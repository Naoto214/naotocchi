// 参加度(2026-11-26): sim.cjs の 結果(変更前・変更後)から、ゲームごとに
//  - 放置・1回だけ・でたらめ・連打 の それぞれが 記録されたか
//  - 「30点未満で 記録された 回」の いちばん 速い へんしんメーターの たまり方(/分。画面の 行き来 8秒を たす)
// を 出す。node participation-farm.cjs <before-dir> <after-dir> [--json out]
const fs = require('fs'), path = require('path');
const load = (d) => fs.readdirSync(d).filter((f) => f.endsWith('.jsonl')).flatMap((f) => fs.readFileSync(path.join(d, f), 'utf8').trim().split('\n').filter(Boolean).map(JSON.parse));
const [bd, ad] = process.argv.slice(2), OVER = 8;
const group = (rows) => { const m = {}; for (const r of rows) ((m[r.id] ||= {})[r.bot] ||= []).push(r); return m; };
const B = group(load(bd)), A = group(load(ad));
const farm = (g) => { let best = 0; for (const bot of ['tap1', 'random', 'mash']) for (const r of g[bot] || []) if (r.recorded && r.raw !== null && r.raw < 30) best = Math.max(best, 25 / ((r.endedMs / 1000 + OVER) / 60)); return Math.round(best); };
const rec = (g, bot) => (g[bot] || []).map((r) => (r.raw === null ? '―' : r.recorded ? '○' : '×')).join('');
const out = [];
for (const id of Object.keys(A).sort()) {
  const b = B[id] || {}, a = A[id];
  out.push({id, before: {idle: rec(b, 'idle'), tap1: rec(b, 'tap1'), random: rec(b, 'random'), mash: rec(b, 'mash'), farm: farm(b)}, after: {idle: rec(a, 'idle'), tap1: rec(a, 'tap1'), random: rec(a, 'random'), mash: rec(a, 'mash'), farm: farm(a)},
    quickSec: Math.round(Math.min(...['tap1', 'random', 'mash'].flatMap((bot) => (a[bot] || []).filter((r) => r.raw !== null).map((r) => r.endedMs / 1000))))});
}
const j = process.argv.indexOf('--json'); if (j > 0) fs.writeFileSync(process.argv[j + 1], JSON.stringify(out, null, 1));
for (const r of out) if (r.before.farm !== r.after.farm || r.before.tap1 !== r.after.tap1 || r.before.random !== r.after.random || r.before.mash !== r.after.mash) console.log(r.id.padEnd(22), 'farm', String(r.before.farm).padStart(3), '→', String(r.after.farm).padStart(3), ' tap1', r.before.tap1, '→', r.after.tap1, ' random', r.before.random, '→', r.after.random, ' mash', r.before.mash, '→', r.after.mash);
const top = (k) => out.map((r) => r[k].farm).sort((x, y) => y - x).slice(0, 5);
console.log('上位5(前)', top('before'), '上位5(後)', top('after'));
