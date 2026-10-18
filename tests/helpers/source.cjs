// RH-6: source を 読む テストの 共通の 部品(いままで テストごとに 写して いた もの を 1 か所に)。
// ふるまいは 写しと 同じ。production の file は 読むだけ。
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = path.join(__dirname, '..', '..');
const read = (file) => fs.readFileSync(path.join(ROOT, file), 'utf8');

// 行コメント(// …)だけの 行を のぞく
const codeOnly = (src) => src.split('\n').filter((l) => !/^\s*\/\//.test(l)).join('\n');

// 宣言の オブジェクト / 配列を そのまま 評価する(文字列・行コメントの 中の かっこは かぞえない)。
// vm の 別 realm の 値は JSON で この realm へ うつす(関数は のこらない)
function literal(file, decl) {
  const src = read(file), i = src.indexOf(decl);
  if (i < 0) throw new Error(`${file}: ${decl} not found`);
  let j = i + decl.length;
  while (src[j] !== '{' && src[j] !== '[') j++;
  const open = src[j], close = open === '{' ? '}' : ']', start = j;
  for (let d = 0; j < src.length; j++) {
    const c = src[j];
    if (c === "'" || c === '"' || c === '`') { const q = c; j++; while (src[j] !== q) { if (src[j] === '\\') j++; j++; } continue; }
    if (c === '/' && src[j + 1] === '/') { while (src[j] !== '\n') j++; continue; }
    if (c === open) d++; else if (c === close && --d === 0) break;
  }
  return JSON.parse(JSON.stringify(vm.runInNewContext('(' + src.slice(start, j + 1) + ')')));
}

// character-world-master.v1.js を 読む(この realm の ふつうの オブジェクトで かえす)
function loadMaster() {
  const ctx = { window: {} }; vm.createContext(ctx);
  vm.runInContext(read('character-world-master.v1.js') + ';window.M = NAOTOCCHI_CHARACTER_WORLD_MASTER_V1;', ctx);
  return JSON.parse(JSON.stringify(ctx.window.M));
}

// めぐるの remove-it テスト(4B / 4C / 4D-1 / 4D-2 / 4E-1)が 使う、印の ついた Phase 4D-2 / 4E-2 の ブロックと 行、
// その export を 消す 変換(5 つの テストに 同じ 写しが あった)
const stripPhase4d2 = (src) => src.replace(/^[ \t]*\/\/ ====== Phase 4D-2:[\s\S]*?\/\/ ====== \/Phase 4D-2 ======\n/gm, '')
  // Phase 4E-2(home|forest を あるく PoC)も 印の ついた ブロックと 行だけ。4D-2 と いっしょに 消す
  .replace(/^[ \t]*\/\/ ====== Phase 4E-2:[\s\S]*?\/\/ ====== \/Phase 4E-2 ======\n/gm, '')
  .split('\n').filter((l) => !/\/\/ Phase 4D-2$|\/\/ Phase 4E-2$/.test(l)).join('\n')
  .replace(/ CONTINUOUS_WALK_ALLOWLIST,[^\n]*? createCorridorWalk,/, '')
  .replace(', get corridor() { return corridorInfo(); }, get corridorStats() { return corrStats; }', '');

module.exports = { ROOT, read, codeOnly, literal, loadMaster, stripPhase4d2 };
