const assert = require('node:assert/strict');
const { test } = require('node:test');
const { harness } = require('./helpers/runtime-harness.cjs');

test('the dex shows a summary and one progress head per species line', () => {
  const h = harness(), state = h.api.state();
  state.discoveredStages = ['dog:0', 'dog:1', 'cat:0'];
  h.api.renderDex();
  const grid = h.get('dexGrid').innerHTML;
  assert.equal((grid.match(/dex-line-head/g) || []).length, h.api.ALL_LINES.length);
  assert.match(grid, /2\/8/);
  assert.ok(/dex-line-block unknown/.test(grid), 'undiscovered lines are marked');
  assert.match(h.get('dexSummary').innerHTML, /ずかんの まとめ/);
  assert.match(h.get('dexSummary').innerHTML, /2\/\d+しゅぞく/);
});

test('travel shows region cards with effects and marks the current region', () => {
  const h = harness(), state = h.api.state();
  state.regionId = 'forest';
  h.api.renderTravelRegionGrid();
  const grid = h.get('travelRegionGrid').innerHTML;
  assert.equal((grid.match(/travel-card/g) || []).length >= h.api.REGIONS.length, true);
  assert.match(grid, /data-id="forest"[^>]*disabled/);
  assert.match(grid, /いまここ/);
  assert.match(grid, /なかまに であいやすい/, 'the forest card explains its effect');
});

test('care meters are hidden while the pet is an egg', () => {
  const h = harness(), state = h.api.state();
  state.stage = 'egg';
  h.api.render();
  assert.equal(h.get('careMeters').classList.contains('hidden'), true);
  state.stage = 'growing';
  h.api.render();
  assert.equal(h.get('careMeters').classList.contains('hidden'), false);
});
