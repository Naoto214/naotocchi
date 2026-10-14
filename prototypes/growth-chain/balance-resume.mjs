// Supplemental transitive provenance gate. Keep earlier manifests as historical evidence.
import fs from 'node:fs';
import crypto from 'node:crypto';
import {ensureManifest} from './balance-manifest.mjs';
const files=new Set();
function visit(name){
  if(files.has(name))return;files.add(name);
  const source=fs.readFileSync(new URL(name,import.meta.url),'utf8');
  for(const m of source.matchAll(/(?:from\s*|import\s*)['"]\.\/([^'"]+\.mjs)['"]/g))visit(m[1]);
}
visit('balance-followup.mjs');visit('balance-resume.mjs');
const hashes=Object.fromEntries([...files].sort().map(f=>[f,crypto.createHash('sha256').update(fs.readFileSync(new URL(f,import.meta.url))).digest('hex')]));
ensureManifest(new URL('./balance-followup-20261014/dependency-proof.json',import.meta.url),{note:'Transitive dependency gate added after original run; original trial files unchanged',hashes});
await import('./balance-followup.mjs');
