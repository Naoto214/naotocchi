import fs from "node:fs";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import { standardRules } from "./rules.mjs";
import { createSession, applyAction, stateData } from "./session.mjs";
import { chooseEggPolicy } from "./egg-policy.mjs";
import { economyMetrics } from "./egg-economy.mjs";
import { compactAction } from "./experiments.mjs";
import { ensureManifest } from "./balance-manifest.mjs";
export const directory = new URL("./egg-results-20261014/", import.meta.url);
export const conditions = ["death", "evolution"].flatMap((mode) =>
  ["drop", "active", "reserve"].map((policy) => ({
    id: `${mode}-${policy}`,
    mode,
    policy,
  })),
);
export const protocol = {
  version: "evolution-eggs-v1",
  seeds: Array.from({ length: 32 }, (_, i) => 104 + i),
  conditions,
  dropLimit: 500,
  actionLimit: 5000,
  toolCap: 8,
  gauge: [8, 24],
  initialEggs: [0, 0, 0, 0],
  information: "board/current/NEXT3/resources only; hidden seed/bag replaced",
  raceClocks: ["actions", "slots"],
  time: "no human elapsed-time inference",
  seriesColumns: [
    "action",
    "drop",
    "ordinary",
    "silver",
    "gold",
    "platinum",
    "gauge",
    "score",
    "potential",
  ],
};
export function run(c, seed) {
  let s = createSession(seed, standardRules({ eggReward: c.mode })),
    initial = stateData(s),
    actions = [],
    streak = 0,
    capHits = 0;
  while (
    !s.over &&
    s.drops < protocol.dropLimit &&
    actions.length < protocol.actionLimit
  ) {
    if (streak === protocol.toolCap) capHits++;
    const a = chooseEggPolicy(s, c.policy, {
      allowItems: streak < protocol.toolCap,
    });
    if (!a) throw Error("Missing legal action");
    s = applyAction(s, a, false);
    actions.push(a);
    streak = a.type === "drop" ? 0 : streak + 1;
  }
  return {
    condition: c,
    seed,
    initial,
    actions: actions.map(compactAction),
    metrics: economyMetrics(initial, actions),
    censored: !s.over,
    capHits,
  };
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  fs.mkdirSync(directory, { recursive: true });
  const files = new Set();
  function visit(f) {
    if (files.has(f)) return;
    files.add(f);
    for (const m of fs
      .readFileSync(new URL(f, import.meta.url), "utf8")
      .matchAll(/(?:from\s*|import\s*)['"]\.\/([^'"]+\.mjs)['"]/g))
      visit(m[1]);
  }
  visit("egg-run.mjs");
  const proof = {
    ...protocol,
    hashes: Object.fromEntries(
      [...files].sort().map((f) => [
        f,
        crypto
          .createHash("sha256")
          .update(fs.readFileSync(new URL(f, import.meta.url)))
          .digest("hex"),
      ]),
    ),
  };
  ensureManifest(new URL("manifest.json", directory), proof);
  const worker = Number(process.argv[2] || 0),
    workers = Number(process.argv[3] || 1);
  let job = 0;
  for (const c of conditions)
    for (const seed of protocol.seeds) {
      if (job++ % workers !== worker) continue;
      const f = new URL(`${c.id}-${seed}.json`, directory);
      if (fs.existsSync(f)) continue;
      const t = run(c, seed);
      fs.writeFileSync(f, JSON.stringify(t));
      console.log(
        c.id,
        seed,
        t.metrics.drops,
        t.metrics.created08,
        t.metrics.deathGroups,
        t.censored,
        t.capHits,
      );
    }
}
