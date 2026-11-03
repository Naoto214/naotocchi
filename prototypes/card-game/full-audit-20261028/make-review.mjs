// review.json（手動レビューの結果）を生成する。audit-full452.mjs の出力 cards-452.json を入力にする。
// 手動で確認した結論（false positive の除外・B/D/E 判定とその理由）をここに明示的に残す。
import fs from 'node:fs';
const [inp, out] = process.argv.slice(2);
const rows = JSON.parse(fs.readFileSync(inp, 'utf8'));
const rv = {};
const set = (id, primary, note, secondary = [], strength) => { rv[id] = {primary, secondary, note, ...(strength ? {strength} : {})}; };
const by = id => rows.find(r => r.id === id);
// --- B: 意味を変えない本文明確化の候補（個別レビュー）---
const B = {
  'G-lunar-lander': '「残り時がちょうど2なら」を判定する時点（コスト支払い後か）が本文だけでは読み取れない。実装は支払い後。',
  'G-submarine-3d': '「3に選んだ数の2倍を足した枚数」が数式的で初心者に読みにくい。「時コスト」と選択のタイミングも一文に詰まっている。',
  'M-venus_flytrap-03': '「適用されていた」が相手ターン中の過去参照であることが読み取りにくい（効果が解決時に適用された、の意）。',
  'M-venus_flytrap-08': '「適用されており」の参照範囲（このターンに自分がしかけたカード）と「発動できる」の条件が一文で並び、条件の区切りが読み取りにくい。',
  'M-sakura-06': '124字超で条件が三重（選んだ後／解決時に一部適用／準備枠から移動）。条件の省略はできないため、文の区切りだけを整理する案。',
  'M-star-03': '「メインへへんしん」と助詞が連続し読みにくい。意味は変えない。',
  'M-man-04': '「ちょうせんする時、発動できる」の発動時点と、能力値を選んだ後に行う処理の順が一文で分かりにくい。'};
for (const [id, n] of Object.entries(B)) set(id, 'B', n, [], by(id).testRefs > 0 ? 'S' : 'M');
// --- D: 正式資料間の同期不足（カード効果・実装は変えない）---
set('G-doodle-jump', 'D', '出典・画像対応表(docs/content-provenance-20261021/cards.csv)の本文が、正式公開済みの本文(#452/doc 477)より古い。実装・カタログ・テストは新本文で一致。', [], 'S');
set('P-rock_octopus', 'D', '出典・画像対応表の本文が、#449で修正済みの現行本文より古い。実装・カタログ・テストは新本文で一致。', [], 'S');
// --- 用語: 発動コスト は本文7枚が使うがルールブック(CHAPTERS)に定義が無い ---
const hatsudou = rows.filter(r => /発動コスト/.test(r.text) && !rv[r.id]).map(r => r.id);
for (const id of hatsudou) set(id, 'B', '「発動コスト」が本文で使われているが、ルールブック15章に用語としての説明が無い（「発動のために払う／捨てる」の意）。本文変更ではなくルールブック側の一文追加でも解消可。', [], by(id).testRefs > 0 ? 'M' : 'W');
// --- 用語ゆれ（場/盤面、伏せた/表向き）---
for (const r of rows) {
  if (rv[r.id]) continue;
  const t = r.text, notes = [];
  if (/場に|場の/.test(t) && !/盤面/.test(t)) notes.push('「場」表記（他27枚は「盤面」）');
  if (/伏せた/.test(t)) notes.push('「伏せた」表記（他は「表向き／しかける」系の語）');
  if (notes.length) set(r.id, 'B', '表記ゆれ（任意・低優先）：' + notes.join('／'), [], 'W');
}
// --- E: 画面収容量の概算が超過（実描画は未確認。詳細パネルでは全文が読める）---
for (const r of rows) {
  if (!r.flags.some(f => f.startsWith('H8'))) continue;
  if (rv[r.id]) { rv[r.id].secondary = [...new Set([...rv[r.id].secondary, 'E'])]; continue; }
  set(r.id, 'E', `カード面の本文が概算で${r.capUsedLines}行（収容${r.capLines}行）。効果・実装は一致。詳細パネルでは全文表示。実描画での確認は未実施。`, [], 'W');
}
// --- 以上以外のフラグは手動確認で false positive と判断 → A ---
const fpNote = {
  'H1': '本文の「1ラウンドに1回」は防止/置換の共通機構(preventions)が1ラウンド1回を保証する。C-hedgehog は tests/replacements.test.mjs で2回目に防止されないことを直接確認。',
  'H2': '本文の数値は条件(op/n)や段階・手札枚数などプログラム上の別表現で保持されている。個別に目視確認。',
  'H3': 'プログラム内の数値は段階・ちから・ちえ・種類別判定など本文の別表現に対応。個別に目視確認。',
  'H5': '「時コスト」「発動コスト」はルールブック/裁定で使用される正式語。',
  'H7': '「」は種類名・枠名・能力名・コスト表記であり、カード名参照ではない。',
  'provenance': 'PR #413 で「確認済みの名称差・表示名差・形態ラベル差」と記録済みの既知差分。'};
for (const r of rows) {
  if (rv[r.id]) continue;
  const ks = [...new Set(r.flags.map(f => f.split(/[:=]/)[0].replace(/b|c$/, '')))].filter(k => k);
  if (!ks.length) continue;
  const notes = ks.map(k => fpNote[k] ?? fpNote[k.split(':')[0]] ?? '').filter(Boolean);
  set(r.id, 'A', '静的フラグ(' + ks.join('/') + ')を個別確認し誤検知と判断。' + notes.join(' '), [], r.testRefs > 0 ? 'S' : 'M');
}
fs.writeFileSync(out, JSON.stringify(rv, null, 1));
console.log(Object.keys(rv).length, 'reviews;', 'hatsudou', hatsudou.join(','));
