import test from "node:test";
import assert from "node:assert/strict";
import { standardRules } from "../rules.mjs";
import { board } from "../engine.mjs";
import {
  createSession,
  spawnPose,
  movePose,
  stateHash,
  applyAction,
  replay,
  stateData,
} from "../session.mjs";
import { toolTransaction } from "../live-tools.mjs";
test("live tool preserves active pose and queue and supplies replayable path", () => {
  const r = standardRules(),
    b = board(r);
  b[13][0] = { id: 1, k: 0, s: 1 };
  const s = createSession(7, r, { board: b, gauge: 8 });
  const p = movePose(b, spawnPose(r), "down");
  const a = { type: "transform", x: 0, y: 13, to: 1 };
  const z = toolTransaction(s, p, a);
  assert.deepEqual(z.pose, p);
  assert.deepEqual(z.state.queue, s.queue);
  assert.equal(z.state.gauge, 0);
  const dropped = applyAction(z.state, {
    type: "drop",
    path: [...z.path, "hard"],
  });
  assert.equal(
    stateHash(
      replay({
        version: s.version,
        initial: stateData(s),
        actions: [a, { type: "drop", path: [...z.path, "hard"] }],
      }),
    ),
    stateHash(dropped),
  );
});
test("tool intersecting active pair cancels atomically without stock loss", () => {
  const r = standardRules(),
    s = createSession(1, r, { eggs: [1, 0, 0, 0] });
  const p = { x: 0, y: 13, rot: 0 };
  const hash = stateHash(s);
  assert.throws(() =>
    toolTransaction(s, p, { type: "egg", rank: 0, k: 0, x: 0 }),
  );
  assert.equal(stateHash(s), hash);
});
test("stale cell identity cancels, no spending and no double transaction", () => {
  const r = standardRules(),
    b = board(r);
  b[13][0] = { id: 1, k: 0, s: 1 };
  const s = createSession(1, r, { board: b, gauge: 8 });
  assert.throws(() =>
    toolTransaction(
      s,
      spawnPose(r),
      { type: "transform", x: 0, y: 13, to: 1 },
      99,
    ),
  );
  const z = toolTransaction(
    s,
    spawnPose(r),
    { type: "transform", x: 0, y: 13, to: 1 },
    1,
  );
  assert.throws(() =>
    toolTransaction(
      z.state,
      z.pose,
      { type: "transform", x: 0, y: 13, to: 2 },
      1,
    ),
  );
  assert.equal(z.state.gauge, 0);
});
test("egg cannot occupy active pair even if immediate merge clears its insertion cell", () => {
  const r = standardRules(),
    b = board(r);
  b[13][0] = { id: 1, k: 0, s: 1 };
  const s = createSession(1, r, { board: b, eggs: [1, 0, 0, 0] });
  assert.throws(() =>
    toolTransaction(
      s,
      { x: 1, y: 13, rot: 0 },
      { type: "egg", rank: 0, k: 0, x: 1 },
    ),
  );
  assert.equal(s.eggs[0], 1);
});
test("egg cutting off replay spawn path cancels even when active pose is elsewhere", () => {
  const r = standardRules(),
    b = board(r);
  for (let y = 3; y < 14; y++) b[y][2] = { id: y, k: y % 2, s: 1 };
  const s = createSession(1, r, { board: b, eggs: [1, 0, 0, 0] });
  assert.throws(() =>
    toolTransaction(
      s,
      { x: 0, y: 5, rot: 0 },
      { type: "egg", rank: 0, k: 3, x: 2 },
    ),
  );
  assert.equal(s.eggs[0], 1);
});
