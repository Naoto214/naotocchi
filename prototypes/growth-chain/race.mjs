// Offline comparison only. Does not alter endless sessions or claim real-time fairness.
import assert from "node:assert/strict";
import { replay, applyAction, hasLegalPlacement } from "./session.mjs";
export function compareRace(a, b, { clock = "actions" } = {}) {
  if (!["actions", "slots"].includes(clock))
    throw Error("Unknown comparison clock");
  assert.deepEqual(
    a.initial,
    b.initial,
    "Race requires identical initial conditions",
  );
  const inspect = (record) => {
    if(record.initial.over && hasLegalPlacement({...record.initial,over:null}))throw Error("Invalid ended initial board");
    const end = replay(record); // Validate full legal history and optional checksum.
    let s = structuredClone(record.initial),
      firstDeath = null;
    for (let i = 0; i < record.actions.length && !firstDeath; i++) {
      s = applyAction(s, record.actions[i], false);
      const wave = s.last.waves.find((w) => w.events.some((e) => e.death));
      if (wave) firstDeath = { action: i + 1, drop: s.drops, wave: wave.chain };
    }
    return { end, firstDeath };
  };
  const sides = [inspect(a), inspect(b)],
    deaths = sides.map((s) => s.firstDeath),
    scores = sides.map((s) => s.end.score);
  const beyondActions = (i) => [a, b][i].actions.length;
  let winner = null,
    reason = "unfinished";
  if (deaths.some(Boolean)) {
    const leader = deaths[0] ? 0 : 1,
      other = 1 - leader;
    if (
      !deaths[other] &&
      !sides[other].end.over &&
      (clock === "actions"
        ? beyondActions(other) < deaths[leader].action
        : sides[other].end.drops <= deaths[leader].drop)
    )
      return {
        experimental: true,
        clock,
        winner: null,
        reason: "unfinished",
        deaths,
        scores,
        ended: sides.map((s) => !!s.end.over),
      };
    reason = "death";
    if (!deaths[0]) winner = "B";
    else if (!deaths[1]) winner = "A";
    else {
      const key = clock === "actions" ? "action" : "drop",
        d = deaths[0][key] - deaths[1][key] || deaths[0].wave - deaths[1].wave;
      winner = d < 0 ? "A" : d > 0 ? "B" : "draw";
    }
  } else if (sides.every((s) => s.end.over)) {
    reason = "score";
    winner = scores[0] > scores[1] ? "A" : scores[0] < scores[1] ? "B" : "draw";
  }
  return {
    experimental: true,
    clock,
    winner,
    reason,
    deaths,
    scores,
    ended: sides.map((s) => !!s.end.over),
  };
}
