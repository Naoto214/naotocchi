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

test('ten minutes away lowers stats gently and leaves coins', () => {
  const h = harness(), state = h.api.state();
  state.stage = 'growing'; state.savedAt = 1000 - 10 * MIN; state.hunger = 100; state.happiness = 100; state.energy = 100; state.isSleeping = false;
  const money = state.lifetime.money, log = state.lifeLog.length;
  const r = h.api.applyOfflineProgress(1000);
  assert.equal(r.ticks, 200);
  assert.ok(Math.abs(state.hunger - 70) < 0.01, 'hunger drops 0.25 per tick but at most 30 per absence: ' + state.hunger);
  assert.equal(state.energy, 100, 'energy never drops while away');
  assert.equal(state.lifetime.money, money + 2, 'one coin per five minutes');
  assert.equal(state.lifeLog.length, log + 1);
  assert.equal(state.ageTicks, 500, 'age does not pass while closed');
});

test('stats never drop below the floor even when the drift exceeds them', () => {
  const h = harness(), state = h.api.state();
  state.stage = 'growing'; state.savedAt = 1000 - 25 * MIN; state.hunger = 90; state.happiness = 30; state.energy = 90;
  h.api.applyOfflineProgress(1000);
  assert.equal(state.hunger, 60, 'one absence drops a stat by at most 30'); assert.equal(state.happiness, 20, 'and never below the floor');
});

test('a long absence is capped at thirty minutes of drift and cannot endanger a low pet', () => {
  const h = harness(), state = h.api.state();
  state.stage = 'growing'; state.savedAt = 1000 - 10 * 60 * MIN; state.hunger = 25; state.happiness = 100; state.energy = 40;
  const r = h.api.applyOfflineProgress(1000);
  assert.equal(r.ticks, h.api.OFFLINE_CAP_TICKS);
  assert.equal(state.hunger, 20, 'already low hunger stops at the floor');
  assert.ok(state.energy > 40, 'energy recovers a little while resting away: ' + state.energy);
  assert.ok(state.deathMeter === 0 || state.deathMeter < 1, 'no death meter from being away');
});

test('sleeping while away recovers energy instead of draining it', () => {
  const h = harness(), state = h.api.state();
  state.stage = 'growing'; state.savedAt = 1000 - 15 * MIN; state.energy = 10; state.isSleeping = true; state.hunger = 90;
  const r = h.api.applyOfflineProgress(1000);
  assert.equal(r.sleeping, true);
  assert.ok(state.energy > 60, 'energy recovered: ' + state.energy);
  assert.ok(state.hunger > 90 - 0.25 * 300, 'hunger drops slower while asleep');
});
