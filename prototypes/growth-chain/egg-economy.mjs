import assert from "node:assert/strict";
import { applyAction, stateHash } from "./session.mjs";
export const resourcePotential = (s) =>
  s.board.flat().reduce((n, c) => n + (c ? c.s + 1 : 0), 0) +
  s.eggs.reduce((n, e, i) => n + e * (i + 2), 0);
export function economyMetrics(initial, actions) {
  let s = structuredClone(initial),
    initialEggs = [...s.eggs],
    lineage = new Set();
  const m = {
    drops: 0,
    actions: actions.length,
    earned: [0, 0, 0, 0],
    spent: [0, 0, 0, 0],
    eggInducedRewards: [0, 0, 0, 0],
    maxStock: [...s.eggs],
    causalRewards: 0,
    descendantDeaths: 0,
    created08: 0,
    deathGroups: 0,
    first08: null,
    firstDeath: null,
    firstEgg: null,
    maxChain: 0,
    chains2: 0,
    chains3: 0,
    chains5: 0,
    gaugeEarned: 0,
    gaugeSpent: 0,
    gaugeFromTools: 0,
    transforms: 0,
    bulks: 0,
    eggGrowth: 0,
    maxToolStreak: 0,
    positiveGaugeActions: 0,
    series: [],
  };
  let streak = 0;
  for (let i = 0; i < actions.length; i++) {
    const a = actions[i],
      before = resourcePotential(s),
      gauge = s.gauge;
    if (a.type === "egg") {
      m.spent[a.rank]++;
      if (initialEggs[a.rank]) initialEggs[a.rank]--;
      else lineage.add(s.nextId);
    }
    if (a.type === "transform") {
      m.transforms++;
      m.gaugeSpent += s.rules.gaugeUnit;
    }
    if (a.type === "bulk") {
      m.bulks++;
      m.gaugeSpent += 3 * s.rules.gaugeUnit;
    }
    s = applyAction(s, a, false);
    let groups = 0;
    for (const w of s.last.waves)
      for (const e of w.events) {
        groups++;
        const carries = e.consumed.some((id) => lineage.has(id));
        for (const id of e.consumed) lineage.delete(id);
        if (carries) {
          if (e.death) m.descendantDeaths++;
          else lineage.add(e.anchor.id);
          m.causalRewards += e.eggCount;
        }
        if (e.death) {
          m.deathGroups++;
          m.firstDeath ??= { drop: s.drops, action: i + 1, wave: w.chain };
        }
        if (e.eggCount)
          m.firstEgg ??= { drop: s.drops, action: i + 1, wave: w.chain };
      }
    // Every prefix is bounded, including egg spending and rewards in the same action.
    assert.ok(
      resourcePotential(s) <= before + (a.type === "drop" ? 4 : 0) - groups,
      "resource potential grew without a normal pair",
    );
    m.earned = m.earned.map((n, j) => n + s.last.eggs[j]);
    m.maxStock = m.maxStock.map((n, j) => Math.max(n, s.eggs[j]));
    if (a.type === "egg") {
      m.eggGrowth += s.last.gauge;
      m.eggInducedRewards = m.eggInducedRewards.map(
        (n, j) => n + s.last.eggs[j],
      );
    }
    m.created08 += s.last.created08;
    if (s.last.created08) m.first08 ??= { drop: s.drops, action: i + 1 };
    m.gaugeEarned += s.last.gauge;
    if (a.type !== "drop") {
      m.gaugeFromTools += s.last.gauge;
      if (s.gauge > gauge) m.positiveGaugeActions++;
    }
    streak = a.type === "drop" ? 0 : streak + 1;
    m.maxToolStreak = Math.max(streak, m.maxToolStreak);
    m.maxChain = Math.max(m.maxChain, s.last.waves.length);
    for (const n of [2, 3, 5]) if (s.last.waves.length >= n) m["chains" + n]++;
    assert.deepEqual(
      s.eggs,
      initial.eggs.map((n, j) => n + m.earned[j] - m.spent[j]),
    );
    assert.equal(s.gauge, initial.gauge + m.gaugeEarned - m.gaugeSpent);
    m.series.push([
      i + 1,
      s.drops,
      ...s.eggs,
      s.gauge,
      s.score,
      resourcePotential(s),
    ]);
  }
  return {
    ...m,
    drops: s.drops,
    over: !!s.over,
    endReason: s.over,
    remaining: s.eggs,
    gaugeRemaining: s.gauge,
    score: s.score,
    hash: stateHash(s),
  };
}
