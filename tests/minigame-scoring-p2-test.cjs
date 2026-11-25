// ミニゲーム採点監査 Phase 2(docs/audit/minigame-scoring-p2-2026-11-25)の 回帰テスト。
// 本物の games.js + script.js を harness で うごかす(canvas は 呼び出しを きろくする だけの スタブ)。
// たしかめる こと:
//  - 何も 達成して いない 回は 30点未満(コイン 0)。放置・1回 さわって 放置は「参加なし」で 記録しない
//  - 最初の 小さな 目標(1問 とく・1ウェーブ たおす など)を 達成すれば 30点いじょう
//  - 上手な プレイの 点は 以前と おなじ(全ウェーブ撃破・フリッパーで 打つ ピンボール など)
//  - 考える ゲームは「考えている 時間」を 放置と みなさない(操作の あいだが ながくても 記録する)
//  - ピクロスの 10問は すべて 答えが 1通り
const assert = require('node:assert/strict');
const {test} = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const {harness} = require('./helpers/runtime-harness.cjs');
const S = require('../tools/push-puzzle/solver.cjs');

function recordingCtx() {
  const calls = [], state = {font: ''};
  const ctx = new Proxy(state, {
    get(o, k) {
      if (k in o) return o[k];
      if (k === 'measureText') return () => ({width: 10});
      if (k === 'createLinearGradient' || k === 'createRadialGradient' || k === 'createPattern') return () => ({addColorStop() {}});
      if (k === 'getImageData') return () => ({data: new Uint8ClampedArray(4)});
      if (k === 'fillText') return (...a) => calls.push({a, font: state.font});
      return () => {};
    },
    set(o, k, v) { o[k] = v; return true; },
  });
  return {ctx, calls};
}
function lcg(seed) { return `Math.random=(()=>{let s=${seed};return ()=>((s=(Math.imul(s,1664525)+1013904223)>>>0)/4294967296);})()`; }
// ゲームを 1回 あそぶ。bot(r, t) を 50msごとに よぶ。本体の finishMinigame まで とおすので「記録されたか」も わかる
function play(id, seed, bot, {limitMs = 300000, setup} = {}) {
  const {ctx, calls} = recordingCtx();
  const h = harness({canvasContext: ctx});
  vm.runInContext(lcg(seed), h.sandbox);
  const s = h.api.state();
  Object.assign(s, {isSleeping: false, isSick: false, energy: 100});
  const game = h.api.games.find((g) => g.id === id); assert.ok(game, id);
  if (setup) setup(game);
  const before = s.minigameCount; let score = null, meter = null;
  h.api.startMinigame({id: game.id, start(c, done) { return game.start(c, (sc, msg, p) => { if (score === null) { score = sc; meter = p; } done(sc, msg, p); }); }});
  const r = {h, s, game, calls, view: h.get('minigameOverlay')};
  r.q = (sel) => r.view.querySelector(sel);
  r.down = (el, x = 150, y = 150, id = 1) => h.dispatch(el, 'pointerdown', {pointerId: id, clientX: x, clientY: y, button: 0});
  r.up = (el, x = 150, y = 150, id = 1) => h.dispatch(el, 'pointerup', {pointerId: id, clientX: x, clientY: y, button: 0});
  let t = 0;
  for (; t < limitMs && score === null; t += 50) { if (bot) bot(r, t); h.advance(50); }
  h.advance(1500);
  return {score, meter, recorded: s.minigameCount > before, t};
}
const idle = null;

// ---------------- そうこばん ----------------
function pzSolution(r) {
  const canvas = r.q('#pzCanvas'), tag = canvas.dataset.level;
  const lv = Object.values(r.game.plans).flatMap((p) => p.levels.flatMap((st) => st.boards)).find((l) => l.id === tag.replace(/m$/, ''));
  const rows0 = tag.endsWith('m') ? lv.rows.map((x) => [...x].reverse().join('')) : lv.rows, goals = [];
  rows0.forEach((row, y) => [...row].forEach((c, x) => { if (c === '.') goals.push([y, x]); }));
  return S.analyze(rows0.map((x) => x.replace(/\./g, ' ')), goals).solution;
}
function pzSwipe(r, dx, dy) { const c = r.q('#pzCanvas'); r.down(c, 100, 100); r.up(c, 100 + dx * 40, 100 + dy * 40); }
test('そうこばん: 放置は 12点で 記録しない/少し うごかして 0問は 30点未満で 記録/1問 とけば 30点いじょう', () => {
  const a = play('push-puzzle', 11, idle, {limitMs: 400000});
  assert.equal(a.score, 12); assert.equal(a.recorded, false, '放置は 参加なし');
  // 4手 うごかして 時間切れ(以前は 手数ボーナスで 30点・30コイン)
  const b = play('push-puzzle', 11, (r, t) => { if (t === 1000) for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) pzSwipe(r, dx, dy); }, {limitMs: 400000});
  assert.ok(b.score >= 12 && b.score <= 25, `0問 = ${b.score}`); assert.equal(b.recorded, true, '考えて 動かしたので 記録する');
  // 1問 とく → 2問目で 時間切れ
  let solved = false;
  const c = play('push-puzzle', 11, (r, t) => { if (t === 1000 && !solved) { for (const [dx, dy] of pzSolution(r)) { pzSwipe(r, dx, dy); r.h.advance(130); } solved = true; } }, {limitMs: 400000});
  assert.ok(c.score >= 40 && c.score <= 55, `1問 = ${c.score}`); assert.equal(c.recorded, true);
});
test('そうこばん: 1手ずつ 長く 考えても(20びょうおき)放置とは みなさない', () => {
  const r = play('push-puzzle', 5, (r, t) => { if (t % 20000 === 1000 && t < 90000) pzSwipe(r, [1, -1, 0, 0][(t / 20000) % 4 | 0], [0, 0, 1, -1][(t / 20000) % 4 | 0]); }, {limitMs: 400000});
  assert.equal(r.recorded, true);
});

// ---------------- タワーディフェンス ----------------
function tdBot(spots, {next = true, upgrade = false} = {}) {
  return (r, t) => {
    if (t % 500) return;
    const cv = r.q('#tdCanvas'), tap = ([x, y]) => r.down(cv, (x + 0.5) * 37.5, (y + 0.5) * 37.5);
    spots.forEach(tap);
    if (upgrade) spots.slice(0, 4).forEach((p) => { tap(p); tap(p); });
    if (next) r.h.dispatch(r.q('#tdNext'), 'pointerdown', {});
  };
}
const TD_SPOTS = [[2, 2], [4, 4], [4, 3], [2, 4], [4, 2], [6, 3], [0, 2], [6, 1]];
test('タワーディフェンス: 全ウェーブ撃破は これまでどおり 100点/時間まで 守りきった ときは 守りの 結果で 70〜90点', () => {
  for (const seed of [7919, 15838]) {
    const a = play('tower-defense', seed, tdBot(TD_SPOTS));
    assert.equal(a.score, 100, `clear ${seed}`); assert.equal(a.recorded, true);
  }
  // 「つぎのウェーブ」を 押さない(自然な ペース)と 90びょうで 3ウェーブ+とちゅう に なる ことが ある。❤️10 なら 82点
  const b = play('tower-defense', 7919, tdBot(TD_SPOTS, {next: false}));
  assert.equal(b.score, 82); assert.equal(b.recorded, true);
});
test('タワーディフェンス: 放置は 10点で 記録しない(全部 通りぬけた ウェーブは「たおした」に 数えない)', () => {
  const a = play('tower-defense', 7919, idle);
  assert.equal(a.score, 10); assert.equal(a.recorded, false);
});

// ---------------- ピンボール ----------------
function pbLaunch(r, t) { const b = r.q('#pbLaunch'); if (t % 2000 === 500 && !b.disabled) r.down(b, 0, 0, 2); if (t % 2000 === 1300) r.up(b, 0, 0, 2); }
test('ピンボール: 放置でも 自動で 発射して 終わる(24点・記録なし)/発射だけ・フリッパー上げっぱなしは 24点まで', () => {
  const a = play('pinball-physics', 7919, idle);
  assert.equal(a.score, 24); assert.equal(a.recorded, false);
  for (const seed of [7919, 15838, 23757]) {
    const b = play('pinball-physics', seed, pbLaunch);
    assert.equal(b.score, 24, `launch only ${seed}`);
    const c = play('pinball-physics', seed, (r, t) => { pbLaunch(r, t); if (t === 2000) { r.down(r.q('#pbLeft'), 0, 0, 3); r.down(r.q('#pbRight'), 0, 0, 4); } });
    // 上げっぱなしの フリッパーに 当たっただけ では「打った」に しない
    assert.ok(c.score <= 24, `hold both ${seed}: ${c.score}`);
  }
});
test('ピンボール: フリッパーで 打てば(連打も)これまでどおりの 点', () => {
  const flap = (r, t) => { pbLaunch(r, t); if (t % 600 === 0) { r.down(r.q('#pbLeft'), 0, 0, 3); r.down(r.q('#pbRight'), 0, 0, 4); } if (t % 600 === 250) { r.up(r.q('#pbLeft'), 0, 0, 3); r.up(r.q('#pbRight'), 0, 0, 4); } };
  const got = [7919, 15838, 23757, 31676].map((seed) => play('pinball-physics', seed, flap).score);
  assert.deepEqual(got, [91, 90, 70, 100]); // Phase 2 まえ(d92b3010)で 同じ 操作をした ときと おなじ
});

// ---------------- スキージャンプ ----------------
test('スキージャンプ: スタートを 押すだけ(自動で 飛び出す)は 25点まで', () => {
  for (const seed of [7919, 15838, 23757]) {
    const a = play('ski-jump', seed, (r, t) => { const b = r.q('#sjBtn'); if (t % 500 === 0 && b.textContent === 'スタート') { r.h.dispatch(b, 'pointerdown', {pointerId: 1}); r.h.dispatch(b, 'pointerup', {pointerId: 1}); } });
    assert.ok(a.score !== null && a.score <= 25, `seed ${seed}: ${a.score}`);
    assert.equal(a.recorded, false, 'スタートだけ では 参加に しない');
  }
});

// ---------------- そのほか(放置・でたらめ) ----------------
test('放置では 30点未満・記録なし: ブロックパズル・リングフライト・スカイシューター・ヒット&ブロー・ジェンガ・すごろく', () => {
  for (const id of ['falling-block-puzzle', 'ring-flight-3d', 'sky-shooter', 'hit-blow', 'jenga-tower', 'sugoroku-race']) {
    const a = play(id, 7919, idle);
    assert.ok(a.score !== null && a.score < 30, `${id}: ${a.score}`);
    assert.equal(a.recorded, false, id);
  }
});
test('マインスイーパー: 同じ マスの 連打(最初の 1手で 自動で ひらく ぶん だけ)は 10点', () => {
  const a = play('minesweeper-8', 7919, (r, t) => { if (t % 150 === 0) { const c = r.q('canvas'); r.down(c); r.up(c); } });
  assert.equal(a.score, 10);
});
test('ヒット&ブロー: 予想を 1回 出して 当てられなければ 25点まで(記録あり)', () => {
  const a = play('hit-blow', 7919, (r, t) => {
    if (t !== 1000) return;
    // harness の DOM には 親子の バブリングが ないので、パレットの リスナーへ「押された 色ボタン」を 直接 わたす
    const palette = r.q('#hbPalette');
    for (let ci = 0; ci < 4; ci++) for (const l of palette.listeners.filter((x) => x.type === 'pointerdown')) l.fn({type: 'pointerdown', target: {closest: () => ({dataset: {color: String(ci)}})}, preventDefault() {}});
    r.h.dispatch(r.q('#hbSubmit'), 'pointerdown', {});
  });
  assert.ok(a.score >= 10 && a.score <= 25, `${a.score}`); assert.equal(a.recorded, true);
});

// ---------------- ピクロス ----------------
test('ピクロス: 10問 すべて、手がかりを 満たす 塗り方が 1通り(「ほし」の 3通り問題を 修正)', () => {
  const src = fs.readFileSync(path.join(__dirname, '..', 'games.js'), 'utf8');
  const block = src.slice(src.indexOf('const PICROSS_PUZZLES = ['), src.indexOf('];', src.indexOf('const PICROSS_PUZZLES = [')));
  const puzzles = [...block.matchAll(/name: '([^']+)'.*?rows: \[([^\]]+)\]/g)].map((m) => ({name: m[1], rows: m[2].match(/[01]{5}/g)}));
  assert.equal(puzzles.length, 10);
  const clue = (bits) => bits.join('').split('0').filter(Boolean).map((x) => x.length).join(',');
  const lines = Array.from({length: 32}, (_, v) => [4, 3, 2, 1, 0].map((b) => (v >> b) & 1));
  for (const p of puzzles) {
    const g = p.rows.map((r) => [...r].map(Number));
    const rowC = g.map(clue), colC = [0, 1, 2, 3, 4].map((x) => clue(g.map((r) => r[x])));
    const cand = rowC.map((c) => lines.filter((l) => clue(l) === c));
    let count = 0;
    const pick = [];
    (function dfs(y) {
      if (count > 1) return;
      if (y === 5) { if ([0, 1, 2, 3, 4].every((x) => clue(pick.map((r) => r[x])) === colC[x])) count++; return; }
      for (const l of cand[y]) { pick[y] = l; dfs(y + 1); }
    })(0);
    assert.equal(count, 1, `${p.name}: ${count}通り`);
  }
});
