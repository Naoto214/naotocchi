// 承認済みの ランタイム変更を、保護スコープ(tests/helpers/home-production-pins.json)に 記録する。
// #587・#589 と おなじ 方法: 変えた 区間を「新しい ファイルの バイト位置 → もとの 中身」として 先頭に たし、
// after(新しい git blob)と size を 更新する。古い 記録は そのまま(もとの ベースラインまで もどせる)。
// node tools/minigame-audit/record-approved-diff.cjs <file> <git-ref-of-previous-version>
const fs = require('fs'), crypto = require('crypto'), {execFileSync} = require('child_process');
const [file, ref] = process.argv.slice(2);
const pinsPath = 'tests/helpers/home-production-pins.json';
const pins = JSON.parse(fs.readFileSync(pinsPath, 'utf8'));
const entry = pins[file];
if (!entry) throw new Error('no pin entry for ' + file);
const blob = (b) => crypto.createHash('sha1').update('blob ' + b.length + '\0').update(b).digest('hex');
const oldB = execFileSync('git', ['show', `${ref}:${file}`], {maxBuffer: 1 << 28});
const newB = fs.readFileSync(file);
if (blob(oldB) !== entry.after) throw new Error(`${file}: previous version is not the pinned "after" (${blob(oldB)} vs ${entry.after})`);
// 行ごとの 差分は git diff -U0 の hunk(Myers)を つかう。区間 = 新しい ファイルの 行 [c, c+d) ↔ もとの 行 [a, a+b)
const split = (b) => { const out = []; let s = 0; for (let i = 0; i < b.length; i++) if (b[i] === 10) { out.push(b.subarray(s, i + 1)); s = i + 1; } if (s < b.length) out.push(b.subarray(s)); return out; };
const A = split(oldB), B = split(newB);
const offB = []; { let o = 0; for (const l of B) { offB.push(o); o += l.length; } offB.push(o); }
const diff = execFileSync('git', ['diff', '-U0', '--no-color', '--no-ext-diff', ref, '--', file], {maxBuffer: 1 << 28}).toString('utf8');
const hunks = [];
for (const m of diff.matchAll(/^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/gm)) {
  const a = +m[1], b = m[2] === undefined ? 1 : +m[2], c = +m[3], d = m[4] === undefined ? 1 : +m[4];
  const oldStart = b === 0 ? a : a - 1, newStart = d === 0 ? c : c - 1; // 0 行の 区間は「その 行の あと」
  hunks.push({bStart: newStart, bEnd: newStart + d, old: A.slice(oldStart, oldStart + b)});
}
const reverse = hunks.map((h) => [offB[h.bStart], offB[h.bEnd], Buffer.concat(h.old).toString('utf8')]).sort((x, y) => y[0] - x[0]);
// たしかめ: 新しい ファイルに reverse を あてると もとの ファイルに もどる
let prior = newB; for (const [s, e, prev] of reverse) prior = Buffer.concat([prior.subarray(0, s), Buffer.from(prev), prior.subarray(e)]);
if (!prior.equals(oldB)) throw new Error('reverse does not restore the previous bytes');
entry.reverse = reverse.concat(entry.reverse);
entry.after = blob(newB); entry.size = newB.length;
fs.writeFileSync(pinsPath, JSON.stringify(pins, null, 2) + '\n');
console.log(file, 'hunks', reverse.length, 'after', entry.after);
