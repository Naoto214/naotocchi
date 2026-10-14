import test from "node:test";
import assert from "node:assert/strict";
import {
  unlockedRoster,
  readRoster,
  selectFive,
  imagePath,
} from "../roster.mjs";
import { standardRules } from "../rules.mjs";
import { createSession, validateSession } from "../session.mjs";
import { draw } from "../random.mjs";
test("initial five exact canonical species have all eight images without discoveries", () => {
  const a = unlockedRoster({});
  assert.deepEqual(
    a.map((x) => x.id),
    ["dog", "penguin", "clownfish", "mushroom", "butterfly"],
  );
  for (const c of a)
    for (let s = 1; s <= 8; s++)
      assert.equal(
        imagePath(c, s),
        `../../assets/characters/${c.id}/${String(s).padStart(2, "0")}.png`,
      );
});
test("partial discoveries do not reveal species; full zero-based discovery unlocks", () => {
  const keys = Array.from({ length: 7 }, (_, i) => `cat:${i}`);
  assert.equal(unlockedRoster({ discoveredStages: keys }).length, 5);
  keys.push("cat:7");
  assert.equal(unlockedRoster({ discoveredStages: keys }).at(-1).id, "cat");
});
test("save read is read only and malformed/unavailable storage fails closed", () => {
  let reads = 0;
  const storage = {
    getItem(k) {
      reads++;
      assert.equal(k, "naotocchi-save-v1");
      return "{";
    },
    setItem() {
      throw Error("write forbidden");
    },
  };
  assert.equal(readRoster(storage).length, 5);
  assert.equal(reads, 1);
  assert.equal(
    readRoster({
      getItem() {
        throw Error("denied");
      },
    }).length,
    5,
  );
});
test("selected five bag contains exactly four each even with extra unlocked tool species", () => {
  const roster = unlockedRoster({
    discoveredStages: Array.from({ length: 8 }, (_, i) => `cat:${i}`),
  });
  const selected = selectFive(roster, [
    "dog",
    "penguin",
    "clownfish",
    "mushroom",
    "cat",
  ]);
  const s = createSession(3, standardRules({ kinds: 6 }), { selected });
  const all = s.queue.flat();
  while (all.length < 20) all.push(draw(s.bag));
  assert.deepEqual([...new Set(all)].sort(), selected.sort());
  for (const k of selected) assert.equal(all.filter((x) => x === k).length, 4);
  validateSession(s);
  assert.throws(() =>
    selectFive(roster, ["dog", "dog", "cat", "mushroom", "penguin"]),
  );
});
test("session preserves canonical identities independently of later unlock ordering", () => {
  const ids = ["dog", "penguin", "clownfish", "mushroom", "butterfly", "woman"];
  const s = createSession(1, standardRules({ kinds: 6 }), {
    species: ids,
    selected: [0, 1, 2, 3, 5],
  });
  assert.deepEqual(s.species, ids);
  validateSession(s);
  assert.throws(() =>
    createSession(1, standardRules(), {
      species: ["dog", "dog", "dog", "dog", "dog"],
    }),
  );
});
test("tools can use unlocked species outside the five in the bag", async () => {
  const { applyAction } = await import("../session.mjs");
  const s = createSession(1, standardRules({ kinds: 6 }), {
    selected: [0, 1, 2, 3, 5],
    eggs: [1, 0, 0, 0],
  });
  const z = applyAction(s, { type: "egg", rank: 0, k: 4, x: 0 });
  assert.equal(z.board[13][0].k, 4);
  assert.deepEqual(z.queue, s.queue);
  assert.deepEqual(z.bag.selected, [0, 1, 2, 3, 5]);
});
