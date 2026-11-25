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
