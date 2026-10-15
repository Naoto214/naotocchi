import { readFileSync, readdirSync } from 'node:fs';
import { verify } from './replay.mjs';
import { create, step } from './engine.mjs';
import { metrics } from './metrics.mjs';
import assert from 'node:assert/strict';
const d = new URL('./results/', import.meta.url),
  read = (f) => JSON.parse(readFileSync(new URL(f, d)));
let proofs = 0;
for (const f of readdirSync(d))
  if (/^(proof-|pilot-|alternative-).*\.json$/.test(f)) {
    verify(read(f));
    proofs++;
  }
const rows = read('matrix.json');
assert.equal(rows.length, 320);
assert.equal(new Set(rows.map((r) => r.id + ':' + r.seed)).size, 320);
for (const r of rows) {
  if (r.status === 'solved') {
    const p = read(r.proof);
    assert.deepEqual(r.metrics, metrics(p.initial, p.actions));
  } else assert.equal(r.status, 'unproven');
}
for (const r of read('policies.json')) {
  const s = create(r.seed);
  assert.deepEqual(r.metrics, metrics(s, r.path));
}
console.log(
  JSON.stringify({
    proofs,
    matrixRows: rows.length,
    policyRows: read('policies.json').length,
    passed: true,
  }),
);
