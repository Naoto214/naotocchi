import { STORE_KEY } from "./player-store.mjs";

// Comparison is opt-in per URL, never a persisted change to standard rules.
export function playerProfile(search = "") {
  const params = new URLSearchParams(search);
  const values = params.getAll("trial");
  const trial = values.length === 1 && ["2", "3", "4"].includes(values[0]);
  const gaugeUnit = trial ? Number(values[0]) : 8;
  return {
    trial,
    gaugeUnit,
    storeKey: trial ? `${STORE_KEY}-trial-${gaugeUnit}` : STORE_KEY,
    label: trial ? `試遊比較 ${gaugeUnit}／${gaugeUnit * 3} · 未正式採用` : "標準 8／24",
  };
}
