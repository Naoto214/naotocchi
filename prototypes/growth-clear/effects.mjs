// Reuse the verified snapshot timeline; add semantic phases for mixed clearing.
import { animationFrames } from "../growth-chain/animation.mjs";
export function effects(waves, reduced = false) {
  return animationFrames(waves, 420, reduced).map((f) => ({
    ...f,
    phase: f.phase === "evolve" ? "pop" : f.phase,
  }));
}
export function eggEffects(direct, reduced = false) {
  return (reduced ? ["hatch"] : ["eggfall", "crack", "hatch"]).map((phase) => ({
    phase,
    board: direct.board,
    placed: direct.placed,
    events: [],
    chain: 0,
    duration: reduced ? 120 : 160,
  }));
}
