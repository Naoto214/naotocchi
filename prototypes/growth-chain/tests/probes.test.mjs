import { test } from "node:test";
import assert from "node:assert/strict";
import { probes } from "../probes.mjs";
import { replay, stateHash } from "../session.mjs";
test("all targeted probe histories replay with exact hash", () => {
  for (const p of probes()) assert.equal(stateHash(replay(p)), p.hash, p.id);
});
test("all death boundaries from1 to7 and group/pairs resources observable", () => {
  let ps = probes();
  for (const p of ps.filter((x) => x.id.startsWith("life-"))) {
    let [_, n, b] = p.id.split("-");
    assert.equal(p.chain, Number(n));
    let rank = [...b].map(Number).filter((v) => v <= Number(n)).length - 1;
    assert.equal(p.eggDelta[rank], 1);
  }
  assert.equal(ps.find((p) => p.id === "egg-count-group").eggDelta[0], 1);
  assert.equal(ps.find((p) => p.id === "egg-count-pairs").eggDelta[0], 3);
});
test("bulk can execute four independent setups together versus single one", () => {
  let ps = probes(),
    bulk = ps.find((p) => p.id === "four-targets-bulk"),
    one = ps.find((p) => p.id === "four-targets-transform");
  assert.equal(bulk.events[0].length, 4);
  assert.equal(one.events[0].length, 1);
});
