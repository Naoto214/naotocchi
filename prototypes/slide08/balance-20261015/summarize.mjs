import { readFileSync, writeFileSync } from 'node:fs';
import { create } from '../engine.mjs';
import { slideOptions } from './metrics.mjs';
const root = new URL('./results/', import.meta.url),
  read = (f) => JSON.parse(readFileSync(new URL(f, root))),
  manifest = read('manifest.json');
const rows = manifest.conditions.flatMap((c) =>
  manifest.policies.flatMap((p) =>
    manifest.seeds.map((seed) => read(`run-${c.id}-${p.id}-${seed}.json`)),
  ),
);
const sum = (rs, k) => rs.reduce((n, r) => n + (r.metrics[k] ?? 0), 0),
  ratio = (a, b) => (b ? a / b : null);
function aggregate(rs) {
  const solved = rs.filter((r) => r.status === 'solved'),
    moves = sum(solved, 'moves'),
    slides = sum(solved, 'slides');
  return {
    n: rs.length,
    initialBoardsWithEvolvingSlide: rs.filter((r) =>
      slideOptions(create(r.seed, r.config)).some((x) => x.waves.length),
    ).length,
    savedPath: {
      moves: sum(rs, 'moves'),
      slides: sum(rs, 'slides'),
      evolvingSlides: sum(rs, 'evolvingSlides'),
      chainActions: sum(rs, 'chainActions'),
      slideChainActions: sum(rs, 'slideChainActions'),
      largeClears: sum(rs, 'largeClears'),
    },
    freshSearch: {
      n: rs.filter((r) => !r.reused).length,
      nodes: rs.filter((r) => !r.reused).reduce((n, r) => n + r.stats.nodes, 0),
      maxMs: Math.max(
        0,
        ...rs.filter((r) => !r.reused).map((r) => r.stats.elapsedMs),
      ),
      totalMs: rs
        .filter((r) => !r.reused)
        .reduce((n, r) => n + r.stats.elapsedMs, 0),
    },
    solved: solved.length,
    unsolvableInActionScope: rs.filter((r) => r.status === 'unsolvable').length,
    unproven: rs.filter((r) => r.status === 'unproven').length,
    reached08OnSavedPath: rs.filter((r) => r.metrics.reached08).length,
    same08OnSavedPath: rs.filter((r) => r.metrics.same08).length,
    reasons: Object.fromEntries(
      [...new Set(rs.map((r) => r.reason))].map((k) => [
        k,
        rs.filter((r) => r.reason === k).length,
      ]),
    ),
    successOnly: {
      winningActions: Object.fromEntries(
        ['slide', 'egg', 'single', 'bulk'].map((type) => [
          type,
          solved.filter((r) => r.path.at(-1)?.type === type).length,
        ]),
      ),
      moves,
      range: solved.length
        ? [
            Math.min(...solved.map((r) => r.metrics.moves)),
            Math.max(...solved.map((r) => r.metrics.moves)),
          ]
        : null,
      meanMoves: ratio(moves, solved.length),
      slides,
      eggs: solved.reduce((n, r) => n + r.metrics.used.egg, 0),
      single: solved.reduce((n, r) => n + r.metrics.used.single, 0),
      bulk: solved.reduce((n, r) => n + r.metrics.used.bulk, 0),
      itemRatio: ratio(sum(solved, 'itemCount'), moves),
      evolvingSlides: sum(solved, 'evolvingSlides'),
      evolvingSlideRate: ratio(sum(solved, 'evolvingSlides'), slides),
      slideChainRate: ratio(sum(solved, 'slideChainActions'), slides),
      chainRate: ratio(sum(solved, 'chainActions'), moves),
      maxChain: Math.max(0, ...solved.map((r) => r.metrics.maxChain)),
      meanReduction: ratio(sum(solved, 'totalReduction'), moves),
      slideReduction: sum(solved, 'slideReduction'),
      largeClearRate: ratio(sum(solved, 'largeClears'), moves),
      largeSlideClearRate: ratio(sum(solved, 'largeSlideClears'), slides),
      noImmediateSlideEvolutionRate: ratio(
        sum(solved, 'noImmediateSlideEvolution'),
        moves,
      ),
      itemsEnablingSlides: sum(solved, 'itemsEnablingSlides'),
      setupSlidesFollowedByEvolution: sum(
        solved,
        'setupSlidesFollowedByEvolution',
      ),
      longItemShare: ratio(
        sum(solved, 'itemsInLongStreaks'),
        sum(solved, 'itemCount'),
      ),
      maxItemStreak: Math.max(0, ...solved.map((r) => r.metrics.maxItemStreak)),
    },
    seeds: solved.map((r) => ({
      seed: r.seed,
      moves: r.metrics.moves,
      items: r.metrics.itemCount,
      slides: r.metrics.slides,
    })),
  };
}
const groups = manifest.conditions.flatMap((c) =>
  manifest.policies.map((p) => {
    const rs = rows.filter((r) => r.condition === c.id && r.policy === p.id);
    return {
      condition: c.id,
      policy: p.id,
      all: aggregate(rs),
      exploratory: aggregate(rs.filter((r) => r.seed < 20)),
      heldOut: aggregate(rs.filter((r) => r.seed >= 20)),
    };
  }),
);
function paired(c1, p1, c2, p2) {
  const a = rows.filter(
      (r) => r.condition === c1 && r.policy === p1 && r.status === 'solved',
    ),
    b = rows.filter(
      (r) => r.condition === c2 && r.policy === p2 && r.status === 'solved',
    ),
    seeds = a
      .filter((r) => b.some((s) => s.seed === r.seed))
      .map((r) => r.seed);
  return {
    left: [c1, p1],
    right: [c2, p2],
    seeds,
    leftStats: aggregate(a.filter((r) => seeds.includes(r.seed))),
    rightStats: aggregate(b.filter((r) => seeds.includes(r.seed))),
  };
}
const pairs = [
  ...manifest.conditions.map((c) =>
    paired(c.id, 'cluster', c.id, 'item-aware'),
  ),
  paired('A', 'cluster', 'B', 'cluster'),
  paired('C', 'cluster', 'A', 'cluster'),
  paired('B', 'cluster', 'D', 'cluster'),
  paired('B', 'item-aware', 'D', 'item-aware'),
  paired('C', 'cluster', 'B', 'cluster'),
  paired('A', 'cluster', 'D', 'cluster'),
];
const summary = {
  manifest,
  notes: [
    'Rates are solver witness rates, not true solvability or human win rates.',
    'Success-only denominators are survivor-biased; use paired seeds to compare successful paths.',
    '08 diagnostics cover saved best paths, not every state visited.',
    'Reused witness runtimes are historical and are not timing benchmarks.',
  ],
  groups,
  pairs,
};
writeFileSync(new URL('summary.json', root), JSON.stringify(summary, null, 2));
console.log(
  JSON.stringify(
    groups.map((g) => ({
      condition: g.condition,
      policy: g.policy,
      solved: g.all.solved,
      heldOut: g.heldOut.solved,
      ...g.all.successOnly,
    })),
    null,
    2,
  ),
);
