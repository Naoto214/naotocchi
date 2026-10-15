import test from 'node:test';
import assert from 'node:assert/strict';
import { create } from '../engine.mjs';
import { metrics } from '../metrics.mjs';
test('separated same-kind 08 pair after non-evolving transform counts', () => {
  const s = create(1, { size: 3, count: 0, initialEggs: [0, 0, 0, 0] });
  s.board = [8, 0, 0, 0, 0, 0, 0, 0, 16];
  const m = metrics(s, [{ type: 'single', index: 8, kind: 0 }]);
  assert.equal(m.same08, true);
  assert.equal(m.won, false);
  assert.equal(m.reached08, true);
});
