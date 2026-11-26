// Phase 3: sim.cjs の jsonl を ゲーム×ボットで まとめる。node agg.cjs <dir> [--tsv]
const fs = require('fs'), path = require('path');
const dir = process.argv[2];
const rows = fs.readdirSync(dir).filter((f) => f.endsWith('.jsonl')).flatMap((f) => fs.readFileSync(path.join(dir, f), 'utf8').trim().split('\n').filter(Boolean).map((l) => JSON.parse(l)));
const by = {};
for (const r of rows) { (by[r.id] ||= {meter: new Set(), bots: {}}); if (r.recorded || r.meter !== 'none') by[r.id].meter.add(r.meter); (by[r.id].bots[r.bot] ||= []).push(r); }
const fmt = (a) => { if (!a) return '-'; return a.map((r) => r.raw === null ? 'TO' : `${r.recorded ? '' : '×'}${Math.round(r.raw)}@${Math.round(r.endedMs / 1000)}s`).join(' '); };
const out = [];
for (const [id, g] of Object.entries(by)) {
  const m = [...g.meter].filter((x) => x !== 'none' && x !== 'inputs').join('/') || 'なし';
  out.push([id, m, fmt(g.bots.idle), fmt(g.bots.tap1), fmt(g.bots.random), fmt(g.bots.mash)].join('\t'));
}
console.log(['id', 'meter', 'idle', 'tap1', 'random', 'mash'].join('\t'));
console.log(out.join('\n'));
