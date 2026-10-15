import { readFileSync, writeFileSync } from 'node:fs';
import { create, step } from './engine.mjs';
import { search } from './search.mjs';
import { certificate } from './replay.mjs';
const d = new URL('./results/', import.meta.url),
  read = (f) => JSON.parse(readFileSync(new URL(f, d))),
  write = (f, x) => writeFileSync(new URL(f, d), JSON.stringify(x, null, 2));
const rows = read('matrix.json'),
  policies = read('policies.json');
const median = (a) => {
  a = [...a].sort((x, y) => x - y);
  return a.length
    ? (a[Math.floor((a.length - 1) / 2)] + a[Math.ceil((a.length - 1) / 2)]) / 2
    : null;
};
const summary = [...new Set(rows.map((r) => r.id))].map((id) => {
  const all = rows.filter((r) => r.id === id),
    ok = all.filter((r) => r.metrics),
    ms = ok.map((r) => r.metrics);
  return {
    id,
    n: all.length,
    solved: ok.length,
    unproven: all.filter((r) => r.status === 'unproven').length,
    minMoves: ok.length ? Math.min(...ms.map((m) => m.moves)) : null,
    medianMoves: median(ms.map((m) => m.moves)),
    maxMoves: ok.length ? Math.max(...ms.map((m) => m.moves)) : null,
    medianSearchMs: median(all.map((r) => r.stats.elapsedMs)),
    medianNodes: median(all.map((r) => r.stats.nodes)),
    maxChain: ok.length ? Math.max(...ms.map((m) => m.maxChain)) : null,
    meanInitialEvolvingSlides:
      all.reduce((s, r) => s + r.initialEvolvingSlides, 0) / all.length,
    itemRequiredWitnesses: ms.filter(
      (m) => m.used.egg + m.used.single + m.used.bulk > 0,
    ).length,
    stopReasons: all.reduce(
      (o, r) => ((o[r.reason] = (o[r.reason] || 0) + 1), o),
      {},
    ),
  };
});
write('summary.json', summary);
console.table(
  summary.map(
    ({
      id,
      solved,
      minMoves,
      medianMoves,
      maxMoves,
      medianSearchMs,
      maxChain,
    }) => ({
      id,
      solved,
      minMoves,
      medianMoves,
      maxMoves,
      medianSearchMs: Math.round(medianSearchMs),
      maxChain,
    }),
  ),
);
const ps = [...new Set(policies.map((r) => r.policy))].map((policy) => {
  const a = policies.filter((r) => r.policy === policy);
  return {
    policy,
    n: a.length,
    won: a.filter((r) => r.metrics.won).length,
    reached08: a.filter((r) => r.metrics.reached08).length,
    same08: a.filter((r) => r.metrics.same08).length,
    maxChain: Math.max(...a.map((r) => r.metrics.maxChain)),
    chainActions: a.reduce((n, r) => n + r.metrics.chainActions, 0),
    moves: a.reduce((n, r) => n + r.metrics.moves, 0),
    slides: a.reduce((n, r) => n + r.metrics.slides, 0),
    evolvingSlides: a.reduce((n, r) => n + r.metrics.evolvingSlides, 0),
  };
});
write('policy-summary.json', ps);
console.table(ps);
// Recovery: a saved winning path passes a state where none of four slides evolves,
// then an item is used. This proves recoverability of that state, not all deadlocks.
const recovery = [];
for (const row of rows.filter((r) => r.proof)) {
  const p = read(row.proof);
  let s = p.initial;
  for (let i = 0; i < p.actions.length; i++) {
    const a = p.actions[i];
    if (
      a.type !== 'slide' &&
      !['left', 'right', 'up', 'down'].some(
        (dir) => step(s, { type: 'slide', dir }).waves.length,
      )
    ) {
      recovery.push({
        proof: row.proof,
        prefixLength: i,
        nextAction: a,
        remainingMoves: p.actions.length - i,
        occupied: s.board.filter(Boolean).length,
        capacity: s.board.length,
        gauge: s.gauge,
        eggs: s.eggs,
      });
      break;
    }
    s = step(s, a).state;
  }
}
write('recovery.json', recovery);
console.log('Recovery witnesses', recovery.length);
if (process.argv.includes('--diversity')) {
  const output = [];
  for (const seed of [2, 3, 9, 15])
    for (const policy of ['organize', 'save-eggs', 'transform']) {
      const s = create(seed),
        r = search(s, {
          width: 80,
          maxDepth: 100,
          maxNodes: 500000,
          maxMs: 5000,
          policy,
        });
      const row = { seed, policy, status: r.status, stats: r.stats };
      if (r.status === 'solved') {
        row.path = r.path;
        row.proof = `alternative-${seed}-${policy}.json`;
        write(row.proof, certificate(s, r.path, { generated: true }));
      }
      output.push(row);
    }
  write('diversity.json', output);
  console.log('Alternative successes', output.filter((x) => x.proof).length);
}
