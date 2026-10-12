#!/usr/bin/env node
// Conversation Director v1 の 検証用シミュレーション(読みとり専用。ゲームの ふるまいは かえない)。
// docs/design/conversation-director-v1-2026-10-12.md §9 の 計画を そのまま 再現する。
//
// つかいかた:
//   node tools/conversation-sim.cjs                 # 全シナリオ × 10分/1時間/2時間 × seed 3つ
//   node tools/conversation-sim.cjs --json out.json # 結果を JSON でも 保存
//   node tools/conversation-sim.cjs --quick         # 10分だけ(CI や 手元の 確認むけ)
//
// 実ゲームの closure を tests/helpers/runtime-harness.cjs で うごかし、
// 放置中(何も 操作しない Home)の 吹き出しを すべて 記録する。
// 記録は 吹き出しの 本文の setter で とる ので、Director の 実装が かわっても 同じ 方法で 比較できる。
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
process.chdir(path.join(__dirname, '..'));
const {harness} = require('../tests/helpers/runtime-harness.cjs');

const args = process.argv.slice(2);
const jsonOut = args.includes('--json') ? args[args.indexOf('--json') + 1] : null;
const quick = args.includes('--quick');
const DURATIONS = quick ? [{label:'10m', ms:10 * 60e3}] : [{label:'10m', ms:10 * 60e3}, {label:'1h', ms:60 * 60e3}, {label:'2h', ms:120 * 60e3}];
const SEEDS = quick ? [11] : [11, 22, 33];
const STEP_MS = 100;
const WINDOW = 24;

// 台詞 → プール名(監査 inventory が 正本。無ければ 'unknown')
const inventoryPath = 'docs/audit/existing-conversation-audit-2026-10-03-inventory.json';
const poolOf = new Map();
if (fs.existsSync(inventoryPath)) {
  for (const row of JSON.parse(fs.readFileSync(inventoryPath, 'utf8')).lines) {
    if (!poolOf.has(row.text)) poolOf.set(row.text, row.table);
  }
}
// IDLE_GREETINGS の 末尾 8 行(インライン)と pickMemoryGreeting の 組み立て文は inventory に 1 行ずつ 載って いない
const poolName = (text) => poolOf.get(text) || (/さいかぁ|覚えてる|思い出|あのとき|あの日|このまえ|さいのとき|ありがとう|ほっとした|ちゃんと話して|ひと息|にぎやか|自分だった|驚いたね|ふと思い出した/.test(text) ? 'MEMORY' : 'unlisted');
const RARE_POOLS = new Set(['IDLE_GREETINGS_DIALECT', 'MEMORY']);

const MEMORIES = [
  {age:3, icon:'🤝', text:'たぬきがなかまになった'},
  {age:5, icon:'💊', text:'びょうきをなおしてもらった'},
  {age:8, icon:'🗺️', text:'はじめてもりにいった'},
];

const SCENARIOS = [
  {id:'pet-only', label:'本人のみ', setup() {}},
  {id:'partner', label:'本人+こいびと(ロボット)', setup(h, s) { addPartner(h, s, 'robot_neighbor'); }},
  {id:'party', label:'本人+こいびと+なかま3体', setup(h, s) { addPartner(h, s, 'robot_neighbor'); s.companions = ['otter', 'snail', 'clock'].map(id => ({id, bond:100})); }},
  {id:'small-pool', label:'少数プール(なかま1体+思い出3件、本人は思い出30%)', setup(h, s) { s.companions = [{id:'owl', bond:100}]; s.lifeLog = MEMORIES.map(m => ({...m})); }},
  {id:'reload', label:'本人+こいびと、10分ごとに reload', reloadEveryMs:10 * 60e3, setup(h, s) { addPartner(h, s, 'robot_neighbor'); }},
];

function addPartner(h, s, id) {
  const base = h.api.REGIONS.flatMap(r => r.candidates || []).find(c => c.id === id);
  s.partner = JSON.parse(JSON.stringify({...base, affection:60, bondCount:0, married:false}));
}

function boot(seed, resumeState) {
  const options = {deterministic:true, seed};
  if (resumeState) {
    options.resume = true;
    options.storage = {getItem:k => k === 'naotocchi-save-v1' ? resumeState : null, setItem() {}, removeItem() {}};
  }
  const h = harness(options);
  const log = [];
  const textNode = h.get('speechText');
  const record = (value) => {
    const text = String(value).replace(/<[^>]*>/g, '').replace(/&(amp|lt|gt|quot|#39);/g, (_, k) => ({amp:'&', lt:'<', gt:'>', quot:'"', '#39':"'"})[k]);
    if (text) log.push({at:vm.runInContext('Date.now()', h.sandbox), text, kind:null, id:null});
  };
  // harness の innerHTML は textContent へ 書きこむ ので、textContent だけ 見れば 両方 とれる
  let tc = '';
  Object.defineProperty(textNode, 'textContent', {get:() => tc, set:v => { tc = String(v); record(v); }, configurable:true});
  return {h, log};
}

function prepare(h, scenario) {
  const s = h.api.state();
  Object.assign(s, {regionId:'home', isSleeping:false, isSick:false, hunger:95, happiness:95, energy:95, health:100});
  scenario.setup(h, s);
  // harness は 起動時の タイマーを 消す ので、本番と 同じ 放置会話の ループだけを 再開する
  h.api.scheduleIdleGreeting();
  return s;
}

function runOnce(scenario, seed, durationMs) {
  let {h, log} = boot(seed);
  let s = prepare(h, scenario);
  const all = [];
  const bubble = () => h.get('speechBubble');
  let elapsed = 0, sinceReload = 0, reloads = 0;
  const flush = () => {
    for (const e of log) {
      if (e.kind === null) { e.kind = bubble().dataset.kind || 'pet'; e.id = bubble().dataset.speakerId || ''; }
    }
  };
  while (elapsed < durationMs) {
    // needs が 下がって 本人が だまらない よう、放置の あいだも ごきげんを たもつ(tick は うごかさない)
    Object.assign(s, {hunger:95, happiness:95, energy:95, health:100});
    h.advance(STEP_MS);
    flush();
    elapsed += STEP_MS; sinceReload += STEP_MS;
    if (scenario.reloadEveryMs && sinceReload >= scenario.reloadEveryMs && elapsed < durationMs) {
      all.push(...log.map(e => ({...e, at:e.at + elapsed - sinceReload, session:reloads})));
      const saved = JSON.stringify(s);
      ({h, log} = boot(seed + reloads + 1, saved));
      s = h.api.state();
      h.api.scheduleIdleGreeting();
      reloads++; sinceReload = 0;
    }
  }
  all.push(...log.map(e => ({...e, at:e.at + elapsed - sinceReload, session:reloads})));
  return {lines:all, reloads};
}

function metrics(lines, durationMs) {
  const n = lines.length;
  const texts = lines.map(l => l.text);
  const unique = new Set(texts).size;
  let windowRepeats = 0;
  const lastIndex = new Map(), lastAt = new Map();
  const gapsLines = [], gapsSec = [];
  texts.forEach((t, i) => {
    if (lastIndex.has(t)) {
      const gap = i - lastIndex.get(t);
      gapsLines.push(gap); gapsSec.push((lines[i].at - lastAt.get(t)) / 1000);
      if (gap <= WINDOW) windowRepeats++;
    }
    lastIndex.set(t, i); lastAt.set(t, lines[i].at);
  });
  const sorted = (a) => [...a].sort((x, y) => x - y);
  const pct = (a, p) => a.length ? sorted(a)[Math.min(a.length - 1, Math.floor(a.length * p))] : null;
  const bySpeaker = {};
  for (const l of lines) { const k = l.kind === 'pet' ? 'pet' : `${l.kind}:${l.id}`; bySpeaker[k] = (bySpeaker[k] || 0) + 1; }
  const shares = Object.values(bySpeaker).map(c => c / n);
  const mean = shares.length ? 1 / shares.length : 0;
  const speakerStdev = shares.length ? Math.sqrt(shares.reduce((a, x) => a + (x - mean) ** 2, 0) / shares.length) : 0;
  let maxRun = 0, run = 0, prev = null;
  for (const l of lines) { const k = l.kind + ':' + l.id; run = k === prev ? run + 1 : 1; prev = k; maxRun = Math.max(maxRun, run); }
  const byPool = {};
  for (const t of texts) { const p = poolName(t); (byPool[p] ||= new Set()).add(t); }
  const poolSeen = Object.fromEntries(Object.entries(byPool).map(([p, set]) => [p, set.size]));
  const freq = {};
  for (const t of texts) freq[t] = (freq[t] || 0) + 1;
  const top = Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const rare = texts.filter(t => RARE_POOLS.has(poolName(t))).length;
  const crossReloadRepeats = (() => {
    const sessions = new Map();
    for (const l of lines) { if (!sessions.has(l.session)) sessions.set(l.session, []); sessions.get(l.session).push(l.text); }
    let count = 0; const list = [...sessions.values()];
    for (let i = 1; i < list.length; i++) {
      const tail = new Set(list[i - 1].slice(-WINDOW));
      count += list[i].slice(0, WINDOW).filter(t => tail.has(t)).length;
    }
    return count;
  })();
  return {
    utterances:n, perMinute:+(n / (durationMs / 60e3)).toFixed(2), unique, repeatRate:n ? +(1 - unique / n).toFixed(3) : 0,
    windowRepeats, windowRepeatRate:n ? +(windowRepeats / n).toFixed(3) : 0,
    reappearGapLines:{min:pct(gapsLines, 0), p10:pct(gapsLines, 0.1), median:pct(gapsLines, 0.5)},
    reappearGapSec:{min:pct(gapsSec, 0), p10:pct(gapsSec, 0.1), median:pct(gapsSec, 0.5)},
    bySpeaker, speakerShareStdev:+speakerStdev.toFixed(3), maxSameSpeakerRun:maxRun,
    poolSeen, rare, rareRate:n ? +(rare / n).toFixed(3) : 0, crossReloadRepeats, top,
  };
}

const results = [];
for (const scenario of SCENARIOS) {
  for (const d of DURATIONS) {
    const runs = SEEDS.map(seed => metrics(runOnce(scenario, seed, d.ms).lines, d.ms));
    const avg = (k) => +(runs.reduce((a, r) => a + r[k], 0) / runs.length).toFixed(3);
    const summary = {scenario:scenario.id, label:scenario.label, duration:d.label,
      utterances:avg('utterances'), perMinute:avg('perMinute'), unique:avg('unique'), repeatRate:avg('repeatRate'),
      windowRepeatRate:avg('windowRepeatRate'), minGapLines:Math.min(...runs.map(r => r.reappearGapLines.min ?? Infinity)),
      medianGapSec:avg2(runs.map(r => r.reappearGapSec.median)), speakerShareStdev:avg('speakerShareStdev'),
      maxSameSpeakerRun:Math.max(...runs.map(r => r.maxSameSpeakerRun)), rareRate:avg('rareRate'), crossReloadRepeats:avg('crossReloadRepeats'),
      runs};
    results.push(summary);
    console.log(`${scenario.id.padEnd(10)} ${d.label.padEnd(3)} utt=${summary.utterances} /min=${summary.perMinute} uniq=${summary.unique} repeat=${summary.repeatRate} win24=${summary.windowRepeatRate} minGap=${summary.minGapLines} medGap=${summary.medianGapSec}s sdev=${summary.speakerShareStdev} run=${summary.maxSameSpeakerRun} rare=${summary.rareRate} xReload=${summary.crossReloadRepeats}`);
  }
}
function avg2(a) { const v = a.filter(x => x != null); return v.length ? +(v.reduce((x, y) => x + y, 0) / v.length).toFixed(1) : null; }
if (jsonOut) fs.writeFileSync(jsonOut, JSON.stringify({generatedAt:new Date().toISOString(), seeds:SEEDS, results}, null, 1));
