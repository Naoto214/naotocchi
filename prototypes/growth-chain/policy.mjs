import { random, createBag } from "./random.mjs";
import { applyAction, placements } from "./session.mjs";
import { HIDDEN } from "./engine.mjs";
export const POLICY_VERSION = "one-ply-chain-height-v1";
// Only public information. Hypothetical bag is fixed and never used by evaluation.
export function publicView(s) {
  return {
    version: s.version,
    seed: 0,
    rules: s.rules,
    board: s.board,
    eggs: s.eggs,
    gauge: s.gauge,
    queue: s.queue,
    nextId: s.nextId,
    score: s.score,
    drops: s.drops,
    actions: s.actions,
    over: s.over,
  };
}
function simulation(s) {
  return { ...publicView(s), bag: createBag(0, s.rules) };
}
export function evaluate(s) {
  if (s.over) return -1e8;
  let count = 0,
    power = 0,
    heights = [],
    potential = 0;
  for (let x = 0; x < s.rules.width; x++) {
    let h = 0;
    for (let y = HIDDEN; y < s.board.length; y++) {
      let c = s.board[y][x];
      if (c) {
        count++;
        power += Math.pow(c.s, 1.5);
        if (!h) h = s.board.length - y;
        for (const [dx, dy] of [
          [1, 0],
          [0, -1],
        ]) {
          let n = s.board[y + dy]?.[x + dx];
          if (n && n.k === c.k && Math.abs(n.s - c.s) === 1) potential++;
        }
      }
    }
    heights.push(h);
  }
  // Clear space + even low skyline, reward growth and setup for later cascades.
  return (
    -count * 10 -
    Math.max(...heights) * 8 -
    heights.reduce((a, h) => a + h * h, 0) * 0.55 +
    power * 1.6 +
    potential * 2 +
    (s.last?.waves.length || 0) * 12 +
    (s.last?.deaths || 0) * 24
  );
}
export function itemActions(s, mode = "both") {
  if (s.over || mode === "none") return [];
  let out = [],
    r = s.rules;
  if (mode === "eggs" || mode === "both")
    for (let rank = 0; rank < 4; rank++)
      if (s.eggs[rank])
        for (let k = 0; k < r.kinds; k++)
          for (let x = 0; x < r.width; x++) {
            if (r.eggPlacement === "column") {
              if (!s.board[HIDDEN][x]) out.push({ type: "egg", rank, k, x });
            } else
              for (let y = HIDDEN; y < s.board.length; y++)
                if (!s.board[y][x]) out.push({ type: "egg", rank, k, x, y });
          }
  if (mode === "transform" || mode === "both") {
    if (s.gauge >= r.gaugeUnit)
      for (let y = HIDDEN; y < s.board.length; y++)
        for (let x = 0; x < r.width; x++) {
          let c = s.board[y][x];
          if (c)
            for (let to = 0; to < r.kinds; to++)
              if (to !== c.k) out.push({ type: "transform", x, y, to });
        }
    if (s.gauge >= 3 * r.gaugeUnit) {
      let ks = new Set(
        s.board
          .flat()
          .filter(Boolean)
          .map((c) => c.k),
      );
      for (let from of [...ks].sort())
        for (let to = 0; to < r.kinds; to++)
          if (from !== to) out.push({ type: "bulk", from, to });
    }
  }
  return out;
}
export function chooseAction(s, policy, rng, options = {}) {
  let moves = placements(s);
  if (!moves.length) return null;
  if (policy === "random") return moves[Math.floor(random(rng) * moves.length)];
  if (!["strategic", "beam2"].includes(policy)) throw Error("Unknown policy");
  const sim = simulation(s),
    ranked = moves
      .map((a) => {
        let z = applyAction(sim, a, false);
        return { a, z, value: evaluate(z) };
      })
      .sort((a, b) => b.value - a.value);
  if (policy === "beam2")
    for (let v of ranked.slice(0, 2)) {
      let follow = placements(v.z),
        best = follow.length
          ? Math.max(...follow.map((a) => evaluate(applyAction(v.z, a, false))))
          : -1e8;
      v.value = 0.3 * v.value + 0.7 * best;
    }
  const candidates = policy === "beam2" ? ranked.slice(0, 2) : ranked;
  candidates.sort((a, b) => b.value - a.value);
  let best = candidates[0];
  if (options.items && options.items !== "none") {
    const baseline = evaluate({ ...sim, last: undefined });
    let itemBest = null;
    for (const a of itemActions(sim, options.items)) {
      if (options.bulkOnly && a.type === "transform") continue;
      if (
        options.reserve &&
        a.type === "bulk" &&
        sim.gauge < 6 * sim.rules.gaugeUnit
      )
        continue;
      if (
        options.reserve &&
        a.type === "transform" &&
        sim.gauge < 4 * sim.rules.gaugeUnit
      )
        continue;
      let z = applyAction(sim, a, false),
        value =
          evaluate(z) -
          (a.type === "bulk" ? 8 : a.type === "transform" ? 3 : 2);
      // Use only materially productive actions. Resource cost biases against spam.
      if (
        !z.over &&
        value > baseline + 8 &&
        (!itemBest || value > itemBest.value)
      )
        itemBest = { a, value };
    }
    if (itemBest) return itemBest.a;
  }
  const ties = candidates.filter((v) => Math.abs(v.value - best.value) < 1e-8);
  return ties[Math.floor(random(rng) * ties.length)].a;
}
