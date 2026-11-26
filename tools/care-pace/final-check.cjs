'use strict';
// お世話の頻度 VERSION 3 正式採用前の 最終確認: おしらせ(種類別)・危険なのに おしらせが ない 時間・
// キャラクターの せりふ・できごと・メッセージの 表示回数を、現行と V3 で くらべる。
//   node tools/care-pace/final-check.cjs <plan> <persona> <opts> <lives> <out.json>
const fs = require('node:fs');
const V1 = require('./simulate.cjs');
const V2 = require('./simulate-v2.cjs');
const { PLANS } = require('./plans.cjs');
const [plan, persona, optKey, n, out] = process.argv.slice(2);
const H = V1.loadHarnessModule(plan), CS = V1.loadCareStatus(plan);
const rows = [];
for (let i = 0; i < Number(n); i++) {
  const seed = 1000 + i;
  const h = H.harness({ deterministic: true, seed, environment: { time: 'day', weather: 'cloudy' } });
  const s = h.api.state();
  Object.assign(s, { stage: 'growing', speciesLine: 'dog', stageIndex: 0, ageTicks: 0, sodachi: 20, maxSodachi: 20, growth: 0, decline: 0, deathMeter: 0,
    hunger: 90, happiness: 90, energy: 90, health: 100, poopCount: 0, isSick: false, isSleeping: false, companions: [], partner: null });
  V2.setupRelations(h, s, V2.presetOpts(optKey));
  h.api.scheduleEnvironmentMoment(); h.api.scheduleIdleGreeting && h.api.scheduleIdleGreeting(); h.api.scheduleCompanionEncounter && h.api.scheduleCompanionEncounter();
  const r = V1.rng(seed * 7919 + 17);
  const p = V2.newPlayer(h, s, PLANS[plan], r, CS);
  const P = V2.PERSONAS[persona];
  const row = { ticks: 0, kinds: {}, notices: 0, dangerTicks: 0, dangerNoNotice: 0, dangerNoNoticeKinds: {}, speech: 0, story: 0, message: 0, died: false, sickTicks: 0, dyingTicks: 0, dyingNoNotice: 0 };
  let last = null, sp = '', st = '', ms = '', nextCheck = P.gap(r);
  for (let t = 0; t < 2000 && s.stage === 'growing'; t++) {
    p.t = t;
    const n0 = p.notice();
    if (n0 && (n0.severity === 'warning' || n0.severity === 'critical') && P.reactsToWarnings) { if (p.warnAt == null) p.warnAt = t + 5 + Math.floor(r() * 6); nextCheck = Math.min(nextCheck, p.warnAt); } else p.warnAt = null;
    if (t >= nextCheck) { p.session = { n: 0, kinds: new Set() }; P.act(p); p.session = null; nextCheck = t + P.gap(r); p.warnAt = null; }
    V1.step(h, s);
    row.ticks++;
    const nn = p.notice();
    const kind = nn && nn.kind !== 'sleep' ? nn.kind + ':' + nn.severity : null;
    if (kind && kind !== last) { row.notices++; row.kinds[kind] = (row.kinds[kind] || 0) + 1; }
    last = kind;
    // 命や 体調に かかわる 危険な 状態(おしらせが 出るべき)
    const danger = s.isSick ? 'sick' : s.dying ? 'dying' : s.health <= 25 ? 'health' : s.deathMeter >= 60 ? 'life' : s.hunger <= 25 && !s.isSleeping ? 'hunger' : null;
    if (danger) { row.dangerTicks++; if (!nn || nn.kind === 'sleep') { row.dangerNoNotice++; row.dangerNoNoticeKinds[danger] = (row.dangerNoNoticeKinds[danger] || 0) + 1; } }
    if (s.isSick) row.sickTicks++;
    if (s.dying) { row.dyingTicks++; if (!nn || nn.severity !== 'critical') row.dyingNoNotice++; }
    const sp2 = h.get('speechText').textContent || '', st2 = h.get('storyFlashText').textContent || '', ms2 = h.get('message').textContent || '';
    if (sp2 && sp2 !== sp) row.speech++; if (st2 && st2 !== st) row.story++; if (ms2 && ms2 !== ms) row.message++;
    sp = sp2; st = st2; ms = ms2;
  }
  row.died = s.stage === 'dead';
  rows.push(row);
}
fs.writeFileSync(out, JSON.stringify(rows));
