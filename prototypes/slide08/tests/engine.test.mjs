import test from 'node:test';
import assert from 'node:assert/strict';
import * as E from '../engine.mjs';
const make = (cells = {}, opts = {}) => {
  const s = E.create(1, { size: 6, count: 0, ...opts });
  for (const [i, v] of Object.entries(cells)) s.board[+i] = v;
  return s;
};
// Encoded cells: kind*8+stage, zero is empty. Removing kind equality must fail.
test('seed reproducibility and exact initial population', () => {
  assert.deepEqual(E.create(42), E.create(42));
  assert.equal(E.create(42).board.filter(Boolean).length, 24);
  assert.notDeepEqual(E.create(42).board, E.create(43).board);
});
test('configuration rejects fractional, negative and impossible inputs', () => {
  for (const c of [
    { size: 5, count: 30 },
    { kinds: 2.2 },
    { single: 0 },
    { initialGauge: 25 },
    { initialEggs: [-1, 0, 0, 0] },
    { maxStage: 9 },
  ])
    assert.throws(() => E.create(1, c));
});
test('compression preserves order and species cannot cross', () => {
  let s = make({ 1: 1, 3: 9, 5: 2 });
  let t = E.step(s, { type: 'slide', dir: 'left' });
  assert.deepEqual(t.state.board.slice(0, 6), [1, 9, 2, 0, 0, 0]);
  assert.equal(t.state.moves, 1);
  assert.equal(E.step(t.state, { type: 'slide', dir: 'left' }).valid, false);
  assert.equal(s.board[1], 1);
});
for (const [n, stage] of [
  [2, 2],
  [3, 3],
  [4, 4],
  [5, 5],
  [6, 5],
])
  test(`${n} connected pieces consume entire component`, () => {
    const s = make(
      Object.fromEntries(Array.from({ length: n }, (_, i) => [i, 1])),
    );
    const r = E.step(s, { type: 'slide', dir: 'right' });
    assert.equal(r.state.board.filter(Boolean).length, 1);
    assert.equal(r.state.board[5], stage);
    assert.equal(r.state.gauge, 4 + stage - 1);
    assert.equal(r.waves.length, 1);
  });
test('same species 08 dies, unlike 08 does not', () => {
  assert.equal(
    E.step(make({ 0: 8, 1: 8 }), { type: 'slide', dir: 'left' }).state.won,
    true,
  );
  assert.equal(
    E.step(make({ 0: 8, 1: 16 }), { type: 'slide', dir: 'left' }).state.won,
    false,
  );
});
test('independent simultaneous groups count as one wave', () => {
  const r = E.step(make({ 0: 1, 1: 1, 12: 9, 13: 9 }), {
    type: 'slide',
    dir: 'left',
  });
  assert.equal(r.waves.length, 1);
  assert.equal(r.waves[0].events.length, 2);
});
test('slide recompresses in original direction and chains', () => {
  const r = E.step(make({ 0: 1, 1: 1, 4: 2 }), { type: 'slide', dir: 'left' });
  assert.equal(r.waves.length, 2);
  assert.equal(r.state.board[0], 3);
  assert.equal(r.state.moves, 1);
});
test('egg traverses edge until first obstacle, no global compression', () => {
  const s = make({ 3: 9, 15: 2 });
  const r = E.step(s, { type: 'egg', rank: 0, kind: 0, dir: 'right', lane: 0 });
  assert.equal(r.state.board[2], 1);
  assert.equal(r.state.board[3], 9);
  assert.equal(r.state.board[15], 2);
  assert.deepEqual(r.state.eggs, [1, 1, 0, 0]);
});
test('blocked entry, invalid lane and absent egg consume nothing', () => {
  for (const a of [
    { type: 'egg', rank: 0, kind: 0, dir: 'right', lane: 0 },
    { type: 'egg', rank: 2, kind: 0, dir: 'down', lane: 1 },
    { type: 'egg', rank: 0, kind: 0, dir: 'down', lane: 1.5 },
    { type: 'cancel' },
  ]) {
    const s = make({ 0: 9 });
    assert.deepEqual(E.step(s, a).state, s);
    assert.equal(E.step(s, a).valid, false);
  }
});
test('single preserves anchor and stage, pays before gains, no compression', () => {
  const s = make({ 0: 9, 1: 1, 4: 2 });
  const r = E.step(s, { type: 'single', index: 0, kind: 0 });
  assert.equal(r.state.board[0], 2);
  assert.equal(r.state.board[4], 2);
  assert.equal(r.state.gauge, 1);
  assert.equal(r.waves.length, 1);
  assert.equal(r.state.used.single, 1);
});
test('single anchor follows direct chain', () => {
  const r = E.step(make({ 0: 9, 1: 1, 6: 2 }), {
    type: 'single',
    index: 0,
    kind: 0,
  });
  assert.equal(r.state.board[0], 3);
  assert.equal(r.waves.length, 2);
});
test('bulk changes all then resolves, left column then bottom anchor', () => {
  const s = make({ 0: 9, 6: 1, 7: 9 }, { initialGauge: 12 });
  const r = E.step(s, { type: 'bulk', from: 1, kind: 0 });
  assert.equal(r.state.board[6], 3);
  assert.equal(r.state.gauge, 2);
  assert.equal(r.state.used.bulk, 1);
});
test('direction anchor tie uses left then down', () => {
  const r = E.step(make({ 0: 1, 1: 1, 6: 1 }), { type: 'slide', dir: 'down' });
  assert.equal(r.state.board[30], 3);
});
test('landing egg rewards, actual growth gauge and overflow score', () => {
  const r = E.step(
    make({ 0: 7, 1: 7, 2: 7, 3: 7, 4: 7 }, { initialGauge: 24 }),
    { type: 'slide', dir: 'left' },
  );
  assert.equal(r.state.gauge, 24);
  assert.deepEqual(r.state.eggs, [2, 1, 0, 0]);
  assert.equal(r.state.score, 40);
  assert.equal(r.waves[0].events[0].overflow, 3);
  const q = E.step(make({ 0: 3, 1: 3 }), { type: 'slide', dir: 'left' });
  assert.deepEqual(q.state.eggs, [3, 1, 0, 0]);
});
test('crossed reward is explicitly separate experiment', () => {
  const r = E.step(
    make({ 0: 3, 1: 3, 2: 3, 3: 3, 4: 3 }, { reward: 'crossed' }),
    { type: 'slide', dir: 'left' },
  );
  assert.deepEqual(r.state.eggs, [3, 2, 1, 1]);
});
test('invalid transforms and terminal moves are immutable', () => {
  for (const a of [
    { type: 'single', index: 0, kind: 0 },
    { type: 'single', index: 0, kind: 9 },
    { type: 'bulk', from: 0, kind: 1 },
  ]) {
    const s = make({ 0: 1 }, { initialGauge: 0 });
    assert.deepEqual(E.step(s, a).state, s);
  }
  const s = make({ 0: 8, 1: 8 });
  const r = E.step(s, { type: 'slide', dir: 'left' }).state;
  assert.equal(
    E.step(r, { type: 'egg', rank: 0, kind: 0, dir: 'right', lane: 0 }).valid,
    false,
  );
});
test('all enumerated actions legal and key includes resources, excludes score', () => {
  const s = E.create(3);
  for (const a of E.actions(s)) assert.equal(E.step(s, a).valid, true);
  assert.equal(E.key(s), E.key({ ...s, score: 99, moves: 15 }));
  assert.notEqual(E.key(s), E.key({ ...s, gauge: 0 }));
});
test('six connected at left edge leave no unconsumed sixth piece', () => {
  const s = make({ 0: 1, 1: 1, 2: 1, 3: 1, 4: 1, 5: 1 });
  const r = E.step(s, { type: 'slide', dir: 'left' });
  assert.deepEqual(r.state.board.slice(0, 6), [5, 0, 0, 0, 0, 0]);
});
test('egg chains directly with input-direction anchor, other rows remain uncompressed', () => {
  const s = make({ 1: 1, 2: 2, 15: 9 });
  const r = E.step(s, { type: 'egg', rank: 0, kind: 0, dir: 'right', lane: 0 });
  assert.equal(r.waves.length, 2);
  assert.equal(r.state.board[2], 3);
  assert.equal(r.state.board[15], 9);
  assert.equal(r.state.moves, 1);
});
test('edge insertion directions land at opposite boundary on empty lane', () => {
  for (const [dir, lane, index] of [
    ['left', 0, 0],
    ['right', 0, 5],
    ['up', 0, 0],
    ['down', 0, 30],
  ]) {
    const r = E.step(make(), { type: 'egg', rank: 0, kind: 0, dir, lane });
    assert.equal(r.state.board[index], 1);
    assert.equal(r.state.used.egg, 1);
  }
});
