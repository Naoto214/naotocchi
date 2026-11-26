// 参加度(2026-11-26): 全100本の 判定表(docs/audit/minigame-participation-2026-11-26/TABLE.md)を つくる。
// 種類 = games.js から(participation-table.cjs)、操作・目標 = participation-desc.cjs、記録の 有無・へんしん/分 = data/farm.json(sim.cjs の 結果)
const fs = require('fs'), path = require('path');
const D = path.join(__dirname, '..', '..', 'docs', 'audit', 'minigame-participation-2026-11-26');
const kinds = JSON.parse(fs.readFileSync(path.join(D, 'data', 'kinds.json'))), names = JSON.parse(fs.readFileSync(path.join(D, 'data', 'names.json')));
const farm = Object.fromEntries(JSON.parse(fs.readFileSync(path.join(D, 'data', 'farm.json'))).map((r) => [r.id, r]));
const desc = require('./participation-desc.cjs');
const P3 = new Set(Object.entries(desc).filter(([, v]) => v.pr === 'P3').map(([k]) => k));
const order = ['アクション(4秒区切り)', 'アクション(回数のみ)', '考える(1回)', '考える(2回)', '考える(3回)', '盤上の対戦(手と手の間)', 'なし'];
const rows = kinds.map((k) => ({...k, kind: P3.has(k.id) ? (/(darts|archery|domino)/.test(k.id) ? '考える(2回)' : /cake/.test(k.id) ? '考える(1回)' : 'アクション(4秒区切り)') : k.kind}))
  .sort((a, b) => order.indexOf(a.kind) - order.indexOf(b.kind) || a.id.localeCompare(b.id));
const rec = (s) => s ? s.replace(/○/g, '○').replace(/×/g, '×') : '';
let md = '| # | ゲーム | 判定の 種類 | 意味のある 操作(数えるもの) | 最初の 小さな 目標(すぐ おわっても 参加) | 入れた PR | 1回だけ 操作(前→後) | 連打(前→後) | 即時失敗の へんしん/分(前→後) |\n|---|---|---|---|---|---|---|---|---|\n';
rows.forEach((r, i) => {
  const d = desc[r.id], f = farm[r.id] || {before: {}, after: {}};
  const extra = r.id === 'snake-classic' || r.id === 'frogger-road' || r.id === 'bomber-maze' ? '(8秒)' : '';
  md += `| ${i + 1} | ${names[r.id] || r.id}<br>\`${r.id}\` | ${r.kind}${extra} | ${d.acts} | ${d.goal} | ${d.pr === '本PR' ? '**このPR**' : d.pr === 'P3' ? '#597(Phase 3)' : d.pr === 'P2' ? 'Phase 2' : 'Phase 1 まで'} | ${rec(f.before.tap1)} → ${rec(f.after.tap1)} | ${rec(f.before.mash)} → ${rec(f.after.mash)} | ${f.before.farm ?? ''} → ${P3.has(r.id) ? '(#597)' : f.after.farm ?? ''} |\n`;
});
fs.writeFileSync(path.join(D, 'TABLE.md'), `# 全100本の 参加判定(2026-11-26)\n\n- 判定の 種類・数えるもの・最初の 目標は games.js から 取りだした もの(\`tools/minigame-audit/participation-table.cjs\`・\`participation-desc.cjs\`)。\n- 記録の 有無は 自動プレイ(\`tools/minigame-audit/sim.cjs\`、各2回)。○ = 記録・× = 記録しない・― = 終わらない。#597 の 16本は このPRでは まだ メーターが ない(#597 で 入る)。\n- 即時失敗の へんしん/分 = 「1回だけ・連打・でたらめ」で 30点未満の まま 記録された 回の うち いちばん 速い もの(1回の 時間 = プレイ + 画面の 行き来 8秒)。0 = そういう 回が ない。\n\n${md}`);
console.log('ok', rows.length);
