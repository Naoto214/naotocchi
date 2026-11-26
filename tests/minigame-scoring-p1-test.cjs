// ミニゲーム採点監査(docs/audit/minigame-scoring-audit-2026-11-24)Phase 1「重大」3本の 回帰テスト。
// 本物の games.js を harness で うごかす。canvas は 呼び出しを きろくする だけの スタブ(ピクセルは みない)。
//  - tilt-maze-3d: 進み具合を「ゴールまでの 道のり」で はかる(スタートに いるだけで 30点台に ならない)
//  - shanghai-tiles: どの 順番で とっても、さいごまで とりきれる(かさなった 牌だけが のこる 詰みが ない)
//  - slide-puzzle: シャッフルが 完成形に もどっても、解ける 盤に なる(置換の 偶奇)
const assert = require('node:assert/strict');
const {test} = require('node:test');
const vm = require('node:vm');
const {harness} = require('./helpers/runtime-harness.cjs');

function recordingCtx() {
  const calls = [], state = {fillStyle: '#000'};
  const ctx = new Proxy(state, {
    get(o, k) {
      if (k in o) return o[k];
      if (k === 'measureText') return () => ({width: 10});
      if (k === 'createLinearGradient' || k === 'createRadialGradient' || k === 'createPattern') return () => ({addColorStop() {}});
      if (k === 'getImageData') return () => ({data: new Uint8ClampedArray(4)});
      if (k === 'fillText' || k === 'drawImage') return (...a) => calls.push({k, a});
      return () => {};
    },
    set(o, k, v) { o[k] = v; return true; },
  });
  return {ctx, calls};
}
function lcg(seed) { return `Math.random=(()=>{let s=${seed};return ()=>((s=(Math.imul(s,1664525)+1013904223)>>>0)/4294967296);})()`; }
function start(id, {random, mode} = {}) {
  const {ctx, calls} = recordingCtx();
  const h = harness({canvasContext: ctx});
  if (random) vm.runInContext(random, h.sandbox);
  if (mode) h.api.state().lifetime.minigameDifficulty = mode;
  if (mode === 'hard') h.api.state().ageTicks = 100000; // むずかしい+高齢 = 大きい盤(上海 68まい、スライド 4×4)
  Object.assign(h.api.state(), {isSleeping: false, isSick: false, energy: 100});
  const game = h.api.games.find((g) => g.id === id); assert.ok(game, id);
  const scores = [];
  h.api.startMinigame({id: game.id, start(c, done) { return game.start(c, (s, ...rest) => { scores.push(s); done(s, ...rest); }); }});
  return {h, calls, scores, view: h.get('minigameOverlay')};
}
function frame(r) { r.calls.length = 0; r.h.advance(17); return r.calls.slice(); }

// ---------------- tilt-maze-3d ----------------
test('tilt-maze: 何もしないで時間切れになると 進み具合 0 の 15点(以前は 30〜35点)', () => {
  for (let seed = 1; seed <= 8; seed++) {
    const r = start('tilt-maze-3d', {random: lcg(seed * 7919)});
    for (let t = 0; t < 60000 && !r.scores.length; t += 100) r.h.advance(100);
    assert.equal(r.scores.length, 1, 'ends');
    assert.equal(r.scores[0], 15, `seed ${seed}`);
  }
});

// ---------------- shanghai-tiles ----------------
const SH_FACES = ['🌸', '🍀', '🍁', '🌙', '⭐', '🐟', '🐢', '🦋', '🍑', '🍇', '🎐', '🏮', '🐉', '🎋', '🍵', '🪷'];
const SH_OX = (300 - 16 * 14) / 2 + 6, SH_OY = (236 - 5 * 36) / 2 + 6;
// 描かれた 絵(fillText の 位置)から、牌の 段・ざひょうを もとに もどす(段ごとに 3px ずれる ので 一意に きまる)
function shTiles(calls) {
  const out = [];
  for (const c of calls) {
    if (c.k !== 'fillText' || !SH_FACES.includes(c.a[0])) continue;
    const [face, cx, cy] = c.a;
    for (let layer = 0; layer <= 3; layer++) {
      const x = (cx - SH_OX - 14 + layer * 3) / 14, y = (cy - 1 - SH_OY - 18 + layer * 3) / 18;
      if (Number.isInteger(x) && x % 2 === 0 && Number.isInteger(y)) { out.push({face, layer, x, y, cx, cy, alive: true}); break; }
    }
  }
  return out;
}
function shFree(tiles) {
  const covers = (a, b) => a.layer === b.layer + 1 && Math.abs(a.x - b.x) < 2 && Math.abs(a.y - b.y) < 2;
  const side = (t, dir) => tiles.some((o) => o !== t && o.layer === t.layer && o.x === t.x + dir * 2 && Math.abs(o.y - t.y) < 2);
  return tiles.filter((t) => !tiles.some((o) => covers(o, t)) && !(side(t, -1) && side(t, 1)));
}
// でたらめな 順に「とれる おなじ絵の 2まい」を とりつづける 人。のこりが 0 に なれば true。
// まぜた 回数を 種類ごとに かぞえる(ヒント欄の 文を 読んだら 消す: 同じ 文が 2回 つづいても かぞえられる ように)
//   normal = ボタン・取れる牌が なくなった ときの 自動(減点あり) / rescued = 詰みの 救済(減点なし)
function shRandomPlayer(seed, mode, {shuffleFirst = 0} = {}) {
  const r = start('shanghai-tiles', {random: lcg(seed), mode}), canvas = r.view.querySelector('#shCanvas'), shuffle = r.view.querySelector('#shShuffle');
  const hint = r.view.querySelector('#shHint');
  let s = (seed * 2654435761) >>> 0; const rnd = () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296);
  let normal = 0, rescued = 0;
  const readHint = () => { const t = hint.textContent; if (/おろして/.test(t)) rescued++; else if (/まぜた/.test(t)) normal++; hint.textContent = ''; };
  r.h.advance(20);
  for (let i = 0; i < shuffleFirst; i++) { r.h.dispatch(shuffle, 'pointerdown', {}); readHint(); }
  let total = null;
  for (let step = 0; step < 200; step++) {
    const tiles = shTiles(frame(r));
    if (total === null) total = tiles.length;
    if (!tiles.length) break;
    const free = shFree(tiles), pairs = [];
    for (let i = 0; i < free.length; i++) for (let j = i + 1; j < free.length; j++) if (free[i].face === free[j].face) pairs.push([free[i], free[j]]);
    if (!pairs.length) { // とれる ペアが ない: まぜる(ゲームが じぶんで まぜる はずなので、ここに くるのは 詰んだ とき)
      r.h.dispatch(shuffle, 'pointerdown', {}); readHint();
      const again = shTiles(frame(r)), f2 = shFree(again);
      if (!f2.some((a, i) => f2.some((b, j) => j > i && a.face === b.face))) return {cleared: false, left: again.length, total, normal, rescued, r};
      continue;
    }
    const [a, b] = pairs[Math.floor(rnd() * pairs.length)];
    for (const t of [a, b]) r.h.dispatch(canvas, 'pointerdown', {clientX: t.cx, clientY: t.cy - 1});
    readHint();
  }
  return {cleared: shTiles(frame(r)).length === 0, total, normal, rescued, r};
}
// 全部 とったときの 点 = 84 + min(16, 残り秒/6) − 2×(ふつうの まぜた 回数)。ハーネスでは 数秒で おわるので 残り時間の 分は 96 前後
const shClearBase = (res) => res.r.scores[0] + 2 * res.normal;
for (const [label, mode] of [['60まい', undefined], ['68まい', 'hard']]) {
  test(`shanghai(${label}): でたらめな 順に とっても、40局 すべて さいごまで とりきれる。救済は 減点なし、ふつうの まぜるは 1回 2点`, () => {
    const stuck = [], bases = new Set(); let rescues = 0, normals = 0;
    for (let seed = 1; seed <= 40; seed++) {
      const res = shRandomPlayer(seed * 104729 + (mode ? 7 : 0), mode);
      assert.equal(res.total, mode ? 68 : 60, 'board size');
      if (!res.cleared) { stuck.push(`seed ${seed}: のこり ${res.left}/${res.total}`); continue; }
      res.r.h.advance(1000); assert.equal(res.r.scores.length, 1, `seed ${seed}: 全部とって 終わる`);
      rescues += res.rescued; normals += res.normal;
      bases.add(shClearBase(res));
    }
    assert.deepEqual(stuck, []);
    assert.ok(rescues >= 1, '救済が 少なくとも 1局で はたらいた(この シードの 組で 再現)');
    // 救済が あった 局も なかった 局も、点 + 2×ふつうの回数 が おなじ(= 救済は 減点されていない)
    assert.deepEqual([...bases], [[...bases][0]], `clear base ${[...bases]}`);
    assert.ok([...bases][0] >= 95 && [...bases][0] <= 97, 'clear base ~96');
  });
}
test('shanghai: まだ とりきれる 盤で「まぜる」を おすと、救済ではなく ふつうの まぜる(1回 2点 減点)', () => {
  for (const seed of [3, 5, 7]) {
    const plain = shRandomPlayer(seed * 104729, undefined), pressed = shRandomPlayer(seed * 104729, undefined, {shuffleFirst: 2});
    assert.ok(plain.cleared && pressed.cleared, 'both cleared');
    plain.r.h.advance(1000); pressed.r.h.advance(1000);
    assert.ok(pressed.normal >= 2, 'ボタンの 2回は ふつうの まぜる として かぞえる');
    assert.equal(shClearBase(pressed), shClearBase(plain), `seed ${seed}: 減点の 計算が 一致`);
    assert.equal(pressed.r.scores[0], shClearBase(pressed) - 2 * pressed.normal);
  }
});

// ---------------- slide-puzzle ----------------
// 描かれた ピース(drawImage の 切り出し位置 → ピース番号、描く位置 → マス)から 盤を もとに もどす
function slideBoard(calls) {
  const pieces = calls.filter((c) => c.k === 'drawImage' && c.a.length === 9);
  assert.ok(pieces.length >= 8, 'pieces drawn');
  const CELL = pieces[0].a[3] / 2, N = Math.round(Math.sqrt(pieces.length + 1));
  const board = Array(N * N).fill(N * N - 1);
  for (const {a} of pieces) {
    const val = Math.round(a[2] / 2 / CELL) * N + Math.round(a[1] / 2 / CELL), pos = Math.round(a[6] / CELL) * N + Math.round(a[5] / CELL);
    board[pos] = val;
  }
  return {board, N};
}
// 15パズルの 解ける 条件: (空きマスを ふくめた 置換の 偶奇) = (空きマスの 本来の 位置からの マンハッタン距離の 偶奇)
function solvable(board, N) {
  assert.ok(board.slice().sort((x, y) => x - y).every((v, i) => v === i), 'board was read as a permutation: ' + board);
  let inv = 0; const seen = board.slice(), blank = N * N - 1;
  for (let i = 0; i < seen.length; i++) while (seen[i] !== i) { const j = seen[i]; [seen[i], seen[j]] = [seen[j], seen[i]]; inv++; }
  const at = board.indexOf(blank), dist = Math.abs((at % N) - (N - 1)) + Math.abs(Math.floor(at / N) - (N - 1));
  return inv % 2 === dist % 2;
}
function openBoard(r) {
  const canvas = r.view.querySelector('#spCanvas');
  r.h.advance(20);
  r.h.dispatch(canvas, 'pointerdown', {pointerId: 1, clientX: 5, clientY: 5}); r.h.dispatch(canvas, 'pointerup', {pointerId: 1, clientX: 5, clientY: 5}); // お手本を とじる
  return slideBoard(frame(r));
}
test('slide-puzzle: ふつうの シャッフルは 解ける 盤(3×3 と 4×4)', () => {
  for (const mode of [undefined, 'hard']) for (let seed = 1; seed <= 6; seed++) {
    const r = start('slide-puzzle', {random: lcg(seed * 31337), mode});
    const {board, N} = openBoard(r);
    assert.equal(N, mode ? 4 : 3);
    assert.ok(solvable(board, N), `${mode || 'normal'} seed ${seed}: ${board}`);
    assert.ok(board.some((v, i) => v !== i), 'not already solved');
  }
});
test('slide-puzzle: シャッフルが 完成形に もどる 乱数でも、解ける 盤に なる(以前は 2枚 入れかえで 解けなかった)', () => {
  // 空きマス(右下)が 右下の 2×2 を まわりつづける 乱数(4こ周期)。3周で 完成形に もどり、60手 = 15周 は 完成形。
  // ほかの 乱数の つかいかたに よって 周期の ずれが かわる ので、4とおり ためして 完成形に もどる ものを さがす
  let hit = 0;
  for (let off = 0; off < 4; off++) {
    const seq = [0.75, 0.25, 0.5, 0.25];
    const r = start('slide-puzzle', {random: `Math.random=(()=>{let i=${off};const q=${JSON.stringify(seq)};return ()=>q[(i++)%4];})()`});
    const {board, N} = openBoard(r);
    assert.equal(N, 3);
    assert.ok(solvable(board, N), `offset ${off}: ${board}`);
    assert.ok(board.some((v, i) => v !== i), `offset ${off}: not solved`);
    if (board.filter((v, i) => v !== i).length <= 2) hit++; // 完成形からの 1手(のこりの 救済)= 2マスだけ ちがう
  }
  assert.ok(hit >= 1, 'いずれかの ずれで 完成形に もどる シャッフルを 再現できた');
});
