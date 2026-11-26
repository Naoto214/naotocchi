// 参加度(2026-11-26): 全100本の ゲームごとの 判定を games.js から 取りだす(説明は docs の 表で 人が 書く)。
// node tools/minigame-audit/participation-table.cjs > out.json
const fs = require('fs'), path = require('path');
const src = fs.readFileSync(path.join(__dirname, '..', '..', 'games.js'), 'utf8');
const {harness} = require(path.join(__dirname, '..', '..', 'tests', 'helpers', 'runtime-harness.cjs'));
const ids = harness({seed: 1}).api.games.map((g) => g.id);
const out = [];
for (const id of ids) {
  const m = new RegExp(`mg\\('${id}',\\s*(?:randomThemeGame\\()?(make\\w+)`).exec(src);
  const fn = m && m[1];
  const a = fn ? src.search(new RegExp(`\\n  function ${fn}\\b`)) : -1;
  let b = a < 0 ? -1 : src.slice(a + 10).search(/\n  (function make|const [A-Z_]+_VARIANTS)/);
  const seg = a < 0 ? '' : src.slice(a, b < 0 ? undefined : a + 10 + b);
  const kind = /mgPlayMeter\(\{\s*turnGap: true/.test(seg) ? '盤上の対戦(手と手の間)' : /mgPlayMeter\(\{\s*cover: false/.test(seg) ? 'アクション(回数のみ)' : /mgPlayMeter\(/.test(seg) ? 'アクション(4秒区切り)' : (/mgThinkMeter\((\d*)\)/.exec(seg) ? `考える(${/mgThinkMeter\((\d*)\)/.exec(seg)[1] || 2}回)` : /\binputs\b/.test(seg) ? '入力' : 'なし');
  const ach = [...seg.matchAll(/achieved: ([^})]+)\}/g)].map((x) => x[1].trim());
  const acts = [...seg.matchAll(/meter\.act\(\)|stroke\(\)/g)].length;
  out.push({id, factory: fn, kind, achieved: [...new Set(ach)].join(' / '), actSites: acts});
}
console.log(JSON.stringify(out, null, 1));
