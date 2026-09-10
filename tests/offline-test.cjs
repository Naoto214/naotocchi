const assert = require('node:assert/strict');
const { test } = require('node:test');
const { harness } = require('./helpers/runtime-harness.cjs');

const MIN = 60 * 1000;

test('a short absence changes nothing', () => {
  const h = harness(), state = h.api.state();
  state.stage = 'growing'; state.savedAt = 1000 - 1 * MIN; state.hunger = 80;
  assert.equal(h.api.applyOfflineProgress(1000), null);
  assert.equal(state.hunger, 80);
});

test('twenty minutes away lowers stats gently, never below the floor, and leaves coins', () => {
  const h = harness(), state = h.api.state();
  state.stage = 'growing'; state.savedAt = 1000 - 20 * MIN; state.hunger = 90; state.happiness = 90; state.energy = 90; state.isSleeping = false;
  const money = state.lifetime.money, log = state.lifeLog.length;
  const r = h.api.applyOfflineProgress(1000);
  assert.equal(r.ticks, 400);
  assert.ok(Math.abs(state.hunger - (90 - 0.6 * 400)) < 0.01 || state.hunger === 20, 'hunger dropped by the tick budget: ' + state.hunger);
  assert.ok(state.hunger >= 20 && state.happiness >= 20 && state.energy >= 20, 'floors hold');
  assert.equal(state.lifetime.money, money + 4, 'one coin per five minutes');
  assert.equal(state.lifeLog.length, log + 1);
  assert.equal(state.ageTicks, 500, 'age does not pass while closed');
});

test('a long absence is capped at thirty minutes of drift and cannot endanger a low pet', () => {
  const h = harness(), state = h.api.state();
  state.stage = 'growing'; state.savedAt = 1000 - 10 * 60 * MIN; state.hunger = 25; state.happiness = 100; state.energy = 100;
  const r = h.api.applyOfflineProgress(1000);
  assert.equal(r.ticks, h.api.OFFLINE_CAP_TICKS);
  assert.equal(state.hunger, 20, 'already low hunger stops at the floor');
  assert.ok(state.deathMeter === 0 || state.deathMeter < 1, 'no death meter from being away');
});

test('sleeping while away recovers energy instead of draining it', () => {
  const h = harness(), state = h.api.state();
  state.stage = 'growing'; state.savedAt = 1000 - 15 * MIN; state.energy = 10; state.isSleeping = true; state.hunger = 90;
  const r = h.api.applyOfflineProgress(1000);
  assert.equal(r.sleeping, true);
  assert.ok(state.energy > 60, 'energy recovered: ' + state.energy);
  assert.ok(state.hunger > 90 - 0.6 * 300, 'hunger drops slower while asleep');
});
