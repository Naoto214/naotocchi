// Deliberately does not import the solver. Replay every saved transition and proof.
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { create, step } from '../engine.mjs';
import { hash, verify } from '../replay.mjs';
import { analyzePath } from './metrics.mjs';
const root = new URL('./results/', import.meta.url),
  read = (f) => JSON.parse(readFileSync(new URL(f, root))),
  m = read('manifest.json');
let runs = 0,
  proofs = 0;
for (const c of m.conditions)
  for (const p of m.policies)
    for (const seed of m.seeds) {
      const r = read(`run-${c.id}-${p.id}-${seed}.json`),
        initial = create(seed, {
          count: c.count,
          single: c.single,
          bulk: c.bulk,
        });
      assert.equal(r.condition, c.id);
      assert.equal(r.policy, p.id);
      assert.equal(r.seed, seed);
      assert.equal(r.initialHash, hash(initial));
      assert.deepEqual(r.config, initial.config);
      for (const [k, v] of Object.entries({
        ...m.limits,
        mode: p.mode,
        itemPenalty: p.itemPenalty,
        actionSet: p.actionSet,
      }))
        assert.equal(r.options[k], v);
      assert.deepEqual(r.metrics, analyzePath(initial, r.path));
      let state = initial;
      for (const a of r.path) {
        if (p.actionSet === 'slides') assert.equal(a.type, 'slide');
        const result = step(state, a);
        assert.ok(result.valid);
        state = result.state;
      }
      assert.equal(state.won, r.status === 'solved');
      if (r.status === 'solved') {
        const cert = read(`proof-${c.id}-${p.id}-${seed}.json`);
        assert.deepEqual(cert.initial, initial);
        assert.deepEqual(cert.actions, r.path);
        assert.deepEqual(verify(cert), state);
        proofs++;
      } else {
        assert.ok(['unproven', 'unsolvable'].includes(r.status));
        assert.equal(r.shortest, false);
      }
      if (r.shortest) assert.equal(p.mode, 'bfs');
      assert.equal(r.shortestScope, p.actionSet);
      runs++;
    }
assert.equal(
  readdirSync(root).filter((f) => f.startsWith('run-')).length,
  runs,
);
assert.equal(
  readdirSync(root).filter((f) => f.startsWith('proof-')).length,
  proofs,
);
console.log(JSON.stringify({ runs, proofs, verified: true }));
