// Phase 1(U1 遷移・判定待ちの入力ロック / U2 検証つきリトライ生成 / U6 の一部)の 回帰テスト。
// docs/audit/minigame-phase0-2026-10-12 の B09(G-AC-24)・B10(G-AC-36)・B15(G-FG-01)・
// B16(G-FG-02)・B17(G-FG-03)・B18(G-FG-04)。本物の games.js を harness で うごかし、
// canvas は 呼び出しを きろくする だけの スタブ(ピクセルは みない)。
const assert = require('node:assert/strict');
const {test} = require('node:test');
const vm = require('node:vm');
const {harness} = require('./helpers/runtime-harness.cjs');

// fillText / arc を その ときの fillStyle と いっしょに きろくする ctx
function recordingCtx() {
  const calls = [], state = {fillStyle: '#000'};
  const ctx = new Proxy(state, {
    get(o, k) {
      if (k in o) return o[k];
      if (k === 'measureText') return () => ({width: 10});
      if (k === 'createLinearGradient' || k === 'createRadialGradient') return () => ({addColorStop() {}});
      if (k === 'fillText') return (...a) => calls.push({k, a, fillStyle: o.fillStyle});
      if (k === 'arc') return (...a) => calls.push({k, a});
      return () => {};
    },
    set(o, k, v) { o[k] = v; return true; },
  });
  return {ctx, calls};
}
function lcg(seed) { return `Math.random=(()=>{let s=${seed};return ()=>((s=(Math.imul(s,1664525)+1013904223)>>>0)/4294967296);})()`; }
function start(id, {random = '()=>0.5', mode, ageTicks} = {}) {
  const {ctx, calls} = recordingCtx();
  const h = harness({canvasContext: ctx});
  vm.runInContext(random.startsWith('Math.random') ? random : `Math.random=${random}`, h.sandbox);
  if (mode) h.api.state().lifetime.minigameDifficulty = mode;
  if (ageTicks !== undefined) h.api.state().ageTicks = ageTicks;
  const game = h.api.games.find((g) => g.id === id); assert.ok(game, id);
  const scores = [];
  h.api.startMinigame({id: game.id, start(c, done) { return game.start(c, (s) => { scores.push(s); done(s); }); }});
  return {h, calls, scores, view: h.get('minigameOverlay')};
}
// 1フレームだけ すすめて、その フレームの 描画だけを かえす
function frame(r) { r.calls.length = 0; r.h.advance(17); return r.calls.slice(); }

// ---------------- B10 / G-AC-36 push-puzzle ----------------
const PUSH_L0 = ['#######', '#  #  #', '# $   #', '#  #$ #', '# @  ##', '#  ## #', '#######'];
const PUSH_G0 = [[1, 1], [1, 4]];
function solvePush(L, G) {
  const st = {p: null, b: []};
  L.forEach((r, y) => [...r].forEach((c, x) => { if (c === '@') st.p = [x, y]; if (c === '$') st.b.push([x, y]); }));
  const wall = (x, y) => L[y][x] === '#', key = (s) => s.p + '|' + s.b.map((b) => b + '').sort().join(';');
  const goal = (s) => G.every(([gy, gx]) => s.b.some(([bx, by]) => bx === gx && by === gy));
  const q = [[st, []]], seen = new Set([key(st)]);
  while (q.length) {
    const [s, path] = q.shift(); if (goal(s)) return path;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = s.p[0] + dx, ny = s.p[1] + dy; if (wall(nx, ny)) continue;
      const b = s.b.map((v) => v.slice()), bi = b.findIndex(([bx, by]) => bx === nx && by === ny);
      if (bi >= 0) { const bx = nx + dx, by = ny + dy; if (wall(bx, by) || b.some(([x, y]) => x === bx && y === by)) continue; b[bi] = [bx, by]; }
      const ns = {p: [nx, ny], b}, k = key(ns); if (seen.has(k)) continue; seen.add(k); q.push([ns, path.concat([[dx, dy]])]);
    }
  }
  return null;
}
test('push-puzzle: undo/redo during the clear transition cannot count the same level twice (B10)', () => {
  const r = start('push-puzzle'), {h, view} = r; // Math.random=0.5 → 1問目は レベル0
  const canvas = view.querySelector('#pzCanvas'), undo = view.querySelector('#pzUndo'), reset = view.querySelector('#pzReset');
  const level = view.querySelector('#pzLevel'), moves = view.querySelector('#pzMoves');
  const sw = (dx, dy) => { h.dispatch(canvas, 'pointerdown', {pointerId: 1, clientX: 100, clientY: 100}); h.dispatch(canvas, 'pointerup', {pointerId: 1, clientX: 100 + dx * 40, clientY: 100 + dy * 40}); h.advance(130); };
  h.advance(50);
  const path = solvePush(PUSH_L0, PUSH_G0); assert.ok(path);
  for (const [dx, dy] of path) sw(dx, dy);
  assert.equal(moves.textContent, '手' + path.length);
  const last = path[path.length - 1];
  // evidence/scripts/repro-push-AC.cjs と おなじ 手順: もどす→おなじ手 を 2かい
  for (let i = 0; i < 2; i++) { h.dispatch(undo, 'pointerdown', {pointerId: 2}); h.advance(20); sw(last[0], last[1]); }
  assert.equal(moves.textContent, '手' + path.length, 'undo and moves are ignored while the level is done');
  h.dispatch(reset, 'pointerdown', {pointerId: 3}); h.advance(20);
  assert.equal(moves.textContent, '手' + path.length, 'reset is ignored while the level is done');
  h.advance(3000);
  assert.equal(level.textContent, '2/3問目', 'exactly one level is advanced');
  assert.deepEqual(r.scores, [], 'one solved level does not finish the game');
  // つぎの 問題では また うごける
  const before = moves.textContent; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) sw(dx, dy);
  assert.notEqual(moves.textContent, before, 'input resumes after load()');
});

// ---------------- B09 / G-AC-24 mini-golf-physics ----------------
function golfBall(calls, S) { const b = calls.filter((c) => c.k === 'arc' && Math.abs(c.a[2] - 6 * S) < 1e-9).pop(); assert.ok(b, 'ball drawn'); return {x: b.a[0], y: b.a[1]}; }
function putt(r, S, dx, dy, pull) {
  const {h} = r, canvas = r.view.querySelector('#gfCanvas'), b = golfBall(frame(r), S);
  h.dispatch(canvas, 'pointerdown', {pointerId: 1, clientX: b.x, clientY: b.y});
  h.dispatch(canvas, 'pointermove', {pointerId: 1, clientX: b.x - dx * pull * S, clientY: b.y - dy * pull * S});
  h.dispatch(canvas, 'pointerup', {pointerId: 1, clientX: b.x - dx * pull * S, clientY: b.y - dy * pull * S});
}
test('mini-golf: a putt during the over-par wait is ignored and the hole index advances by one (B09)', () => {
  const r = start('mini-golf-physics'), {h, view} = r, S = 300 / 244; // 0.5 → HOLE 1 は ホール0(池なし)
  const strokes = view.querySelector('#gfStrokes'), hole = view.querySelector('#gfHole');
  h.advance(50);
  for (let i = 0; i < 5; i++) { putt(r, S, 0, i % 2 ? 1 : -1, 16); h.advance(2500); }
  assert.equal(strokes.textContent, '打数5');
  putt(r, S, 0, 1, 16); // 6打目
  // ボールが とまるまで まつ(打数オーバーの 予約が はいる)。とまった 直後に うつ
  let stopped = false;
  for (let t = 0; t < 200 && !stopped; t++) { h.advance(17); stopped = /打数オーバー/.test(view.querySelector('#gfHint').textContent); }
  assert.ok(stopped, "over-par message shown: " + strokes.textContent + " " + view.querySelector("#gfHint").textContent);
  putt(r, S, 0, -1, 16);
  assert.equal(strokes.textContent, '打数6', 'the putt during the wait is not counted');
  h.advance(1000);
  assert.match(hole.textContent, /^HOLE 2\/3/);
  assert.equal(strokes.textContent, '打数0');
  putt(r, S, 0, -1, 16);
  assert.equal(strokes.textContent, '打数1', 'input resumes on the next hole');
});
test('mini-golf: a splash on the sixth stroke also ends the hole (B09)', () => {
  // 0.1 で ならべかえると ホールは 5,4,3 の じゅん。HOLE 2 は start(122,210) の まっすぐ上に 池が ある ホール
  const r = start('mini-golf-physics', {random: '()=>0.1'}), {h, view} = r, S = 300 / 244;
  const strokes = view.querySelector('#gfStrokes'), hole = view.querySelector('#gfHole'), hint = view.querySelector('#gfHint');
  h.advance(50);
  for (let i = 0; i < 6; i++) { putt(r, S, 0, i % 2 ? -1 : 1, 16); h.advance(2500); }
  h.advance(1000);
  assert.match(hole.textContent, /^HOLE 2\/3／PAR 3/);
  let splashes = 0;
  for (let i = 0; i < 3; i++) {
    hint.textContent = '';
    putt(r, S, 0, -1, 50);
    for (let t = 0; t < 200 && !/池に落ちた/.test(hint.textContent); t++) h.advance(17);
    if (/池に落ちた/.test(hint.textContent)) splashes++;
    h.advance(100);
  }
  assert.equal(splashes, 3, 'each straight putt lands in the pond');
  assert.equal(strokes.textContent, '打数6');
  putt(r, S, 0, -1, 50); h.advance(17);
  assert.equal(strokes.textContent, '打数6', 'no seventh stroke after the splash reaches the limit');
  h.advance(1000);
  assert.match(hole.textContent, /^HOLE 3\/3/);
});

// ---------------- B16 / G-FG-02 memory-cards ----------------
test('memory-cards: a third card tapped during the 350ms match wait is not flipped (B16)', () => {
  const r = start('memory-cards'), {h, view} = r; // 0.5 → カード i と i+8 が ペア
  const canvas = view.querySelector('#mcCanvas');
  const tap = (i) => h.dispatch(canvas, 'pointerdown', {clientX: (i % 4 + .5) * 75, clientY: (Math.floor(i / 4) + .5) * 75});
  h.advance(300);
  tap(0); h.advance(50); tap(8); h.advance(100); tap(1);
  h.advance(1000);
  tap(2); h.advance(50); tap(3); h.advance(1500);
  assert.equal(view.querySelector('#mcTries').textContent, 'めくり2かい');
  assert.equal(view.querySelector('#mcPairs').textContent, 'ペア1/8');
  const backs = frame(r).filter((c) => c.k === 'fillText' && c.a[0] === '?').length;
  assert.equal(backs, 14, 'only the matched pair is face up; card 1 stayed hidden');
});

// ---------------- B15 / G-FG-01 shanghai-tiles ----------------
const SH_FACES = ['🌸', '🍀', '🍁', '🌙', '⭐', '🐟', '🐢', '🦋', '🍑', '🍇', '🎐', '🏮', '🐉', '🎋', '🍵', '🪷'];
function shLayout(big) {
  const layout = [], addRect = (layer, cols, rows, ox, oy) => { for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) layout.push({layer, x: ox + c * 2, y: oy + r * 2}); };
  addRect(0, 8, 5, 0, 0); addRect(1, 6, 3, 2, 2); if (big) { addRect(2, 4, 2, 4, 3); addRect(3, 2, 1, 6, 4); } else addRect(2, 2, 1, 6, 4);
  if (layout.length % 2) layout.pop(); return layout;
}
const SH_OX = (300 - 16 * 14) / 2 + 6, SH_OY = (236 - 5 * 36) / 2 + 6;
const shCenter = (t) => ({x: SH_OX + t.x * 14 - t.layer * 3 + 14, y: SH_OY + t.y * 18 - t.layer * 3 + 18});
// その フレームで 描かれた 牌を ならびに もどす(絵柄 null も ひろう)
function readTiles(calls, big) {
  const drawn = calls.filter((c) => c.k === 'fillText' && (c.a[0] === null || c.a[0] === 'null' || SH_FACES.includes(c.a[0])));
  return shLayout(big).map((t) => {
    const {x, y} = shCenter(t), d = drawn.find((c) => c.a[1] === x && c.a[2] === y + 1);
    assert.ok(d, `tile drawn at ${t.layer}/${t.x}/${t.y}`);
    return {...t, face: d.a[0], alive: true};
  });
}
// おなじ 絵の とれる 2まいを とって 0まいに できるか(きおくつき の ふかさ優先)
function shSolve(tiles) {
  const covers = (a, b) => a.layer === b.layer + 1 && Math.abs(a.x - b.x) < 2 && Math.abs(a.y - b.y) < 2;
  const side = (t, dir) => tiles.some((o) => o.alive && o !== t && o.layer === t.layer && o.x === t.x + dir * 2 && Math.abs(o.y - t.y) < 2);
  const free = (t) => t.alive && !tiles.some((o) => o.alive && covers(o, t)) && !(side(t, -1) && side(t, 1));
  const seen = new Set(), order = [];
  const rec = () => {
    if (!tiles.some((t) => t.alive)) return true;
    const key = tiles.map((t) => t.alive ? 1 : 0).join(''); if (seen.has(key)) return false; seen.add(key);
    const f = tiles.filter(free).sort((a, b) => b.layer - a.layer); // うえの だんから ためすと はやく みつかる
    for (let i = 0; i < f.length; i++) for (let j = i + 1; j < f.length; j++) if (f[i].face === f[j].face) {
      f[i].alive = f[j].alive = false; order.push([f[i], f[j]]);
      if (rec()) return true;
      f[i].alive = f[j].alive = true; order.pop();
    }
    return false;
  };
  const ok = rec(); for (const t of tiles) t.alive = true; return ok ? order : null;
}
function assertGoodDeal(tiles, label) {
  assert.equal(tiles.filter((t) => t.face === null || t.face === 'null').length, 0, label + ': every tile has a face');
  const counts = {}; for (const t of tiles) counts[t.face] = (counts[t.face] || 0) + 1;
  assert.ok(Object.values(counts).every((n) => n % 2 === 0), label + ': faces come in pairs');
  assert.ok(shSolve(tiles.map((t) => ({...t}))), label + ': the deal can be cleared');
}
for (const [label, opts, big] of [['60 tiles', {}, false], ['68 tiles', {mode: 'hard', ageTicks: 100000}, true]]) {
  test(`shanghai: the first deal and every reshuffle give a clearable ${label} board (B15)`, () => {
    let bad = 0;
    for (let seed = 1; seed <= 4; seed++) {
      const r = start('shanghai-tiles', {...opts, random: lcg(seed * 7919)}), shuffle = r.view.querySelector('#shShuffle');
      r.h.advance(20);
      assertGoodDeal(readTiles(frame(r), big), `${label} seed ${seed} initial`);
      for (let i = 0; i < 16; i++) {
        r.h.dispatch(shuffle, 'pointerdown', {});
        const tiles = readTiles(frame(r), big);
        if (tiles.some((t) => t.face === null || t.face === 'null')) bad++;
        assertGoodDeal(tiles, `${label} seed ${seed} reshuffle ${i}`);
      }
      assert.equal(r.calls.some((c) => c.k === 'fillText' && (c.a[0] === null || c.a[0] === 'null')), false);
    }
    assert.equal(bad, 0);
  });
}
test('shanghai: the verified deal is actually cleared by tapping, and the fallback path also deals faces (B15)', () => {
  // ()=>0.5 だと ランダムな 配りは 毎回 おなじ ところで いきづまる(修正前は 絵の ない 牌が 2まい)。30かい だめなので かくじつな 手順に きりかわる
  for (const random of [lcg(424242), '()=>0.5']) {
    const r = start('shanghai-tiles', {random}), {h, view} = r, canvas = view.querySelector('#shCanvas');
    h.advance(20);
    const tiles = readTiles(frame(r), false);
    assertGoodDeal(tiles, random);
    const order = shSolve(tiles); assert.ok(order);
    const tap = (t) => { const {x, y} = shCenter(t); h.dispatch(canvas, 'pointerdown', {clientX: x, clientY: y}); };
    for (const [a, b] of order) { tap(a); tap(b); }
    assert.equal(view.querySelector('#shScore').textContent, `🀄 ${tiles.length / 2}/${tiles.length / 2}`);
    h.advance(1000);
    assert.equal(r.scores.length, 1); assert.ok(r.scores[0] >= 84, 'full clear score band');
  }
});

// ---------------- B17 / B18 sudoku-mini ----------------
function sdBoard(calls, N) {
  const CELL = 280 / N, g = Array.from({length: N}, () => Array(N).fill(0));
  for (const c of calls) {
    if (c.k !== 'fillText' || !/^[1-6]$/.test(c.a[0])) continue;
    const col = Math.round((c.a[1] - 10 - CELL / 2) / CELL), row = Math.round((c.a[2] - 1 - 10 - CELL / 2) / CELL);
    if (Math.abs(10 + col * CELL + CELL / 2 - c.a[1]) < 1e-6 && Math.abs(10 + row * CELL + CELL / 2 + 1 - c.a[2]) < 1e-6) g[row][col] = +c.a[0];
  }
  return g;
}
function sdSolutions(g, N, limit = 2) {
  const BR = 2, BC = N === 6 ? 3 : 2, out = [];
  const ok = (r, c, v) => { for (let i = 0; i < N; i++) if (g[r][i] === v || g[i][c] === v) return false; const br = Math.floor(r / BR) * BR, bc = Math.floor(c / BC) * BC; for (let rr = br; rr < br + BR; rr++) for (let cc = bc; cc < bc + BC; cc++) if (g[rr][cc] === v) return false; return true; };
  (function rec() { if (out.length >= limit) return; for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) if (!g[r][c]) { for (let v = 1; v <= N; v++) if (ok(r, c, v)) { g[r][c] = v; rec(); g[r][c] = 0; } return; } out.push(g.map((x) => x.slice())); })();
  return out;
}
function sdInput(r, N) {
  const {h, view} = r, canvas = view.querySelector('#sdCanvas'), pad = view.querySelector('#sdPad'), CELL = 280 / N;
  return (row, col, n) => {
    h.dispatch(canvas, 'pointerdown', {clientX: 10 + col * CELL + CELL / 2, clientY: 10 + row * CELL + CELL / 2, pointerId: 1});
    const digit = pad.children.find((b) => b.dataset.v === String(n));
    digit.closest = (s) => s === 'button' ? digit : null;
    pad.listeners.find((l) => l.type === 'pointerdown' && !l.capture).fn({target: digit, preventDefault() {}});
  };
}
for (const [label, opts, N, rounds] of [['4×4 easy', {mode: 'easy', ageTicks: 0}, 4, 3], ['4×4 normal', {ageTicks: 100000}, 4, 3], ['6×6 hard', {mode: 'hard', ageTicks: 100000}, 6, 2]]) {
  test(`sudoku: every ${label} board has exactly one solution and rule-following input completes it with no mistakes (B17)`, () => {
    for (let seed = 1; seed <= 6; seed++) {
      const r = start('sudoku-mini', {...opts, random: lcg(seed * 104729)}), {h, view} = r, put = sdInput(r, N);
      h.advance(20);
      for (let round = 0; round < rounds; round++) {
        const g = sdBoard(frame(r), N), blanks = g.flat().filter((v) => !v).length;
        assert.ok(blanks >= (N === 4 ? 7 : 18), `${label} seed ${seed} round ${round}: blanks ${blanks}`);
        const sols = sdSolutions(g.map((x) => x.slice()), N);
        assert.equal(sols.length, 1, `${label} seed ${seed} round ${round}: unique solution`);
        for (let rr = 0; rr < N; rr++) for (let cc = 0; cc < N; cc++) if (!g[rr][cc]) put(rr, cc, sols[0][rr][cc]);
        assert.equal(view.querySelector('#sdMiss').textContent, 'ミス0');
        h.advance(1701);
      }
      h.advance(1000);
      assert.equal(r.scores.length, 1, `${label} seed ${seed}: all boards completed`);
      assert.equal(r.scores[0], 100);
    }
  });
}
test('sudoku: a digit judged wrong is drawn red until it is replaced or cleared (B18)', () => {
  const N = 4, r = start('sudoku-mini', {mode: 'easy', ageTicks: 0, random: lcg(99991)}), {h, view} = r, put = sdInput(r, N), CELL = 280 / N;
  h.advance(20);
  const g = sdBoard(frame(r), N), sol = sdSolutions(g.map((x) => x.slice()), N)[0];
  // 行・列・わくで かさならない まちがい(conflict では 赤く ならない もの)を さがす
  const BR = 2, BC = 2, clash = (row, col, v) => { for (let i = 0; i < N; i++) if ((i !== col && g[row][i] === v) || (i !== row && g[i][col] === v)) return true; const br = Math.floor(row / BR) * BR, bc = Math.floor(col / BC) * BC; for (let a = br; a < br + BR; a++) for (let b = bc; b < bc + BC; b++) if ((a !== row || b !== col) && g[a][b] === v) return true; return false; };
  let pick = null;
  for (let row = 0; row < N && !pick; row++) for (let col = 0; col < N && !pick; col++) if (!g[row][col]) for (let v = 1; v <= N; v++) if (v !== sol[row][col] && !clash(row, col, v)) { pick = [row, col, v]; break; }
  assert.ok(pick, 'a non-conflicting wrong digit exists');
  const [row, col, v] = pick;
  const colorAt = (calls) => { const c = calls.find((x) => x.k === 'fillText' && x.a[1] === 10 + col * CELL + CELL / 2 && x.a[2] === 10 + row * CELL + CELL / 2 + 1); return c && {text: c.a[0], color: c.fillStyle}; };
  put(row, col, v);
  assert.equal(view.querySelector('#sdMiss').textContent, 'ミス1');
  assert.deepEqual(colorAt(frame(r)), {text: String(v), color: '#c1121f'}, 'the wrong digit is red');
  put(row, col, 0);
  assert.equal(colorAt(frame(r)), undefined, 'cleared');
  put(row, col, v); put(row, col, sol[row][col]);
  assert.deepEqual(colorAt(frame(r)), {text: String(sol[row][col]), color: '#1d4ed8'}, 'replacing with the right digit clears the red');
});
