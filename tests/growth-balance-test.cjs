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

test('sleeping from empty takes at least 30 seconds of recovery steps', () => {
  const h = harness(), state = h.api.state();
  state.energy = 0; state.isSleeping = true;
  let steps = 0;
  while (state.energy < 100 && steps < 5000) { h.api.recoverSleepStep(); steps++; }
  const seconds = steps * 0.1;
  assert.ok(seconds >= 30 && seconds <= 90, 'full recovery took ' + seconds + 's');
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
