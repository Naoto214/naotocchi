'use strict';
// お世話の頻度 監査(2026-11-25)のシミュレーション。
//
// 本物の script.js(と、案ごとの 差し替え plans.cjs)を tests/helpers/runtime-harness.cjs の
// VM で動かし、5種類の プレイヤーが じっさいに ボタンを 押す(click を 送る)ことで、
// 1生涯(100さい = 2,000 tick = 100分)ぶんの お世話回数・状態・成長・死亡を はかる。
//
//   node tools/care-pace/simulate.cjs --plan B --lives 40 --out result-B.json
//
// 時間について: ホームを ひらいている間だけ tick が進む。ミニゲーム・メニュー・めぐるの間は
// 時間が止まる(本体の isTimePaused と同じ)。ここでの「10分」は ホームで過ごした 10分(200 tick)。
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ROOT = path.resolve(__dirname, '..', '..');
process.chdir(ROOT);
const { PLANS, scriptPatches, careStatusPatches, applyPatches } = require('./plans.cjs');

const TICKS_PER_MIN = 20;
const LIFE_TICKS = 2000;

function arg(name, fallback) {
  const i = process.argv.indexOf('--' + name);
  return i >= 0 ? process.argv[i + 1] : fallback;
}

// ---------- 本体の 読みこみ(案の 差し替えを 当てた script.js で harness を つくる) ----------
function loadHarnessModule(planId) {
  const realRead = fs.readFileSync;
  const patched = applyPatches(realRead.call(fs, 'script.js', 'utf8'), scriptPatches(planId), planId);
  fs.readFileSync = function (file, ...rest) {
    if (file === 'script.js') return patched;
    return realRead.call(fs, file, ...rest);
  };
  const modPath = require.resolve(path.join(ROOT, 'tests/helpers/runtime-harness.cjs'));
  delete require.cache[modPath];
  try { return require(modPath); } finally { fs.readFileSync = realRead; }
}
function loadCareStatus(planId) {
  const src = applyPatches(fs.readFileSync('care-status.js', 'utf8'), careStatusPatches(planId), planId);
  const sandbox = { module: { exports: {} } };
  sandbox.window = null;
  vm.runInNewContext(src, sandbox);
  return sandbox.module.exports;
}

// ---------- らんすう(プレイヤーの 気まぐれ用。ゲーム本体の らんすうとは 別) ----------
function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const BUTTONS = { feed: 'feedBtn', clean: 'cleanBtn', pet: 'playWithBtn', sleep: 'sleepBtn', wake: 'sleepBtn', medicine: 'medicineBtn' };
const NOTICE_ACTION = { feedBtn: 'feed', cleanBtn: 'clean', playWithBtn: 'pet', medicineBtn: 'medicine', playBtn: 'game' };

// ---------- プレイヤー像 ----------
// check(): 次に 画面を 見る tick を かえす。act(): その時に する お世話を 順に 行う。
const PERSONAS = {
  diligent: {
    label: 'こまめにお世話',
    gap: r => 5 + Math.floor(r() * 6), // 15〜30秒ごと
    act(p) {
      const s = p.s;
      if (s.isSick) p.tap('medicine');
      if (s.isSleeping) { if (s.energy >= 100 && s.sleptTicks >= 20) p.tap('wake'); return; }
      if (s.poopCount >= 1) p.tap('clean');
      if (s.hunger <= 70) p.tap('feed');
      if (s.energy <= 30) { p.tap('sleep'); return; }
      for (let i = 0; i < 2 && s.happiness <= 80 && s.affectionStreak < p.plan.spamThreshold; i++) p.tap('pet');
      if (p.t - p.lastGameT >= 60 && s.energy >= 40) p.game();
    },
  },
  casual: {
    label: 'ながめながら時々お世話',
    gap: r => 30 + Math.floor(r() * 31), // 1.5〜3分ごと
    reactsToWarnings: true,
    act(p) {
      const s = p.s;
      if (s.isSick) p.tap('medicine');
      if (s.isSleeping) {
        if (s.energy >= 100 || s.hunger <= 25) p.tap('wake'); else return;
      }
      if (s.poopCount >= 1) p.tap('clean');
      if (s.hunger <= 60) p.tap('feed');
      if (s.hunger <= 60) p.tap('feed');
      if (s.energy <= 35) { p.tap('sleep'); return; }
      for (let i = 0; i < 3 && s.happiness <= 60 && s.affectionStreak < p.plan.spamThreshold; i++) p.tap('pet');
      if (p.r() < 0.25 && s.energy >= 40) p.game();
    },
  },
  gamer: {
    label: 'ミニゲーム中心',
    gap: r => 10 + Math.floor(r() * 11), // 30〜60秒(ホーム時間)ごとに 1ゲーム
    act(p) {
      const s = p.s;
      if (s.isSick) p.tap('medicine');
      if (s.isSleeping) { if (s.energy >= 100) p.tap('wake'); else return; }
      if (s.poopCount >= 2) p.tap('clean');
      if (s.hunger <= 50) p.tap('feed');
      if (s.energy >= 25) p.game(); else p.tap('sleep');
    },
  },
  minimal: {
    label: '必要最低限だけ',
    // おしらせ(care-status の assess)が 出て 30秒 たったら、おすすめの ボタンを 1回 押す。
    gap: () => 4,
    act(p) {
      const n = p.notice();
      if (!n || !n.action) { p.noticeSince = -1; return; }
      if (p.noticeSince < 0) { p.noticeSince = p.t; return; }
      if (p.t - p.noticeSince < 10) return;
      if (n.action === 'sleepBtn') p.tap(p.s.isSleeping ? 'wake' : 'sleep');
      else if (n.action === 'playBtn') p.game();
      // おすすめが「じゃれる」のままでも、続けすぎると いやがる(ごきげん−5)。
      // 気づいた プレイヤーは そこで ミニゲームに きりかえる(ほんとうに 押し続けた 場合は 別に はかる)
      else if (n.action === 'playWithBtn' && p.s.affectionStreak >= p.plan.spamThreshold && !p.followBlindly) p.game();
      else p.tap(NOTICE_ACTION[n.action]);
      p.noticeSince = p.t - 6; // 押したあと 12秒 ようすを見て、まだ おしらせが あれば もう1回
    },
  },
  viewer: {
    label: 'しばらく眺めて楽しむ',
    gap: r => 180 + Math.floor(r() * 41), // 9〜11分ごとに まとめて お世話
    reactsToCritical: true,
    act(p) {
      const s = p.s;
      if (s.isSick) p.tap('medicine');
      if (s.isSleeping) p.tap('wake');
      if (s.poopCount >= 1) p.tap('clean');
      for (let i = 0; i < 3 && s.hunger < 75; i++) p.tap('feed');
      for (let i = 0; i < p.plan.spamThreshold && s.happiness <= 85; i++) p.tap('pet');
      if (s.happiness <= 60 && s.energy >= 30) p.game();
      if (s.energy <= 45) p.tap('sleep');
    },
  },
};

function minigameScore(r) {
  // 平均62・ばらつき20 ぐらい(ふつうの うでまえ)。
  const u = Math.max(1e-9, r()), v = r();
  const z = Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  return Math.max(0, Math.min(100, Math.round(62 + 20 * z)));
}

// 1 tick(3秒)すすめる。本体の setInterval(loop, 3000) と、ねている間の
// setInterval(recoverSleepStep, 100)を ここで まねる(harness の setInterval は 何もしないため)。
function step(h, s) {
  h.api.tick();
  h.advance(3000);
  if (s.isSleeping && s.stage === 'growing') for (let i = 0; i < 30 && s.isSleeping && s.energy < 100; i++) h.api.recoverSleepStep();
}

// ---------- 1生涯 ----------
function runLife(H, CS, planId, personaId, seed, opts = {}) {
  const plan = PLANS[planId];
  const persona = PERSONAS[personaId];
  const h = H.harness({ deterministic: true, seed, environment: opts.environment || { time: 'day', weather: 'cloudy' } });
  const api = h.api;
  const s = api.state();
  Object.assign(s, {
    stage: 'growing', speciesLine: 'dog', stageIndex: 0, ageTicks: opts.startAgeTicks || 0,
    sodachi: 20, maxSodachi: 20, growth: 0, decline: 0, deathMeter: 0,
    hunger: 90, happiness: 90, energy: 90, health: 100, poopCount: 0,
    isSick: false, isSleeping: false, companions: [], partner: null,
  });
  api.scheduleEnvironmentMoment();
  const r = rng(seed * 7919 + 17);
  const fixtureGame = { id: 'care-pace-probe', start(container) { container.innerHTML = '<div></div>'; } };

  const taps = { feed: 0, clean: 0, pet: 0, sleep: 0, wake: 0, medicine: 0, game: 0 };
  const tapTicks = []; // 押した tick(集中の はかりかた用)
  const sessions = []; // 1回 画面を 見た ときに 押した 数・種類
  let session = null;
  const p = {
    s, r, plan, t: 0, lastGameT: -999, noticeSince: -1,
    tap(kind) {
      if (kind === 'clean' && s.poopCount === 0) return;
      if (kind === 'wake' && !s.isSleeping) return;
      if (kind === 'sleep' && s.isSleeping) return;
      h.dispatch(h.get(BUTTONS[kind]), 'click');
      taps[kind]++; tapTicks.push(p.t);
      if (session) { session.n++; session.kinds.add(kind); }
    },
    game() {
      if (s.isSleeping || s.energy < 10) return;
      api.startMinigame(fixtureGame);
      api.finishMinigame(minigameScore(r));
      taps.game++; tapTicks.push(p.t); p.lastGameT = p.t;
      if (session) { session.n++; session.kinds.add('game'); }
    },
    notice() {
      return CS.assess(s, { immortal: false, petAvailable: true });
    },
  };

  // 計測
  const metric = {
    ticks: 0, signalFreeTicks: 0, noticeFreeTicks: 0, overlap2: 0, overlap3: 0,
    stretches: [], noticeStretches: [], sickTicks: 0, sleepTicks: 0,
    poopFullTicks: 0, minHealth: 100, deathMeterSum: 0, sicknesses: 0,
  };
  let stretch = 0, noticeStretch = 0, wasSick = false;
  let nextCheck = persona.gap(r);
  let died = false, deathAge = null;
  const notice = () => p.notice();

  for (let t = 0; t < (opts.maxTicks || LIFE_TICKS); t++) {
    p.t = t;
    const live = s.stage === 'growing';
    if (!live) { died = s.stage === 'dead'; if (died) deathAge = Math.floor(s.ageTicks / 20); break; }
    // おしらせに 反応する プレイヤー(時々・眺め)は、いつもの 見回りより 早く 見に来る
    const n = notice();
    const warn = n && (n.severity === 'warning' || n.severity === 'critical');
    if (persona.reactsToWarnings && warn && nextCheck - t > 10) nextCheck = t + 5 + Math.floor(r() * 6);
    if (persona.reactsToCritical && n && n.severity === 'critical' && nextCheck - t > 20) nextCheck = t + 10 + Math.floor(r() * 10);
    if (t >= nextCheck) {
      session = { t, n: 0, kinds: new Set(), needs: needCount(s, plan) };
      persona.act(p);
      if (session.n) sessions.push({ t, n: session.n, kinds: session.kinds.size, needs: session.needs });
      session = null;
      nextCheck = t + persona.gap(r);
    }
    step(h, s);
    // ---- 計測 ----
    metric.ticks++;
    const needs = needCount(s, plan);
    if (needs === 0) { metric.signalFreeTicks++; stretch++; } else { if (stretch) metric.stretches.push(stretch); stretch = 0; }
    if (needs >= 2) metric.overlap2++;
    if (needs >= 3) metric.overlap3++;
    const n2 = notice();
    const quiet = !n2 || n2.kind === 'sleep';
    if (quiet) { metric.noticeFreeTicks++; noticeStretch++; } else { if (noticeStretch) metric.noticeStretches.push(noticeStretch); noticeStretch = 0; }
    if (s.isSick) { metric.sickTicks++; if (!wasSick) metric.sicknesses++; }
    wasSick = s.isSick;
    if (s.isSleeping) metric.sleepTicks++;
    if (s.poopCount >= 4) metric.poopFullTicks++;
    metric.minHealth = Math.min(metric.minHealth, s.health);
    metric.deathMeterSum += s.deathMeter;
  }
  if (s.stage === 'dead' && !died) { died = true; deathAge = Math.floor(s.ageTicks / 20); }
  if (stretch) metric.stretches.push(stretch);
  if (noticeStretch) metric.noticeStretches.push(noticeStretch);
  const reachedEnd = s.stage === 'farewell' || Math.floor(s.ageTicks / 20) >= 100;
  return {
    plan: planId, persona: personaId, seed, taps, tapTicks, sessions, metric,
    died, deathAge, reachedEnd, maxSodachi: s.maxSodachi, sodachi: s.sodachi,
    clear: reachedEnd && s.maxSodachi >= 70,
  };
}

// 画面に 出ている「お世話の サイン」の 数(ゲージの 黄色以下・うんちの おしらせ・びょうき)。
function needCount(s, plan) {
  let n = 0;
  if (s.hunger <= 50) n++;
  if (s.happiness <= 50) n++;
  if (!s.isSleeping && s.energy <= 50) n++;
  if (s.poopCount >= plan.poopNotice) n++;
  if (s.isSick) n++;
  return n;
}

// ---------- なにも しないで 眺めた とき ----------
// すべて まんたん・うんち0 から 手を はなし、サインが 出るまで / おしらせ / びょうき / 死 までの 時間。
function runIdle(H, CS, planId, seed, { startAge = 10, sleeping = false, energy = 100 } = {}) {
  const plan = PLANS[planId];
  const h = H.harness({ deterministic: true, seed, environment: { time: 'day', weather: 'cloudy' } });
  const s = h.api.state();
  Object.assign(s, {
    stage: 'growing', speciesLine: 'dog', stageIndex: 2, ageTicks: startAge * 20,
    sodachi: 40, maxSodachi: 40, growth: 0, decline: 0, deathMeter: 0,
    hunger: 100, happiness: 100, energy, health: 100, poopCount: 0,
    isSick: false, isSleeping: false, companions: [], partner: null,
  });
  if (sleeping) h.dispatch(h.get('sleepBtn'), 'click');
  h.api.scheduleEnvironmentMoment();
  const out = { firstSignal: null, firstNotice: null, firstWarning: null, firstSick: null, firstFullPoop: null, firstHarm: null, death: null, autoWake: null, poopAt10: null, poopAt20: null };
  for (let t = 1; t <= 1200; t++) { // 最大 60分
    step(h, s);
    const m = t / TICKS_PER_MIN;
    if (out.firstSignal == null && needCount(s, plan) > 0) out.firstSignal = m;
    const n = CS.assess(s, {});
    if (out.firstNotice == null && n && n.kind !== 'sleep') out.firstNotice = m;
    if (out.firstWarning == null && n && (n.severity === 'warning' || n.severity === 'critical')) out.firstWarning = m;
    if (out.firstSick == null && s.isSick) out.firstSick = m;
    if (out.firstFullPoop == null && s.poopCount >= 4) out.firstFullPoop = m;
    if (out.firstHarm == null && (s.isSick || s.health < 100 || s.deathMeter > 0.5)) out.firstHarm = m;
    if (sleeping && out.autoWake == null && !s.isSleeping) out.autoWake = m;
    if (t === 200) out.poopAt10 = s.poopCount;
    if (t === 400) out.poopAt20 = s.poopCount;
    if (s.stage !== 'growing') { out.death = s.stage === 'dead' ? m : null; break; }
  }
  return out;
}

// ---------- 集計 ----------
const mean = a => a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0;
const pct = (a, q) => { if (!a.length) return 0; const b = [...a].sort((x, y) => x - y); return b[Math.min(b.length - 1, Math.floor(q * (b.length - 1)))]; };
function maxInWindow(ticks, w) { let best = 0, j = 0; for (let i = 0; i < ticks.length; i++) { while (ticks[i] - ticks[j] >= w) j++; best = Math.max(best, i - j + 1); } return best; }

function summarize(lives) {
  const homeMin = lives.map(l => l.metric.ticks / TICKS_PER_MIN);
  const tapsTotal = l => Object.values(l.taps).reduce((a, b) => a + b, 0);
  const careTaps = l => tapsTotal(l) - l.taps.game; // ミニゲームを 除いた お世話の 操作
  const per10 = f => mean(lives.map(l => f(l) / (l.metric.ticks / 200)));
  const kinds = {};
  for (const k of ['feed', 'clean', 'pet', 'sleep', 'wake', 'medicine', 'game']) kinds[k] = { per10: per10(l => l.taps[k]), life: mean(lives.map(l => l.taps[k] * (2000 / l.metric.ticks))) };
  const stretchesMin = lives.flatMap(l => l.metric.stretches.map(x => x / 20));
  const noticeStretchesMin = lives.flatMap(l => l.metric.noticeStretches.map(x => x / 20));
  const sessions = lives.flatMap(l => l.sessions);
  const gaps = lives.flatMap(l => l.tapTicks.slice(1).map((t, i) => (t - l.tapTicks[i]) / 20)).filter(g => g > 0);
  return {
    lives: lives.length,
    homeMinutes: mean(homeMin),
    careTapsPer10: per10(careTaps),
    allTapsPer10: per10(tapsTotal),
    careTapsPer30Max: mean(lives.map(l => maxInWindow(l.tapTicks.filter((_, i) => true), 600))),
    careTapsPerLife: mean(lives.map(l => careTaps(l) * (2000 / l.metric.ticks))),
    gamesPerLife: kinds.game.life,
    kinds,
    maxTapsIn1Min: mean(lives.map(l => maxInWindow(l.tapTicks, 20))),
    maxTapsIn10Min: mean(lives.map(l => maxInWindow(l.tapTicks, 200))),
    sessionsPer10: per10(l => l.sessions.length),
    burstSessionsPerLife: mean(lives.map(l => l.sessions.filter(x => x.n >= 5 || x.kinds >= 3).length * (2000 / l.metric.ticks))),
    sessionTapsP90: pct(sessions.map(x => x.n), 0.9),
    quietGapMedianMin: pct(gaps, 0.5),
    signalFreeShare: mean(lives.map(l => l.metric.signalFreeTicks / l.metric.ticks)),
    noticeFreeShare: mean(lives.map(l => l.metric.noticeFreeTicks / l.metric.ticks)),
    signalFreeStretchMeanMin: mean(stretchesMin),
    signalFreeStretchP90Min: pct(stretchesMin, 0.9),
    noticeFreeStretchMeanMin: mean(noticeStretchesMin),
    overlap2Share: mean(lives.map(l => l.metric.overlap2 / l.metric.ticks)),
    overlap3Share: mean(lives.map(l => l.metric.overlap3 / l.metric.ticks)),
    sicknessesPerLife: mean(lives.map(l => l.metric.sicknesses)),
    sickShare: mean(lives.map(l => l.metric.sickTicks / l.metric.ticks)),
    poopFullShare: mean(lives.map(l => l.metric.poopFullTicks / l.metric.ticks)),
    sleepShare: mean(lives.map(l => l.metric.sleepTicks / l.metric.ticks)),
    deathRate: mean(lives.map(l => l.died ? 1 : 0)),
    deathAges: lives.filter(l => l.died).map(l => l.deathAge),
    meanDeathMeter: mean(lives.map(l => l.metric.deathMeterSum / l.metric.ticks)),
    maxSodachi: mean(lives.map(l => l.maxSodachi)),
    maxSodachiP10: pct(lives.map(l => l.maxSodachi), 0.1),
    clearRate: mean(lives.map(l => l.clear ? 1 : 0)),
  };
}

function summarizeIdle(rows) {
  const f = k => { const v = rows.map(r => r[k]).filter(x => x != null); return { mean: mean(v), p10: pct(v, 0.1), p90: pct(v, 0.9), reached: v.length / rows.length }; };
  const out = {};
  for (const k of Object.keys(rows[0])) out[k] = f(k);
  return out;
}

if (require.main === module) {
  const planId = arg('plan', 'current');
  // 調整用: --override '{"hungerDecay":0.2}' で 案の つまみを 一時的に かえる
  if (arg('override', null)) Object.assign(PLANS[planId], JSON.parse(arg('override')));
  const lives = Number(arg('lives', 30));
  const idleRuns = Number(arg('idle', 120));
  const outFile = arg('out', null);
  const H = loadHarnessModule(planId);
  const CS = loadCareStatus(planId);
  const t0 = Date.now();
  const personas = {};
  for (const personaId of Object.keys(PERSONAS)) {
    const rows = [];
    for (let i = 0; i < lives; i++) rows.push(runLife(H, CS, planId, personaId, 1000 + i));
    personas[personaId] = summarize(rows);
    personas[personaId].label = PERSONAS[personaId].label;
    process.stderr.write(`${planId} ${personaId} done ${(Date.now() - t0) / 1000}s\n`);
  }
  const idle = {};
  for (const [key, o] of Object.entries({ young: { startAge: 10 }, old: { startAge: 80 }, sleep: { startAge: 10, sleeping: true, energy: 20 } })) {
    const rows = [];
    for (let i = 0; i < idleRuns; i++) rows.push(runIdle(H, CS, planId, 5000 + i, o));
    idle[key] = summarizeIdle(rows);
  }
  // 季節・天気・時間帯が いちばん きびしい 組みあわせ(夜・雨)での「時々」プレイヤー
  const harsh = [];
  for (let i = 0; i < Math.max(10, Math.floor(lives / 2)); i++) harsh.push(runLife(H, CS, planId, 'casual', 3000 + i, { environment: { time: 'night', weather: 'rain' } }));
  const result = { plan: PLANS[planId], personas, idle, harshCasual: summarize(harsh), seconds: (Date.now() - t0) / 1000 };
  const json = JSON.stringify(result, null, 1);
  if (outFile) fs.writeFileSync(outFile, json); else console.log(json);
}

module.exports = { PERSONAS, runLife, runIdle, loadHarnessModule, loadCareStatus, summarize, step, rng, minigameScore, needCount, BUTTONS, NOTICE_ACTION };
