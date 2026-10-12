import { configuration, VERSION } from "./rules.mjs";
import {
  createSession,
  applyAction,
  stateHash,
  stateData,
} from "./session.mjs";
import { chooseAction, POLICY_VERSION } from "./policy.mjs";
import { fileURLToPath } from "node:url";
const codes = { left: "L", right: "R", rotate: "T", down: "D", hard: "H" },
  ops = Object.fromEntries(Object.entries(codes).map(([k, v]) => [v, k]));
export const compactAction = (a) =>
  a.type === "drop" ? a.path.map((p) => codes[p]).join("") : a;
export const expandAction = (a) =>
  typeof a === "string" ? { type: "drop", path: [...a].map((c) => ops[c]) } : a;
export function runTrial({
  seed,
  limit = 500,
  policy = "strategic",
  rules = {},
  items = "none",
  reserve = false,
  bulkOnly = false,
  initialResources = {},
  onWitness,
}) {
  let s = createSession(seed, configuration(rules), initialResources),
    initial = stateData(s),
    actions = [],
    rng = { state: (seed ^ 0xa511e9b3) >>> 0 },
    itemSinceDrop = 0;
  let m = {
    seed,
    policy,
    limit,
    items,
    reserve,
    drops: 0,
    actionCount: 0,
    maxChain: 0,
    chains2: 0,
    chains3: 0,
    chains5: 0,
    dropChains2: 0,
    dropChains3: 0,
    dropChains5: 0,
    created08: 0,
    deaths: 0,
    first08: null,
    eggsEarned: [0, 0, 0, 0],
    eggsSpent: [0, 0, 0, 0],
    transforms: 0,
    bulks: 0,
    inputs: 0,
    peakOccupancy: 0,
  };
  while (!s.over && s.drops < limit) {
    let a = chooseAction(s, policy, rng, {
      items: itemSinceDrop < 2 ? items : "none",
      reserve,
      bulkOnly,
    });
    if (!a) break;
    s = applyAction(s, a, false);
    actions.push(compactAction(a));
    const w = s.last.waves.length;
    if (a.type === "drop") {
      itemSinceDrop = 0;
      m.inputs += a.path.length;
    } else {
      itemSinceDrop++;
      m.inputs += a.type === "bulk" ? 3 : 3;
    }
    m.maxChain = Math.max(m.maxChain, w);
    for (let n of [2, 3, 5])
      if (w >= n) {
        m["chains" + n]++;
        if (a.type === "drop") m["dropChains" + n]++;
      }
    m.created08 += s.last.created08;
    m.deaths += s.last.deaths;
    if (s.last.created08 && m.first08 === null) m.first08 = s.drops;
    m.eggsEarned = m.eggsEarned.map((v, i) => v + s.last.eggs[i]);
    if (a.type === "egg") m.eggsSpent[a.rank]++;
    if (a.type === "transform") m.transforms++;
    if (a.type === "bulk") m.bulks++;
    m.peakOccupancy = Math.max(
      m.peakOccupancy,
      s.board.flat().filter(Boolean).length,
    );
    if ((w === 3 || w === 5) && onWitness)
      onWitness(w, {
        version: VERSION,
        initial,
        actions: actions.map(expandAction),
        hash: stateHash(s),
        origin: "legal-play",
        policy,
        policyVersion: POLICY_VERSION,
      });
  }
  return {
    ...m,
    drops: s.drops,
    actionCount: actions.length,
    over: s.over,
    censored: !s.over && s.drops === limit,
    eggsRemaining: s.eggs,
    gaugeRemaining: s.gauge,
    score: s.score,
    hash: stateHash(s),
    initial,
    actions,
  };
}
export function wilson(k, n) {
  if (!n) return [null, null];
  const z = 1.95996398454,
    p = k / n,
    d = 1 + (z * z) / n,
    mid = (p + (z * z) / (2 * n)) / d,
    half = (z * Math.sqrt((p * (1 - p)) / n + (z * z) / (4 * n * n))) / d;
  return [Math.max(0, mid - half), Math.min(1, mid + half)];
}
export function summarize(ts) {
  const sum = (k) => ts.reduce((n, t) => n + t[k], 0),
    ratio = (fn) => {
      let k = ts.filter(fn).length;
      return {
        count: k,
        rate: ts.length ? k / ts.length : null,
        ci: wilson(k, ts.length),
      };
    };
  let drops = sum("drops"),
    actions = sum("actionCount");
  return {
    runs: ts.length,
    drops,
    actions,
    censored: ts.filter((t) => t.censored).length,
    gameOver: ratio((t) => !!t.over),
    reach08: ratio((t) => t.created08 > 0),
    death08: ratio((t) => t.deaths > 0),
    maxChain: Math.max(0, ...ts.map((t) => t.maxChain)),
    meanMaxChain: sum("maxChain") / ts.length,
    meanDrops: drops / ts.length,
    chainPerDrop: Object.fromEntries(
      [2, 3, 5].map((n) => [n, sum("dropChains" + n) / drops]),
    ),
    chainPerAction: Object.fromEntries(
      [2, 3, 5].map((n) => [n, sum("chains" + n) / actions]),
    ),
    meanInputsPerDrop: sum("inputs") / drops,
    transforms: sum("transforms"),
    bulks: sum("bulks"),
    eggsEarned: [0, 1, 2, 3].map((i) =>
      ts.reduce((n, t) => n + t.eggsEarned[i], 0),
    ),
    eggsSpent: [0, 1, 2, 3].map((i) =>
      ts.reduce((n, t) => n + t.eggsSpent[i], 0),
    ),
    meanGaugeRemaining: sum("gaugeRemaining") / ts.length,
  };
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const fs = await import("node:fs");
  const job = JSON.parse(fs.readFileSync(process.argv[2], "utf8")),
    out = process.argv[3];
  fs.mkdirSync(out, { recursive: true });
  const started = performance.now(),
    trials = [],
    found = new Set();
  for (const seed of job.seeds) {
    trials.push(
      runTrial({
        ...job,
        seed,
        onWitness: (chain, record) => {
          if (found.has(chain)) return;
          found.add(chain);
          fs.writeFileSync(
            `${out}/${job.id}-witness-${chain}.json`,
            JSON.stringify(record),
          );
        },
      }),
    );
    if (trials.length % 25 === 0)
      console.log(`${job.id} ${trials.length}/${job.seeds.length}`);
  }
  const data = {
    version: VERSION,
    policyVersion: POLICY_VERSION,
    rng: "mulberry32-v1",
    job,
    summary: summarize(trials),
    elapsedSeconds: (performance.now() - started) / 1000,
    trials,
  };
  fs.writeFileSync(`${out}/${job.id}.json`, JSON.stringify(data));
  console.log(
    JSON.stringify({
      id: job.id,
      ...data.summary,
      elapsedSeconds: data.elapsedSeconds,
    }),
  );
}
