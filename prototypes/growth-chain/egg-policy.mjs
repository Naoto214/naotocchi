// Measurement only; fixed visible-information strategy shared by both reward modes.
import { featureValue } from "./balance-policy.mjs";
import { publicView, itemActions } from "./policy.mjs";
import { createBag } from "./random.mjs";
import { applyAction, placements, spawnPose } from "./session.mjs";
import { toolTransaction } from "./live-tools.mjs";
const value = (s) =>
  featureValue({ ...s, eggs: [0, 0, 0, 0] }, "life") +
  s.eggs.reduce((n, e, i) => n + e * (i + 2), 0);
const reward = (z) =>
  z.last.waves.reduce(
    (n, w) => n + w.events.filter((e) => e.death).length * 1200,
    0,
  ) +
  z.last.created08 * 80 +
  z.last.waves.length * 16;
function candidates(s, policy, allowItems) {
  const rows = [],
    base = value(s);
  for (const a of [
    ...placements(s),
    ...(policy !== "drop" && allowItems ? itemActions(s, "both") : []),
  ]) {
    // Reserve three bars except when an08 conversion may immediately win.
    if (
      a.type === "transform" &&
      s.gauge < 3 * s.rules.gaugeUnit &&
      s.board[a.y][a.x].s !== 8
    )
      continue;
    let z;
    try {
      z =
        a.type === "drop"
          ? applyAction(s, a, false)
          : toolTransaction(s, spawnPose(s.rules), a).state;
    } catch {
      continue;
    }
    const event = reward(z),
      v = value(z) + event;
    if (a.type !== "drop" && (z.over || v <= base + 4)) continue;
    if (
      a.type === "egg" &&
      policy === "reserve" &&
      s.eggs[a.rank] <= 1 &&
      z.last.waves.length < 2 &&
      !z.last.created08 &&
      !z.last.deaths
    )
      continue;
    rows.push({ a, z, event, v });
  }
  return rows.sort((a, b) => b.v - a.v);
}
export function chooseEggPolicy(input, policy, { allowItems = true } = {}) {
  if (!["drop", "active", "reserve"].includes(policy))
    throw Error("Unknown egg policy");
  const s = { ...publicView(input), bag: createBag(0, input.rules) },
    rows = candidates(s, policy, allowItems);
  if (!rows.length) return null;
  if (!s.board.flat().some((c) => c?.s >= 6)) return rows[0].a;
  // Two actions ahead, top two immediate candidates, no hidden future bag use.
  const beam = rows.slice(0, 2);
  for (const r of beam) {
    const next = candidates(r.z, policy, allowItems);
    if (next.length) r.v = 0.25 * r.v + 0.75 * (r.event + next[0].v);
  }
  return beam.sort((a, b) => b.v - a.v)[0].a;
}
