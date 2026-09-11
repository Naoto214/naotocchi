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
  assert.equal(h.api.minigameDemoKind({id: 'falling-block-puzzle'}), 'dpad');
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
  assert.match(html, /data-demo="dpad"/);
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
  state.lifetime.minigameRecords[game.id] = {best: 10, last: 10}; // not a first play: skip the intro card
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
