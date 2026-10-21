import test from 'node:test';
import assert from 'node:assert/strict';
import { create, key, step } from '../engine.mjs';
import { search } from '../search.mjs';
import { certificate, verify } from '../replay.mjs';
const near = () => {
  const s = create(1, {
    size: 2,
    count: 0,
    initialGauge: 0,
    initialEggs: [0, 0, 0, 0],
  });
  s.board = [8, 0, 0, 8];
  return s;
};
test('BFS finds actual death and proves shortest distance', () => {
  const s = near(),
    r = search(s, { mode: 'bfs', maxNodes: 1000, maxMs: 1000 });
  assert.equal(r.status, 'solved');
  assert.equal(r.shortest, true);
  assert.equal(r.path.length, 1);
  assert.equal(step(s, r.path[0]).state.won, true);
});
test('exhausted graph differs from bounded unproven', () => {
  const s = near();
  s.board = [1, 0, 0, 0];
  assert.equal(
    search(s, { mode: 'bfs', maxNodes: 1000, maxMs: 1000 }).status,
    'unsolvable',
  );
  assert.equal(
    search(s, { mode: 'bfs', maxNodes: 1, maxMs: 1000 }).status,
    'unproven',
  );
  assert.equal(search(near(), { maxNodes: 100, maxMs: 0 }).status, 'unproven');
});
test('beam does not claim shortest or impossibility', () => {
  const s = near();
  const r = search(s, { mode: 'beam', maxMs: 1000 });
  assert.equal(r.status, 'solved');
  assert.equal(r.shortest, false);
  s.board = [1, 0, 0, 0];
  assert.equal(search(s, { mode: 'beam', maxMs: 1000 }).status, 'unproven');
});
test('certificate replays and rejects operation/hash/config tampering', () => {
  const s = near(),
    r = search(s, { mode: 'bfs' }),
    proof = certificate(s, r.path);
  assert.equal(verify(proof).won, true);
  const bad = structuredClone(proof);
  bad.hashes[1] = '0';
  assert.throws(() => verify(bad));
  const bad2 = structuredClone(proof);
  bad2.actions = [{ type: 'cancel' }];
  assert.throws(() => verify(bad2));
  const bad3 = structuredClone(proof);
  bad3.initial.config.single = 2;
  assert.throws(() => verify(bad3));
});
test('non-winning trace cannot be certified', () => {
  assert.throws(() => certificate(near(), []));
});
test('state de-duplication respects remaining eggs', () => {
  const s = near();
  assert.notEqual(key(s), key({ ...s, eggs: [1, 0, 0, 0] }));
});
