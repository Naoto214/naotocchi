// Inject real rendering faults into the browser, without editing product files.
const { spawnSync } = require('node:child_process');
const fs = require('node:fs'), os = require('node:os'), path = require('node:path');
const assert = require('node:assert/strict');
const root = fs.mkdtempSync(path.join(os.tmpdir(), 'slide-paint-mutations-'));
try {
  for (const mutant of ['foreground', 'cell-context', 'cell-clip']) {
    const out = path.join(root, mutant);
    const r = spawnSync(process.execPath, [path.join(__dirname, 'paint-order.cjs')], {
      env: { ...process.env, PAINT_MUTANT: mutant, PAINT_OUT: out }, encoding: 'utf8', timeout: 120000,
    });
    assert.equal(r.status, 1, `mutation must fail normally: ${mutant}: ${r.stderr}`);
    const result = JSON.parse(fs.readFileSync(path.join(out, 'results.json')));
    const raster = result.failures.filter(f => f.includes('raster differs'));
    assert.ok(raster.length > 0, `paint pixels must detect ${mutant}`);
    assert.ok(result.summary.length === 24, 'all direction/rotation frames were exercised');
    console.log(`PASS detected ${mutant}: ${raster.length} raster mismatches`);
  }
} finally { fs.rmSync(root, { recursive: true, force: true }); }
