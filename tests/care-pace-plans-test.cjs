'use strict';
// お世話の頻度 監査(2026-11-25)の 案の差し替えが、いまの本体に ちょうど当たることを たしかめる。
// 本体が変わって 差し替えが 外れたら ここで 気づける(試遊ページは 黙って現行で動かない)。
const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const { PLAN_IDS, PLANS, scriptPatches, careStatusPatches, applyPatches } = require('../tools/care-pace/plans.cjs');

const script = fs.readFileSync('script.js', 'utf8');
const careStatus = fs.readFileSync('care-status.js', 'utf8');

test('every plan patches script.js and care-status.js exactly once per anchor', () => {
  for (const id of PLAN_IDS) {
    const s = applyPatches(script, scriptPatches(id), id);
    const c = applyPatches(careStatus, careStatusPatches(id), id);
    assert.doesNotThrow(() => new Function(s), id + ' script.js parses');
    assert.doesNotThrow(() => new Function(c), id + ' care-status.js parses');
  }
  assert.equal(scriptPatches('current').length, 0, 'current is the untouched main');
});

test('the patched values are the ones in the plan table', () => {
  const b = applyPatches(script, scriptPatches('B'), 'B');
  assert.ok(b.includes(`state.hunger = clamp(state.hunger - ${PLANS.B.hungerDecay} * sleepFactor`));
  assert.ok(b.includes(`const AFFECTION_SPAM_THRESHOLD = ${PLANS.B.spamThreshold};`));
  assert.ok(b.includes('state.poopTimer'));
  assert.ok(!b.includes('if (Math.random() < 0.035 && state.poopCount < MAX_POOP) {'));
});

test('the recommended care switches away from じゃれる once it would annoy the pet', () => {
  const sandbox = { module: { exports: {} } };
  require('node:vm').runInNewContext(applyPatches(careStatus, careStatusPatches('B'), 'B'), sandbox);
  const cs = sandbox.module.exports;
  const base = { stage: 'growing', hunger: 80, happiness: 20, energy: 80, health: 100, poopCount: 0 };
  assert.equal(cs.assess({ ...base, affectionStreak: 0 }).action, 'playWithBtn');
  assert.equal(cs.assess({ ...base, affectionStreak: PLANS.B.spamThreshold }).action, 'playBtn');
});

test('the generated play page is in sync with index.html', () => {
  const { build } = require('../tools/care-pace/build-play.cjs');
  assert.equal(fs.readFileSync('comparisons/care-pace-20261125/play.html', 'utf8'), build());
});

// ---- VERSION 2(B2案)の ふるまい: 本物の script.js に B2 の 差し替えを 当てて たしかめる ----
function b2Harness() {
  const { loadHarnessModule } = require('../tools/care-pace/simulate.cjs');
  const H = loadHarnessModule('B2');
  const h = H.harness({ deterministic: true, seed: 7 });
  const s = h.api.state();
  Object.assign(s, { stage: 'growing', speciesLine: 'dog', stageIndex: 2, ageTicks: 200, hunger: 50, happiness: 50, energy: 50, health: 100,
    poopCount: 0, isSick: false, isSleeping: false, deathMeter: 0, companions: [], partner: null });
  return { h, s };
}

test('B2: pressing ごはん while asleep wakes the pet and feeds it in one tap', () => {
  const { h, s } = b2Harness();
  h.dispatch(h.get('sleepBtn'), 'click');
  assert.equal(s.isSleeping, true);
  h.dispatch(h.get('feedBtn'), 'click');
  assert.equal(s.isSleeping, false);
  assert.equal(s.hunger, 50 + PLANS.B2.feedAmount);
});

test('B2: over-petting never lowers happiness, and the streak calms down with time', () => {
  const { h, s } = b2Harness();
  for (let i = 0; i < PLANS.B2.spamThreshold; i++) h.dispatch(h.get('playWithBtn'), 'click');
  const before = s.happiness;
  h.dispatch(h.get('playWithBtn'), 'click');
  assert.equal(s.happiness, before, 'the annoyed tap does not cost happiness');
  for (let i = 0; i < PLANS.B2.affectionCalmTicks * (PLANS.B2.spamThreshold + 1); i++) h.api.tick();
  assert.equal(s.affectionStreak, 0);
});

test('B2: a pet whose health stays at 0 always gets the farewell warning and its grace before dying', () => {
  const { h, s } = b2Harness();
  Object.assign(s, { hunger: 0, happiness: 0, energy: 0, health: 0, isSick: true, totalSicknessCount: 9 });
  let firstDying = null, deadAt = null;
  for (let t = 0; t < 400 && s.stage === 'growing'; t++) { h.api.tick(); if (s.dying && firstDying == null) firstDying = t; if (s.stage === 'dead') deadAt = t; }
  assert.ok(firstDying != null, 'the warning appears');
  // 同じ tick で まえぶれが 出て 1 へるので、猶予 − 1 tick 以上(3分)
  assert.ok(deadAt == null || deadAt - firstDying >= PLANS.B2.dyingGraceTicks - 1, 'death waits for the full grace: ' + (deadAt - firstDying));
});

test('B2: while the player keeps caring, the warning grace does not run out (before old age)', () => {
  const { h, s } = b2Harness();
  Object.assign(s, { hunger: 0, happiness: 0, energy: 0, health: 0, isSick: true, totalSicknessCount: 9 });
  // まえぶれが 出てから 1分後に 気づき、12秒ごとに ゲームの すすめる お世話を する(くすり・ごはん・じゃれる・ねる)
  const recovery = (h, s) => h.advance(3000) || (s.isSleeping && s.energy < 100 && Array.from({ length: 30 }, () => h.api.recoverSleepStep()));
  for (let t = 0; t < 600 && s.stage === 'growing'; t++) {
    if (t > 20 && t % 4 === 0) {
      if (s.isSick) h.dispatch(h.get('medicineBtn'), 'click');
      else if (s.hunger < 60) h.dispatch(h.get('feedBtn'), 'click');
      else if (!s.isSleeping && s.energy < 60) h.dispatch(h.get('sleepBtn'), 'click');
      else if (s.happiness < 60) h.dispatch(h.get('playWithBtn'), 'click');
    }
    h.api.tick();
    recovery(h, s);
  }
  assert.equal(s.stage, 'growing');
  assert.equal(s.dying, false, 'the warning clears once the pet has recovered');
});
