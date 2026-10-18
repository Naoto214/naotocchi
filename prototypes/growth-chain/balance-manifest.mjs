import fs from 'node:fs';
import assert from 'node:assert/strict';
export function ensureManifest(file, proof) {
  if (fs.existsSync(file)) {
    try { assert.deepEqual(JSON.parse(fs.readFileSync(file)), proof); }
    catch { throw Error('Manifest changed; use a new edition'); }
  } else fs.writeFileSync(file, JSON.stringify(proof, null, 2), {flag:'wx'});
}
