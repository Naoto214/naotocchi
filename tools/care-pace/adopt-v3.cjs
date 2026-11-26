'use strict';
// お世話の頻度 監査 VERSION 3: 最終候補(PLANS.V3)を 本体の ファイルに 組みこむ。
//   node tools/care-pace/adopt-v3.cjs          … 基準(main 24c64450)の 写しに V3 の 差し替えを 当てて、本体に 書く
//   node tools/care-pace/adopt-v3.cjs --check  … 本体が「基準 + V3」と 一致して いるかだけ たしかめる
//
// 本体の script.js / care-status.js / item-system.js は、この スクリプトの 出力と 1文字も ちがわない
// ことを tests/care-pace-plans-test.cjs で たしかめる(手で 直した ところが あれば、差し替えの 定義に もどす)。
const fs = require('node:fs');
const path = require('node:path');
const ROOT = path.resolve(__dirname, '..', '..');
const { scriptPatches, careStatusPatches, itemSystemPatches, applyPatches, baseSource } = require('./plans.cjs');

function adopted() {
  return {
    'script.js': applyPatches(baseSource('script.js'), scriptPatches('V3'), 'V3'),
    'care-status.js': applyPatches(baseSource('care-status.js'), careStatusPatches('V3'), 'V3'),
    'item-system.js': applyPatches(baseSource('item-system.js'), itemSystemPatches('V3'), 'V3'),
  };
}

if (require.main === module) {
  const files = adopted();
  const check = process.argv.includes('--check');
  let bad = 0;
  for (const [file, text] of Object.entries(files)) {
    const now = fs.readFileSync(path.join(ROOT, file), 'utf8');
    if (check) { if (now !== text) { bad++; console.error(`${file}: 基準 + V3 と 一致しません`); } }
    else if (now !== text) { fs.writeFileSync(path.join(ROOT, file), text); console.log('wrote', file); }
  }
  if (check && bad) process.exit(1);
  if (check) console.log('本体は 基準 + V3 と 一致しています');
}
module.exports = { adopted };
