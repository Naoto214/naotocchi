import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { step } from "../engine.mjs";
import { frames } from "../animation.mjs";
test("presentation frames end at the exact engine board for every proof action", () => {
  const cert = JSON.parse(
    readFileSync(
      new URL(
        "../balance-20261015/results/proof-D-cluster-3.json",
        import.meta.url,
      ),
    ),
  );
  let s = cert.initial;
  for (const a of cert.actions) {
    const r = step(s, a),
      before = JSON.stringify(s);
    const f = frames(s, a, r);
    assert.deepEqual(f.at(-1).board, r.state.board);
    assert.equal(JSON.stringify(s), before);
    s = r.state;
  }
});
