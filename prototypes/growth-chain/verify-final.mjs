import fs from "node:fs";
import assert from "node:assert/strict";
import { applyAction, stateHash } from "./session.mjs";
import { expandAction, summarize } from "./experiments.mjs";
const dir = new URL("./qa-final-20261014/", import.meta.url);
let trials = 0,
  actions = 0;
for (const label of ["normal", "gauge8", "gauge12", "bulk8", "bulk12"]) {
  const ts = [];
  for (let seed = 0; seed < 40; seed++) {
    const t = JSON.parse(
      fs.readFileSync(new URL(`${label}-${seed}.json`, dir)),
    );
    let s = structuredClone(t.initial),
      created = 0,
      deaths = 0,
      max = 0,
      earned = [0, 0, 0, 0],
      spent = [0, 0, 0, 0],
      score = 0;
    for (const raw of t.actions) {
      const a = expandAction(raw);
      s = applyAction(s, a, false);
      actions++;
      created += s.last.created08;
      deaths += s.last.deaths;
      max = Math.max(max, s.last.waves.length);
      score += s.last.score;
      earned = earned.map((n, i) => n + s.last.eggs[i]);
      if (a.type === "egg") spent[a.rank]++;
    }
    assert.equal(stateHash(s), t.hash);
    assert.equal(s.score, score);
    assert.equal(s.score, t.score);
    assert.equal(created, t.created08);
    assert.equal(deaths, t.deaths);
    assert.equal(max, t.maxChain);
    assert.deepEqual(earned, t.eggsEarned);
    assert.deepEqual(spent, t.eggsSpent);
    assert.deepEqual(s.eggs, t.eggsRemaining);
    assert.equal(s.gauge, t.gaugeRemaining);
    assert.equal(s.over, t.over);
    ts.push(t);
    trials++;
  }
  assert.deepEqual(
    summarize(ts),
    JSON.parse(fs.readFileSync(new URL(`${label}-summary.json`, dir))),
  );
}
console.log(
  JSON.stringify({
    status: "PASS",
    trials,
    actions,
    checks: [
      "final hash",
      "score",
      "gauge",
      "egg earn/spend",
      "08",
      "chains",
      "end",
      "summaries",
    ],
  }),
);
