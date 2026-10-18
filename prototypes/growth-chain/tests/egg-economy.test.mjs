import test from "node:test";
import assert from "node:assert/strict";
import { standardRules } from "../rules.mjs";
import { board, resolve } from "../engine.mjs";
import { createSession, stateData, applyAction } from "../session.mjs";
test("weighted board plus inventory potential strictly falls for every standard evolution component", async () => {
  const { resourcePotential } = await import("../egg-economy.mjs");
  const r = standardRules();
  for (let s = 1; s <= 8; s++)
    for (let n = 2; n <= 72; n++) {
      const b = board(r);
      for (let i = 0; i < n; i++)
        b[13 - Math.floor(i / 6)][i % 6] = { id: i + 1, k: 0, s };
      const z = resolve(b, r);
      assert.ok(
        resourcePotential(z) <
          resourcePotential({ board: b, eggs: [0, 0, 0, 0] }),
        `${s}:${n}`,
      );
    }
});
test("new economy measures egg descendants and each prefix budget separately from death counts", async () => {
  const { economyMetrics } = await import("../egg-economy.mjs");
  const r = standardRules(),
    b = board(r);
  b[13][0] = { id: 1, k: 0, s: 3 };
  b[13][1] = { id: 2, k: 1, s: 3 };
  const s = createSession(1, r, { board: b, gauge: 8, eggs: [0, 0, 1, 0] });
  const actions = [
    { type: "transform", x: 1, y: 13, to: 0 },
    { type: "egg", rank: 2, k: 0, x: 0 },
  ];
  const m = economyMetrics(stateData(s), actions);
  assert.deepEqual(m.earned, [1, 0, 0, 0]);
  assert.equal(m.deathGroups, 0);
  assert.equal(m.causalRewards, 0);
  assert.equal(m.over, false);
});
test("egg policy is deterministic, uses public information and takes a winning egg action", async () => {
  const { chooseEggPolicy } = await import("../egg-policy.mjs");
  const r = standardRules(),
    b = board(r);
  for (let i = 0; i < 6; i++) b[13 - i][0] = { id: i + 1, k: 0, s: i + 3 };
  const s = createSession(1, r, { board: b, eggs: [0, 0, 1, 0] });
  const a = chooseEggPolicy(s, "active");
  assert.equal(a.type, "egg");
  assert.ok(applyAction(s, a).last.deaths);
  const z = structuredClone(s);
  z.seed = 777;
  z.bag.state = 99;
  z.bag.items.reverse();
  assert.deepEqual(chooseEggPolicy(z, "active"), a);
});
test("naturally earned egg descendant can create new rewards and reach death", async () => {
  const { economyMetrics } = await import("../egg-economy.mjs");
  const r = standardRules(),
    b = board(r);
  for (let i = 0; i < 6; i++) b[13 - i][0] = { id: i + 1, k: 0, s: i + 3 };
  for (let i = 0; i < 5; i++) b[13 - i][4] = { id: i + 10, k: 1, s: i + 4 };
  const s = createSession(0, r, { board: b, eggs: [0, 0, 1, 0] });
  const m = economyMetrics(s, [
    { type: "egg", rank: 2, k: 0, x: 1 },
    { type: "egg", rank: 3, k: 1, x: 5 },
  ]);
  assert.equal(m.causalRewards, 3);
  assert.equal(m.descendantDeaths, 1);
  assert.equal(m.deathGroups, 2);
  assert.deepEqual(m.earned, [1, 2, 2, 2]);
});
