import { test } from "node:test";
import assert from "node:assert/strict";
import { runTrial, summarize, expandAction, wilson } from "../experiments.mjs";
import { replay, stateHash } from "../session.mjs";
import { VERSION } from "../rules.mjs";
test("trial logs reproduce final hash and consume no hidden policy RNG", () => {
  let a = runTrial({ seed: 9, limit: 12, policy: "strategic" }),
    b = runTrial({ seed: 9, limit: 12, policy: "strategic" });
  assert.deepEqual(a, b);
  assert.equal(
    stateHash(
      replay({
        version: VERSION,
        initial: a.initial,
        actions: a.actions.map(expandAction),
      }),
    ),
    a.hash,
  );
});
test("metrics distinguish survival censoring from game over and per-drop denominator", () => {
  let t = runTrial({ seed: 2, limit: 1, policy: "random" });
  let z = summarize([t]);
  assert.equal(z.gameOver.rate, 0);
  assert.equal(z.censored, 1);
  assert.equal(z.drops, 1);
  assert.equal(z.runs, 1);
  assert.ok(z.gameOver.ci[1] > 0);
  assert.deepEqual(wilson(0, 0), [null, null]);
});
