import { metrics } from './metrics.mjs';
import { mkdirSync, writeFileSync } from 'node:fs';
import { create, candidates, step, key, stage, kind, rng } from './engine.mjs';
import { search, evaluate } from './search.mjs';
import { certificate, hash } from './replay.mjs';
const dir = new URL('./results/', import.meta.url);
mkdirSync(dir, { recursive: true });
export const SEEDS = Array.from({ length: 20 }, (_, i) => i);
export const MATRIX = [
  ['base', {}],
  ['size5', { size: 5 }],
  ['size7', { size: 7 }],
  ['count18', { count: 18 }],
  ['count30', { count: 30 }],
  ['kinds4', { kinds: 4 }],
  ['kinds5', { kinds: 5 }],
  ['stages3', { maxStage: 3 }],
  ['stages5', { maxStage: 5 }],
  ['cost2', { single: 2, bulk: 6 }],
  ['cost8', { single: 8, bulk: 24 }],
  ['gauge0', { initialGauge: 0 }],
  ['gauge12', { initialGauge: 12 }],
  ['no-initial-eggs', { initialEggs: [0, 0, 0, 0] }],
  ['no-reward', { reward: 'off' }],
  ['crossed', { reward: 'crossed' }],
];
export const LIMITS = {
  mode: 'beam',
  width: 80,
  maxDepth: 100,
  maxNodes: 500000,
  maxMs: 5000,
};
function choose(s, policy, random, seen) {
  let next = [];
  for (const a of candidates(s)) {
    const r = step(s, a);
    if (r.valid && !seen.has(key(r.state)))
      next.push({ a, ...r, value: evaluate(r.state, policy) });
  }
  if (!next.length) return null;
  if (policy === 'random') return next[Math.floor(random() * next.length)];
  next.sort((a, b) => b.value - a.value);
  if (policy !== 'lookahead2') return next[0];
  let best = next[0],
    value = -Infinity;
  for (const p of next.slice(0, 6)) {
    let v = p.value;
    for (const a of candidates(p.state)) {
      const r = step(p.state, a);
      if (r.valid && !seen.has(key(r.state)))
        v = Math.max(v, evaluate(r.state));
    }
    if (v > value) {
      value = v;
      best = p;
    }
  }
  return best;
}
const phase = process.argv[2] || 'matrix';
if (phase === 'matrix') {
  writeFileSync(
    new URL('manifest.json', dir),
    JSON.stringify(
      {
        version: 1,
        seeds: SEEDS,
        matrix: MATRIX,
        limits: LIMITS,
        notes:
          'One-variable fixed-seed comparison. Time budget wall-clock; deterministic node limit also recorded. Pilot used seeds 0..19; matrix is exploratory, not held-out.',
      },
      null,
      2,
    ),
  );
  const rows = [];
  for (const [id, opts] of MATRIX) {
    for (const seed of SEEDS) {
      const initial = create(seed, opts),
        r = search(initial, LIMITS),
        row = {
          id,
          seed,
          config: initial.config,
          initialHash: hash(initial),
          status: r.status,
          shortest: r.shortest,
          reason: r.reason,
          stats: r.stats,
        };
      const slides = ['left', 'right', 'up', 'down'].map((dir) =>
        step(initial, { type: 'slide', dir }),
      );
      row.initialEvolvingSlides = slides.filter((r) => r.waves.length).length;
      row.initialValidSlides = slides.filter((r) => r.valid).length;
      if (r.status === 'solved') {
        row.metrics = metrics(initial, r.path);
        row.proof = `proof-${id}-${seed}.json`;
        writeFileSync(
          new URL(row.proof, dir),
          JSON.stringify(certificate(initial, r.path, { generated: true })),
        );
      }
      rows.push(row);
    }
    writeFileSync(new URL('matrix.json', dir), JSON.stringify(rows, null, 2));
    const sub = rows.filter((x) => x.id === id);
    console.log(
      id,
      sub.filter((x) => x.status === 'solved').length + '/' + sub.length,
    );
  }
} else if (phase === 'policies') {
  const rows = [];
  for (const policy of [
    'random',
    'organize',
    'cluster',
    'save-eggs',
    'transform',
    'lookahead2',
  ]) {
    for (const seed of SEEDS) {
      let initial = create(seed),
        s = initial,
        path = [],
        seen = new Set([key(s)]),
        start = performance.now(),
        stop = 'step-limit',
        random = rng(seed + 100000);
      for (let i = 0; i < 100 && !s.won; i++) {
        const choice = choose(s, policy, random, seen);
        if (!choice) {
          stop = 'no-unvisited-successor';
          break;
        }
        s = choice.state;
        path.push(choice.a);
        seen.add(key(s));
      }
      if (s.won) stop = 'won';
      rows.push({
        policy,
        seed,
        path,
        metrics: metrics(initial, path),
        stop,
        elapsedMs: performance.now() - start,
      });
    }
    console.log(
      policy,
      rows.filter((x) => x.policy === policy && x.metrics.won).length + '/20',
    );
    writeFileSync(new URL('policies.json', dir), JSON.stringify(rows, null, 2));
  }
}
