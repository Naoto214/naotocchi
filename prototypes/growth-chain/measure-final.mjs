import fs from "node:fs";
import { runTrial, expandAction, summarize } from "./experiments.mjs";
import { standardRules } from "./rules.mjs";
import { replay } from "./session.mjs";
const out = new URL("./qa-final-20261014/", import.meta.url);
fs.mkdirSync(out, { recursive: true });
for (const [label, unit, items, bulkOnly] of [
  ["normal", 8, "none", false],
  ["gauge8", 8, "both", false],
  ["gauge12", 12, "both", false],
  ["bulk8", 8, "both", true],
  ["bulk12", 12, "both", true],
]) {
  const trials = [];
  for (let seed = 0; seed < 40; seed++) {
    const file = new URL(`${label}-${seed}.json`, out);
    let t;
    if (fs.existsSync(file)) t = JSON.parse(fs.readFileSync(file));
    else {
      t = runTrial({
        seed,
        limit: 1000,
        rules: standardRules({ gaugeUnit: unit }),
        items,
        bulkOnly,
      });
      fs.writeFileSync(file, JSON.stringify(t));
    }
    replay({
      version: t.initial.version,
      initial: t.initial,
      actions: t.actions.map(expandAction),
      hash: t.hash,
    });
    trials.push(t);
    console.log(label, seed, t.drops, t.created08);
  }
  fs.writeFileSync(
    new URL(`${label}-summary.json`, out),
    JSON.stringify(summarize(trials), null, 2),
  );
}
