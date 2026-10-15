import { step, validate, candidates } from "./engine.mjs";
const clone = (x) => structuredClone(x);
export function newRun(initial, species, proof, id = crypto.randomUUID()) {
  validate(initial);
  if (
    !Array.isArray(species) ||
    species.length !== 3 ||
    new Set(species).size !== 3 ||
    species.some((x) => typeof x !== "string")
  )
    throw Error("3種族を選んでください");
  return {
    version: 1,
    id,
    proof,
    species: [...species],
    initial: clone(initial),
    state: clone(initial),
    previous: null,
    practice: false,
    undoCount: 0,
    elapsedMs: 0,
    deaths: [],
    ended: false,
  };
}
export function advance(p, a) {
  if (p.ended) return { valid: false, state: p.state, waves: [] };
  const r = step(p.state, a);
  if (!r.valid) return r;
  p.previous = {
    state: clone(p.state),
    deaths: clone(p.deaths),
    action: clone(a),
  };
  p.state = r.state;
  p.deaths.push(
    ...r.waves.flatMap((w) =>
      w.events.filter((e) => e.death).map((e) => e.kind),
    ),
  );
  return r;
}
export function undo(p, confirmed) {
  if (
    p.ended ||
    !p.previous ||
    (!p.practice && !confirmed) ||
    p.mode === "versus"
  )
    return false;
  p.state = clone(p.previous.state);
  p.deaths = clone(p.previous.deaths);
  p.previous = null;
  p.practice = true;
  p.undoCount++;
  return true;
}
export function hasMoves(s) {
  for (const a of candidates(s)) if (step(s, a).valid) return true;
  return false;
}
export function restore(raw, allowed) {
  const p = clone(raw);
  validate(p.state);
  validate(p.initial);
  if (
    p.version !== 1 ||
    typeof p.id !== "string" ||
    typeof p.proof !== "string" ||
    !Array.isArray(p.species) ||
    p.species.length !== 3 ||
    new Set(p.species).size !== 3 ||
    !p.species.every((x) => allowed.includes(x)) ||
    typeof p.practice !== "boolean" ||
    typeof p.ended !== "boolean" ||
    !Number.isSafeInteger(p.undoCount) ||
    p.undoCount < 0 ||
    (p.undoCount > 0 && !p.practice) ||
    !Number.isFinite(p.elapsedMs) ||
    p.elapsedMs < 0 ||
    !Array.isArray(p.deaths) ||
    p.deaths.some((x) => ![0, 1, 2].includes(x))
  )
    throw Error("途中保存を確認してください");
  if (
    JSON.stringify(p.state.config) !== JSON.stringify(p.initial.config) ||
    p.state.seed !== p.initial.seed
  )
    throw Error("盤面設定の不一致");
  if (p.previous) {
    validate(p.previous.state);
    const r = step(p.previous.state, p.previous.action);
    if (
      !r.valid ||
      JSON.stringify(r.state) !== JSON.stringify(p.state) ||
      !Array.isArray(p.previous.deaths)
    )
      throw Error("Undo状態の不一致");
  }
  return p;
}
export function record(p) {
  return {
    id: p.id,
    practice: p.practice,
    won: p.state.won,
    moves: p.state.moves,
    score: p.state.score,
    elapsedMs: p.elapsedMs,
    deaths: p.deaths.length,
    species: p.deaths.map((k) => p.species[k]),
    date: new Date().toISOString(),
  };
}
