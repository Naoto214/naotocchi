import { test } from "node:test";
import assert from "node:assert/strict";
import { configuration, VERSION } from "../rules.mjs";
import { board } from "../engine.mjs";
import {
  createSession,
  placements,
  applyAction,
  preview,
  replay,
  stateHash,
  poseCells,
  movePose,
  spawnPose,
} from "../session.mjs";
const rules = configuration();
test("reachable placements replay deterministic NEXT3 without touching input", () => {
  let s = createSession(19, rules);
  assert.equal(s.queue.length, 4);
  let initial = structuredClone(s),
    actions = [];
  for (let i = 0; i < 12 && !s.over; i++) {
    let a = placements(s)[i % placements(s).length];
    actions.push(a);
    s = applyAction(s, a, false);
  }
  assert.deepEqual(createSession(19, rules), initial);
  assert.equal(
    stateHash(replay({ version: VERSION, initial, actions })),
    stateHash(s),
  );
  assert.equal(s.drops, actions.length);
});
test("illegal path rejected; rotation and hard-drop stay on board", () => {
  let s = createSession(3, rules);
  assert.throws(() => applyAction(s, { type: "drop", path: ["teleport"] }));
  for (let a of placements(s)) {
    let p = spawnPose(rules);
    for (let op of a.path) {
      if (op === "hard")
        while (movePose(s.board, p, "down")) p = movePose(s.board, p, "down");
      else p = movePose(s.board, p, op);
      assert.ok(p);
    }
    assert.ok(poseCells(p).every((c) => c.x >= 0 && c.x < 6 && c.y < 14));
  }
});
test("items cost exact units, preview immutable and bag unchanged", () => {
  let b = board(rules);
  b[13][0] = { id: 1, k: 0, s: 3 };
  let s = createSession(4, rules, { board: b, eggs: [2, 2, 2, 2], gauge: 64 }),
    copy = structuredClone(s);
  let a = { type: "transform", x: 0, y: 13, to: 1 };
  let z = preview(s, a);
  assert.deepEqual(s, copy);
  assert.equal(z.gauge, 48);
  assert.equal(z.board[13][0].s, 3);
  assert.deepEqual(z.bag, s.bag);
  for (let rank = 0; rank < 4; rank++) {
    let q = applyAction(s, { type: "egg", rank, k: 2, x: 3 });
    assert.equal(q.board[13][3].s, rank + 1);
    assert.equal(q.eggs[rank], 1);
  }
  assert.throws(() => applyAction(createSession(2, rules), a));
});
test("bulk changes simultaneously with independent anchor setting", () => {
  let b = board(rules);
  b[13][0] = { id: 1, k: 1, s: 2 };
  b[13][1] = { id: 2, k: 0, s: 2 };
  b[13][2] = { id: 3, k: 1, s: 2 };
  let s = createSession(2, configuration({ bulkAnchor: "changed" }), {
    board: b,
    gauge: 48,
  });
  let z = applyAction(s, { type: "bulk", from: 0, to: 1 });
  assert.equal(z.board[13][1].s, 4);
  assert.equal(z.last.waves.length, 1);
  assert.equal(z.gauge, 3);
});
test("cannot use items on occupied cells / same species / invalid rank", () => {
  let b = board(rules);
  b[13][0] = { id: 1, k: 0, s: 2 };
  let s = createSession(1, configuration({ eggPlacement: "free" }), {
    board: b,
    gauge: 100,
    eggs: [1, 1, 1, 1],
  });
  assert.throws(() =>
    applyAction(s, { type: "egg", x: 0, y: 13, k: 1, rank: 0 }),
  );
  assert.throws(() =>
    applyAction(s, { type: "transform", x: 0, y: 13, to: 0 }),
  );
  assert.throws(() =>
    applyAction(s, { type: "egg", x: 1, y: 13, k: 1, rank: 9 }),
  );
});
test("top-out preserves hidden cells, no silent deletion", () => {
  let b = board(rules);
  for (let y = 3; y < 14; y++)
    for (let x = 0; x < 6; x++)
      b[y][x] = { id: y * 6 + x + 1, k: (x + y) % 5, s: 1 };
  let s = createSession(42, rules, { board: b });
  let z = applyAction(s, { type: "drop", path: ["hard"] });
  assert.equal(z.over, "lock-overflow");
  assert.equal(z.board.flat().filter(Boolean).length, 68);
});
test("invalid import/replay rejects version, mutation, unstable board", () => {
  assert.throws(() =>
    replay({ version: "bad", initial: createSession(1, rules), actions: [] }),
  );
  let b = board(rules);
  b[13][0] = { id: 1, k: 0, s: 1 };
  b[13][1] = { id: 2, k: 0, s: 1 };
  assert.throws(() => createSession(1, rules, { board: b }));
  assert.throws(() =>
    replay({
      version: VERSION,
      initial: createSession(1, rules),
      actions: [],
      hash: "wrong",
    }),
  );
});
test("settled top-out permits off-spawn hidden cells when spawn remains clear", () => {
  let r = configuration({ topOut: "settled" }),
    b = board(r);
  for (let y = 3; y < 14; y++) b[y][0] = { id: y, k: y % 2, s: 1 };
  let s = createSession(7, r, { board: b });
  s.queue[0] = [2, 3];
  let z = applyAction(s, { type: "drop", path: ["left", "left", "hard"] });
  assert.ok(z.board[1][0]);
  assert.equal(z.over, null);
});
test("import rejects incomplete configuration rather than producing NaN gauge", () => {
  let s = createSession(1);
  s = structuredClone(s);
  delete s.rules.gaugeUnit;
  assert.throws(
    () => replay({ version: VERSION, initial: s, actions: [] }),
    /Incomplete rules/,
  );
});
test("long legal manual movement history still locks", () => {
  let s = createSession(1);
  let z = applyAction(s, {
    type: "drop",
    path: [...Array(504).fill("rotate"), "hard"],
  });
  assert.equal(z.drops, 1);
});
test("import rejects falsely active state with blocked spawn", () => {
  let r = configuration(),
    b = board(r);
  for (let y = 2; y < 14; y++) b[y][2] = { id: y, k: y % 2, s: 1 };
  let s = createSession(1, r, { board: b });
  assert.equal(s.over, "spawn-blocked");
  s.over = null;
  assert.throws(
    () => replay({ version: VERSION, initial: s, actions: [] }),
    /Blocked active spawn/,
  );
});
