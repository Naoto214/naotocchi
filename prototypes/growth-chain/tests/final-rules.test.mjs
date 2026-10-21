import test from "node:test";
import assert from "node:assert/strict";
import { standardRules, configuration } from "../rules.mjs";
import { board, resolve } from "../engine.mjs";
import { createSession, applyAction, placements } from "../session.mjs";
test("standard preset preserves laboratory defaults", () => {
  const r = standardRules();
  assert.equal(r.gaugeUnit, 8);
  assert.equal(r.scoreMode, "evolution");
  assert.equal(r.topOut, "legal");
  assert.equal(configuration().gaugeUnit, 16);
});
test("whole six component grows once at bottom left with capped growth", () => {
  const r = standardRules(),
    b = board(r);
  for (let x = 0; x < 6; x++) b[13][x] = { id: x + 1, k: 0, s: 1 };
  const z = resolve(b, r);
  assert.equal(z.board.flat().filter(Boolean).length, 1);
  assert.equal(z.board[13][0].s, 5);
  assert.equal(z.gauge, 4);
  assert.equal(z.score, 40);
});
test("overflow scores ten per excess stage, gauge only actual growth", () => {
  const r = standardRules(),
    b = board(r);
  for (let x = 0; x < 5; x++) b[13][x] = { id: x + 1, k: 0, s: 7 };
  const z = resolve(b, r);
  assert.equal(z.score, 40);
  assert.equal(z.gauge, 1);
  assert.equal(z.overflow, 3);
});
test("legacy independent deaths award one egg and 100 points each in same wave", () => {
  const r = standardRules({eggReward:"death"}),
    b = board(r);
  for (let x of [0, 1, 4, 5]) b[13][x] = { id: x + 1, k: x < 2 ? 0 : 1, s: 8 };
  const z = resolve(b, r);
  assert.deepEqual(z.eggs, [2, 0, 0, 0]);
  assert.equal(z.score, 200);
  assert.equal(z.gauge, 0);
  assert.equal(z.waves.length, 1);
});
test("standard legal placements never lock above visible board and ended tools do not spend", () => {
  const r = standardRules(),
    b = board(r);
  let id = 1;
  for (let y = 2; y < 14; y++)
    for (let x = 0; x < 6; x++) b[y][x] = { id: id++, k: (x + y) % 5, s: 1 };
  const s = createSession(0, r, { board: b, eggs: [1, 0, 0, 0], gauge: 24 });
  assert.ok(s.over);
  assert.deepEqual(placements(s), []);
  assert.throws(() => applyAction(s, { type: "egg", rank: 0, k: 0, x: 0 }));
  assert.equal(s.eggs[0], 1);
});
for (const chain of [1, 2, 3, 4, 5])
  test(`death at wave ${chain} awards exactly one appropriate egg and multiplied score`, () => {
    const r = standardRules({eggReward:"death"}),
      b = board(r);
    let id = 1;
    const start = 9 - chain;
    for (let j = 0; j < chain; j++)
      b[13 - j][0] = { id: id++, k: 0, s: start + j };
    b[13][1] = { id: id++, k: 0, s: start };
    const z = resolve(b, r);
    assert.equal(z.waves.length, chain);
    const eggs = [0, 0, 0, 0];
    eggs[Math.min(3, chain - 1)] = 1;
    assert.deepEqual(z.eggs, eggs);
    assert.equal(z.score, (10 * (chain - 1) * chain) / 2 + 100 * chain);
    assert.equal(z.gauge, chain - 1);
  });
test("transform and bulk use the same anchor and stage accounting as egg/drop", () => {
  for (const type of ["transform", "bulk"]) {
    const r = standardRules(),
      b = board(r);
    b[13][0] = { id: 1, k: 0, s: 1 };
    b[13][1] = { id: 2, k: 1, s: 1 };
    const s = createSession(1, r, { board: b, gauge: 24 });
    const z = applyAction(
      s,
      type === "bulk" ? { type, from: 1, to: 0 } : { type, x: 1, y: 13, to: 0 },
    );
    assert.equal(z.board[13][0].s, 2);
    assert.equal(z.board[13][0].id, 1);
    assert.equal(z.score, 10);
    assert.equal(z.gauge, 24 - (type === "bulk" ? 24 : 8) + 1);
  }
});
test("two landed pair members share one simultaneous resolution", () => {
  const r = standardRules();
  const s = createSession(1, r);
  s.queue[0] = [0, 0];
  const z = applyAction(s, { type: "drop", path: ["hard"] });
  assert.equal(z.last.waves.length, 1);
  assert.equal(z.score, 10);
  assert.equal(z.gauge, 1);
  assert.equal(z.board[13][2].s, 2);
});
test("saved natural three and five chains resolve under final standard rules", async () => {
  const { naturalFixtures } = await import("../natural-fixtures.mjs");
  for (const n of [3, 5]) {
    const f = structuredClone(naturalFixtures[n]);
    f.state.rules = standardRules();
    const z = applyAction(f.state, f.action);
    assert.equal(z.last.waves.length, n);
  }
});
test("simultaneous component outcome does not depend on cell IDs or change priorities", () => {
  const r = standardRules(),
    b = board(r);
  for (let x = 0; x < 6; x++) b[13][x] = { id: x + 1, k: x < 3 ? 0 : 1, s: 2 };
  const a = resolve(b, r, { priority: [1, 2, 3, 4, 5, 6] });
  for (const c of b.flat().filter(Boolean)) c.id = 100 - c.id;
  const z = resolve(b, r, { priority: [94, 95, 96, 97, 98, 99] });
  const shape = (b) =>
    b.map((row) => row.map((c) => (c ? { k: c.k, s: c.s } : null)));
  assert.deepEqual(shape(a.board), shape(z.board));
  assert.equal(z.score, 40);
  assert.equal(z.waves.length, 1);
});
test("spawn can fit while no fully visible landing exists; imported false-active state is rejected", async () => {
  const { validateSession } = await import("../session.mjs");
  const r = standardRules(),
    b = board(r);
  let id = 1;
  for (let y = 2; y < 14; y++)
    for (let x = 0; x < 6; x++) b[y][x] = { id: id++, k: (x + y) % 5, s: 1 };
  b[2][2] = null;
  const s = createSession(1, r, { board: b, gauge: 24 });
  assert.equal(s.over, "no-legal-placement");
  assert.throws(() => validateSession({ ...s, over: null }));
});
