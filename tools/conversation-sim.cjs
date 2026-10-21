#!/usr/bin/env node
// Conversation Director v1 の 検証用シミュレーション(読みとり専用。ゲームの ふるまいは かえない)。
// docs/design/conversation-director-v1-2026-10-12.md §9 の 計画を 再現する。
//
// つかいかた:
//   node tools/conversation-sim.cjs                       # 5 セットアップ × 10分/1時間/2時間 × seed 3 + 追加シナリオ(2時間)
//   node tools/conversation-sim.cjs --json out.json       # 結果を JSON でも 保存
//   node tools/conversation-sim.cjs --quick               # 10分・seed 1 つ だけ
//   node tools/conversation-sim.cjs --root <checkout>     # べつの checkout(例: Director 導入前)を 同じ 条件で はかる
//
// 実ゲームの closure を その checkout の tests/helpers/runtime-harness.cjs で うごかし、
// 放置中(何も 操作しない Home)の 吹き出しを すべて 記録する。本文の setter で とる ので、
// Director の 有無に かかわらず 同じ 方法で 比較できる。
// 自由生活(relationship-life)の「訪問」が 本番と 同じに おきる よう、3 秒ごとに render() する(本番の tick と 同じ 間隔)。
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const args = process.argv.slice(2);
const opt = (name) => args.includes(name) ? args[args.indexOf(name) + 1] : null;
const jsonOut = opt('--json') ? path.resolve(opt('--json')) : null;
const root = path.resolve(opt('--root') || path.join(__dirname, '..'));
const quick = args.includes('--quick');
const inventoryPath = path.resolve(path.join(__dirname, '..', 'docs/audit/existing-conversation-audit-2026-10-03-inventory.json'));
process.chdir(root);
const {harness} = require(path.join(root, 'tests/helpers/runtime-harness.cjs'));

const DURATIONS = quick ? [{label:'10m', ms:10 * 60e3}] : [{label:'10m', ms:10 * 60e3}, {label:'1h', ms:60 * 60e3}, {label:'2h', ms:120 * 60e3}];
const SEEDS = quick ? [11] : [11, 22, 33];
const STEP_MS = 100;
const RENDER_MS = 3000;
const WINDOW = 24;

// 台詞 → プール名・話者(監査 inventory が 正本。無ければ 推定)
const poolOf = new Map(), ownOf = new Map();
if (fs.existsSync(inventoryPath)) {
  for (const row of JSON.parse(fs.readFileSync(inventoryPath, 'utf8')).lines) {
    if (!poolOf.has(row.text)) poolOf.set(row.text, row.table);
    if (/^(partner|companion):/.test(row.speaker)) { if (!ownOf.has(row.speaker)) ownOf.set(row.speaker, new Set()); ownOf.get(row.speaker).add(row.text); }
  }
}
const MEMORY_RE = /さいかぁ|覚えてる|思い出|あのとき|あの日|このまえ|さいのとき|ありがとう|ほっとした|ちゃんと話して|ひと息|にぎやか|自分だった|驚いたね|ふと思い出した/;
// IDLE_GREETINGS の 末尾 8 行(インライン)と pickMemoryGreeting の 組み立て文は inventory に 1 行ずつ 載って いない
const poolName = (text) => poolOf.get(text) || (MEMORY_RE.test(text) ? 'MEMORY' : 'unlisted');
const QUIET = new Set(['partner:high_eagle', 'partner:desert_scorpion', 'partner:swamp_croc', 'companion:sekizou', 'companion:box', 'companion:watcher']);

const MEMORIES = [
  {age:3, icon:'🤝', text:'たぬきがなかまになった'},
  {age:5, icon:'💊', text:'びょうきをなおしてもらった'},
  {age:8, icon:'🗺️', text:'はじめてもりにいった'},
];
const party = (s, ids) => { s.companions = ids.map(id => ({id, bond:100})); };

const CORE = [
  {id:'pet-only', label:'本人のみ', setup() {}},
  {id:'partner', label:'本人+こいびと(ロボット)', setup(h, s) { addPartner(h, s, 'robot_neighbor'); }},
  {id:'party', label:'本人+こいびと+なかま3体', setup(h, s) { addPartner(h, s, 'robot_neighbor'); party(s, ['otter', 'snail', 'clock']); }},
  {id:'small-pool', label:'少数プール(なかま1体+思い出3件)', setup(h, s) { party(s, ['owl']); s.lifeLog = MEMORIES.map(m => ({...m})); }},
  {id:'reload', label:'本人+こいびと、10分ごとに reload', reloadEveryMs:10 * 60e3, setup(h, s) { addPartner(h, s, 'robot_neighbor'); }},
];
const EXTRA = [
  {id:'quiet', label:'寡黙(ワニ+はこ+石像)', setup(h, s) { addPartner(h, s, 'swamp_croc'); party(s, ['box', 'sekizou']); }},
  {id:'hungry', label:'空腹45(本人は黙る)+こいびと+なかま3体', needs:{hunger:45}, setup(h, s) { addPartner(h, s, 'robot_neighbor'); party(s, ['otter', 'snail', 'clock']); }},
  {id:'interact', label:'本人のみ、1分ごとに画面タップ(操作中の頻度で比較)', interactEveryMs:60e3, setup() {}},
  // 現在の main の自由生活では訪問中のこいびと・なかまが放置で話す機会がほぼ無い(記録 §3)。
  // Director の話者制御を確かめるため、harness の setPresentCastFixture(常に在宅・initiative 常に可)で同じ条件を作る
  {id:'fx-party', label:'[常在fixture] こいびと+なかま3体', fixture:true, setup(h, s) { addPartner(h, s, 'robot_neighbor'); party(s, ['otter', 'snail', 'clock']); }},
  {id:'fx-quiet', label:'[常在fixture] 寡黙(ワニ+はこ+石像)', fixture:true, setup(h, s) { addPartner(h, s, 'swamp_croc'); party(s, ['box', 'sekizou']); }},
  {id:'fx-hungry', label:'[常在fixture] 空腹45+こいびと+なかま3体', fixture:true, needs:{hunger:45}, setup(h, s) { addPartner(h, s, 'robot_neighbor'); party(s, ['otter', 'snail', 'clock']); }},
];

function addPartner(h, s, id) {
  const base = h.api.REGIONS.flatMap(r => r.candidates || []).find(c => c.id === id);
  s.partner = JSON.parse(JSON.stringify({...base, affection:60, bondCount:0, married:false}));
}

function boot(seed, store, resume) {
  // 本番と 同じく localStorage は 1 つ(セーブも 会話の 記憶も)。reload を またいで のこる
  const storage = {getItem:k => store.has(k) ? store.get(k) : null, setItem:(k, v) => store.set(k, String(v)), removeItem:k => store.delete(k)};
  const h = harness({deterministic:true, seed, storage, resume});
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

const NEEDS = {hunger:95, happiness:95, energy:95, health:100};
function prepare(h, scenario, fresh) {
  const s = h.api.state();
  if (fresh) { Object.assign(s, {regionId:'home', isSleeping:false, isSick:false, ...NEEDS}); scenario.setup(h, s); }
  if (scenario.fixture) h.api.setPresentCastFixture();
  // harness は 起動時の タイマーを 消す ので、本番と 同じ 放置会話の ループだけを 再開する
  h.api.scheduleIdleGreeting();
  return s;
}

function runOnce(scenario, seed, durationMs) {
  const store = new Map();
  let {h, log} = boot(seed, store, false);
  let s = prepare(h, scenario, true);
  const all = [];
  const bubble = () => h.get('speechBubble');
  let elapsed = 0, sinceReload = 0, reloads = 0, sinceRender = 0, sinceTap = 0;
  const flush = () => {
    for (const e of log) if (e.kind === null) { e.kind = bubble().dataset.kind || 'pet'; e.id = bubble().dataset.speakerId || ''; }
  };
  while (elapsed < durationMs) {
    // needs が 下がって 本人が だまらない よう、放置の あいだも 値を たもつ(tick は うごかさない)
    Object.assign(s, NEEDS, scenario.needs || {});
    h.advance(STEP_MS);
    flush();
    elapsed += STEP_MS; sinceReload += STEP_MS; sinceRender += STEP_MS; sinceTap += STEP_MS;
    if (sinceRender >= RENDER_MS) { sinceRender = 0; h.api.render(); }
    if (scenario.interactEveryMs && sinceTap >= scenario.interactEveryMs) { sinceTap = 0; h.dispatch(h.document, 'pointerdown'); }
    if (scenario.reloadEveryMs && sinceReload >= scenario.reloadEveryMs && elapsed < durationMs) {
      all.push(...log.map(e => ({...e, at:e.at + elapsed - sinceReload, session:reloads})));
      h.api.saveState();
      h.dispatch(h.window, 'pagehide');   // 本番の reload と同じく、閉じる前に会話の記憶を保存させる
      ({h, log} = boot(seed + reloads + 1, store, true));
      s = prepare(h, scenario, false);
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
  const keyOf = (l) => l.kind === 'pet' ? 'pet' : `${l.kind}:${l.id}`;
  const bySpeaker = {};
  for (const l of lines) bySpeaker[keyOf(l)] = (bySpeaker[keyOf(l)] || 0) + 1;
  const shares = Object.values(bySpeaker).map(c => c / n);
  const mean = shares.length ? 1 / shares.length : 0;
  const speakerStdev = shares.length ? Math.sqrt(shares.reduce((a, x) => a + (x - mean) ** 2, 0) / shares.length) : 0;
  let maxRun = 0, run = 0, prev = null;
  for (const l of lines) { const k = keyOf(l); run = k === prev ? run + 1 : 1; prev = k; maxRun = Math.max(maxRun, run); }
  const multiSpeaker = Object.keys(bySpeaker).length > 1;
  const byPool = {};
  for (const t of texts) { const p = poolName(t); (byPool[p] ||= new Set()).add(t); }
  const poolSeen = Object.fromEntries(Object.entries(byPool).map(([p, set]) => [p, set.size]));
  const freq = {};
  for (const t of texts) freq[t] = (freq[t] || 0) + 1;
  const top = Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const petLines = lines.filter(l => l.kind === 'pet');
  const memory = petLines.filter(l => poolName(l.text) === 'MEMORY').length;
  const dialect = petLines.filter(l => poolName(l.text) === 'IDLE_GREETINGS_DIALECT').length;
  const visitorLines = lines.filter(l => l.kind !== 'pet');
  const quietLines = visitorLines.filter(l => QUIET.has(keyOf(l)));
  const quietGeneric = quietLines.filter(l => !(ownOf.get(keyOf(l)) || new Set()).has(l.text)).length;
  const firstMs = 5 * 60e3, lateFrom = 30 * 60e3;
  const early = lines.filter(l => l.at - (lines[0]?.at ?? 0) < firstMs).length;
  const late = lines.filter(l => l.at - (lines[0]?.at ?? 0) >= lateFrom).length;
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
    maxSameLine:top[0]?.[1] || 0,
    bySpeaker, speakerShareStdev:+speakerStdev.toFixed(3), maxSameSpeakerRun:multiSpeaker ? maxRun : null,
    poolSeen, memoryShareOfPet:petLines.length ? +(memory / petLines.length).toFixed(3) : 0,
    dialectShareOfPet:petLines.length ? +(dialect / petLines.length).toFixed(3) : 0,
    visitorLines:visitorLines.length, quietLines:quietLines.length, quietGeneric,
    perMinuteFirst5m:+(early / Math.min(5, durationMs / 60e3)).toFixed(2),
    perMinuteAfter30m:durationMs > lateFrom ? +(late / ((durationMs - lateFrom) / 60e3)).toFixed(2) : null,
    crossReloadRepeats, top,
  };
}

const avgOf = (runs, k) => { const v = runs.map(r => r[k]).filter(x => x != null); return v.length ? +(v.reduce((a, b) => a + b, 0) / v.length).toFixed(3) : null; };
const results = [];
function measure(scenario, durations) {
  for (const d of durations) {
    const runs = SEEDS.map(seed => metrics(runOnce(scenario, seed, d.ms).lines, d.ms));
    const summary = {scenario:scenario.id, label:scenario.label, duration:d.label};
    for (const k of ['utterances', 'perMinute', 'unique', 'repeatRate', 'windowRepeatRate', 'maxSameLine', 'speakerShareStdev', 'memoryShareOfPet',
      'dialectShareOfPet', 'visitorLines', 'quietLines', 'quietGeneric', 'perMinuteFirst5m', 'perMinuteAfter30m', 'crossReloadRepeats']) summary[k] = avgOf(runs, k);
    summary.minGapLines = Math.min(...runs.map(r => r.reappearGapLines.min ?? Infinity));
    summary.medianGapSec = avgOf(runs.map(r => ({x:r.reappearGapSec.median})), 'x');
    const maxRuns = runs.map(r => r.maxSameSpeakerRun).filter(x => x != null);
    summary.maxSameSpeakerRun = maxRuns.length ? Math.max(...maxRuns) : null;
    summary.runs = runs;
    results.push(summary);
    console.log(`${scenario.id.padEnd(10)} ${d.label.padEnd(3)} utt=${summary.utterances} /min=${summary.perMinute} (5m=${summary.perMinuteFirst5m} late=${summary.perMinuteAfter30m}) uniq=${summary.unique} win24=${summary.windowRepeatRate} maxLine=${summary.maxSameLine} minGap=${summary.minGapLines} medGap=${summary.medianGapSec}s run=${summary.maxSameSpeakerRun} mem=${summary.memoryShareOfPet} dia=${summary.dialectShareOfPet} visitors=${summary.visitorLines} quietGen=${summary.quietGeneric}/${summary.quietLines} xReload=${summary.crossReloadRepeats}`);
  }
}
for (const scenario of CORE) measure(scenario, DURATIONS);
if (!quick) for (const scenario of EXTRA) measure(scenario, [{label:'2h', ms:120 * 60e3}]);
if (jsonOut) fs.writeFileSync(jsonOut, JSON.stringify({generatedAt:new Date().toISOString(), root, seeds:SEEDS, results}, null, 1));
