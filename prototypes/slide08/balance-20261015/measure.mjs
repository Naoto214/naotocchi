import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import assert from 'node:assert/strict';
import { create } from '../engine.mjs';
import { search } from '../search.mjs';
import { certificate, hash, verify } from '../replay.mjs';
import { analyzePath } from './metrics.mjs';
const root = new URL('./results/', import.meta.url);
mkdirSync(root, { recursive: true });
const write = (f, x) => writeFileSync(new URL(f, root), JSON.stringify(x));
const conditions = [
  { id: 'A', count: 24, single: 2, bulk: 6, prior: 'cost2' },
  { id: 'B', count: 30, single: 4, bulk: 12, prior: 'count30' },
  { id: 'C', count: 24, single: 4, bulk: 12, prior: 'base' },
  { id: 'D', count: 30, single: 2, bulk: 6, prior: null },
];
const seeds = Array.from({ length: 40 }, (_, i) => i),
  limits = { width: 80, maxDepth: 100, maxNodes: 500000, maxMs: 5000 };
const policies = [
  { id: 'cluster', mode: 'beam', itemPenalty: 0, actionSet: 'all' },
  { id: 'item-aware', mode: 'beam', itemPenalty: 4, actionSet: 'all' },
  { id: 'slides-only', mode: 'bfs', itemPenalty: 0, actionSet: 'slides' },
];
const manifest = {
  version: 1,
  sourceHead: '05778f7e8475c09133834685d3e60e308cb9ffbf',
  conditions,
  seeds,
  limits,
  policies,
  largeClearThreshold: 4,
  longItemStreak: 3,
  reuse:
    'Prior successful cluster witnesses reused. Prior unproven searches rerun only to collect missing bestPath diagnostics; original results immutable.',
};
if (existsSync(new URL('manifest.json', root)))
  assert.deepEqual(
    JSON.parse(readFileSync(new URL('manifest.json', root))),
    manifest,
  );
else write('manifest.json', manifest);
const previous = JSON.parse(
  readFileSync(new URL('../results/matrix.json', import.meta.url)),
);
for (const c of conditions)
  for (const policy of policies) {
    let solved = 0,
      reused = 0;
    for (const seed of seeds) {
      const filename = `run-${c.id}-${policy.id}-${seed}.json`;
      if (existsSync(new URL(filename, root))) {
        const saved = JSON.parse(readFileSync(new URL(filename, root)));
        assert.equal(
          saved.initialHash,
          hash(
            create(seed, { count: c.count, single: c.single, bulk: c.bulk }),
          ),
        );
        solved += saved.status === 'solved';
        reused += saved.reused;
        continue;
      }
      const initial = create(seed, {
          count: c.count,
          single: c.single,
          bulk: c.bulk,
        }),
        opts = {
          ...limits,
          mode: policy.mode,
          itemPenalty: policy.itemPenalty,
          actionSet: policy.actionSet,
        };
      let result,
        source = null;
      const old = previous.find(
        (r) => r.id === c.prior && r.seed === seed && r.status === 'solved',
      );
      if (policy.id === 'cluster' && old) {
        const p = JSON.parse(
          readFileSync(new URL('../results/' + old.proof, import.meta.url)),
        );
        verify(p);
        assert.equal(hash(initial), hash(p.initial));
        result = {
          status: 'solved',
          path: p.actions,
          bestPath: p.actions,
          shortest: false,
          shortestScope: 'all',
          reason: 'witness',
          options: opts,
          stats: old.stats,
        };
        source = { commit: manifest.sourceHead, file: 'results/' + old.proof };
        reused++;
      } else result = search(initial, opts);
      const path = result.status === 'solved' ? result.path : result.bestPath,
        measure = analyzePath(initial, path);
      if (result.status === 'solved') {
        solved++;
        write(
          `proof-${c.id}-${policy.id}-${seed}.json`,
          certificate(initial, path, { generated: true }),
        );
      }
      write(filename, {
        condition: c.id,
        policy: policy.id,
        seed,
        initialHash: hash(initial),
        config: initial.config,
        reused: !!source,
        source,
        status: result.status,
        reason: result.reason,
        shortest: result.shortest,
        shortestScope: result.shortestScope,
        options: result.options,
        stats: result.stats,
        path,
        metrics: measure,
      });
    }
    console.log(
      JSON.stringify({
        condition: c.id,
        policy: policy.id,
        solved,
        total: seeds.length,
        reused,
      }),
    );
  }
