import test from 'node:test';
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import { create, step } from '../engine.mjs';
import { search } from '../search.mjs';
import { analyzePath } from '../balance-20261015/metrics.mjs';
const blank = () => create(1, { size: 3, count: 0, initialEggs: [2, 1, 0, 0] });
test('slide-only impossible is scoped; transform still wins same board', () => {
  const s = blank();
  s.board = [8, 16, 0, 0, 0, 0, 0, 0, 0];
  const r = search(s, { mode: 'bfs', actionSet: 'slides', maxMs: 1000 });
  assert.equal(r.status, 'unsolvable');
  assert.equal(r.options.actionSet, 'slides');
  assert.equal(step(s, { type: 'single', index: 1, kind: 0 }).state.won, true);
});
test('new search options reject invalid penalties/action sets', () => {
  for (const opts of [
    { itemPenalty: -1 },
    { itemPenalty: NaN },
    { actionSet: 'items' },
  ])
    assert.throws(() => search(blank(), opts));
});
test('unproven best observation is legal and never a certified solution', () => {
  const s = blank();
  s.board = [1, 1, 0, 0, 0, 0, 0, 0, 0];
  const r = search(s, { maxDepth: 1, itemPenalty: 4 });
  assert.equal(r.status, 'unproven');
  assert.equal(r.path.length, 0);
  assert.ok(r.bestPath.length > 0);
  let q = s;
  for (const a of r.bestPath) {
    const p = step(q, a);
    assert.ok(p.valid);
    q = p.state;
  }
  assert.equal(q.won, false);
});
test('penalty-zero leaves existing seed3 witness unchanged', () => {
  const s = create(3);
  const opts = { width: 80, maxDepth: 30, maxNodes: 500000, maxMs: 10000 };
  assert.deepEqual(
    search(s, { ...opts, itemPenalty: 0 }).path,
    JSON.parse(
      readFileSync(new URL('../results/proof-base-3.json', import.meta.url)),
    ).actions,
  );
});
test('occupied reduction includes egg addition, and slide denominators are separate', () => {
  const s = blank();
  s.board = [0, 1, 2, 0, 0, 0, 9, 0, 0];
  const a = [
    { type: 'egg', rank: 0, kind: 0, dir: 'right', lane: 0 },
    { type: 'slide', dir: 'left' },
  ];
  const r = analyzePath(s, a);
  assert.equal(r.steps[0].reduction, 1);
  assert.equal(r.steps[0].chain, 2);
  assert.equal(r.slides, 1);
  assert.equal(r.evolvingSlides, 0);
  assert.equal(r.slideChainActions, 0);
  assert.equal(r.chainActions, 1);
  assert.equal(r.itemRatio, 0.5);
});
test('large clearing threshold four and chain measured on slides', () => {
  const s = blank();
  s.board = [1, 1, 1, 1, 1, 0, 0, 0, 0];
  const r = analyzePath(s, [{ type: 'slide', dir: 'left' }]);
  assert.equal(r.largeClears, 1);
  assert.equal(r.largeSlideClears, 1);
  assert.equal(r.totalReduction, 4);
});
test('item streaks count all items in runs >=3, not number of runs', () => {
  const s = blank();
  const r = analyzePath(s, [
    { type: 'egg', rank: 0, kind: 0, dir: 'down', lane: 0 },
    { type: 'egg', rank: 0, kind: 1, dir: 'down', lane: 1 },
    { type: 'egg', rank: 1, kind: 2, dir: 'down', lane: 2 },
  ]);
  assert.equal(r.maxItemStreak, 3);
  assert.equal(r.itemsInLongStreaks, 3);
  assert.equal(r.itemCount, 3);
  assert.equal(r.slides, 0);
});
test('same count paired boards identical; 30 contains the same initial24', () => {
  const a = create(20, { count: 24, single: 2, bulk: 6 }),
    c = create(20, { count: 24 }),
    b = create(20, { count: 30 });
  assert.deepEqual(a.board, c.board);
  assert.ok(a.board.every((v, i) => !v || v === b.board[i]));
});
test('zero-move paths use null ratios rather than fabricated zeros', () => {
  const r = analyzePath(blank(), []);
  assert.equal(r.itemRatio, null);
  assert.equal(r.meanReduction, null);
});
test('item penalty changes path ranking without changing transition rules', () => {
  const s = blank();
  s.board = [0, 1, 1, 0, 0, 0, 0, 0, 0];
  const low = search(s, { maxDepth: 1, maxNodes: 10000, itemPenalty: 0 }),
    high = search(s, { maxDepth: 1, maxNodes: 10000, itemPenalty: 1000 });
  assert.equal(low.bestPath[0].type, 'egg');
  assert.equal(high.bestPath[0].type, 'slide');
});
