// そうこばん 3案の 比較ページを つくる: games.js の PUSH_PUZZLE_PLANS と 以前の 4盤面を ソルバーに かけ、
// comparisons/push-puzzle-20261124/template.html に データを うめこんで index.html と data.json を かく。
// node tools/push-puzzle/build-compare.cjs
'use strict';
const fs = require('node:fs'), path = require('node:path');
const S = require('./solver.cjs');
const root = path.resolve(__dirname, '..', '..'), out = path.join(root, 'comparisons', 'push-puzzle-20261124');
const src = fs.readFileSync(path.join(root, 'games.js'), 'utf8');
const lit = src.match(/const PUSH_PUZZLE_PLANS = (\{[\s\S]*?\n  \});/)[1];
const PLANS = Function('return ' + lit)();
const RECOMMENDED = src.match(/const PUSH_PUZZLE_PLAN = '(\w)'/)[1];
// 2026-11-24 時点の main(d9f63bbd)の 盤面と ★([y, x])。制限時間は 3問 あわせて 60秒
const OLD = {
  rows: [
    ['#######', '#  #  #', '# $   #', '#  #$ #', '# @  ##', '#  ## #', '#######'],
    ['#######', '#     #', '# #$# #', '# $@$ #', '# #$# #', '#     #', '#######'],
    ['#######', '#    ##', '# # $ #', '#  $# #', '## @  #', '#     #', '#######'],
    ['#######', '#     #', '#  $  #', '# $@$ #', '#  $  #', '#     #', '#######'],
  ],
  goals: [[[1, 1], [1, 4]], [[1, 1], [1, 5], [5, 1], [5, 5]], [[1, 1], [5, 5]], [[1, 1], [1, 5], [5, 1], [5, 5]]],
};
const toDots = (rows, goals) => rows.map((r, y) => [...r].map((c, x) => (goals.some(([gy, gx]) => gy === y && gx === x) ? (c === '$' ? '*' : '.') : c)).join(''));
function board(lv) { const goals = []; lv.rows.forEach((r, y) => [...r].forEach((c, x) => { if (c === '.') goals.push([y, x]); })); return { rows: lv.rows.map((r) => r.replace(/\./g, ' ')), goals }; }
function metrics(rows, goals) {
  const m = S.analyze(rows, goals), est = S.estimateSeconds(m);
  const naive = m.solvable ? S.naiveRate(rows, goals) : 0;
  return { boxes: m.boxes, solvable: m.solvable, minMoves: m.minMoves, minPushes: m.minPushes, solution: m.solution, states: m.states,
    deadStateRatio: m.deadStateRatio, trapPushRatio: m.trapPushRatio, firstTraps: m.firstTraps, estSec: Number.isFinite(est) ? est : null, naiveRate: naive };
}
const data = { generated: new Date().toISOString().slice(0, 10), recommended: RECOMMENDED, plans: {}, old: [] };
for (const [id, plan] of Object.entries(PLANS)) {
  data.plans[id] = { name: plan.name, levels: plan.levels.map((lv) => {
    const { rows, goals } = board(lv), m = metrics(rows, goals);
    if (m.minMoves !== lv.par) throw new Error(`${lv.id}: par ${lv.par} != ${m.minMoves}`);
    const mi = S.mirror(rows, goals); if (!S.analyze(mi.rows, mi.goals).solvable) throw new Error(lv.id + ' mirror');
    return { id: lv.id, tier: lv.tier, timeSec: lv.timeMs / 1000, rows: lv.rows, ...m };
  }) };
}
OLD.rows.forEach((rows, i) => data.old.push({ id: `旧${i + 1}`, rows: toDots(rows, OLD.goals[i]).map((r) => r.replace('@', '@')), ...metrics(rows, OLD.goals[i]) }));
fs.mkdirSync(out, { recursive: true });
fs.writeFileSync(path.join(out, 'data.json'), JSON.stringify(data, null, 1) + '\n');
const tpl = fs.readFileSync(path.join(out, 'template.html'), 'utf8');
fs.writeFileSync(path.join(out, 'index.html'), tpl.replace('/*DATA*/null', () => JSON.stringify(data)));
for (const [id, p] of Object.entries(data.plans)) console.log(id, p.name, p.levels.map((l) => `${l.id} 箱${l.boxes} ${l.minMoves}手/押${l.minPushes} 詰${l.trapPushRatio} 約${l.estSec}s/${l.timeSec}s`).join(' | '));
data.old.forEach((o) => console.log(o.id, o.solvable ? `${o.minMoves}手/押${o.minPushes} 約${o.estSec}s` : '解なし', `詰${o.trapPushRatio} dead${o.deadStateRatio}`));
