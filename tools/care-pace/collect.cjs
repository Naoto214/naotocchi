'use strict';
// simulate.cjs の 結果(r-current.json など)を まとめて comparisons/care-pace-20261125/data.json にする。
//   node tools/care-pace/collect.cjs <結果のフォルダ> [trap.json]
const fs = require('node:fs');
const path = require('node:path');
const dir = process.argv[2];
const ROOT = path.resolve(__dirname, '..', '..');
const out = { generated: new Date().toISOString().slice(0, 10), method: 'tools/care-pace/simulate.cjs --lives 40 --idle 150', plans: {} };
for (const id of ['current', 'A', 'B', 'C']) {
  const r = JSON.parse(fs.readFileSync(path.join(dir, `r-${id}.json`), 'utf8'));
  delete r.seconds;
  out.plans[id] = r;
}
if (process.argv[3]) out.blindFollower = JSON.parse(fs.readFileSync(process.argv[3], 'utf8'));
const file = path.join(ROOT, 'comparisons/care-pace-20261125/data.json');
fs.writeFileSync(file, JSON.stringify(out, null, 1));
console.log('wrote', path.relative(ROOT, file));
