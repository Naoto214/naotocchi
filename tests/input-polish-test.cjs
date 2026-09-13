const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const { harness } = require('./helpers/runtime-harness.cjs');

test('every minigame maps to one of the intro demo kinds, and the kinds are varied', () => {
  const h = harness();
  const counts = {};
  for (const game of h.api.games) {
    const kind = h.api.minigameDemoKind(game);
    assert.ok(h.api.MG_DEMO_KINDS.includes(kind), `${game.id} -> ${kind}`);
    counts[kind] = (counts[kind] || 0) + 1;
  }
  assert.ok(Object.keys(counts).length >= 4, `demo kinds should cover most input styles: ${JSON.stringify(counts)}`);
  assert.equal(h.api.minigameDemoKind({id: 'bowling-3d'}), 'swipe');
  assert.equal(h.api.minigameDemoKind({id: 'dragDecorate-cake'}), 'drag');
  assert.equal(h.api.minigameDemoKind({id: 'falling-block-puzzle'}), 'pad');
  assert.equal(h.api.minigameDemoKind({id: 'snake-classic'}), 'pad');
  assert.equal(h.api.minigameDemoKind({id: 'pinball-physics'}), 'hold');
  assert.equal(h.api.minigameDemoKind({id: 'no-such-game'}), 'tap');
});

test('the intro card carries a demo canvas tagged with the demo kind', () => {
  const h = harness(), state = h.api.state();
  state.stage = 'growing'; state.energy = 100; state.isSleeping = false;
  const game = h.api.games.find((g) => g.id === 'falling-block-puzzle');
  h.api.startMinigame(game, {intro: true});
  const html = h.get('minigameOverlay').innerHTML;
  assert.match(html, /mg-intro-demo/);
  assert.match(html, /data-demo="pad"/);
  h.dispatch(h.get('minigameOverlay').querySelector('#mgIntroStart'), 'click');
  assert.doesNotMatch(h.get('minigameOverlay').innerHTML, /mg-intro-demo/, 'the demo card is replaced by the game');
});

test('swipe thresholds are unified through MG_SWIPE_MIN and hold timing through MG_HOLD_PROFILES', () => {
  const h = harness();
  assert.equal(typeof h.api.MG_SWIPE_MIN, 'number');
  assert.ok(h.api.MG_SWIPE_MIN >= 12 && h.api.MG_SWIPE_MIN <= 20);
  assert.deepEqual(Object.keys(h.api.MG_HOLD_PROFILES).sort(), ['fast', 'step']);
  const games = fs.readFileSync(path.join(__dirname, '..', 'games.js'), 'utf8');
  assert.ok((games.match(/MG_SWIPE_MIN/g) || []).length >= 11, 'all swipe games read the shared threshold');
  const stray = games.split('\n').filter((line) => /swipe/.test(line) && /Math\.(hypot|max)\([^)]*\) ?< ?\d+\)/.test(line));
  assert.deepEqual(stray, [], 'no hard-coded swipe threshold is left');
});

test('the result toast offers a retry button that restarts the same game', () => {
  const h = harness(), state = h.api.state();
  state.stage = 'growing'; state.energy = 100; state.isSleeping = false;
  const game = h.api.games.find((g) => g.id === 'falling-block-puzzle');
  h.api.render(); // the play button is enabled by render()
  state.lifetime.minigamePlayCounts[game.id] = 5; // past the intro plays: skip the intro card
  const played = [];
  const origStart = game.start;
  game.start = (container, done) => { played.push(game.id); container.innerHTML = '<button id="fin">x</button>'; };
  try {
    assert.equal(h.api.tryStartPlay(game), true);
    h.api.finishMinigame(0.5, 'ok');
    const toast = h.get('mgResultToast');
    assert.equal(toast.classList.contains('hidden'), false);
    assert.match(toast.innerHTML, /mg-retry-btn/);
    const btn = toast.querySelector('#mgRetryBtn');
    assert.ok(btn, 'retry button rendered');
    state.energy = 100;
    h.dispatch(btn, 'click');
    assert.equal(toast.classList.contains('hidden'), true, 'toast hides on retry');
    assert.deepEqual(played, [game.id, game.id], 'the same game starts again');
  } finally { game.start = origStart; }
});

test('the result toast has no retry button before any game was played', () => {
  const h = harness();
  h.api.showMinigameResultToast({score: 40, best: 40, prevBest: null, isNewBest: true, rank: 'C', bestRank: 'C'});
  assert.doesNotMatch(h.get('mgResultToast').innerHTML, /mg-retry-btn/);
});

test('the intro card shows for the first three plays and the help overlay works any time', () => {
  const h = harness(), state = h.api.state();
  state.stage = 'growing'; state.energy = 100; h.api.render();
  const game = h.api.games.find((g) => g.id === 'race-3d');
  for (let play = 1; play <= 4; play++) {
    state.lifetime.minigamePlayCounts[game.id] = play;
    assert.equal(h.api.isFirstMinigamePlay(game), play <= 3, 'play ' + play);
  }
  state.lifetime.minigamePlayCounts[game.id] = 9;
  h.api.startMinigame(game);
  h.api.closeMinigameHelp();
  assert.equal(h.get('mgHelpOverlay').classList.contains('hidden'), true);
  h.dispatch(h.get('mgHelpBtn'), 'click');
  assert.equal(h.get('mgHelpOverlay').classList.contains('hidden'), false);
  assert.match(h.get('mgHelpText').textContent, /アクセル/);
  assert.match(h.get('mgHelpTitle').textContent, /レース|3D/);
  h.dispatch(h.get('mgHelpCloseBtn'), 'click');
  assert.equal(h.get('mgHelpOverlay').classList.contains('hidden'), true);
  h.dispatch(h.get('mgHelpBtn'), 'click');
  h.api.retireMinigame();
  assert.equal(h.get('mgHelpOverlay').classList.contains('hidden'), true, 'ending the game closes the help');
});

// パッドを ゆびで なぞる うごきを 再現する(pointerId 1、1回の move ごとに clock を すすめる)
function padDrag(h, pad, moves, { id = 1, start = [150, 150], gapMs = 16, release = true } = {}) {
  let [x, y] = start;
  h.dispatch(pad.el, 'pointerdown', { pointerId: id, clientX: x, clientY: y });
  for (const [dx, dy, ms] of moves) {
    h.advance(ms ?? gapMs);
    x += dx; y += dy;
    h.dispatch(pad.el, 'pointermove', { pointerId: id, clientX: x, clientY: y });
  }
  if (release) { h.advance(gapMs); h.dispatch(pad.el, 'pointerup', { pointerId: id, clientX: x, clientY: y }); }
  return [x, y];
}

test('steps pad fires the moment a direction is clear, once per flick, without waiting for release', () => {
  const h = harness();
  const host = h.document.createElement('div');
  const steps = [];
  const pad = h.api.createTouchPad(host, { mode: 'steps', triggerPx: 9, repeatPx: 26, onStep: (dx, dy) => steps.push([dx, dy]) });
  // 12px の みじかい フリック: はなす まえに 1マス、はなしても 2マスめは 出ない
  padDrag(h, pad, [[4, 1], [4, 0], [4, 1]], { release: false });
  assert.deepEqual(JSON.parse(JSON.stringify(steps)), [[1, 0]], 'step fires before the finger lifts');
  h.dispatch(pad.el, 'pointerup', { pointerId: 1, clientX: 162, clientY: 152 });
  assert.equal(steps.length, 1, 'release adds nothing after an immediate step');
  // 60px の はやい フリックでも 1マスだけ
  steps.length = 0;
  padDrag(h, pad, [[15, 0, 8], [15, 0, 8], [15, 0, 8], [15, 0, 8]]);
  assert.deepEqual(JSON.parse(JSON.stringify(steps)), [[1, 0]], 'a fast 60px flick is one input');
  // 右へ なぞって そのまま 上へ: ゆびを はなさずに 2つの 入力
  steps.length = 0;
  padDrag(h, pad, [[6, 0], [6, 0], [0, -6], [0, -6]]);
  assert.deepEqual(JSON.parse(JSON.stringify(steps)), [[1, 0], [0, -1]], 'right then up without lifting');
  // 7px の ごく みじかい フリックは はなした ときに ひろう
  steps.length = 0;
  padDrag(h, pad, [[7, 0]]);
  assert.deepEqual(JSON.parse(JSON.stringify(steps)), [[1, 0]], 'a tiny flick still counts on release');
  // ななめ 45° ちかくは まよい、しゅじくが はっきりしたら 出る
  steps.length = 0;
  padDrag(h, pad, [[5, 5], [5, 4], [0, -0]], { release: false });
  assert.equal(steps.length, 0, 'ambiguous diagonal waits');
  h.advance(16); h.dispatch(pad.el, 'pointermove', { pointerId: 1, clientX: 168, clientY: 159 });
  assert.deepEqual(JSON.parse(JSON.stringify(steps)), [[1, 0]], 'resolves to the dominant axis once clear');
  h.dispatch(pad.el, 'pointerup', { pointerId: 1, clientX: 168, clientY: 159 });
  // とまってから おなじ むきへ もう 1かい なぞると 2かいめの 入力
  steps.length = 0;
  padDrag(h, pad, [[10, 0], [10, 0, 200]]);
  assert.deepEqual(JSON.parse(JSON.stringify(steps)), [[1, 0], [1, 0]], 'a pause separates two flicks in the same direction');
  // pointerup が きえても つぎの ゆびで うごく
  steps.length = 0;
  h.dispatch(pad.el, 'pointerdown', { pointerId: 7, clientX: 100, clientY: 100 });
  padDrag(h, pad, [[10, 0]], { id: 8 });
  assert.deepEqual(JSON.parse(JSON.stringify(steps)), [[1, 0]], 'a new finger takes over a stale pointer');
  assert.equal(pad.active, false);
});

test('turn-based steps pad needs a longer drag for the second cell in the same direction', () => {
  const h = harness();
  const host = h.document.createElement('div');
  const steps = [];
  const pad = h.api.createTouchPad(host, { mode: 'steps', triggerPx: 14, repeatPx: 40, repeatMs: 220, onStep: (dx, dy) => steps.push([dx, dy]) });
  padDrag(h, pad, [[10, 0], [10, 0], [10, 0], [10, 0], [10, 0]]);
  assert.deepEqual(JSON.parse(JSON.stringify(steps)), [[1, 0]], 'a 50px flick moves one cell');
  steps.length = 0;
  padDrag(h, pad, [[10, 0, 60], [10, 0, 60], [10, 0, 60], [10, 0, 60], [10, 0, 60], [10, 0, 60]]);
  assert.deepEqual(JSON.parse(JSON.stringify(steps)), [[1, 0], [1, 0]], 'a long deliberate drag repeats');
});

test('delta pad glides at the pad edge while pushing outward and stops when the finger comes back', () => {
  const h = harness();
  const host = h.document.createElement('div');
  let x = 0, y = 0;
  const pad = h.api.createTouchPad(host, { mode: 'delta', gainY: 1.5, glide: { speed: 260, ramp: 350 }, onDelta: (dx, dy) => { x += dx; y += dy; } });
  // まんなかで うごかしても グライドは しない(そのままの px、たては gainY ばい)
  padDrag(h, pad, [[10, 4]], { release: false, start: [150, 150] });
  assert.equal(x, 10); assert.equal(y, 6);
  assert.equal(pad.gliding, false);
  h.dispatch(pad.el, 'pointerup', { pointerId: 1, clientX: 160, clientY: 154 });
  // みぎはし(300px はば の 290)へ おしつけて とめる → うごきつづける
  x = 0; y = 0;
  padDrag(h, pad, [[5, 0]], { release: false, start: [287, 150] });
  assert.equal(pad.gliding, true, 'glide starts at the edge while pushing outward');
  const before = x;
  h.advance(200);
  const early = x - before;
  assert.ok(early > 5 && early < 40, `ramps up slowly at first: ${early}`);
  h.advance(1000);
  const late = x - before - early;
  assert.ok(late > 180, `reaches full speed: ${late}`);
  assert.equal(y, 0, 'no vertical glide when only the right edge is touched');
  // すこし もどすと とまる
  h.dispatch(pad.el, 'pointermove', { pointerId: 1, clientX: 284, clientY: 150 });
  assert.equal(pad.gliding, false, 'moving back cancels');
  const stopped = x; h.advance(300);
  assert.equal(x, stopped, 'nothing moves after cancel');
  h.dispatch(pad.el, 'pointerup', { pointerId: 1, clientX: 284, clientY: 150 });
  // はなすと とまる
  padDrag(h, pad, [[0, 5]], { release: false, start: [150, 287] });
  assert.equal(pad.gliding, true);
  h.dispatch(pad.el, 'pointerup', { pointerId: 1, clientX: 150, clientY: 292 });
  assert.equal(pad.gliding, false);
  const y0 = y; h.advance(500);
  assert.equal(y, y0, 'release stops the glide');
  // glide:false なら はしでも うごかない
  const plain = h.api.createTouchPad(host, { mode: 'delta', glide: false, onDelta: () => {} });
  padDrag(h, plain, [[5, 0]], { release: false, start: [287, 150] });
  assert.equal(plain.gliding, false);
});

test('vector pad keeps the direction of the real movement, not the wobble when the finger stops', () => {
  const h = harness();
  const host = h.document.createElement('div');
  const vecs = [];
  const pad = h.api.createTouchPad(host, { mode: 'vector', sticky: true, onVector: (x, y) => vecs.push([+x.toFixed(2), +y.toFixed(2)]) });
  // 左へ 42px なぞって、とめる ときに 1px ほどの ぶれ(下・右・下)
  padDrag(h, pad, [[-7, 0.4], [-7, 0.4], [-7, 0.4], [-7, 0.4], [-7, 0.4], [-7, 0.4], [-1.2, 0.9], [-0.4, 1.1], [0.3, 0.8], [0, 0.7]], { release: false });
  const last = vecs[vecs.length - 1];
  assert.ok(last[0] < -0.9 && Math.abs(last[1]) < 0.2, `still pointing left after the wobble: ${JSON.stringify(last)}`);
  assert.equal(pad.held.left, true); assert.equal(pad.held.down, false);
  // はなさずに 上へ 10px なぞると 上に かわる
  h.advance(16); h.dispatch(pad.el, 'pointermove', { pointerId: 1, clientX: 108, clientY: 145 });
  h.advance(16); h.dispatch(pad.el, 'pointermove', { pointerId: 1, clientX: 108, clientY: 140 });
  assert.equal(pad.held.up, true); assert.equal(pad.held.left, false);
  h.dispatch(pad.el, 'pointerup', { pointerId: 1, clientX: 108, clientY: 140 });
  assert.deepEqual(JSON.parse(JSON.stringify(pad.vector())), { x: 0, y: 0 });
  // dominant: 4ほうこうに スナップし、ななめは いまの じくを ゆうせん
  const held = [];
  const four = h.api.createTouchPad(host, { mode: 'vector', sticky: true, dominant: true, onVector: (x, y) => held.push([x, y]) });
  padDrag(h, four, [[-7, 3], [-7, 3], [-7, 3], [-0.5, 1], [0.3, 0.9]], { release: false });
  assert.deepEqual(JSON.parse(JSON.stringify(held[held.length - 1])), [-1, 0], 'snaps to left and ignores the wobble');
  h.advance(16); h.dispatch(four.el, 'pointermove', { pointerId: 1, clientX: 128.8, clientY: 168.9 + 12 });
  assert.deepEqual(JSON.parse(JSON.stringify(held[held.length - 1])), [0, 1], 'a clear 12px move down switches axis');
  h.dispatch(four.el, 'pointerup', { pointerId: 1, clientX: 128.8, clientY: 180.9 });
  // steering(非sticky): おなじ むきへ ゆっくり なぞりつづける あいだは いきていて、とめると holdMs で きえる
  const steer = h.api.createTouchPad(host, { mode: 'vector', axis: 'x', holdMs: 150, onVector: () => {} });
  padDrag(h, steer, [[-5, 0], [-2, 0, 60], [-2, 0, 60], [-2, 0, 60], [-2, 0, 60]], { release: false });
  assert.equal(steer.held.left, true, 'slow continued drag keeps steering');
  h.advance(200);
  assert.equal(steer.held.left, false, 'stops after holdMs when the finger rests');
  h.dispatch(steer.el, 'pointerup', { pointerId: 1, clientX: 137, clientY: 150 });
});
