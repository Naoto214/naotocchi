'use strict';
// comparisons/care-pace-20261125/play.html を index.html から つくる。
//   node tools/care-pace/build-play.cjs          … 生成
//   node tools/care-pace/build-play.cjs --check  … 生成物が index.html と ずれていないか だけ たしかめる
//
// index.html の写しに 次の4点だけを 加える:
//   1. <base href="../../"> … アセットの相対パスを リポジトリの根から 解決する
//   2. 起動救済スクリプトの セーブキーを 案ごとに わける
//   3. care-status.js / script.js の <script> を care-pace-loader.js に 置きかえる(案の差し替えを当てて実行)
//   4. 計測パネル care-pace-hud.js を 足す
const fs = require('node:fs');
const path = require('node:path');
const ROOT = path.resolve(__dirname, '..', '..');
const OUT = path.join(ROOT, 'comparisons/care-pace-20261125/play.html');
const LOADER = 'comparisons/care-pace-20261125/care-pace-loader.js';
const HUD = 'comparisons/care-pace-20261125/care-pace-hud.js';

function build() {
  let html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  const once = (find, replace, label) => {
    const n = html.split(find).length - 1;
    if (n !== 1) throw new Error(`${label}: ${n} 回 見つかりました(期待 1 回)`);
    html = html.replace(find, replace);
  };
  once('<head>\n', '<head>\n<base href="../../">\n<!-- 生成物: tools/care-pace/build-play.cjs(お世話の頻度 監査 2026-11-25)。直接 編集しない -->\n', 'head');
  once("var KEY = 'naotocchi-save-v1',",
    "var KEY = 'naotocchi-carepace-' + (/^(current|A|B|C|B2)$/.test(new URLSearchParams(location.search).get('plan') || '') ? new URLSearchParams(location.search).get('plan') : 'current') + '-v1',",
    'rescue key');
  html = html.replace(/<title>なおとっち<\/title>/, '<title>なおとっち お世話ペース試遊</title>');
  const cs = html.match(/<script src="care-status\.js\?v=[^"]*"><\/script>/);
  if (!cs) throw new Error('care-status.js の script が見つかりません');
  html = html.replace(cs[0], `<script src="${LOADER}" data-file="care-status.js"></script>`);
  const sj = html.match(/<script src="script\.js\?v=[^"]*"><\/script>/);
  if (!sj) throw new Error('script.js の script が見つかりません');
  html = html.replace(sj[0], `<script src="${LOADER}" data-file="script.js"></script>\n  <script src="${HUD}"></script>`);
  return html;
}

if (require.main === module) {
  const html = build();
  if (process.argv.includes('--check')) {
    const current = fs.existsSync(OUT) ? fs.readFileSync(OUT, 'utf8') : '';
    if (current !== html) { console.error('play.html が index.html と ずれています。node tools/care-pace/build-play.cjs で つくりなおしてください'); process.exit(1); }
    console.log('play.html は最新です');
  } else {
    fs.writeFileSync(OUT, html);
    console.log('wrote', path.relative(ROOT, OUT), html.length, 'bytes');
  }
}
module.exports = { build };
