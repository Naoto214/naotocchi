// Presentation only: every evolution comes from the engine's events.
import { lines, landing, kind, stage } from "../../engine.mjs";
const compress = (b, n, dir) => {
  const out = b.map(() => 0);
  for (const line of lines(n, dir)) {
    const values = line.map((i) => b[i]).filter(Boolean);
    values.forEach((v, j) => (out[line[j]] = v));
  }
  return out;
};
export function frames(before, a, result) {
  if (!result.valid) return [];
  let b = [...before.board];
  const n = before.config.size;
  const out = [];
  if (a.type === "slide") b = compress(b, n, a.dir);
  if (a.type === "egg")
    b[landing(before, a.dir, a.lane)] = a.kind * 8 + a.rank + 1;
  if (a.type === "single") b[a.index] = a.kind * 8 + stage(b[a.index]);
  if (a.type === "bulk")
    b = b.map((v) => (v && kind(v) === a.from ? a.kind * 8 + stage(v) : v));
  out.push({ board: [...b], chain: 0, events: [] });
  for (const wave of result.waves) {
    for (const e of wave.events) {
      for (const i of e.cells) b[i] = 0;
      if (!e.death) b[e.anchor] = e.kind * 8 + e.to;
    }
    if (a.type === "slide") b = compress(b, n, a.dir);
    out.push({ board: [...b], chain: wave.chain, events: wave.events });
  }
  return out;
}

// Compression keeps lane order, so identical images still retain distinct origins.
export function slideMoves(board, size, dir) {
  return lines(size, dir).flatMap(line => line.filter(i => board[i]).map((from,j)=>({from,to:line[j],value:board[from]})));
}
