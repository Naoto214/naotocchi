// Phase 2 第3弾(T3・T4): 「みじかめ」と 手番制、のこり時間の ひょうじ の 回帰テスト。
// DOM と 時計は ハーネスの 代用品(ブラウザの 描画や 指の 入力の 証拠では ない)。
const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const {harness} = require('./helpers/runtime-harness.cjs');

const GAMES_SRC = fs.readFileSync('games.js', 'utf8');
const GRACE = 600; // script.js の MG_ACTION_START_GRACE_MS

function start(id, options = {}) {
  const h = harness({seed: options.seed || 3});
  const s = h.api.state();
  if (options.length) s.lifetime.minigameLength = options.length;
  const game = h.api.games.find((g) => g.id === id), scores = [];
  assert.ok(game, id);
  h.api.startMinigame({id: game.id, start(container, done) { game.start(container, (score) => { scores.push(score); done(score); }); }});
  const view = h.get('minigameOverlay');
  return {h, view, scores, header: () => view.innerHTML.match(/<div class="mg-header">([\s\S]*?)<\/div>/)?.[1] || ''};
}
// ヘッダーの のこり時間(新しい ⏱️ と、もとから ある「残り：N秒」の どちらか)の 秒数
function shownSeconds(g) {
  const t = g.view.querySelector('#mgTimer').textContent;
  if (t) return Number(t.match(/^[⏱️⏳]+(\d+)秒$/u)[1]);
  const m = g.header().match(/残り：(\d+)秒/);
  assert.ok(m, 'a remaining-time display must exist: ' + g.header());
  return Number(m[1]);
}

// T3: 手番で すすむ ゲーム(16本)。games.js の MG_TURN_BASED と 一致させる
const TURN_BASED = ['reversi-6', 'animal-shogi', 'connect-four', 'gomoku-9', 'checkers-6', 'mancala-kalah', 'curling-ice', 'curling-winter', 'sugoroku-race', 'solitaire-klondike', 'hit-blow', 'slide-puzzle', 'sudoku-mini', 'picross-5', 'push-puzzle', 'roguelike-dungeon'];
// T4: もとは 残り時間を 出して いなかった 時間制の ゲーム(31本)と、mgDuration に わたす 長さ
const T4 = {
  'breakout-classic': 30000, 'dragDecorate-cake': 16000, 'dragDecorate-bento': 11000, 'crane-game-3d': 45000, 'rhythm-highway-3d': 22000,
  'mini-golf-physics': 40000, 'pingpong-3d': 28000, 'tower-defense': 90000, 'roguelike-dungeon': 90000, 'grand-prix-3d': 30000,
  'push-puzzle': 60000, 'reversi-6': 60000, 'billiards-6': 40000, 'animal-shogi': 60000, 'minesweeper-8': 60000,
  'catapult-castle': 30000, 'connect-four': 60000, 'match-3': 32000, 'gomoku-9': 60000, 'picross-5': 75000,
  'pipe-connect': 50000, 'lights-out': 45000, 'curling-ice': 45000, 'curling-winter': 45000, 'jenga-tower': 45000,
  'line-trace': 32000, 'checkers-6': 60000, 'memory-cards': 45000, 'domino-run': 45000, 'sudoku-mini': 90000, 'mancala-kalah': 60000,
};

test('the turn-based list is decided in one place in games.js (T3)', () => {
  const src = GAMES_SRC.match(/const MG_TURN_BASED = new Set\(\[([^\]]*)\]\)/)?.[1];
  assert.ok(src, 'games.js must define MG_TURN_BASED');
  assert.deepEqual(src.match(/'[\w-]+'/g).map((x) => x.slice(1, -1)).sort(), [...TURN_BASED].sort());
});

test('turn-based games keep their full time limit in the short setting (T3)', () => {
  for (const id of TURN_BASED) {
    const normal = start(id), short = start(id, {length: 'short'});
    assert.equal(shownSeconds(short), shownSeconds(normal), `${id}: short must not cut the limit`);
    normal.h.api.retireMinigame(); short.h.api.retireMinigame();
  }
});

test('reversi left alone in the short setting runs to the full 60 s (T3)', () => {
  const g = start('reversi-6', {length: 'short'});
  g.h.advance(42000 + 1000);
  assert.deepEqual(g.scores, [], 'the old 42 s cut no longer ends the game');
  g.h.advance(60000 - 43000 + 1000);
  assert.equal(g.scores.length, 1, 'ends at the normal 60 s');
});

test('time-based games still run at 70% in the short setting (T3)', () => {
  const h = harness();
  h.api.state().lifetime.minigameLength = 'short';
  assert.equal(h.api.mgDuration(30000), 21000);
  assert.equal(h.api.mgDuration(30000, {turn: true}), 30000);
  for (const [id, base] of Object.entries(T4)) {
    if (TURN_BASED.includes(id)) continue;
    const g = start(id, {length: 'short'});
    assert.equal(shownSeconds(g), Math.ceil((base >= 20000 ? base * 0.7 : base) / 1000), id);
    g.h.api.retireMinigame();
  }
  for (const id of ['shanghai-tiles', 'snake-classic', 'race-3d']) {
    const n = start(id), s = start(id, {length: 'short'});
    assert.ok(shownSeconds(s) < shownSeconds(n), `${id}: still shortened`);
  }
});

// カーリング: 1.8秒 かんがえて なげる(ふつうの はやさ)。うごいて いる あいだの タップは スイープ
function playCurling(id, length, thinkMs) {
  const g = start(id, {length});
  const cv = g.view.querySelector('#cuCanvas'), mineEl = g.view.querySelector('#cuTurn'), theirsEl = g.view.querySelector('#cuScore');
  const swipe = () => {
    g.h.dispatch(cv, 'pointerdown', {pointerId: 1, clientX: 150, clientY: 290});
    g.h.dispatch(cv, 'pointermove', {pointerId: 1, clientX: 150, clientY: 180});
    g.h.dispatch(cv, 'pointerup', {pointerId: 1, clientX: 150, clientY: 180});
  };
  for (let t = 0; t < 200000 && !g.scores.length; t += thinkMs) { g.h.advance(thinkMs); swipe(); }
  g.h.advance(2000);
  const left = (el) => Number(el.textContent.match(/残り(\d+)/)[1]);
  return {g, mine: left(mineEl), theirs: left(theirsEl)};
}

test('curling-winter throws all 8 stones in the short setting (T3)', () => {
  for (const length of ['short', 'normal']) {
    const {g, mine, theirs} = playCurling('curling-winter', length, 1800);
    assert.equal(g.scores.length, 1);
    assert.equal(mine, 0, `${length}: you throw all 4`);
    assert.equal(theirs, 0, `${length}: the opponent throws all 4`);
  }
});

test('curling time-up waits for the turn boundary: every throw gets its answer (T3)', () => {
  // 1投に 14秒 かける 遅い プレイ(42秒めに なげる): 時間ぎれでも、なげた 石が とまり、あいてが かならず こたえてから おわる
  for (const [id, cut] of [['curling-winter', true], ['curling-ice', false]]) {
    const {g, mine, theirs} = playCurling(id, 'normal', 14000);
    assert.equal(g.scores.length, 1);
    assert.equal(mine > 0, cut, `${id}: the slow play is ${cut ? '' : 'not '}cut by time`);
    assert.equal(mine, theirs, `${id}: no throw is left unanswered`);
  }
  // 「4こずつ」の 説明と 画面の「残り4」は そのまま(tests/minigame-phase1-wording-test.cjs)
  const g = start('curling-winter');
  assert.match(g.header(), /^<span id="cuTurn">あなた🔴残り4<\/span>/);
});

test('every timed game shows one remaining-time display that counts down (T4)', () => {
  for (const [id, base] of Object.entries(T4)) {
    const g = start(id);
    const header = g.header();
    assert.equal((header.match(/class="mg-timer"/g) || []).length, 1, `${id}: one timer in the header`);
    assert.doesNotMatch(header, /残り：|\d+秒<\/span><span/, `${id}: no second time display`);
    const first = shownSeconds(g);
    assert.equal(first, Math.ceil(base / 1000), `${id}: starts at the real limit`);
    g.h.advance(4500);
    if (!g.scores.length) assert.ok(shownSeconds(g) < first, `${id}: counts down (${first} -> ${shownSeconds(g)})`);
    g.h.api.retireMinigame();
  }
});

test('the timer turns ⏳ near the end, then stops at the finish (T4)', () => {
  const g = start('memory-cards');
  const el = g.view.querySelector('#mgTimer');
  g.h.advance(45000 - 4000);
  assert.match(el.textContent, /^⏳[1-5]秒$/u, 'last seconds use a different symbol, not color alone');
  assert.ok(el.classList.contains('low'));
  g.h.advance(5000);
  assert.equal(g.scores.length, 1);
  const last = el.textContent;
  g.h.advance(2000);
  assert.equal(el.textContent, last, 'no more updates after the game ends');
});

test('no game shows two remaining-time displays (T4)', () => {
  const h = harness();
  for (const game of h.api.games) {
    const g = start(game.id);
    const header = g.header();
    const n = (header.match(/class="mg-timer"/g) || []).length + (header.match(/残り：/g) || []).length;
    assert.ok(n <= 1, `${game.id}: ${header}`);
    g.h.api.retireMinigame();
  }
});
