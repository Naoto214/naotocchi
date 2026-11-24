// ミニゲーム採点監査 Phase 1 の 試遊ページ(修正前/修正後)を つくる。
// 本物の games.js(修正前 = origin/main、修正後 = いまの ファイル)と、script.js の ミニゲーム共通ヘルパー
// (タッチパッド・canvas・迷路)を そのまま 切り出して 1枚の ページに のせる。本番の ファイルは 変更しない。
// node tools/minigame-audit/build-p1-trial.cjs [--before <git-ref>]
// できるもの: comparisons/minigame-scoring-p1-20261124/{helpers.js, games-before.js, games-after.js, style.css}
//(index.html は 手で 書いた もの。生成物は .gitignore で コミットしない)
'use strict';
const fs = require('node:fs'), path = require('node:path'), {execFileSync} = require('node:child_process');
const root = path.resolve(__dirname, '..', '..'), out = path.join(root, 'comparisons', 'minigame-scoring-p1-20261124');
const ref = process.argv.includes('--before') ? process.argv[process.argv.indexOf('--before') + 1] : 'origin/main';
const script = fs.readFileSync(path.join(root, 'script.js'), 'utf8');
const a = script.indexOf('  const MG_HOLD_PROFILES = '), m = script.indexOf('  function mazeBfs(map, sx, sy) {'), b = script.indexOf('\n  }\n', m) + 5;
if (a < 0 || m < 0 || b < 5) throw new Error('script.js の ミニゲーム共通ヘルパーが みつからない');
const grace = /const MG_ACTION_START_GRACE_MS = (\d+);/.exec(script)[1];
const helpers = `// script.js の ミニゲーム共通ヘルパー(切り出し。${new Date().toISOString().slice(0, 10)} に build-p1-trial.cjs が 生成)
(() => {
  'use strict';
  const CANVAS_ILLUSTRATIONS = null; // 試遊ページでは 絵文字を そのまま 描く
  const mgPerfDpr = () => 2;
  const MG_ACTION_START_GRACE_MS = ${grace};
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const lerp = (x, y, t) => x + (y - x) * t;
${script.slice(a, b)}
  window.P1Helpers = { MG_ACTION_START_GRACE_MS, MG_SWIPE_MIN, bindHeldButton, createTouchPad, createPadRow, clamp, createMgCanvas, generateMaze, lerp, mazeBfs, mgPointerPos, resetMinigameInput };
})();
`;
fs.mkdirSync(out, {recursive: true});
fs.writeFileSync(path.join(out, 'helpers.js'), helpers);
const tag = (src, name) => src + `\n;window.${name} = window.installNaotocchiMinigames;\n`;
fs.writeFileSync(path.join(out, 'games-before.js'), tag(execFileSync('git', ['show', `${ref}:games.js`], {cwd: root, maxBuffer: 1 << 28}).toString('utf8'), 'P1InstallBefore'));
fs.writeFileSync(path.join(out, 'games-after.js'), tag(fs.readFileSync(path.join(root, 'games.js'), 'utf8'), 'P1InstallAfter'));
fs.copyFileSync(path.join(root, 'style.css'), path.join(out, 'style.css'));
console.log('ok', out, 'before =', ref);
