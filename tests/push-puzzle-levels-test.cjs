// そうこばん(push-puzzle)の 盤面・難易度・操作の 回帰テスト(2026-11 見直し)。
// 1) ソルバーで 全案・全盤面(左右反転も)の 合法解と 最短手数を 確認  2) 実際の ゲーム(ハーネス)で 解答手順を 入力して 3問クリア
// 3) 1問ごとの 制限時間・もどす・やりなおし・救済の 声かけ
const {test} = require('node:test');
const assert = require('node:assert/strict');
const {harness} = require('./helpers/runtime-harness.cjs');
const S = require('../tools/push-puzzle/solver.cjs');

const TIERS = [[1, 2], [2, 3], [3, 4]]; // 入門・初級・中級 の 箱の かず
const OLD_UNSOLVABLE = {rows: ['#######', '#     #', '# #$# #', '# $@$ #', '# #$# #', '#     #', '#######'], goals: [[1, 1], [1, 5], [5, 1], [5, 5]]};

function gameOf(h) { return h.api.games.find((g) => g.id === 'push-puzzle'); }
function board(lv, mirror) {
  const rows = mirror ? lv.rows.map((r) => [...r].reverse().join('')) : lv.rows, goals = [];
  rows.forEach((r, y) => [...r].forEach((c, x) => { if (c === '.') goals.push([y, x]); }));
  return {rows: rows.map((r) => r.replace(/\./g, ' ')), goals};
}

test('the old 4-box plus board really has no solution (why it was removed)', () => {
  const m = S.analyze(OLD_UNSOLVABLE.rows, OLD_UNSOLVABLE.goals);
  assert.equal(m.solvable, false);
  assert.equal(m.firstTraps.trap, m.firstTraps.total, 'every first push is already a dead end');
});

const allBoards = (plan) => plan.levels.flatMap((stage, i) => stage.boards.map((b) => ({...b, tier: stage.tier, timeMs: stage.timeMs, stage: i})));
const pushPuzzleStuck = (() => {
  const src = require('node:fs').readFileSync('games.js', 'utf8');
  return new Function(src.match(/  function pushPuzzleStuck\(grid, isGoal\) \{[\s\S]*?\n  \}\n/)[0] + '; return pushPuzzleStuck;')();
})();

test('every board of every plan (and its mirror) is solvable, par = shortest, tiers grow in order', () => {
  const plans = gameOf(harness()).plans;
  assert.deepEqual(Object.keys(plans).sort(), ['A', 'B', 'C']);
  for (const [id, plan] of Object.entries(plans)) {
    assert.equal(plan.levels.length, 3, id);
    let prevBoxes = 0;
    plan.levels.forEach((stage, i) => {
      assert.ok(stage.boards.length >= 1, `${id}${i + 1}: has boards`);
      let tierMin = Infinity;
      for (const lv of stage.boards) for (const mirror of [false, true]) {
        const {rows, goals} = board(lv, mirror);
        assert.ok(rows.every((r) => r.length === 7) && rows.length === 7, `${lv.id}: 7x7`);
        const m = S.analyze(rows, goals);
        assert.ok(m.solvable, `${lv.id}${mirror ? 'm' : ''} solvable`);
        assert.equal(m.boxes, m.goals, `${lv.id}: boxes = stars`);
        assert.equal(m.minMoves, lv.par, `${lv.id}: par is the solver's shortest`);
        assert.ok(S.replay(rows, goals, m.solution), `${lv.id}: solution replays under the rules`);
        assert.ok(m.boxes >= TIERS[i][0] && m.boxes <= TIERS[i][1], `${lv.id}: ${m.boxes} boxes fits ${stage.tier}`);
        // 気軽さの 上限: 最短 25手・押し 10回 まで、初見の めやす時間が 制限時間の 6わり いか
        assert.ok(m.minMoves <= 25 && m.minPushes <= 10, `${lv.id}: small enough`);
        assert.ok(S.estimateSeconds(m) * 1000 <= stage.timeMs * 0.6, `${lv.id}: first-try estimate fits the limit`);
        tierMin = Math.min(tierMin, m.boxes);
      }
      assert.ok(tierMin >= prevBoxes, `${id}: boxes never decrease`); prevBoxes = tierMin;
    });
  }
});

// B案(採用候補)の 盤面プール: 各段階 3盤面いじょう、べつの パズル(たがいに 行き来できない)、むずかしさが そろって いる
test('plan B: every tier has 3+ different puzzles of matching difficulty', () => {
  const B = gameOf(harness()).plans.B;
  const key = (grid) => grid.map((r) => r.join('')).join('|');
  B.levels.forEach((stage, i) => {
    assert.ok(stage.boards.length >= 3, `tier ${i + 1}: 3+ boards`);
    const info = stage.boards.map((lv) => {
      const {rows, goals} = board(lv, false), m = S.analyze(rows, goals);
      const reach = new Set(S.states(rows, goals).map((st) => key(st.grid)));
      const start = key(rows.map((r) => [...r.replace('@', ' ')]));
      const mi = S.mirror(rows, goals), startM = key(mi.rows.map((r) => [...r.replace('@', ' ')]));
      return {lv, m, reach, start, startM, goals};
    });
    for (const a of info) for (const b of info) if (a !== b) {
      assert.ok(!b.reach.has(a.start) && !b.reach.has(a.startM) || JSON.stringify(a.goals) !== JSON.stringify(b.goals), `${a.lv.id} is not just a position inside ${b.lv.id}`);
    }
    const spread = (f) => Math.max(...info.map(f)) - Math.min(...info.map(f));
    assert.ok(spread((x) => x.m.minMoves) <= 6, `tier ${i + 1}: shortest moves are close`);
    assert.ok(spread((x) => x.m.minPushes) <= 2, `tier ${i + 1}: pushes are close`);
    assert.ok(spread((x) => x.m.trapPushRatio) <= 0.1, `tier ${i + 1}: dead-end rate is close`);
    for (const x of info) assert.ok(x.m.trapPushRatio <= 0.21, `${x.lv.id}: dead-end rate stays low`);
    if (i === 0) for (const x of info) assert.equal(x.m.firstTraps.trap, 0, `${x.lv.id}: no first push is fatal on the first problem`);
  });
});

// 初見シミュレーション(tools/push-puzzle/solver.cjs の beginnerSim。乱数は 固定)で 制限時間を 確かめる。
// ふつう = 箱を ★へ ちかづける 押しを 75% / 詰みに 気づく 50%、迷いがち = 55% / 30%
test('plan B: simulated first-time players mostly clear each board within its limit, evenly within a tier', () => {
  const B = gameOf(harness()).plans.B;
  B.levels.forEach((stage, i) => {
    const res = stage.boards.map((lv) => {
      const {rows, goals} = board(lv, false), lim = stage.timeMs / 1000;
      const rate = (o) => { const {times, median} = S.beginnerSim(rows, goals, {stuckFn: pushPuzzleStuck, trials: 150, ...o}); return {median, within: times.filter((t) => t <= lim).length / times.length}; };
      return {id: lv.id, normal: rate({}), slow: rate({skill: 0.55, insight: 0.3})};
    });
    for (const r of res) {
      assert.ok(r.normal.within >= 0.93, `${r.id}: ${Math.round(r.normal.within * 100)}% of normal players clear in time`);
      assert.ok(r.slow.within >= 0.75, `${r.id}: ${Math.round(r.slow.within * 100)}% of hesitant players clear in time`);
    }
    const med = res.map((r) => r.normal.median);
    assert.ok(Math.max(...med) - Math.min(...med) <= 15, `tier ${i + 1}: typical times are close (${med.join(', ')} s)`);
  });
});

test('the in-game "stuck" hint never fires on a position that can still be solved', () => {
  const plans = gameOf(harness()).plans;
  let checked = 0, caught = 0;
  for (const lv of Object.values(plans).flatMap(allBoards)) for (const mirror of [false, true]) {
    const {rows, goals} = board(lv, mirror), st = S.states(rows, goals);
    const isGoal = (x, y) => goals.some(([gy, gx]) => gx === x && gy === y);
    for (const {grid, live} of st) {
      const stuck = pushPuzzleStuck(grid, isGoal);
      if (live) assert.equal(stuck, false, `${lv.id}: solvable position flagged\n${grid.map((r) => r.join('')).join('\n')}`);
      else if (stuck) caught++;
      checked++;
    }
  }
  assert.ok(checked > 1000 && caught > 0, `checked ${checked}, caught ${caught} dead positions`);
});

// 実際の ゲームで: 盤面(data-level)を 読み、ソルバーの 手順を スワイプで 入れる
function startGame(planId, seed, force) {
  const h = harness({seed}), game = gameOf(h), scores = [];
  game.plan = planId; game.force = force || null;
  h.api.startMinigame({id: game.id, start(c, done) { return game.start(c, (s) => { scores.push(s); done(s); }); }});
  const view = h.get('minigameOverlay');
  return {h, game, scores, view, canvas: view.querySelector('#pzCanvas')};
}
function swipe(r, dx, dy, wait = 130) {
  r.h.dispatch(r.canvas, 'pointerdown', {pointerId: 1, clientX: 100, clientY: 100});
  r.h.dispatch(r.canvas, 'pointerup', {pointerId: 1, clientX: 100 + dx * 40, clientY: 100 + dy * 40});
  r.h.advance(wait);
}
function currentSolution(r) {
  const tag = r.canvas.dataset.level, lv = Object.values(r.game.plans).flatMap(allBoards).find((l) => l.id === tag.replace(/m$/, ''));
  const {rows, goals} = board(lv, tag.endsWith('m'));
  return S.analyze(rows, goals).solution;
}

const r0 = (planId) => gameOf(harness()).plans[planId].levels;
for (const planId of ['A', 'B', 'C']) {
  test(`plan ${planId}: the real game clears every board in tier order with the solver's moves (both mirrors)`, () => {
    const mirrors = new Set(), stages = r0(planId), runs = Math.max(3, ...stages.map((s) => s.boards.length)) * 2;
    for (let k = 0; k < runs; k++) {
      // k 回目は 各段階の (k mod 盤面数) 番めを 出す → すべての 盤面を 反転あり/なしで とく
      const force = stages.map((s) => s.boards[k % s.boards.length].id);
      const r = startGame(planId, k + 1, force), level = r.view.querySelector('#pzLevel'), moves = r.view.querySelector('#pzMoves');
      r.h.advance(50);
      const seen = [];
      for (let i = 0; i < 3; i++) {
        assert.equal(level.textContent, `${i + 1}/3問目`);
        seen.push(r.canvas.dataset.level);
        const sol = currentSolution(r);
        for (const [dx, dy] of sol) swipe(r, dx, dy);
        assert.equal(moves.textContent, '手' + sol.length);
        assert.ok(!r.view.querySelector('#pzUndo').classList.contains('pz-suggest'), `${seen[i]}: no false "stuck" hint on a winning line`);
        r.h.advance(1500);
      }
      r.h.advance(1000);
      assert.deepEqual(Array.from(seen, (t) => t.replace(/m$/, '')), Array.from(force), 'tiers come in order');
      seen.forEach((t) => mirrors.add(t.endsWith('m')));
      assert.equal(r.scores.length, 1, 'game ends after 3 clears');
      assert.ok(r.scores[0] >= 95, `perfect play scores high (${r.scores[0]})`);
    }
    assert.equal(mirrors.size, 2, 'both the board and its mirror were played');
  });
}

test('plan B picks a random board per tier, never the same one twice in a row, and shows them all', () => {
  const h = harness({seed: 9}), game = gameOf(h), seen = [new Set()], last = [];
  for (let play = 0; play < 15; play++) {
    h.api.startMinigame({id: game.id, start(c, done) { return game.start(c, done); }});
    // 1問目(入門)の 盤面を 読む。えらび方は 3段階 共通の pushPuzzlePick なので、入門で 確かめれば たりる
    const canvas = h.get('minigameOverlay').querySelector('#pzCanvas'), now = [canvas.dataset.level.replace(/m$/, '')];
    h.api.retireMinigame();
    if (last.length) assert.notEqual(now[0], last[0], `play ${play}: tier 1 board changed`);
    seen[0].add(now[0]); last[0] = now[0];
  }
  assert.equal(seen[0].size, game.plans.B.levels[0].boards.length, 'all tier-1 boards appeared');
});

test('time limit is per level: a slow first level does not eat the next one', () => {
  const r = startGame('B', 3), timer = r.view.querySelector('#mgTimer');
  const limits = r.game.plans.B.levels.map((stage) => stage.timeMs / 1000);
  assert.equal(timer.textContent, `⏱️${limits[0]}秒`);
  r.h.advance(30000); // 30秒 かんがえてから とく
  for (const [dx, dy] of currentSolution(r)) swipe(r, dx, dy, 600);
  r.h.advance(1500);
  assert.equal(r.view.querySelector('#pzLevel').textContent, '2/3問目');
  assert.match(timer.textContent, new RegExp(`^⏱️(${limits[1]}|${limits[1] - 1})秒$`, 'u'), 'next level starts with its full time');
  r.h.advance(limits[1] * 1000 + 500);
  assert.equal(r.scores.length, 1, 'running out on level 2 ends the game');
  assert.ok(r.scores[0] >= 40 && r.scores[0] < 95, `1 clear is partial credit (${r.scores[0]})`);
});

test('undo restores board and move count, reset restores the start, stuck boxes get a rescue hint', () => {
  const r = startGame('A', 1), moves = r.view.querySelector('#pzMoves'), hint = r.view.querySelector('#pzHint');
  const undo = r.view.querySelector('#pzUndo'), reset = r.view.querySelector('#pzReset');
  r.h.advance(50);
  const press = (el) => { r.h.dispatch(el, 'pointerdown', {pointerId: 2}); r.h.advance(30); };
  press(undo);
  assert.match(hint.textContent, /もどせない/, 'nothing to undo is explained');
  // A1: 箱(3,3)・★(2,2)・じぶん(3,5)。左右反転なら 横の 向きを 入れかえる
  const m = r.canvas.dataset.level.endsWith('m') ? -1 : 1;
  swipe(r, 1 * m, 0); swipe(r, 0, -1); swipe(r, 0, -1); // (4,5) → (4,4) → 箱の 右(4,3)
  assert.ok(!undo.classList.contains('pz-suggest'));
  swipe(r, -1 * m, 0); swipe(r, -1 * m, 0); // 箱を 左の かべぎわ(1,3)へ。その かべぞいに ★は ない → もう ★へ とどかない
  assert.ok(undo.classList.contains('pz-suggest'), 'undo is highlighted');
  assert.match(hint.textContent, /もう動かせない/);
  const before = moves.textContent;
  press(undo);
  assert.equal(moves.textContent, '手' + (Number(before.slice(1)) - 1), 'undo steps the count back');
  assert.ok(!undo.classList.contains('pz-suggest'), 'highlight clears once the box is free');
  press(reset);
  assert.equal(moves.textContent, '手0');
  // やりなおし後でも 最短手順で とける(盤面が はじめに もどっている)
  for (const [dx, dy] of currentSolution(r)) swipe(r, dx, dy);
  r.h.advance(1500);
  assert.equal(r.view.querySelector('#pzLevel').textContent, '2/3問目');
});
