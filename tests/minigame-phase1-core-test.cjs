const assert = require('node:assert/strict');
const {test} = require('node:test');
const {harness} = require('./helpers/runtime-harness.cjs');
const R = require('../minigame-reactions.js');

// Phase 1 (docs/audit/minigame-phase0-2026-10-12/01-confirmed-defects.md) B01-B05 and the
// reaction foundation v0. v0 must reproduce the previous reactions exactly.
function growing(h, extra = {}) {
  const s = h.api.state();
  Object.assign(s, {stage: 'growing', isSleeping: false, isSick: false, energy: 100, health: 100, hunger: 80, ...extra});
  h.api.render();
  return s;
}

test('B01: quick question cues keep the question reading through the voice wrapper', () => {
  const h = harness(); growing(h);
  const calls = []; h.api.audio.voice = (...a) => { calls.push(a); return true; };
  assert.equal(h.api.startQuickRun('count'), true); h.advance(40);
  assert.equal(calls[0][1] && calls[0][1].question, true, 'いくつ? is read as a question');
  h.api.retireMinigame(); h.advance(5000); calls.length = 0;
  assert.equal(h.api.startQuickRun('mash'), true); h.advance(40);
  assert.equal(calls[0][1] && calls[0][1].question, false, 'れんだ! stays an order');
});

test('B02: without a partner, the other companions never appear as wrong answers', () => {
  const comps = ['🐱', '🐰'];
  const h = harness(); const s = growing(h, {partner: null});
  s.companions = h.api.normalCompanions.filter((c) => comps.includes(c.emoji)).slice(0, 2).map((c) => ({id: c.id, bond: 100}));
  assert.equal(s.companions.length, 2, 'fixture has two companions whose emoji overlap the decoys');
  const def = h.api.QUICK_GAMES.find((x) => x.id === 'partner');
  const noop = () => {};
  for (let i = 0; i < 200; i++) {
    const faces = [];
    const ctx = new Proxy({fillText(ch) { faces.push(ch); }, createLinearGradient: () => ({addColorStop: noop})}, {get: (t, k) => (k in t ? t[k] : noop), set: () => true});
    def.create({W: 360, H: 300, level: 1 + (i % 6), extra: 0, feint: false, speed: 1, win: noop, lose: noop}).draw(ctx);
    assert.equal(faces.filter((ch) => comps.includes(ch)).length, 1, 'exactly one own companion on screen: ' + faces.join(''));
  }
});

function playSolo(h, id, win) {
  assert.equal(h.api.startQuickRun(id), true);
  h.advance(40);
  const run = h.api.quickSoloRun(id)._run;
  for (let n = 0; n < 12; n++) {
    const cur = run.current; if (!cur) break;
    for (let i = 0; i < 300; i++) { const t = cur.game.target(); if (!win || t.ready !== false) { cur.game.onTap(t.x, t.y); break; } h.advance(16); }
    h.advance(700);
    if (run.current === cur) h.advance(700);
  }
  h.advance(3000);
  return h.get('mgResultToast').textContent;
}

test('B03: a quick single game compares with its own record, not another game', () => {
  const h = harness(); const s = growing(h);
  assert.match(playSolo(h, 'button', true), /はじめての記録/);
  h.advance(7000);
  const second = playSolo(h, 'stop', false);
  assert.match(second, /はじめての記録/, 'first play of stop is a first record: ' + second);
  assert.doesNotMatch(second, /自己ベスト100/);
  assert.deepEqual(Object.keys(s.lifetime.minigameRecords['quick-solo']).sort(), ['best', 'last'], 'record shape is unchanged');
});

test('B04: a game started from a companion invite counts as a play and a weather play', () => {
  const h = harness({environment: {time: 'day', weather: 'rain'}}); const s = growing(h);
  const before = {play: s.actionCounts.play, rain: (s.lifetime.envPlays || {}).rain || 0};
  h.api.setPendingCompanion(h.api.normalCompanions[0].id);
  h.dispatch(h.get('companionInvitePlayBtn'), 'click');
  assert.equal(h.get('companionInviteOverlay').classList.contains('hidden'), true, 'the invite closed');
  assert.equal(s.actionCounts.play, before.play + 1);
  assert.equal(s.lifetime.envPlays.rain, before.rain + 1);
});

function finishProbe(score, {sodachiUp = false} = {}) {
  const h = harness(); const s = growing(h, {transformMeter: 0});
  if (sodachiUp) s.growth = h.api.sodachiCost(s.sodachi) - 0.1;
  let done; const game = {id: 'probe-x', start(_c, d) { done = d; }};
  s.lifetime.minigamePlayCounts[game.id] = 10;
  h.api.tryStartPlay(game);
  const sod = s.sodachi;
  done(score); h.advance(1);
  return {h, s, sod};
}

test('B05: a growth line raised while scoring waits until the result card has been read', () => {
  const {h, s, sod} = finishProbe(50, {sodachiUp: true});
  assert.ok(s.sodachi > sod, 'fixture raises sodachi during the result');
  const toast = h.get('mgResultToast'), bubble = h.get('speechBubble');
  assert.equal(toast.classList.contains('hidden'), false, 'result card stays visible');
  assert.equal(bubble.classList.contains('hidden'), true, 'no bubble over the result card');
  h.advance(6000);
  assert.equal(bubble.classList.contains('hidden'), false, 'the growth line appears after the card');
});

test('B05: great and bad results keep their reaction after the card (held lines are not doubled)', () => {
  for (const score of [90, 10]) {
    const {h} = finishProbe(score, {sodachiUp: true});
    assert.equal(h.get('mgResultToast').classList.contains('hidden'), false);
    assert.equal(h.get('speechBubble').classList.contains('hidden'), true);
    h.advance(6000);
    assert.equal(h.get('speechBubble').classList.contains('hidden'), false);
  }
});

test('reaction v0 reproduces the previous band → event mapping', () => {
  const base = {gameId: 'g', score: 50, record: {score: 50, best: 60, prevBest: 60, isNewBest: false, rank: 'C', bestRank: 'B'}};
  const plan = (o) => R.resolve(R.buildContext({...base, ...o}));
  assert.deepEqual([plan({band: 'great'}).eventKey, plan({band: 'great'}).partnerChance, plan({band: 'great'}).companionChance], ['minigame_great', 0.5, 0.6]);
  assert.deepEqual([plan({band: 'bad'}).eventKey, plan({band: 'bad'}).partnerChance, plan({band: 'bad'}).companionChance], ['minigame_bad', 0.45, 0.5]);
  assert.equal(plan({band: 'mid'}).eventKey, null);
  assert.equal(plan({band: 'bad', source: 'companion', recruited: true}).eventKey, 'companion_new');
  assert.equal(plan({band: 'great'}).petText, null, 'v0 has no new lines');
  assert.deepEqual(R.LINES, []);
  assert.deepEqual(R.audit(), []);
});

test('reaction moments are derived from existing data only', () => {
  const ctx = (o) => R.buildContext({gameId: 'g', band: 'mid', score: 50, ...o});
  assert.equal(R.detectMoments(ctx({record: {score: 50, best: 50, prevBest: null, isNewBest: true, rank: 'C'}}))[0], 'firstClear');
  assert.equal(R.detectMoments(ctx({score: 92, record: {score: 92, best: 92, prevBest: 80, isNewBest: true, rank: 'S'}}))[0], 'firstS');
  assert.equal(R.detectMoments(ctx({score: 85, record: {score: 85, best: 85, prevBest: 80, isNewBest: true, rank: 'A'}}))[0], 'newBest');
  assert.equal(R.detectMoments(ctx({score: 77, record: {score: 77, best: 80, prevBest: 80, isNewBest: false, rank: 'A'}}))[0], 'nearMiss');
  const bad = {gameId: 'g', band: 'bad', score: 10};
  assert.ok(R.detectMoments(ctx({band: 'bad', recent: [bad, bad, bad]})).includes('losingStreak'));
  assert.ok(R.detectMoments(ctx({recent: [{gameId: 'g'}, {gameId: 'g'}, {gameId: 'g'}]})).includes('repeatPlay'));
  assert.ok(R.detectMoments(ctx({playCount: 10})).includes('milestone'));
  assert.equal(R.detectMoments(ctx({source: 'companion', recruited: false}))[0], 'companionMiss');
  assert.equal(R.detectMoments(ctx({}))[0], 'plain');
});

test('reaction lines use the narrowest scope first and are audited', () => {
  const lines = [
    {moment: 'newBest', scope: 'any', text: 'any'},
    {moment: 'newBest', scope: 'genre:sports', text: 'genre'},
    {moment: 'newBest', scope: 'category:fishing', text: 'category'},
    {moment: 'newBest', scope: 'game:fishing-river', text: 'game'},
  ];
  const c = (o) => R.buildContext({band: 'great', genre: 'sports', category: 'fishing', gameId: 'fishing-river', ...o});
  assert.equal(R.pickLine(c({}), ['newBest'], lines), 'game');
  assert.equal(R.pickLine(c({gameId: 'fishing-sea'}), ['newBest'], lines), 'category');
  assert.equal(R.pickLine(c({gameId: 'x', category: 'y'}), ['newBest'], lines), 'genre');
  assert.equal(R.pickLine(c({gameId: 'x', category: 'y', genre: 'z'}), ['newBest'], lines), 'any');
  assert.equal(R.resolve(c({record: {score: 80, best: 80, prevBest: 70, isNewBest: true, rank: 'A'}}), {lines}).petText, 'game');
  assert.equal(R.resolve(c({band: 'mid', record: {score: 60, best: 60, prevBest: 50, isNewBest: true, rank: 'B'}}), {lines}).petText, null, 'mid band stays quiet in v0');
  assert.deepEqual(R.audit([{moment: 'nope', scope: 'everywhere', text: '{x}'}]).length, 3);
});

test('the reaction path keeps the old event keys and quick runs still skip reactions', () => {
  for (const [score, key] of [[90, 'minigame_great'], [10, 'minigame_bad']]) {
    const h = harness(); const s = growing(h);
    let done; const game = {id: 'probe-k', start(_c, d) { done = d; }}; s.lifetime.minigamePlayCounts[game.id] = 10;
    h.api.tryStartPlay(game); done(score); h.advance(6100);
    assert.equal(h.get('speechBubble').classList.contains('hidden'), false, key + ' speaks after the card');
  }
  const h = harness(); const s = growing(h);
  h.api.startQuickRun(); h.api.finishMinigame(100); h.advance(7000);
  assert.equal(h.get('speechBubble').classList.contains('hidden'), true, 'quick runs keep no character reaction in v0');
  assert.equal(s.minigameCount >= 1, true);
});
