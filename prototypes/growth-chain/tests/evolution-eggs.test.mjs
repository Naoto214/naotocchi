import test from "node:test";
import assert from "node:assert/strict";
import { standardRules, configuration } from "../rules.mjs";
import { board, resolve } from "../engine.mjs";
import {
  createSession,
  applyAction,
  preview,
  stateHash,
  replay,
  stateData,
} from "../session.mjs";
const component = (stage, count = 2) => {
  const r = standardRules(),
    b = board(r);
  for (let x = 0; x < count; x++) b[13][x] = { id: x + 1, k: 0, s: stage };
  return b;
};
test("standard rewards final evolution04..07 once; low stages08 and death give none", () => {
  for (let from = 1; from <= 8; from++) {
    const z = resolve(component(from), standardRules()),
      eggs = [0, 0, 0, 0];
    if (from >= 3 && from <= 6) eggs[from - 3] = 1;
    assert.deepEqual(z.eggs, eggs, `from${from}`);
  }
  assert.equal(standardRules().eggReward, "evolution");
  assert.equal(Object.hasOwn(configuration(), "eggReward"), false);
});
test("skipping stages rewards only final stage and overflow stays score only", () => {
  for (const [from, n, to] of [
    [1, 4, 4],
    [1, 5, 5],
    [3, 5, 7],
    [4, 5, 8],
    [7, 5, 8],
    [1, 6, 5],
  ]) {
    const z = resolve(component(from, n), standardRules()),
      expected = [0, 0, 0, 0];
    if (to >= 4 && to <= 7) expected[to - 4] = 1;
    assert.deepEqual(z.eggs, expected);
    assert.equal(z.score, Math.min(4, n - 1) * 10);
  }
});
test("independent simultaneous groups each reward, same cell can reward on later waves", () => {
  let r = standardRules(),
    b = component(3);
  b[13][4] = { id: 3, k: 1, s: 3 };
  b[13][5] = { id: 4, k: 1, s: 3 };
  let z = resolve(b, r);
  assert.deepEqual(z.eggs, [2, 0, 0, 0]);
  assert.equal(z.waves.length, 1);
  b = board(r);
  for (let j = 0; j < 4; j++) b[13 - j][0] = { id: j + 1, k: 0, s: 3 + j };
  b[13][1] = { id: 5, k: 0, s: 3 };
  z = resolve(b, r);
  assert.deepEqual(z.eggs, [1, 1, 1, 1]);
  assert.equal(z.waves.length, 4);
  assert.ok(z.waves.every((w) => w.events[0].anchor.id === 1));
});
test("legacy missing-field and explicit death rules retain old rewards", () => {
  const r = standardRules({ eggReward: "death" });
  assert.deepEqual(resolve(component(8), r).eggs, [1, 0, 0, 0]);
  assert.deepEqual(resolve(component(3), r).eggs, [0, 0, 0, 0]);
  assert.deepEqual(resolve(component(8), configuration()).eggs, [1, 0, 0, 0]);
  assert.throws(() => configuration({ eggReward: "both" }));
});
test("drop egg transform bulk share evolution reward and immutable previews/replays", () => {
  for (const type of ["drop", "egg", "transform", "bulk"]) {
    const r = standardRules(),
      b = board(r);
    let a;
    if (type === "drop") {
      b[13][0] = { id: 1, k: 0, s: 1 };
      b[13][2] = { id: 2, k: 0, s: 1 };
      a = { type, path: ["left", "left", "rotate", "hard"] };
    } else {
      b[13][0] = { id: 1, k: 0, s: 3 };
      if (type !== "egg") b[13][1] = { id: 2, k: 1, s: 3 };
      a =
        type === "egg"
          ? { type, rank: 2, k: 0, x: 0 }
          : type === "bulk"
            ? { type, from: 1, to: 0 }
            : { type, x: 1, y: 13, to: 0 };
    }
    const s = createSession(0, r, { board: b, eggs: [0, 0, 1, 0], gauge: 24 });
    if (type === "drop") s.queue[0] = [0, 0];
    const h = stateHash(s),
      z = preview(s, a);
    assert.equal(stateHash(s), h);
    assert.ok(z.last.eggs[0] > 0, type);
    const committed = applyAction(s, a);
    assert.equal(stateHash(z), stateHash(committed));
    assert.equal(
      stateHash(
        replay({ version: s.version, initial: stateData(s), actions: [a] }),
      ),
      stateHash(z),
    );
    assert.throws(() => applyAction(s, { type: "egg", rank: 0, k: 0, x: 0 }));
    assert.equal(stateHash(s), h);
  }
});
