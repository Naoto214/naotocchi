// All values are laboratory hypotheses, NOT production game rules.
export const VERSION = "growth-chain-lab/1";
export const OPTIONS = {
  anchor: ["bottom", "changed"],
  bulkAnchor: ["bottom", "changed"],
  consume: ["all", "five"],
  competition: ["component", "disjoint"],
  deathSpecies: ["same", "any"],
  eggCount: ["group", "pairs"],
  gaugeMetric: ["consumed", "growth"],
  scoreMode: ["linear", "chain"],
  topOut: ["lock", "settled"],
  eggPlacement: ["column", "free"],
  bag: ["fourEach", "fixed20"],
};
export function configuration(p = {}) {
  const r = {
    width: 6,
    height: 12,
    kinds: 5,
    anchor: "bottom",
    bulkAnchor: "bottom",
    consume: "all",
    competition: "component",
    pairFirst: false,
    deathSpecies: "same",
    eggCount: "group",
    eggThresholds: [1, 2, 3, 4],
    gaugeMetric: "consumed",
    gaugeUnit: 16,
    scoreMode: "linear",
    topOut: "lock",
    eggPlacement: "column",
    bag: "fourEach",
    ...p,
  };
  for (const k of Object.keys(p))
    if (
      !(k in r) ||
      ![
        "width",
        "height",
        "kinds",
        "pairFirst",
        "eggThresholds",
        "gaugeUnit",
        ...Object.keys(OPTIONS),
      ].includes(k)
    )
      throw Error("Unknown rule " + k);
  for (const [k, vs] of Object.entries(OPTIONS))
    if (!vs.includes(r[k])) throw Error("Invalid " + k);
  if (
    ![6, 7].includes(r.width) ||
    r.height !== 12 ||
    ![4, 5, 6].includes(r.kinds) ||
    typeof r.pairFirst !== "boolean" ||
    !Number.isInteger(r.gaugeUnit) ||
    r.gaugeUnit < 1
  )
    throw Error("Invalid numeric rule");
  if (
    !Array.isArray(r.eggThresholds) ||
    r.eggThresholds.length !== 4 ||
    r.eggThresholds[0] !== 1 ||
    r.eggThresholds.some(
      (n, i) =>
        !Number.isInteger(n) || n < 1 || (i && n <= r.eggThresholds[i - 1]),
    )
  )
    throw Error("Invalid egg thresholds");
  // Disjoint partitions are meaningful only with bounded consumption.
  if (r.competition === "disjoint" && r.consume !== "five")
    throw Error("disjoint requires consume=five");
  r.eggThresholds = Object.freeze([...r.eggThresholds]);
  return Object.freeze(r);
}
