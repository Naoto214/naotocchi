'use strict';
// お世話の頻度 監査 VERSION 2(2026-11-25): B案を 正式採用候補として 追加検証する。
//
//   node tools/care-pace/simulate-v2.cjs --plan B2 --lives 50 --out v2-B2.json
//
// VERSION 1(simulate.cjs)に くわえて はかる もの:
//   - 睡眠: 1生涯の 回数・1回の 長さ・おきている 間隔・起きかた(自分で/プレイヤー/操作で)・
//           「寝ていて したい ことが できなかった」回数と、そのために 余分に 押した 回数
//   - プレイヤー像: 初心者(おしらせに おくれて 従い、ときどき 失敗する)・ふれあい好き(したくて じゃれる)・
//           おすすめに 素直(おすすめの ボタンを そのまま 押しつづける)
//   - 運の わるい 側: 生涯ごとの 値の 下位10%・上位10%
//   - 放置: 健康な 状態から 5・10・15分 手を はなした ときの 状態の 分布
//   - 救出: 命の 危機(赤い おしらせ)に 気づくのが 30秒〜3分 おくれた ときに 助けられるか
//   - 予告: 死亡の 何秒 前に「おわかれの まえぶれ」が 出たか
const fs = require('node:fs');
const path = require('node:path');
const V1 = require('./simulate.cjs');
const { PLANS } = require('./plans.cjs');
const { step, rng, minigameScore, needCount, NOTICE_ACTION } = V1;
const BUTTONS = { ...V1.BUTTONS, court: 'courtBtn' };

const LIFE_TICKS = 2000;
function arg(name, fallback) { const i = process.argv.indexOf('--' + name); return i >= 0 ? process.argv[i + 1] : fallback; }

// ---------- プレイヤー像(睡眠を 意識した 版) ----------
// p.want(kind): したい お世話。寝ていたら、案に よって「そっと起きて そのまま」か「起こす操作が 先に 必要」。
const PERSONAS = {
  diligent: {
    label: 'こまめ', gap: r => 5 + Math.floor(r() * 6),
    act(p) {
      const s = p.s;
      if (s.isSick) p.tap('medicine');
      if (s.isSleeping && s.energy >= 100 && s.sleptTicks >= 20) p.tap('wake');
      if (s.poopCount >= 1) p.tap('clean');
      if (s.hunger <= 70) p.want('feed');
      if (!s.isSleeping && s.energy <= 30) { p.tap('sleep'); return; }
      if (s.isSleeping) return;
      for (let i = 0; i < 2 && s.happiness <= 80 && s.affectionStreak < p.plan.spamThreshold; i++) p.want('pet');
      if (p.t - p.lastGameT >= 60 && s.energy >= 40) p.want('game');
    },
  },
  casual: {
    label: 'ときどき', gap: r => 30 + Math.floor(r() * 31), reactsToWarnings: true,
    act(p) {
      const s = p.s;
      if (s.isSick) p.tap('medicine');
      if (s.isSleeping && s.energy >= 100) p.tap('wake');
      if (s.poopCount >= 1) p.tap('clean');
      if (s.hunger <= 60) p.want('feed');
      if (s.hunger <= 60) p.want('feed');
      if (!s.isSleeping && s.energy <= 35) { p.tap('sleep'); return; }
      for (let i = 0; i < 3 && s.happiness <= 60 && s.affectionStreak < p.plan.spamThreshold; i++) p.want('pet');
      if (p.r() < 0.25 && s.energy >= 40) p.want('game');
    },
  },
  gamer: {
    label: 'ミニゲーム中心', gap: r => 10 + Math.floor(r() * 11),
    act(p) {
      const s = p.s;
      if (s.isSick) p.tap('medicine');
      if (s.poopCount >= 2) p.tap('clean');
      if (s.hunger <= 50) p.want('feed');
      if (s.energy >= 25) p.want('game'); else if (!s.isSleeping) p.tap('sleep');
    },
  },
  minimal: {
    label: '最低限(おしらせに従う)', gap: () => 4,
    act(p) { followNotice(p, 10, false); },
  },
  follower: {
    label: 'おすすめに素直', gap: () => 4,
    act(p) { followNotice(p, 10, true); },
  },
  beginner: {
    label: '初心者', gap: r => 40 + Math.floor(r() * 81), reactsToWarnings: true, warnDelay: r => 20 + Math.floor(r() * 21),
    act(p) {
      const s = p.s;
      // おしらせが あれば、その おすすめを まず 押す(じゃれるの おすすめにも そのまま 従う)
      for (let i = 0; i < 4; i++) {
        const n = p.notice();
        if (!n || !n.action) break;
        doNoticeAction(p, n, true);
      }
      // 遊びたい 気持ちで 押す(まちがいも ふくむ)
      if (p.r() < 0.5) { const k = 1 + Math.floor(p.r() * 5); for (let i = 0; i < k; i++) p.want('pet'); }
      if (p.r() < 0.3) p.want('feed'); // おなかを 見ずに ごはん(食べすぎることも ある)
      if (p.r() < 0.3 && s.energy >= 20) p.want('game');
      if (s.poopCount >= 1 && p.r() < 0.7) p.tap('clean');
    },
  },
  affection: {
    label: 'ふれあい好き', gap: r => 6 + Math.floor(r() * 7),
    act(p) {
      const s = p.s;
      if (s.isSick) p.tap('medicine');
      if (s.isSleeping && s.energy >= 100) p.tap('wake');
      if (s.poopCount >= 2) p.tap('clean');
      if (s.hunger <= 55) p.want('feed');
      if (!s.isSleeping && s.energy <= 30) { p.tap('sleep'); return; }
      // ごきげんに 関係なく、会いたくて じゃれる(1〜2回)
      const k = 1 + (p.r() < 0.5 ? 1 : 0);
      for (let i = 0; i < k; i++) p.want('pet');
      if (p.r() < 0.1 && s.energy >= 40) p.want('game');
    },
  },
  keeper: {
    label: 'ときどき+関係も気にかける', gap: r => 30 + Math.floor(r() * 31), reactsToWarnings: true,
    act(p) {
      PERSONAS.casual.act(p);
      const s = p.s;
      // データ画面で きずなを 見て、40を きった 人が いれば じゃれる・こいびとなら きゅうあい
      if (s.companions.some(c => (c.bond ?? 100) < 40) && s.affectionStreak < p.plan.spamThreshold) { p.want('pet'); p.relTaps++; }
      if (s.partner && (s.partner.affection ?? 100) < 40) { p.want('court'); p.relTaps++; }
    },
  },
  viewer: {
    label: '眺める(10分ごと)', gap: r => 180 + Math.floor(r() * 41), reactsToCritical: true,
    act(p) {
      const s = p.s;
      if (s.isSick) p.tap('medicine');
      if (s.poopCount >= 1) p.tap('clean');
      for (let i = 0; i < 3 && s.hunger < 75; i++) p.want('feed');
      for (let i = 0; i < p.plan.spamThreshold && s.happiness <= 85; i++) p.want('pet');
      if (s.happiness <= 60 && s.energy >= 30) p.want('game');
      if (!s.isSleeping && s.energy <= 45) p.tap('sleep');
    },
  },
};

function doNoticeAction(p, n, blind) {
  const s = p.s;
  if (n.action === 'sleepBtn') p.tap(s.isSleeping ? 'wake' : 'sleep');
  else if (n.action === 'playBtn') p.want('game');
  else if (n.action === 'playWithBtn' && !blind && s.affectionStreak >= p.plan.spamThreshold) p.want('game');
  else if (NOTICE_ACTION[n.action] === 'medicine' || NOTICE_ACTION[n.action] === 'clean') p.tap(NOTICE_ACTION[n.action]);
  else p.want(NOTICE_ACTION[n.action]);
}
function followNotice(p, delay, blind) {
  const n = p.notice();
  if (!n || !n.action) { p.noticeSince = -1; return; }
  if (p.noticeSince < 0) { p.noticeSince = p.t; return; }
  if (p.t - p.noticeSince < delay) return;
  doNoticeAction(p, n, blind);
  p.noticeSince = p.t - 6;
}

// ---------- 1生涯 ----------
function newPlayer(h, s, plan, r, CS) {
  const fixtureGame = { id: 'care-pace-probe', start(container) { container.innerHTML = '<div></div>'; } };
  const taps = { feed: 0, clean: 0, pet: 0, sleep: 0, wake: 0, medicine: 0, game: 0, court: 0 };
  const p = {
    s, r, plan, t: 0, lastGameT: -999, noticeSince: -1, taps, tapTicks: [], session: null,
    sleep: { blockedWants: 0, extraWakeTaps: 0, wokenByAction: 0, playerWakes: 0 },
    annoyed: 0, relTaps: 0,
    count(kind) { taps[kind]++; p.tapTicks.push(p.t); if (p.session) { p.session.n++; p.session.kinds.add(kind); } },
    tap(kind) {
      if (kind === 'clean' && s.poopCount === 0) return;
      if (kind === 'wake' && !s.isSleeping) return;
      if (kind === 'sleep' && s.isSleeping) return;
      if (kind === 'wake') p.sleep.playerWakes++;
      h.dispatch(h.get(BUTTONS[kind]), 'click');
      p.count(kind);
    },
    // したい こと(ごはん・じゃれる・あそぶ)。寝ていたら 案に よって あつかいが ちがう。
    want(kind) {
      if (s.stage !== 'growing') return;
      if (s.isSleeping) {
        p.sleep.blockedWants++;
        if (plan.wakeOnAction && (kind !== 'game' || s.energy >= 30)) {
          p.sleep.wokenByAction++;
          if (kind === 'game') h.dispatch(h.get('sleepBtn'), 'click'); // tryStartPlay の 中で 起きるのと 同じ(押すのは 1回)
        } else {
          // 現行・B: まず「おきる」を 押さないと できない(余分な 1タップ)
          p.sleep.extraWakeTaps++;
          p.tap('wake');
        }
      }
      if (kind === 'game') return p.game();
      if (kind === 'pet' && s.affectionStreak >= plan.spamThreshold) p.annoyed++;
      h.dispatch(h.get(BUTTONS[kind]), 'click');
      p.count(kind);
    },
    game() {
      if (s.isSleeping || s.energy < 10) return;
      h.api.startMinigame(fixtureGame);
      h.api.finishMinigame(minigameScore(r));
      p.count('game'); p.lastGameT = p.t;
    },
    notice() { return CS.assess(s, { immortal: false, petAvailable: true }); },
  };
  return p;
}

// opts: { companions: 人数, partner: true/false, equip: アイテムid }
function setupRelations(h, s, opts) {
  if (!opts) return;
  const a = h.api;
  if (opts.companions) s.companions = [...a.normalCompanions, ...(a.rareCompanions || [])].slice(0, opts.companions).map(c => ({ id: c.id, bond: 100 }));
  if (opts.partner) {
    const cand = a.REGIONS.find(r => r.id === 'forest').candidates.find(c => c.attractedTo && c.attractedTo.length >= 2);
    Object.assign(s, { gender: 'female', orientationId: 'bi', attractedTo: ['female', 'male', 'nonbinary'] });
    s.partner = { id: cand.id, label: cand.label, emoji: cand.emoji, gender: cand.gender, orientationId: cand.orientationId,
      attractedTo: [...cand.attractedTo], affinityHeart: cand.affinityHeart, affection: 100, married: false, bondCount: 0 };
  }
  if (opts.equip) { s.lifetime.equippedItemId = opts.equip; }
}
const OPT_PRESETS = {
  base: {}, c4p: { companions: 4, partner: true }, c12p: { companions: 12, partner: true }, c26p: { companions: 26, partner: true },
};
function presetOpts(key) {
  const out = {};
  for (const part of String(key || 'base').split('+')) {
    if (OPT_PRESETS[part]) Object.assign(out, OPT_PRESETS[part]);
    else if (part.startsWith('item-')) out.equip = part.slice(5);
  }
  return out;
}

function runLife(H, CS, planId, personaId, seed, opts) {
  const plan = PLANS[planId];
  const persona = PERSONAS[personaId];
  const h = H.harness({ deterministic: true, seed, environment: { time: 'day', weather: 'cloudy' } });
  const s = h.api.state();
  Object.assign(s, {
    stage: 'growing', speciesLine: 'dog', stageIndex: 0, ageTicks: 0,
    sodachi: 20, maxSodachi: 20, growth: 0, decline: 0, deathMeter: 0,
    hunger: 90, happiness: 90, energy: 90, health: 100, poopCount: 0,
    isSick: false, isSleeping: false, companions: [], partner: null,
  });
  setupRelations(h, s, opts);
  h.api.scheduleEnvironmentMoment();
  const r = rng(seed * 7919 + 17);
  const p = newPlayer(h, s, plan, r, CS);
  const startCompanions = s.companions.length, hadPartner = !!s.partner;
  const sessions = [];
  let lastNoticeKind = null;
  const notices = { appear: 0, warnAppear: 0, ticks: 0, kinds: {} };
  const m = { ticks: 0, free: 0, stretches: [], overlap2: 0, sick: 0, sicknesses: 0, sleepTicks: 0,
    sleeps: 0, sleepLens: [], awakeLens: [], autoWakes: 0, dyingEpisodes: 0, dyingSurvived: 0,
    firstCriticalT: null, dyingT: null, deathLeadCritical: null, deathLeadDying: null };
  let stretch = 0, wasSick = false, wasSleeping = false, sleepStart = 0, wakeAt = 0, wasDying = false;
  let nextCheck = persona.gap(r);
  for (let t = 0; t < LIFE_TICKS; t++) {
    p.t = t;
    if (s.stage !== 'growing') break;
    const n = p.notice();
    const warn = n && (n.severity === 'warning' || n.severity === 'critical');
    if (n && n.severity === 'critical' && m.firstCriticalT == null) m.firstCriticalT = t;
    if (n && n.severity !== 'critical' && !s.dying) m.firstCriticalT = null; // 危機が おさまったら 計りなおす
    // おしらせに 気づいて 見に来る 時刻は、出た ときに 1回だけ きめる(毎tick 引きなおさない)
    if (persona.reactsToWarnings && warn) { if (p.warnAt == null) p.warnAt = t + (persona.warnDelay ? persona.warnDelay(r) : 5 + Math.floor(r() * 6)); nextCheck = Math.min(nextCheck, p.warnAt); }
    else if (persona.reactsToCritical && n && n.severity === 'critical') { if (p.warnAt == null) p.warnAt = t + 10 + Math.floor(r() * 10); nextCheck = Math.min(nextCheck, p.warnAt); }
    else p.warnAt = null;
    if (t >= nextCheck) {
      p.session = { n: 0, kinds: new Set() };
      persona.act(p);
      if (p.session.n) sessions.push({ t, n: p.session.n, kinds: p.session.kinds.size });
      p.session = null;
      nextCheck = t + persona.gap(r);
      p.warnAt = null;
    }
    const sleepingBefore = s.isSleeping;
    step(h, s);
    if (sleepingBefore && !s.isSleeping) m.autoWakes++;
    // ---- 計測 ----
    m.ticks++;
    { const nn = p.notice(); const kind = nn && nn.kind !== 'sleep' ? nn.kind + ':' + nn.severity : null;
      if (kind) { notices.ticks++; if (kind !== lastNoticeKind) { notices.appear++; notices.kinds[nn.kind] = (notices.kinds[nn.kind] || 0) + 1; if (nn.severity !== 'info') notices.warnAppear++; } }
      lastNoticeKind = kind; }
    const needs = needCount(s, plan);
    if (needs === 0) { m.free++; stretch++; } else { if (stretch) m.stretches.push(stretch); stretch = 0; }
    if (needs >= 2) m.overlap2++;
    if (s.isSick) { m.sick++; if (!wasSick) m.sicknesses++; }
    wasSick = s.isSick;
    if (s.isSleeping) m.sleepTicks++;
    if (s.isSleeping && !wasSleeping) { m.sleeps++; sleepStart = t; if (m.sleeps > 1 || wakeAt) m.awakeLens.push(t - wakeAt); }
    if (!s.isSleeping && wasSleeping) { m.sleepLens.push(t - sleepStart); wakeAt = t; }
    wasSleeping = s.isSleeping;
    if (s.dying && !wasDying) { m.dyingEpisodes++; m.dyingT = t; }
    if (!s.dying && wasDying && s.stage === 'growing') m.dyingSurvived++;
    wasDying = !!s.dying;
  }
  // 起きかたの 内訳: 自然に 起きた(自動) = 睡眠の おわり − プレイヤーが 起こした − 操作で 起きた
  const wakes = m.sleepLens.length;
  const died = s.stage === 'dead';
  if (died) {
    if (m.firstCriticalT != null) m.deathLeadCritical = (m.ticks - m.firstCriticalT) * 3;
    if (m.dyingT != null) m.deathLeadDying = (m.ticks - m.dyingT) * 3;
    else m.deathLeadDying = 0;
  }
  if (stretch) m.stretches.push(stretch);
  const reachedEnd = s.stage === 'farewell' || Math.floor(s.ageTicks / 20) >= 100;
  const rel = { departures: startCompanions - s.companions.length, breakup: hadPartner && !s.partner ? 1 : 0, relTaps: p.relTaps, companionsLeft: s.companions.length,
    minBond: s.companions.length ? Math.min(...s.companions.map(c => c.bond ?? 100)) : null, partnerAffection: s.partner ? s.partner.affection : null, married: !!(s.partner && s.partner.married) };
  return { taps: p.taps, tapTicks: p.tapTicks, sessions, m, notices, rel, sleep: { ...p.sleep, wakes }, annoyed: p.annoyed,
    died, deathAge: died ? Math.floor(s.ageTicks / 20) : null, maxSodachi: s.maxSodachi, clear: reachedEnd && s.maxSodachi >= 70 };
}

// ---------- 集計 ----------
const mean = a => a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0;
const pct = (a, q) => { if (!a.length) return null; const b = [...a].sort((x, y) => x - y); return b[Math.min(b.length - 1, Math.floor(q * (b.length - 1)))]; };
const dist = a => ({ mean: +mean(a).toFixed(2), p10: pct(a, 0.1), p50: pct(a, 0.5), p90: pct(a, 0.9), max: a.length ? Math.max(...a) : null });
function maxInWindow(ticks, w) { let best = 0, j = 0; for (let i = 0; i < ticks.length; i++) { while (ticks[i] - ticks[j] >= w) j++; best = Math.max(best, i - j + 1); } return best; }

function summarize(lives) {
  const care = l => Object.entries(l.taps).filter(([k]) => k !== 'game').reduce((a, [, v]) => a + v, 0);
  const per10 = (l, v) => +(v / (l.m.ticks / 200)).toFixed(2);
  const kinds = {};
  for (const k of ['feed', 'clean', 'pet', 'sleep', 'wake', 'medicine', 'game']) kinds[k] = +mean(lives.map(l => l.taps[k] * 2000 / l.m.ticks)).toFixed(1);
  const sleepLens = lives.flatMap(l => l.m.sleepLens.map(x => x * 3));
  const awakeLens = lives.flatMap(l => l.m.awakeLens.map(x => x * 3 / 60));
  const deaths = lives.filter(l => l.died);
  return {
    lives: lives.length,
    carePer10: dist(lives.map(l => per10(l, care(l)))),
    careLife: dist(lives.map(l => Math.round(care(l) * 2000 / l.m.ticks))),
    kindsPerLife: kinds,
    max1min: dist(lives.map(l => maxInWindow(l.tapTicks, 20))),
    max5min: dist(lives.map(l => maxInWindow(l.tapTicks, 100))),
    burstsPerLife: dist(lives.map(l => l.sessions.filter(x => x.n >= 5 || x.kinds >= 3).length)),
    freeShare: dist(lives.map(l => Math.round(100 * l.m.free / l.m.ticks))),
    freeStretchMin: dist(lives.flatMap(l => l.m.stretches.map(x => +(x / 20).toFixed(2)))),
    overlap2Share: dist(lives.map(l => Math.round(100 * l.m.overlap2 / l.m.ticks))),
    sicknesses: dist(lives.map(l => l.m.sicknesses)),
    sleep: {
      perLife: dist(lives.map(l => Math.round(l.m.sleeps * 2000 / l.m.ticks))),
      lengthSec: dist(sleepLens),
      awakeBetweenMin: dist(awakeLens),
      sleepShare: +mean(lives.map(l => 100 * l.m.sleepTicks / l.m.ticks)).toFixed(1),
      blockedWantsPerLife: +mean(lives.map(l => l.sleep.blockedWants)).toFixed(1),
      extraWakeTapsPerLife: +mean(lives.map(l => l.sleep.extraWakeTaps)).toFixed(1),
      wokenByActionPerLife: +mean(lives.map(l => l.sleep.wokenByAction)).toFixed(1),
      playerWakesPerLife: +mean(lives.map(l => l.sleep.playerWakes)).toFixed(1),
      autoWakesPerLife: +mean(lives.map(l => l.m.autoWakes)).toFixed(1),
    },
    annoyedPerLife: +mean(lives.map(l => l.annoyed)).toFixed(1),
    noticesPer10: dist(lives.map(l => +(l.notices.appear / (l.m.ticks / 200)).toFixed(2))),
    warnNoticesPer10: dist(lives.map(l => +(l.notices.warnAppear / (l.m.ticks / 200)).toFixed(2))),
    noticeShare: dist(lives.map(l => Math.round(100 * l.notices.ticks / l.m.ticks))),
    noticeKinds: (() => { const o = {}; for (const l of lives) for (const [k, v] of Object.entries(l.notices.kinds)) o[k] = (o[k] || 0) + v; for (const k in o) o[k] = +(o[k] / lives.length).toFixed(1); return o; })(),
    relation: {
      departures: dist(lives.map(l => l.rel.departures)), breakupRate: +mean(lives.map(l => l.rel.breakup)).toFixed(2),
      relTaps: +mean(lives.map(l => l.rel.relTaps)).toFixed(1), courtPerLife: +mean(lives.map(l => l.taps.court || 0)).toFixed(1),
      marriedRate: +mean(lives.map(l => l.rel.married ? 1 : 0)).toFixed(2),
    },
    tapsPerLifeAll: +mean(lives.map(l => Object.values(l.taps).reduce((a, b) => a + b, 0) * 2000 / l.m.ticks)).toFixed(1),
    deathRate: +(deaths.length / lives.length).toFixed(3),
    deathLeadDyingSec: dist(deaths.map(l => l.m.deathLeadDying)),
    deathLeadCriticalSec: dist(deaths.filter(l => l.m.deathLeadCritical != null).map(l => l.m.deathLeadCritical)),
    dyingEpisodesPerLife: +mean(lives.map(l => l.m.dyingEpisodes)).toFixed(2),
    dyingSurvivedShare: (() => { const e = lives.reduce((a, l) => a + l.m.dyingEpisodes, 0); return e ? +(lives.reduce((a, l) => a + l.m.dyingSurvived, 0) / e).toFixed(2) : null; })(),
    sodachi: dist(lives.map(l => l.maxSodachi)),
    clearRate: +mean(lives.map(l => l.clear ? 1 : 0)).toFixed(2),
  };
}

// ---------- 放置: 健康な 状態から 5・10・15分 ----------
function runIdleSnapshots(H, CS, planId, seed, start) {
  const plan = PLANS[planId];
  const h = H.harness({ deterministic: true, seed, environment: { time: 'day', weather: 'cloudy' } });
  const s = h.api.state();
  Object.assign(s, { stage: 'growing', speciesLine: 'dog', stageIndex: 2, ageTicks: 200, sodachi: 40, maxSodachi: 40, growth: 0, decline: 0, deathMeter: 0,
    isSick: false, isSleeping: false, companions: [], partner: null, health: 100, ...start });
  h.api.scheduleEnvironmentMoment();
  const snaps = {};
  for (let t = 1; t <= 400; t++) {
    step(h, s);
    if (t % 100 === 0) {
      const n = CS.assess(s, {});
      snaps[t / 20] = { hunger: s.hunger, happiness: s.happiness, energy: s.energy, poop: s.poopCount, sick: s.isSick ? 1 : 0, health: s.health,
        signals: needCount(s, plan), warning: n && (n.severity === 'warning' || n.severity === 'critical') ? 1 : 0, dead: s.stage === 'dead' ? 1 : 0 };
    }
    if (s.stage !== 'growing') { for (const k of [5, 10, 15, 20]) if (!snaps[k]) snaps[k] = { hunger: 0, happiness: 0, energy: 0, poop: 4, sick: 1, health: 0, signals: 5, warning: 1, dead: 1 }; break; }
  }
  return snaps;
}
function summarizeIdle(rows) {
  const out = {};
  for (const k of [5, 10, 15, 20]) {
    const g = f => rows.map(r => r[k][f]);
    out[k] = {
      hunger: dist(g('hunger')), happiness: dist(g('happiness')), energy: dist(g('energy')), health: dist(g('health')),
      poop: dist(g('poop')), sickShare: +mean(g('sick')).toFixed(3), anySignalShare: +mean(g('signals').map(x => x > 0 ? 1 : 0)).toFixed(3),
      warningShare: +mean(g('warning')).toFixed(3), deadShare: +mean(g('dead')).toFixed(3),
    };
  }
  return out;
}

// ---------- 救出: 命の 危機に 気づくのが おくれた とき ----------
// ふつうの 状態から 放置して、はじめて 赤い(critical)おしらせが 出た 時点から delay tick 後に、
// おしらせの おすすめに 12秒ごとに 従う。10分後に 生きていて 危機を 脱して いれば 救出成功。
function runRescue(H, CS, planId, seed, delay) {
  const plan = PLANS[planId];
  const h = H.harness({ deterministic: true, seed, environment: { time: 'day', weather: 'cloudy' } });
  const s = h.api.state();
  Object.assign(s, { stage: 'growing', speciesLine: 'dog', stageIndex: 2, ageTicks: 200, sodachi: 40, maxSodachi: 40, growth: 0, decline: 0, deathMeter: 0,
    hunger: 70, happiness: 70, energy: 70, health: 100, poopCount: 1, isSick: false, isSleeping: false, companions: [], partner: null });
  h.api.scheduleEnvironmentMoment();
  const r = rng(seed * 31 + 7);
  const p = newPlayer(h, s, plan, r, CS);
  let critT = null, dyingSeen = false, dyingLeadSec = null;
  for (let t = 0; t < 2400; t++) {
    p.t = t;
    if (s.stage !== 'growing') break;
    const n = p.notice();
    if (critT == null && n && n.severity === 'critical') critT = t;
    if (s.dying && !dyingSeen) dyingSeen = true;
    if (critT != null && t >= critT + delay && t % 4 === 0) {
      const n2 = p.notice();
      if (n2 && n2.action) doNoticeAction(p, n2, false);
      else if (!s.isSleeping && s.hunger < 60) p.want('feed');
    }
    step(h, s);
    if (critT != null && t >= critT + delay + 200) break;
  }
  const dead = s.stage === 'dead';
  return { reachedCritical: critT != null, dead, survived: critT != null && !dead, stillDying: !!s.dying, dyingSeen };
}

// 仮想環境(harness)を たくさん つくると メモリが ふくらむ ので、仕事を 小分けにして 子プロセスで 順に うごかす。
//   --job life:<persona>:<from>:<count> / idle:<full|typical>:<from>:<count> / rescue:<delay>:<from>:<count>
// 放置の 出発点(VERSION 3 で 定義を 明確に した)
const IDLE_STATES = {
  full: { hunger: 100, happiness: 100, energy: 100, poopCount: 0, health: 100 },
  healthy: { hunger: 90, happiness: 90, energy: 90, poopCount: 0, health: 100 },   // 健康: お世話した 直後
  normal: { hunger: 70, happiness: 70, energy: 70, poopCount: 1, health: 100 },    // 普通: 少し 間が あいた ところ
  typical: { hunger: 70, happiness: 70, energy: 70, poopCount: 1, health: 100 },
  bad: { hunger: 45, happiness: 45, energy: 45, poopCount: 2, health: 80 },        // やや悪い: 黄色の サインが 出ている ところ
};
function runJob(planId, job) {
  const H = V1.loadHarnessModule(planId);
  const CS = V1.loadCareStatus(planId);
  const [kind, a, from, count, optKey] = job.split(':');
  const rows = [];
  for (let i = Number(from); i < Number(from) + Number(count); i++) {
    if (kind === 'life') rows.push(runLife(H, CS, planId, a, 1000 + i, presetOpts(optKey)));
    else if (kind === 'idle') rows.push(runIdleSnapshots(H, CS, planId, 7000 + i, IDLE_STATES[a]));
    else if (kind === 'rescue') rows.push(runRescue(H, CS, planId, 9000 + i, Number(a)));
  }
  return rows;
}
function spawnJob(planId, job, override) {
  const { execFileSync } = require('node:child_process');
  const os = require('node:os');
  const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'care-pace-')), 'job.json');
  execFileSync(process.execPath, ['--max-old-space-size=2500', __filename, '--plan', planId, '--job', job, '--jobout', file, ...(override ? ['--override', JSON.stringify(override)] : [])], { stdio: ['ignore', 'ignore', 'inherit'] });
  const rows = JSON.parse(fs.readFileSync(file, 'utf8'));
  fs.rmSync(path.dirname(file), { recursive: true, force: true });
  return rows;
}

if (require.main === module) {
  const planId = arg('plan', 'B2');
  if (arg('override', null)) Object.assign(PLANS[planId], JSON.parse(arg('override')));
  if (arg('job', null)) { fs.writeFileSync(arg('jobout'), JSON.stringify(runJob(planId, arg('job')))); return; }
  const lives = Number(arg('lives', 50));
  const outFile = arg('out', null);
  const only = arg('personas', null);
  const t0 = Date.now();
  const chunk = 25;
  const collect = (prefix, total) => { const rows = []; for (let f = 0; f < total; f += chunk) rows.push(...spawnJob(planId, `${prefix}:${f}:${Math.min(chunk, total - f)}`)); return rows; };
  const personas = {};
  for (const id of (only ? only.split(',') : Object.keys(PERSONAS))) {
    personas[id] = { label: PERSONAS[id].label, ...summarize(collect(`life:${id}`, lives)) };
    process.stderr.write(`${planId} ${id} ${((Date.now() - t0) / 1000).toFixed(0)}s\n`);
  }
  const idle = {};
  for (const key of ['full', 'typical']) idle[key] = summarizeIdle(collect(`idle:${key}`, 300));
  const rescue = {};
  for (const delay of [10, 20, 40, 60]) {
    const rows = collect(`rescue:${delay}`, 80);
    const reached = rows.filter(x => x.reachedCritical);
    rescue[delay * 3 + 's'] = { runs: rows.length, reachedCritical: reached.length, survived: +(reached.filter(x => x.survived).length / Math.max(1, reached.length)).toFixed(2), dyingShown: +(reached.filter(x => x.dyingSeen).length / Math.max(1, reached.length)).toFixed(2) };
  }
  const result = { plan: planId, personas, idle, rescue, seconds: (Date.now() - t0) / 1000 };
  const json = JSON.stringify(result, null, 1);
  if (outFile) fs.writeFileSync(outFile, json); else console.log(json);
}

module.exports = { PERSONAS, runLife, summarize, summarizeIdle, runIdleSnapshots, runRescue, spawnJob, IDLE_STATES, newPlayer, setupRelations, presetOpts };
