#!/usr/bin/env node
// Character 3D Pilot が かえては いけない もの(既存 2D キャラ PNG・Expression PNG・表情 / 感情の runtime・めぐるの シミュレーション)の digest。
//   node tools/character-3d/protected-hashes.cjs            … いまの 作業ツリーの digest を 出す
//   node tools/character-3d/protected-hashes.cjs --write <ref> … <ref>(例 origin/main)から tests/fixtures/ に 書く
const fs = require('fs'), path = require('path'), crypto = require('crypto'), { execSync } = require('child_process');
const ROOT = path.join(__dirname, '..', '..');
const GROUPS = {
  'assets/characters/expressions': (f) => f.startsWith('assets/characters/expressions/'),
  'assets/characters/relationship': (f) => f.startsWith('assets/characters/relationship/'),
  'assets/characters (stage / companion / partner / author PNG)': (f) => f.startsWith('assets/characters/') && !f.startsWith('assets/characters/expressions/') && !f.startsWith('assets/characters/relationship/'),
};
const SINGLE = ['pet-expression.js', 'pet-expression.css', 'relationship-expression.js', 'emotion-state.js', 'cast-bounds.js', 'character-world-master.v1.js', 'life-stage-profiles.js', 'meguru.js'];
function digest(read, list) {
  const out = {};
  for (const [g, fn] of Object.entries(GROUPS)) {
    const files = list.filter(fn).sort(), h = crypto.createHash('sha1');
    for (const f of files) h.update(f + '\0' + crypto.createHash('sha1').update(read(f)).digest('hex') + '\n');
    out[g] = { count: files.length, sha1: h.digest('hex') };
  }
  for (const f of SINGLE) out[f] = { count: 1, sha1: crypto.createHash('sha1').update(read(f)).digest('hex') };
  return out;
}
function current() {
  const list = execSync('git ls-files -- assets/characters', { cwd: ROOT, maxBuffer: 1e8 }).toString().trim().split('\n');
  return digest((f) => fs.readFileSync(path.join(ROOT, f)), list);
}
module.exports = { current, digest };
if (require.main === module) {
  const i = process.argv.indexOf('--write');
  if (i < 0) { console.log(JSON.stringify(current(), null, 1)); return; }
  const ref = process.argv[i + 1] || 'origin/main';
  const list = execSync(`git ls-tree -r --name-only ${ref} -- assets/characters`, { cwd: ROOT, maxBuffer: 1e8 }).toString().trim().split('\n');
  const d = digest((f) => execSync(`git show ${ref}:${f}`, { cwd: ROOT, maxBuffer: 1e8 }), list);
  const out = { base: execSync(`git rev-parse ${ref}`, { cwd: ROOT }).toString().trim(), note: 'Character 3D Pilot は これらを 1 バイトも かえない(tests/character-3d-test.cjs)', groups: d };
  fs.writeFileSync(path.join(ROOT, 'tests/fixtures/character-3d-protected-hashes.json'), JSON.stringify(out, null, 1) + '\n');
  console.log(JSON.stringify(out, null, 1));
}
