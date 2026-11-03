// 全452枚 静的監査スクリプト（読み取り専用）
// 使い方: node audit-full452.mjs [出力ディレクトリ]   （既定: このスクリプトのあるディレクトリ）
// - ゲーム本体・カタログ・ルールブック・画像は一切変更しない。出力ディレクトリにだけ書く。
// - 試合のシミュレーションは行わない。静的照合のみ。
// - ここで出る「疑い」は静的ヒューリスティックであり、確定不具合ではない（証拠強度を別に記録）。
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const CG = path.resolve(HERE, '..');            // prototypes/card-game
const ROOT = path.resolve(CG, '../..');         // repo root
const OUT = path.resolve(process.argv[2] ?? HERE);
fs.mkdirSync(OUT, {recursive: true});

const eng = await import(path.join(CG, 'engine.mjs'));       // RULES 登録のため先に読み込む
const {RULES} = await import(path.join(CG, 'rules.mjs'));
const {CATALOG} = await import(path.join(CG, 'full-catalog.mjs'));
const {CARDS: BASE} = await import(path.join(CG, 'cards.mjs'));
const rb = await import(path.join(CG, 'rulebook-content.mjs'));
const {ART} = await import(path.join(CG, 'ui-art.mjs')).then(m => ({ART: m.ART ?? m.default ?? m.UI_ART ?? m.CARD_ART ?? Object.values(m).find(v => v && typeof v === 'object' && v['C-bat'])}));

const read = p => fs.readFileSync(p, 'utf8');
const ids = Object.keys(CATALOG);
const TYPE_JA = {main: 'メイン', companion: 'なかま', partner: 'こいびと', world: 'セカイ', play: 'あそび', item: 'あいてむ', event: 'できごと'};

// ---------- 参照元の収集 ----------
const runtimeFiles = fs.readdirSync(CG).filter(f => f.endsWith('.mjs') &&
  !/^(full-catalog|ui-art|rulebook-sources|rulebook-content|tutorial|cpu-decks|my-decks|records|collection|learning)/.test(f) && !/^ui-/.test(f));
const runtimeText = Object.fromEntries(runtimeFiles.map(f => [f, read(path.join(CG, f))]));
const testFiles = fs.readdirSync(path.join(CG, 'tests')).filter(f => /\.(mjs|cjs|json|py)$/.test(f));
const testText = Object.fromEntries(testFiles.map(f => [f, read(path.join(CG, 'tests', f))]));
const docsDir = path.join(ROOT, 'docs/card-game');
const docFiles = fs.readdirSync(docsDir).filter(f => f.endsWith('.md'));
const docText = Object.fromEntries(docFiles.map(f => [f, read(path.join(docsDir, f))]));
const quoted = id => new RegExp(`['"\`]${id.replace(/[-.]/g, '\\$&')}['"\`]`);
const inDocs = id => new RegExp(`(?<![A-Za-z0-9_-])${id.replace(/[-.]/g, '\\$&')}(?![A-Za-z0-9_-])`);

// 出典・画像対応表（PR #413 / docs/content-provenance-20261021）
const provCsv = read(path.join(ROOT, 'docs/content-provenance-20261021/cards.csv'));
function parseCsv(t) {
  const rows = []; let row = [], f = '', q = false;
  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (q) { if (c === '"') { if (t[i + 1] === '"') { f += '"'; i++; } else q = false; } else f += c; }
    else if (c === '"') q = true; else if (c === ',') { row.push(f); f = ''; }
    else if (c === '\n') { row.push(f); rows.push(row); row = []; f = ''; } else if (c !== '\r') f += c;
  }
  if (f || row.length) { row.push(f); rows.push(row); }
  const [h, ...b] = rows; return b.filter(r => r.length === h.length).map(r => Object.fromEntries(h.map((k, i) => [k, r[i]])));
}
const prov = Object.fromEntries(parseCsv(provCsv).map(r => [r.card_id, r]));

// ---------- 静的ヒューリスティック ----------
const progJson = id => JSON.stringify(RULES[id] ?? null);
const numbersIn = s => [...s.matchAll(/(?<![0-9])[0-9]+(?![0-9])/g)].map(m => +m[0]);
function progNumbers(id) {                 // プログラム内の数値（値・文字列内の桁）
  const j = progJson(id), set = new Set();
  for (const m of j.matchAll(/:\s*(-?\d+)/g)) set.add(Math.abs(+m[1]));
  for (const m of j.matchAll(/"[A-Za-z]*?(\d+)[A-Za-z]*"/g)) set.add(+m[1]);
  return set;
}
const names = new Set(Object.values(CATALOG).map(c => c.name));
const STALE = [['ときとばし', '118でときおくりへ用語移行済み'], ['HP', '相手のHPを削るゲームではない'], ['ライフ', '非採用語'], ['倒す', '勝敗はそだち比較'], ['コスト', '資源は「時」']];

// 画面での概算収容量（カード面 .card-copy）。CSS: 320px基準キャンバス、font 3.7cqw / long-copy(>140字) 3.2cqw、行高1.4。
function capacity(c, isMain) {
  const long = c.text.length > 140, fontPx = (long ? 3.2 : 3.7) * 3.2;
  const inner = 320 - 2 * 0.04 * 320 - 2 * 0.03 * 294;           // コピー枠の使用幅（概算）
  const perLine = Math.floor(inner / fontPx);
  const rowPct = isMain ? 0.25 : 0.27, boxH = rowPct * (480 - 2 * 0.04 * 320) - 2 * 0.03 * 294;
  const lines = Math.floor(boxH / (fontPx * 1.4));
  let used = 0; for (const seg of c.text.split('\n')) used += Math.max(1, Math.ceil([...seg].length / perLine));
  return {perLine, lines, usedLines: used, overflowLines: used - lines, long};
}

// ---------- カードごとの監査 ----------
const rows = [];
for (const id of ids) {
  const c = CATALOG[id], r = RULES[id], flags = [];
  const impl = r ? `RULES:${r.mode ?? '(mode無し)'}` : BASE[id] ? 'LEGACY:cards.mjs' : 'なし';
  if (!r && !BASE[id]) flags.push('no-implementation');
  const implFiles = runtimeFiles.filter(f => quoted(id).test(runtimeText[f]));
  const tests = testFiles.filter(f => quoted(id).test(testText[f]));
  const docs = docFiles.filter(f => inDocs(id).test(docText[f]));
  const p = prov[id];
  const art = ART?.[id];
  const artOk = !!art && fs.existsSync(path.join(CG, art.small)) && fs.existsSync(path.join(CG, art.large));
  if (!artOk) flags.push('art-missing');
  if (!p) flags.push('provenance-row-missing'); else if (p.canonical_source && p.consistency_status !== 'source_present') flags.push('provenance:' + p.consistency_status);
  if (p && p.effect_summary !== c.text) flags.push('provenance-text-differs');

  const t = c.text;
  const isNoAbility = /^(?:能力なし|なし)[。.]?$/.test(t.trim());
  // H1 回数制限
  const j = progJson(id), hasOnce = /"once"|"onceName"|"limit"|"limitGroup"/.test(j);
  if (/1ターンに1回/.test(t) && r && !hasOnce) flags.push('H1:text-1turn-limit-without-program-limit');
  if (/1ラウンドに1回/.test(t) && r && !/"round"/.test(j) && !hasOnce) flags.push('H1:text-1round-limit-without-program-limit');
  if (/1ラウンドに1回/.test(t) && r && hasOnce && !/"round"/.test(j)) flags.push('H1b:text-1round-limit-program-has-no-round-scope(要確認)');
  if (r && /"once":true/.test(j) && !/1ターンに1回|1ラウンドに1回|1回/.test(t)) flags.push('H1c:program-once-without-text-limit');
  // H2/H3 数値
  if (r && !isNoAbility) {
    const pn = progNumbers(id), tn = numbersIn(t).filter(n => n >= 2);
    const miss = [...new Set(tn)].filter(n => !pn.has(n));
    if (miss.length) flags.push('H2:text-number-not-in-program=' + miss.join('/'));
    const tnAll = new Set(numbersIn(t));
    const extra = [...pn].filter(n => n >= 2 && !tnAll.has(n) && !(c.stage && (n === c.stage || n === c.power || n === c.wisdom || n === c.cost)));
    if (extra.length) flags.push('H3:program-number-not-in-text=' + extra.join('/'));
  }
  // H4 能力なし
  if (isNoAbility && r && /"steps"|"triggers"|"active"|"replacements"|"passive"/.test(j)) flags.push('H4:no-ability-text-but-program-has-effect');
  // H5 用語
  for (const [w, why] of STALE) if (t.includes(w) && !(w === 'コスト' && /コストとして|コストを/.test(t) === false && false)) flags.push(`H5:term「${w}」(${why})`);
  // H7 参照カード名
  for (const m of t.matchAll(/「([^」]+)」/g)) { const n = m[1]; if (!names.has(n) && !/^(すぐつかう|みにつける|しかける|つかう|ちから|ちえ)$/.test(n)) flags.push(`H7:quoted-name-not-in-catalog=${n}`); }
  // H11 体裁
  if (!isNoAbility && !/[。）」]$/.test(t.trim())) flags.push('H11:text-does-not-end-with-sentence-mark');
  if (/\s{2,}|　/.test(t)) flags.push('H11:odd-whitespace');
  // H8 画面収容量
  const cap = capacity(c, c.type === 'main');
  if (cap.overflowLines > 0) flags.push(`H8:card-face-estimated-overflow=${cap.overflowLines}行`);

  rows.push({id, name: c.name, type: c.type, typeJa: TYPE_JA[c.type], rare: c.rare, cost: c.cost, stage: c.stage ?? '', power: c.power ?? '', wisdom: c.wisdom ?? '',
    textLen: [...t].length, text: t, impl, implFiles: implFiles.join('|'), testRefs: tests.length, testFiles: tests.join('|'), rulingDocRefs: docs.length,
    rulingDocs: docs.slice(0, 5).join('|'), provenance: p?.consistency_status ?? '', artOk, source: c.source.split('#')[0], capLines: cap.lines, capUsedLines: cap.usedLines, flags});
}

// ---------- 分類（A〜E）----------
// 主分類は「疑いの種類」で決める。証拠強度: S=直接テストあり+静的一致 / M=間接（種別ループ・ゲーム全体テスト）のみ / W=静的ヒューリスティックのみ
const CLASSIFY = new Map();      // 手動レビュー結果で上書き（review.json）
const reviewPath = path.join(HERE, 'review.json');
const review = fs.existsSync(reviewPath) ? JSON.parse(read(reviewPath)) : {};
for (const row of rows) {
  const rv = review[row.id];
  const f = row.flags;
  let primary = 'A', secondary = [], strength = row.testRefs > 0 ? 'S' : 'M';
  if (rv) { primary = rv.primary; secondary = rv.secondary ?? []; strength = rv.strength ?? strength; row.note = rv.note ?? ''; row.reviewed = true; }
  else {
    const hard = f.filter(x => /^(no-implementation|H4|art-missing|provenance|H7)/.test(x));
    const weak = f.filter(x => /^(H1|H2|H3|H5|H11)/.test(x));
    const ui = f.filter(x => /^H8/.test(x));
    if (hard.length) { primary = /H7|provenance/.test(hard[0]) ? 'D' : 'C'; strength = 'W'; }
    else if (weak.length) { primary = 'B'; strength = 'W'; }
    else if (ui.length) { primary = 'E'; strength = 'W'; }
    if (primary !== 'E' && ui.length) secondary.push('E');
    row.reviewed = false;
  }
  row.primary = primary; row.secondary = secondary.join('|'); row.strength = strength;
}

// ---------- ルールブック15章 ----------
const chapterReport = rb.CHAPTERS.map(ch => {
  const body = [ch.title, ch.summary, ...ch.details].join('\n');
  const missingCards = ch.cards.filter(i => !CATALOG[i]);
  const stale = STALE.filter(([w]) => body.includes(w)).map(([w]) => w);
  return {id: ch.id, title: ch.title, details: ch.details.length, cards: ch.cards.length, missingCards, stale, sources: ch.sources, chars: [...body].length};
});
const rulingReport = rb.CURRENT_RULINGS.map(r => {
  const sp = path.join(ROOT, r.source.path);
  const exists = fs.existsSync(sp);
  const headingFound = exists && read(sp).split('\n').some(l => l.replace(/^#+\s*/, '').trim().startsWith(r.source.heading.replace(/^#+\s*/, '').trim()));
  const stale = STALE.filter(([w]) => r.text.includes(w)).map(([w]) => w);
  return {id: r.id, chapter: r.chapter, title: r.title, sourcePath: r.source.path, sourceExists: exists, headingFound, stale, chars: [...r.text].length};
});
// 主要数値の全文書横断チェック（デッキ40/初手5/そだち開始20/ラウンド10/同名3・1）
const FACTS = [
  ['デッキ枚数', /40枚/], ['初手5枚', /初手5枚/], ['そだち20から', /そだち20/], ['10ラウンド', /10ラウンド/], ['同名3枚', /同名3枚/], ['レア同名1枚', /レア同名1枚/],
  ['本編解禁(旧)', /カード解禁|解禁される/], ['全452枚を最初から使用', /全452枚を最初から/], ['先攻R1ドロー', /先攻R1/], ['ときとばし(旧語)', /ときとばし/], ['ときおくり', /ときおくり/]];
const rbText = rb.CHAPTERS.map(c => [c.title, c.summary, ...c.details].join('\n')).join('\n') + '\n' + rb.CURRENT_RULINGS.map(r => r.text).join('\n');
const tutorialText = read(path.join(CG, 'tutorial.mjs'));
const surfaces = {
  'ルールブック(CHAPTERS+CURRENT_RULINGS)': rbText, 'tutorial.mjs': tutorialText,
  'docs/card-game-design-current.md': read(path.join(ROOT, 'docs/card-game-design-current.md')),
  'prototypes/card-game/README.md': read(path.join(CG, 'README.md')), 'docs/card-game/01-core-rules.md': docText['01-core-rules.md'],
  'docs/card-game/02-main-system.md': docText['02-main-system.md']};
const factTable = FACTS.map(([name, re]) => ({fact: name, ...Object.fromEntries(Object.entries(surfaces).map(([k, v]) => [k, (v.match(new RegExp(re.source, 'g')) ?? []).length]))}));
// カード本文 vs ルールブックの用語（同じ語が異なる意味で使われていないかの手がかり）
const TERMS = ['たんじょう', 'ときおくり', 'へんしん', 'たまご', 'そだち', 'なかま枠', 'こいびと枠', 'セカイ枠', '準備枠', 'すぐつかう', 'みにつける', 'しかける', 'ちょうせん', '発動', '解決', '対象', '捨て札', '山札', '手札', '時', '交際', '結婚', '別れ', '離婚', '裏向き', '表向き', '公開', '装備', '段階', 'メイン'];
const termTable = TERMS.map(t => ({term: t, cards: Object.values(CATALOG).filter(c => c.text.includes(t)).length, rulebook: (rbText.match(new RegExp(t, 'g')) ?? []).length, tutorial: (tutorialText.match(new RegExp(t, 'g')) ?? []).length}));
// 表記ゆれ候補
const VARIANTS = [['手札に戻す', '手札へ戻す'], ['手札に加える', '手札へ加える'], ['山札の一番下', '山札の底'], ['捨て札に置く', '捨て札へ置く'], ['なかま枠', 'なかま欄'], ['発動できる', '発動する'], ['このターン', '今ターン'], ['自分のターン', '自ターン'], ['相手のターン', '相手ターン'], ['能力なし', 'なし。'], ['1枚引く', '1枚ドローする'], ['デッキ', '山札']];
const variantTable = VARIANTS.map(([a, b]) => ({a, aCount: Object.values(CATALOG).filter(c => c.text.includes(a)).length, b, bCount: Object.values(CATALOG).filter(c => c.text.includes(b)).length}));

// ---------- 集計 ----------
const count = (k, f = x => x) => rows.reduce((m, r) => (m[f(r[k])] = (m[f(r[k])] || 0) + 1, m), {});
const summary = {
  generatedFrom: {head: fs.readFileSync(path.join(ROOT, '.git/HEAD'), 'utf8').trim()},
  total: rows.length, byType: count('type'), byPrimary: count('primary'), byStrength: count('strength'), byImpl: count('impl', x => x.split(':')[0]),
  rulesEntries: Object.keys(RULES).length, legacyBase: Object.keys(BASE).length,
  cardsWithDirectTest: rows.filter(r => r.testRefs > 0).length, cardsWithoutDirectTest: rows.filter(r => r.testRefs === 0).length,
  cardsWithRulingDoc: rows.filter(r => r.rulingDocRefs > 0).length, artOk: rows.filter(r => r.artOk).length,
  textLen: {max: Math.max(...rows.map(r => r.textLen)), over140: rows.filter(r => r.textLen > 140).length},
  flagCounts: rows.flatMap(r => r.flags).reduce((m, f) => { const k = f.split(/[=:(]/)[0] + (f.startsWith('H') ? '' : ''); m[k] = (m[k] || 0) + 1; return m; }, {}),
  chapters: chapterReport.length, currentRulings: rulingReport.length};

// ---------- 出力 ----------
const csvEsc = v => { v = Array.isArray(v) ? v.join(' ; ') : String(v ?? ''); return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; };
const cols = ['id', 'name', 'typeJa', 'rare', 'cost', 'stage', 'power', 'wisdom', 'textLen', 'impl', 'implFiles', 'testRefs', 'rulingDocRefs', 'provenance', 'artOk', 'primary', 'secondary', 'strength', 'reviewed', 'flags', 'note', 'text'];
fs.writeFileSync(path.join(OUT, 'cards-452.csv'), '\ufeff' + cols.join(',') + '\n' + rows.map(r => cols.map(k => csvEsc(r[k])).join(',')).join('\n') + '\n');
fs.writeFileSync(path.join(OUT, 'cards-452.json'), JSON.stringify(rows, null, 1));
fs.writeFileSync(path.join(OUT, 'summary.json'), JSON.stringify({summary, chapterReport, rulingReport, factTable, termTable, variantTable}, null, 1));
console.log(JSON.stringify(summary, null, 1));
