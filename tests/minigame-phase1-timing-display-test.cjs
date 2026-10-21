// Phase 1(U3/U4/U5/U6/U12/U12'): games.js の 時計・長さ・表示と 判定の ずれ の 回帰テスト。
// DOM と 時計は ハーネスの 代用品(ブラウザの 描画や 指の 入力の 証拠では ない)。
const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const {harness} = require('./helpers/runtime-harness.cjs');

const GAMES_SRC = fs.readFileSync('games.js', 'utf8');
const GRACE = 600; // script.js の MG_ACTION_START_GRACE_MS

// canvas の 2D コンテキストの 代用品。描いた 命令を log に のこす(ゲームの 中の 値は 見ない)
function fakeCtx(log) {
  const grad = {addColorStop() {}};
  return new Proxy({}, {
    get(t, k) {
      if (k in t) return t[k];
      if (k === 'createLinearGradient' || k === 'createRadialGradient' || k === 'createPattern') return () => grad;
      if (k === 'measureText') return () => ({width: 0});
      return (...a) => { log.push({op: k, a, stroke: t.strokeStyle, fill: t.fillStyle}); };
    },
    set(t, k, v) { t[k] = v; return true; },
  });
}

function start(id, options = {}, setup) {
  const log = [];
  const h = harness({...options, ...(options.ctx ? {canvasContext: fakeCtx(log)} : {})});
  const s = h.api.state();
  if (options.difficulty) s.lifetime.minigameDifficulty = options.difficulty;
  if (options.length) s.lifetime.minigameLength = options.length;
  if (options.ageTicks !== undefined) s.ageTicks = options.ageTicks;
  if (setup) setup(h);
  const game = h.api.games.find((g) => g.id === id), scores = [];
  assert.ok(game, id);
  h.api.startMinigame({id: game.id, start(container, done) { game.start(container, (score) => { scores.push(score); done(score); }); }});
  return {h, view: h.get('minigameOverlay'), scores, log};
}

// 関数の ソースを games.js から とりだす(テストから 純関数を よぶ ため)
function extractFunction(name) {
  const at = GAMES_SRC.indexOf(`function ${name}(`);
  assert.ok(at >= 0, `games.js must define ${name}`);
  let i = GAMES_SRC.indexOf(') {', at) + 2, depth = 0;
  for (; i < GAMES_SRC.length; i++) { if (GAMES_SRC[i] === '{') depth++; else if (GAMES_SRC[i] === '}' && --depth === 0) break; }
  return GAMES_SRC.slice(at, i + 1);
}

// ---------------- B06 / G-AC-07: 開始の ゆうよの あいだは 制限時間が へらない ----------------
test('breakout keeps its full time limit during the start grace (B06)', () => {
  const g = start('breakout-classic', {ctx: true});
  const D = g.h.api.mgDuration(30000);
  const canvas = g.view.querySelector('#bkCanvas');
  // ボールの まうえに パドルを おきつづける(まっすぐ はねかえり、ステージを 消しきらずに 時間まで のこる)
  g.h.dispatch(canvas, 'pointerdown', {pointerId: 1, clientX: 150, clientY: 360});
  const step = () => {
    g.log.length = 0; g.h.advance(16);
    const balls = g.log.filter((c) => c.op === 'arc' && c.a[2] === 5);
    if (!balls.length) return;
    const low = balls.reduce((p, q) => (q.a[1] > p.a[1] ? q : p));
    g.h.dispatch(canvas, 'pointermove', {pointerId: 1, clientX: 150 + (low.a[0] - 150) / 1.15, clientY: 360});
  };
  for (let t = 0; t < D + 1000; t += 16) step();
  assert.deepEqual(g.scores, [], 'the limit counts from the end of the grace, so the result is not out yet');
  for (let t = 0; t < 400; t += 16) step();
  assert.equal(g.scores.length, 1, 'time-up finishes after limit + grace');
});

test('breakout and pingpong start their clock after MG_ACTION_START_GRACE_MS (B06)', () => {
  for (const name of ['makeBreakoutGame', 'makePingPongGame']) {
    const src = extractFunction(name);
    assert.match(src, /const startTime = performance\.now\(\) \+ MG_ACTION_START_GRACE_MS;/, name);
    assert.doesNotMatch(src, /const startTime = performance\.now\(\);/, name);
  }
});

// ---------------- B07 / G-AC-20: リズムの 長さも mgDuration を とおる ----------------
test('rhythm-highway-3d follows the short and easy length settings (B07)', () => {
  for (const [opts, base] of [[{length: 'short'}, 22000], [{difficulty: 'easy'}, 22000], [{}, 22000]]) {
    const g = start('rhythm-highway-3d', opts);
    const L = g.h.api.mgDuration(base);
    if (opts.length === 'short') assert.equal(L, 15400);
    if (opts.difficulty === 'easy') assert.equal(L, 26400);
    g.h.advance(GRACE + L - 100);
    assert.deepEqual(g.scores, [], JSON.stringify(opts) + ': still playing before the length ends');
    g.h.advance(100 + 50 + 650);
    assert.equal(g.scores.length, 1, JSON.stringify(opts) + ': ends at the mgDuration length');
    assert.ok(g.scores[0] >= 8 && g.scores[0] <= 100, 'score stays a ratio band');
  }
});

// ---------------- W03 / G-AC-16: ヘッダーの 初期の 秒数は 本当の 制限時間 ----------------
test('initial timer headers show the actual duration (W03)', () => {
  const cases = [['falling-block-puzzle', 'fbTimer', 28000], ['street-fight', 'sfTimer', 25000], ['sky-shooter', 'ssTimer', 27000], ['jump-quest', 'jqTimer', 28000]];
  for (const opts of [{}, {difficulty: 'easy'}, {length: 'short'}]) {
    for (const [id, el, base] of cases) {
      const g = start(id, opts);
      const shown = g.view.innerHTML.match(new RegExp(`id="${el}">([^<]*)<`))?.[1];
      assert.equal(shown, `残り：${Math.ceil(g.h.api.mgDuration(base) / 1000)}秒`, `${id} ${JSON.stringify(opts)}`);
      g.h.api.retireMinigame();
    }
  }
  assert.doesNotMatch(GAMES_SRC, /残り：\d+秒/, 'no hard-coded remaining seconds');
});

// ---------------- B08 / G-AC-23: ボールから はなれた タップでは 打たない ----------------
test('mini-golf ignores a tap far from the ball and explains the pull (B08)', () => {
  const g = start('mini-golf-physics');
  const canvas = g.view.querySelector('#gfCanvas'), strokes = g.view.querySelector('#gfStrokes'), hint = g.view.querySelector('#gfHint');
  const S = 300 / 244;
  // どの ホールの スタートからも 遠い 点を タップ(おして その場で はなす)
  g.h.dispatch(canvas, 'pointerdown', {pointerId: 1, clientX: 200 * S, clientY: 120 * S});
  g.h.dispatch(canvas, 'pointerup', {pointerId: 1, clientX: 200 * S, clientY: 120 * S});
  g.h.advance(16);
  assert.notEqual(strokes.textContent, '打数1', 'a far tap must not use a stroke');
  assert.match(hint.textContent, /ボールから引っぱろう/);
  // ボールの 上で おして 下へ 引けば 1打
  for (const [x, y] of [[30, 200], [30, 210], [122, 215], [40, 40], [122, 210], [30, 40]]) {
    if (strokes.textContent === '打数1') break;
    g.h.dispatch(canvas, 'pointerdown', {pointerId: 2, clientX: x * S, clientY: y * S});
    g.h.dispatch(canvas, 'pointermove', {pointerId: 2, clientX: x * S, clientY: y * S + 40 * S});
    g.h.dispatch(canvas, 'pointerup', {pointerId: 2, clientX: x * S, clientY: y * S + 40 * S});
  }
  assert.equal(strokes.textContent, '打数1', 'pulling back from the ball still putts');
});

// ---------------- B11 / G-AC-10 + W02 / G-AC-11: おべんとうの ⭕/❌ と 終わりの ことば ----------------
function bento(options = {}) {
  const g = start('dragDecorate-bento', options);
  const items = g.view.querySelectorAll('.mg-drag-item'), targets = g.view.querySelectorAll('.mg-drop-target');
  targets.forEach((t, i) => { t.getBoundingClientRect = () => ({left: 20 + i * 60, right: 66 + i * 60, top: 20, bottom: 66, width: 46, height: 46}); });
  items.forEach((i) => { i.getBoundingClientRect = () => ({left: 0, right: 46, top: 180, bottom: 226, width: 46, height: 46}); });
  g.drop = (key, targetKey) => {
    const item = items.find((i) => i.dataset.key === key), target = targets.find((t) => t.dataset.key === targetKey);
    g.h.dispatch(item, 'pointerdown', {pointerId: 5, clientX: 23, clientY: 203});
    g.h.dispatch(item, 'pointerup', {pointerId: 5, clientX: target.getBoundingClientRect().left + 23, clientY: 43});
  };
  g.targets = targets; g.hint = g.view.querySelector('#mgHint');
  return g;
}
const markOf = (t) => t.children.find((c) => c.className === 'mg-reveal-mark')?.textContent;

test('bento marks each placed slot with ⭕/❌, not color alone (B11)', () => {
  const g = bento();
  g.h.advance(2200);
  g.drop('rice', 'egg'); g.drop('egg', 'rice'); g.drop('shrimp', 'shrimp'); g.drop('broccoli', 'broccoli');
  const by = (k) => g.targets.find((t) => t.dataset.key === k);
  assert.equal(markOf(by('egg')), '❌'); assert.equal(markOf(by('rice')), '❌');
  assert.equal(markOf(by('shrimp')), '⭕'); assert.equal(markOf(by('broccoli')), '⭕');
  assert.ok(by('egg').classList.contains('wrong'));
  assert.deepEqual(g.scores, [50]);
  // 全部 置いたが まちがいあり: 「時間までに」とは 言わない(W02)
  assert.doesNotMatch(g.hint.textContent, /時間までに/);
  assert.match(g.hint.textContent, /2\/4/);
});

test('bento says "時間までに…" only when time actually runs out (W02)', () => {
  const g = bento();
  g.h.advance(2200);
  g.drop('rice', 'rice');
  g.h.advance(30000);
  assert.deepEqual(g.scores, [25]);
  assert.equal(g.hint.textContent, '時間までにここまでつめられた');
});

// ---------------- B12 / G-DE-01: バブルの 1だん さがるで 泡が きえない・ずれない ----------------
test('bubble-shooter drop keeps every bubble, its x position and its neighbours (B12)', () => {
  const hexFactory = new Function(extractFunction('makeBubbleHex') + '; return makeBubbleHex;')();
  const COLS = 9, R = 300 / 19, RH = R * Math.sqrt(3), hex = hexFactory(COLS, R, RH);
  let seed = 7; const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const pairs = (grid, parity, shift = 0) => {
    const out = new Set();
    for (let r = 0; r < grid.length; r++) for (let c = 0; c < grid[r].length; c++) {
      if (grid[r][c] < 0) continue;
      for (const [dr, dc] of hex.neighborSteps(r, parity)) {
        const nr = r + dr, nc = c + dc;
        if (nr < 0 || nr >= grid.length || nc < 0 || nc >= hex.rowLen(nr, parity) || grid[nr][nc] < 0) continue;
        if (r - shift >= 0 && nr - shift >= 0) out.add(`${r - shift},${c}|${nr - shift},${nc}`); // あたらしい 行を ふくむ ペアは のぞく
      }
    }
    return out;
  };
  for (const startParity of [0, 1]) for (let trial = 0; trial < 20; trial++) {
    let parity = startParity, grid = [];
    const rows = 4 + (trial % 3);
    for (let r = 0; r < rows; r++) grid.push(Array.from({length: hex.rowLen(r, parity)}, () => (rand() < 0.2 ? -1 : Math.floor(rand() * 5))));
    for (let drop = 0; drop < 3; drop++) {
      const before = grid.map((row) => row.slice()), beforeParity = parity, beforePairs = pairs(grid, parity);
      ({grid, parity} = hex.dropRow(grid, parity, () => 3));
      assert.equal(grid.length, before.length + 1);
      assert.equal(grid[0].length, hex.rowLen(0, parity), 'new top row has the right length');
      assert.ok(grid[0].every((v) => v === 3));
      for (let r = 0; r < before.length; r++) {
        assert.deepEqual(grid[r + 1], before[r], 'old rows are not trimmed or padded');
        for (let c = 0; c < before[r].length; c++) {
          const was = hex.cellPos(r, c, beforeParity), now = hex.cellPos(r + 1, c, parity);
          assert.equal(now.x, was.x, 'no half-cell sideways shift');
          assert.ok(Math.abs(now.y - was.y - RH) < 1e-9, 'moves down exactly one row');
        }
      }
      const afterPairs = pairs(grid, parity, 1);
      assert.deepEqual([...afterPairs].sort(), [...beforePairs].sort(), 'neighbour pairs among old bubbles are unchanged');
    }
  }
});

test('bubble-shooter runs to the end with the shared parity grid (B12)', () => {
  const g = start('bubble-shooter', {seed: 11});
  const canvas = g.view.querySelector('#bsCanvas');
  for (let i = 0; i < 40 && !g.scores.length; i++) {
    g.h.dispatch(canvas, 'pointerdown', {pointerId: 1, clientX: 60 + (i * 37) % 180, clientY: 120});
    g.h.dispatch(canvas, 'pointerup', {pointerId: 1, clientX: 60 + (i * 37) % 180, clientY: 120});
    g.h.advance(700);
  }
  g.h.advance(40000);
  assert.equal(g.scores.length, 1);
});

// ---------------- B13 / G-DE-02: ライツアウトの「さいてい」は ほんとうの 最小手数 ----------------
test('lights-out par is the true minimum number of presses (B13)', () => {
  const src = GAMES_SRC.match(/const LIGHTS_OUT_NULL = \[[^\]]*\];/)?.[0];
  assert.ok(src, 'null-space basis constant');
  const minPresses = new Function(src + extractFunction('lightsOutMinPresses') + '; return lightsOutMinPresses;')();
  const N = 5, eff = (i) => { let m = 0; const x = i % 5, y = (i / 5) | 0; for (const [dx, dy] of [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy; if (nx >= 0 && ny >= 0 && nx < N && ny < N) m |= 1 << (ny * 5 + nx); } return m; };
  const board = (set) => { let g = 0; for (let i = 0; i < 25; i++) if (set >> i & 1) g ^= eff(i); return g; };
  const popcount = (m) => { let n = 0; for (; m; m &= m - 1) n++; return n; };
  // ほんとうの 最小(1行目の 32とおり × ライトチェイス)
  const trueMin = (target) => {
    let best = Infinity;
    for (let m = 0; m < 32; m++) {
      let g = target, p = 0;
      const press = (i) => { p ^= 1 << i; g ^= eff(i); };
      for (let x = 0; x < 5; x++) if (m >> x & 1) press(x);
      for (let y = 1; y < 5; y++) for (let x = 0; x < 5; x++) if (g >> ((y - 1) * 5 + x) & 1) press(y * 5 + x);
      if (!g) best = Math.min(best, popcount(p));
    }
    return best;
  };
  const basis = eval(src.replace('const LIGHTS_OUT_NULL = ', '').replace(/;$/, ''));
  for (const v of basis) assert.equal(board(v), 0, 'basis presses change nothing');
  let seed = 3, shorter = 0; const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  for (let t = 0; t < 3000; t++) {
    const n = 3 + (t % 6); let set = 0;
    while (popcount(set) < n) set |= 1 << Math.floor(rand() * 25);
    const got = minPresses(set);
    assert.equal(got, trueMin(board(set)), 'par equals the true minimum');
    assert.ok(got <= n);
    if (got < n) shorter++;
  }
  assert.ok(shorter > 0, 'some generated boards have a shorter solution than the pressed count');
  // 全部 点いた 盤の 最小は 15
  let allOnPresses = null;
  for (let m = 0; m < 32 && allOnPresses === null; m++) {
    let g = (1 << 25) - 1, p = 0; const press = (i) => { p ^= 1 << i; g ^= eff(i); };
    for (let x = 0; x < 5; x++) if (m >> x & 1) press(x);
    for (let y = 1; y < 5; y++) for (let x = 0; x < 5; x++) if (g >> ((y - 1) * 5 + x) & 1) press(y * 5 + x);
    if (!g) allOnPresses = p;
  }
  assert.equal(minPresses(allOnPresses), 15);
});

test('lights-out starts with a positive par in its header (B13 smoke)', () => {
  const g = start('lights-out', {seed: 5, difficulty: 'hard', ageTicks: 100000});
  const par = Number(g.view.querySelector('#loMoves').textContent.match(/さいてい(\d+)/)[1]);
  assert.ok(par >= 1 && par <= 6);
});

// ---------------- B14 / G-DE-03: 「おちつき」と 照準円は じっさいの ゆれと おなじ値 ----------------
test('darts aim ring and steadiness gauge follow the actual sway amplitude (B14)', () => {
  const ringAfterHold = (difficulty) => {
    const g = start('darts-board', {ctx: true, difficulty, ageTicks: 100000});
    const canvas = g.view.querySelector('#dtCanvas');
    g.h.dispatch(canvas, 'pointerdown', {pointerId: 1, clientX: 60, clientY: 60});
    g.h.advance(1000);
    g.log.length = 0; g.h.advance(16);
    const ring = g.log.filter((c) => c.op === 'arc' && Math.hypot(c.a[0] - 60, c.a[1] - 60) < 40 && c.a[2] >= 10).pop();
    const gauge = g.log.filter((c) => c.op === 'fillRect' && c.a[3] === 6).pop();
    return {amp: (ring.a[2] - 10) * 2, red: ring.stroke === 'rgba(255,90,90,.9)', gaugeAmp: 26 * (1 - gauge.a[2] / 80)};
  };
  const easy = ringAfterHold('easy'), hard = ringAfterHold('hard');
  // じっさいの ゆれは holdT²×lerp(9,14,d): d=0.3 と d=1 の 比 = 14/10.5
  assert.ok(Math.abs(hard.amp / easy.amp - 14 / 10.5) < 0.02, `ratio ${hard.amp / easy.amp}`);
  assert.ok(Math.abs(easy.gaugeAmp - easy.amp) < 1e-6 && Math.abs(hard.gaugeAmp - hard.amp) < 1e-6, 'gauge and ring read the same amp');
  assert.ok(hard.amp > 12 && hard.red, 'hard sway over 12 turns the ring red');
  assert.ok(easy.amp < 12 && !easy.red);
});

// ---------------- B19 / G-FG-05: チェッカーの かちの ことばは おわりかたに あわせる ----------------
test('checkers win message matches how the game ended; score band unchanged (B19)', () => {
  let timeUpWins = 0;
  for (let seed = 1; seed <= 6; seed++) {
    const g = start('checkers-6', {seed});
    const v = g.view, canvas = v.querySelector('#ckCanvas'), turn = v.querySelector('#ckTurn'), cnt = v.querySelector('#ckCount'), hint = v.querySelector('#ckHint');
    const tap = (x, y) => g.h.dispatch(canvas, 'pointerdown', {pointerId: 1, clientX: x * 50 + 25, clientY: y * 50 + 25});
    // かんたんな 手: 合法手を さがして さす。駒の数で 上まわったら あとは 待つ
    for (let guard = 0; guard < 400 && !g.scores.length; guard++) {
      const [me, ai] = cnt.textContent.match(/\d+/g).map(Number);
      if (!turn.textContent.startsWith('あなた') || me > ai) { g.h.advance(300); continue; }
      const order = [...Array(36).keys()].sort((p, q) => ((p * seed * 7919 + (guard + 1) * 31) % 97) - ((q * seed * 7919 + (guard + 1) * 31) % 97));
      search: for (const fi of order) for (let ty = 0; ty < 6; ty++) for (let tx = 0; tx < 6; tx++) {
        const fx = fi % 6, fy = (fi / 6) | 0; if (tx === fx || ty === fy) continue;
        tap(fx, fy); tap(tx, ty);
        if (turn.textContent !== 'あなたの番(🔴)' || hint.textContent === '続けて取れる!') break search;
      }
      g.h.advance(250);
    }
    g.h.advance(70000);
    assert.equal(g.scores.length, 1);
    const [me, ai] = cnt.textContent.match(/\d+/g).map(Number);
    if (/かち/.test(hint.textContent)) {
      assert.equal(g.scores[0], Math.min(100, Math.max(78, 78 + me * 4)), 'win score band unchanged');
      if (ai > 0) assert.doesNotMatch(hint.textContent, /ぜんぶとった/, `seed ${seed}: pieces remain (${me}-${ai})`);
      if (ai > 0 && /時間切れ/.test(hint.textContent)) timeUpWins++;
    }
  }
  assert.ok(timeUpWins > 0, 'at least one time-up win was exercised');
});
