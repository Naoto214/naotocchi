// ミニゲーム採点監査(2026-11-24): コード読解の結果(data/code-review/*.json)と
// 自動プレイの結果(data/sim-runs-*.jsonl)を まとめて、比較表(audit.json / table.md)を つくる。
// 本番コードは 読みこまない・変更しない。 node tools/minigame-audit/build-report.cjs
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..', '..');
const DIR = path.join(ROOT, 'docs', 'audit', 'minigame-scoring-audit-2026-11-24');
const DATA = path.join(DIR, 'data');

const review = [];
for (const f of ['groupA', 'groupB', 'groupC', 'groupD1', 'groupD2', 'groupE']) review.push(...JSON.parse(fs.readFileSync(path.join(DATA, 'code-review', f + '.json'), 'utf8')));

const runs = [];
for (const f of ['sim-runs-part1.jsonl', 'sim-runs-part2.jsonl']) for (const l of fs.readFileSync(path.join(DATA, f), 'utf8').split('\n')) if (l.trim()) runs.push(JSON.parse(l));
// tower-defense は 1回目の 実行を とちゅうで とめて やりなおした ので、2回目(part2)を つかう
const runsOf = (id) => { const rs = runs.filter((r) => r.id === id); return rs.some((r) => r.source !== 'log') ? rs.filter((r) => r.source !== 'log') : rs; };

// 統合者(監査のまとめ役)の 判定。コード読解の 判定を 上書きする ものと、優先度の 区分。
// P1 = 重大(解答不能・進行不能・採点バグ)
// P2 = 改善推奨・高(ほとんど何もしなくても「ふつう」以上、または単純な操作の繰り返しで「大成功」が安定して取れる)
// P3 = 改善推奨・中(100点に届かない、時間と構造が合わない、運の比重 など)
// P4 = 軽微 / — = 現行維持
const P1 = ['tilt-maze-3d', 'shanghai-tiles', 'slide-puzzle'];
const P2 = ['stack-themed', 'stack-snowman', 'stack-harvest', 'stack-acorn', 'stack-sakura', 'stack-leaves',
  'pinball-physics', 'rhythm-highway-3d', 'grand-prix-3d', 'ski-jump', 'street-fight', 'fruit-slice', 'darts-board',
  'asteroids-classic', 'jenga-tower', 'voxel-mine', 'halfpipe-skate', 'archery-3d', 'dragDecorate-cake', 'domino-run',
  'tower-defense', 'hang-glider-3d', 'downhill-snow', 'sushi-belt', 'push-puzzle', 'falling-block-puzzle', 'track-field',
  'blackjack-21', 'plane-landing', 'sugoroku-race', 'sky-shooter', 'ring-flight-3d', 'ring-flight-summer'];
const OVERRIDE = {
  'tower-defense': { verdict: '改善推奨', note: 'コード読解では「重大」。時間切れ=「守りきった」は Phase 0 で仕様判断待ち(G-AC-31)とされた設計の問題で、不具合とは言い切れないため「改善推奨・高」に下げた。' },
  'hang-glider-3d': { verdict: '改善推奨', note: 'コード読解では「重大」。進行は正常で、点が操作よりも配置(運)で決まる問題なので「改善推奨・高」に下げた。' },
};
const STACK_NOTE = '【自動プレイで発見】0.15秒ごとの連打だけで6回中5回が100点(harness)。ゆれるブロックは落下中に止まり、着地後も位置が戻らないため、着地直後に押すとほぼ真上に落ちて「パーフェクト」が続く(games.js 371-382行)。コード読解の段階では「現行維持」としていた。';
for (const id of P2.slice(0, 6)) OVERRIDE[id] = { verdict: '改善推奨', note: STACK_NOTE, extraIssue: { level: '改善推奨', text: '連打だけで100点(6回中5回、自動プレイ)。着地直後に押すと、ゆれが動く前に落ちてパーフェクトになる。', basis: 'harness' }, proposal: '着地後にゆれるブロックの位置を端へ戻す、または着地から次に落とせるまで0.3〜0.5秒待つ。連続パーフェクトの加点(perfects×4)を、ゆれの速さに応じたものにする。' };

const GENRE_FIX = { 'downhill-mountain': 'アクション', 'crane-game-3d': 'テーブル・運', 'street-fight': '対戦', 'tower-defense': '戦略' };
const GENRE_MAP = { 'カード・運': 'テーブル・運', '対戦ボード': '対戦', '対戦アクション': '対戦', '育成・料理': '料理・デコ', 'リズム': 'リズム' };

const coinsFor = (s) => (s >= 70 ? 60 : s >= 30 ? 30 : 0);
function simSummary(id) {
  const rs = runsOf(id);
  const pick = (bot) => rs.filter((r) => r.bot === bot);
  const fmt = (arr) => arr.map((r) => ({ raw: r.raw, rec: !!r.recorded }));
  const rec = (arr) => arr.filter((r) => r.recorded && r.raw !== null).map((r) => r.raw);
  const stat = (arr) => { const v = rec(arr); if (!v.length) return null; return { n: arr.length, recorded: v.length, min: Math.min(...v), max: Math.max(...v), mean: Math.round(v.reduce((a, b) => a + b, 0) / v.length), ge30: v.filter((x) => x >= 30).length, ge70: v.filter((x) => x >= 70).length, coins: Math.round(v.reduce((a, b) => a + coinsFor(b), 0) / arr.length) }; };
  const ends = rs.filter((r) => r.endedMs).map((r) => r.endedMs);
  return { idle: fmt(pick('idle')), tap1: fmt(pick('tap1')), random: fmt(pick('random')), mash: fmt(pick('mash')), randomStat: stat(pick('random')), mashStat: stat(pick('mash')), neverEnds: rs.filter((r) => r.raw === null).map((r) => r.bot), simEndSec: ends.length ? Math.round(Math.max(...ends) / 1000) : null };
}

const rows = review.map((g) => {
  const o = OVERRIDE[g.id] || {};
  const verdict = o.verdict || g.verdict;
  const priority = P1.includes(g.id) ? 'P1' : P2.includes(g.id) ? 'P2' : verdict === '改善推奨' ? 'P3' : verdict === '軽微' ? 'P4' : '—';
  const issues = [...(o.extraIssue ? [o.extraIssue] : []), ...(g.issues || [])];
  const genre = GENRE_FIX[g.id] || GENRE_MAP[g.genre] || g.genre;
  return {
    id: g.id, name: g.name, genre, category: g.category, factory: g.factory, lines: g.lines,
    formula: g.formula, timeLimit: g.timeLimit, endConditions: g.endConditions,
    minScore: g.minScore, maxScore: g.maxScore, hundredReachable: g.hundredReachable, hundredCondition: g.hundredCondition,
    idle: g.idle, zeroAchievement: g.zeroAchievement, partial: g.partial, fullClear: g.fullClear, timeout: g.timeout,
    bonuses: g.bonuses, exploits: g.exploits || [], solvability: g.solvability, luck: g.luck, playSec: g.playSec,
    difficulty: g.difficulty, mobile: g.mobile, issues, verdict, priority,
    proposal: o.proposal || g.proposal || '', reviewNote: o.note || '', reviewVerdict: g.verdict,
    sim: simSummary(g.id),
  };
});
const order = { P1: 0, P2: 1, P3: 2, P4: 3, '—': 4 };
rows.sort((a, b) => order[a.priority] - order[b.priority] || a.genre.localeCompare(b.genre, 'ja') || a.id.localeCompare(b.id));
if (rows.length !== 100 || new Set(rows.map((r) => r.id)).size !== 100) throw new Error('100本そろっていない: ' + rows.length);

fs.writeFileSync(path.join(DIR, 'audit.json'), JSON.stringify(rows));
const cnt = {}; for (const r of rows) cnt[r.priority] = (cnt[r.priority] || 0) + 1;

// Markdown の 一覧表(README から リンク)
const esc = (s) => String(s == null ? '' : s).replace(/\|/g, '／').replace(/\n/g, ' ');
const cut = (s, n) => { s = esc(s); return s.length > n ? s.slice(0, n) + '…' : s; };
const simCell = (r) => { const s = r.sim.randomStat; const m = r.sim.mashStat; return `でたらめ ${s ? `${s.min}〜${s.max}(記録${s.recorded}/${s.n})` : '記録なし'} / 連打 ${m ? `${m.min}〜${m.max}` : '記録なし'}${r.sim.neverEnds.length ? ' / 終わらない:' + [...new Set(r.sim.neverEnds)].join(',') : ''}`; };
const lines = ['# 全100本 監査結果一覧(2026-11-24)', '', '優先度の順に並べています。詳しい項目(式の行番号、100点の条件、運、スマホ操作など)は `audit.json` と監査ページにあります。', '',
  `件数: P1(重大) ${cnt.P1 || 0} / P2(改善推奨・高) ${cnt.P2 || 0} / P3(改善推奨・中) ${cnt.P3 || 0} / P4(軽微) ${cnt.P4 || 0} / 現行維持 ${cnt['—'] || 0}`, '',
  '| 優先 | ゲーム | ジャンル | 採点式(要約) | 最低〜最高 | 放置 | 達成なし | 難易度 | 時間(秒) | 自動プレイ | 問題点 | 必要性 | 改善提案 |', '|---|---|---|---|---|---|---|---|---|---|---|---|---|'];
for (const r of rows) {
  lines.push(`| ${r.priority} | ${esc(r.name)}<br>\`${r.id}\` | ${r.genre} | ${cut(r.formula, 110)} | ${r.minScore}〜${r.maxScore}${r.hundredReachable ? '' : '(100不可)'} | ${cut(r.idle && r.idle.raw, 40)} | ${cut(r.zeroAchievement && r.zeroAchievement.score, 40)} | ${cut(r.difficulty, 30)} | ${r.playSec ? `${r.playSec.min}/${r.playSec.typical}/${r.playSec.max}` : ''} | ${simCell(r)} | ${cut(r.issues.map((i) => i.text).join(' ／ '), 160)} | ${r.verdict} | ${cut(r.proposal, 140)} |`);
}
fs.writeFileSync(path.join(DIR, 'table.md'), lines.join('\n') + '\n');
console.log('ok', cnt);
