const assert = require('node:assert/strict');
const { test } = require('node:test');
const { harness } = require('./helpers/runtime-harness.cjs');

// The growth curve must be reachable inside one 100-minute life: about 1,500-1,800
// growth from sodachi 20 to 100 (roughly 60 great minigames plus care).
test('sodachi 20 to 100 costs 1,500-1,800 growth and 20 to 70 costs under 800', () => {
  const h = harness();
  const sum = (from, to) => { let n = 0; for (let v = from; v < to; v++) n += h.api.sodachiCost(v); return n; };
  const toMax = sum(20, h.api.SODACHI_MAX), toClear = sum(20, 70);
  assert.ok(toMax >= 1500 && toMax <= 1800, 'to 100: ' + toMax);
  assert.ok(toClear < 800, 'to 70: ' + toClear);
  assert.ok(h.api.SODACHI_COST_BANDS.every((b, i, a) => i === 0 || b.cost >= a[i - 1].cost), 'costs never decrease');
});

test('sleeping from empty takes roughly 3-12 seconds of recovery steps', () => {
  const h = harness(), state = h.api.state();
  state.energy = 0; state.isSleeping = true;
  let steps = 0;
  while (state.energy < 100 && steps < 5000) { h.api.recoverSleepStep(); steps++; }
  const seconds = steps * 0.1;
  assert.ok(seconds >= 3 && seconds <= 12, 'full recovery took ' + seconds + 's');
});

test('an S-rank result grants a growth boost that doubles growth and decays per tick', () => {
  const h = harness(), state = h.api.state();
  state.stage = 'growing';
  const game = {id: 'boost-probe', start(container, done) { container.innerHTML = '<div></div>'; }};
  h.api.startMinigame(game);
  h.api.finishMinigame(95);
  assert.ok(state.boostTicks >= 40, 'S rank sets boostTicks: ' + state.boostTicks);
  const growthBefore = state.growth, sodachiBefore = state.sodachi;
  h.api.applyGrowth(3);
  const gained = (state.sodachi - sodachiBefore) * h.api.sodachiCost(sodachiBefore) + (state.growth - growthBefore);
  assert.equal(gained, 6, 'growth is doubled while boosted');
  const ticksBefore = state.boostTicks;
  h.api.tick();
  assert.equal(state.boostTicks, ticksBefore - 1, 'the boost runs down one tick at a time');
  assert.equal(h.api.grantGrowthBoost(1000), 200, 'the boost is capped at 10 minutes');
});

test('the short game-length setting only shortens games of 90 seconds or more', () => {
  const h = harness(), state = h.api.state();
  state.lifetime.minigameDifficulty = 'hard';
  state.lifetime.minigameLength = 'normal';
  assert.equal(h.api.mgDuration(60000), 60000);
  assert.equal(h.api.mgDuration(150000), 150000);
  state.lifetime.minigameLength = 'short';
  assert.equal(h.api.mgDuration(60000), 60000, 'short games are untouched');
  assert.equal(h.api.mgDuration(150000), 90000, 'long games run at 60%');
  assert.ok(Object.keys(h.api.GAME_LENGTH_CHOICES).includes('short'));
});

test('life recovers during ordinary care and faster when everything is above 60', () => {
  const h = harness(), state = h.api.state();
  require('node:vm').runInContext('Math.random=()=>0.99', h.sandbox);
  Object.assign(state, {stage: 'growing', speciesLine: 'dog', ageTicks: 600, deathMeter: 50, hunger: 50, happiness: 50, health: 50, energy: 20, isSick: false, decline: 0});
  h.api.tick();
  assert.ok(Math.abs(state.deathMeter - 49.1) < 0.01, 'calm care recovers 0.9: ' + state.deathMeter);
  Object.assign(state, {hunger: 80, happiness: 80, health: 80, energy: 80});
  h.api.tick();
  assert.ok(Math.abs(state.deathMeter - 47.3) < 0.01, 'well cared recovers 1.8: ' + state.deathMeter);
  Object.assign(state, {isSick: true});
  const before = state.deathMeter;
  h.api.tick();
  assert.ok(state.deathMeter >= before, 'no recovery while sick');
});

test('a full transform meter opens the transform choice right after the game, with no lottery', () => {
  const h = harness(), state = h.api.state();
  require('node:vm').runInContext('Math.random=()=>0.999', h.sandbox);
  Object.assign(state, {stage: 'growing', speciesLine: 'dog', ageTicks: 600, transformMeter: 0, transformOptions: null, hunger: 80, happiness: 80, energy: 80, health: 80});
  h.api.render();
  const game = {id: 'transform-probe', start(container, done) { container.innerHTML = '<div></div>'; }};
  for (let i = 0; i < 3; i++) { h.api.startMinigame(game); h.api.finishMinigame(50); }
  assert.equal(state.transformMeter, 75, 'three games fill 75');
  assert.equal(state.transformOptions, null);
  h.api.startMinigame(game); h.api.finishMinigame(50);
  assert.ok(Array.isArray(state.transformOptions) && state.transformOptions.length > 0, 'the fourth game fills the meter and offers a transform');
  assert.equal(state.transformMeter, 0);
  h.api.startMinigame(game); h.api.finishMinigame(50);
  assert.equal(state.transformMeter, 25, 'the meter keeps filling while the choice is open');
});
