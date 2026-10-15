import { step, stage, kind } from './engine.mjs';
export function metrics(initial, path) {
  let s = initial,
    maxChain = 0,
    chainActions = 0,
    evolvingSlides = 0,
    slides = 0,
    reached08 = false,
    same08 = false,
    events = 0;
  const frequency = {},
    kcounts = Array(s.config.kinds).fill(0);
  for (const v of s.board) if (stage(v) === 8) kcounts[kind(v)]++;
  reached08 = kcounts.some((x) => x > 0);
  same08 = kcounts.some((x) => x >= 2);
  for (const a of path) {
    const r = step(s, a);
    if (!r.valid) throw Error('Illegal measurement path');
    if (a.type === 'slide') {
      slides++;
      if (r.waves.length) evolvingSlides++;
    }
    maxChain = Math.max(maxChain, r.waves.length);
    if (r.waves.length >= 2) chainActions++;
    frequency[r.waves.length] = (frequency[r.waves.length] || 0) + 1;
    // Count simultaneous 08 populations directly at each wave boundary.
    const counts = Array(s.config.kinds).fill(0);
    let before = s.board.slice();
    if (a.type === 'single')
      before[a.index] = a.kind * 8 + stage(before[a.index]);
    if (a.type === 'bulk')
      before = before.map((v) =>
        v && kind(v) === a.from ? a.kind * 8 + stage(v) : v,
      );
    for (const v of before) if (stage(v) === 8) counts[kind(v)]++;
    if (counts.some((x) => x >= 2)) same08 = true;
    for (const wave of r.waves) {
      for (const ev of wave.events) {
        events++;
        if (ev.death) {
          same08 = true;
          counts[ev.kind] -= ev.cells.length;
        } else if (ev.to === 8) {
          reached08 = true;
          counts[ev.kind]++;
        }
      }
      if (counts.some((x) => x >= 2)) same08 = true;
    }
    s = r.state;
    if (s.board.some((v) => stage(v) === 8)) reached08 = true;
    if (s.won) same08 = true;
  }
  return {
    moves: s.moves,
    score: s.score,
    used: s.used,
    won: s.won,
    maxChain,
    chainActions,
    frequency,
    evolvingSlides,
    slides,
    reached08,
    same08,
    events,
    finalEggs: s.eggs,
    finalGauge: s.gauge,
  };
}
