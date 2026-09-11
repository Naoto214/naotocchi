const assert = require('node:assert/strict');
const { test } = require('node:test');
const { harness } = require('./helpers/runtime-harness.cjs');

function finishResultGame(h,score) {
  let complete;
  const game={id:'result-probe',start(_container,done){complete=done;}};
  const s=h.api.state();
  Object.assign(s,{stage:'growing',isSleeping:false,isSick:false,energy:100,health:100,hunger:80,transformMeter:0});
  s.lifetime.minigamePlayCounts[game.id]=10;
  h.api.render();
  assert.equal(h.api.tryStartPlay(game),true);
  complete(score);
  return game;
}

for(const score of [10,90]) test(`score ${score} keeps results readable before the reaction begins`,()=>{
  const h=harness();finishResultGame(h,score);h.advance(1);
  assert.equal(h.get('mgResultToast').classList.contains('hidden'),false);
  assert.equal(h.get('speechBubble').classList.contains('hidden'),true,'reaction must wait for results');
  assert.equal(h.get('mgResultToast').style.animationDuration,'6000ms','animation must last as long as retry');
  h.advance(4500);
  assert.equal(h.get('mgResultToast').classList.contains('hidden'),false);
  assert.equal(h.get('speechBubble').classList.contains('hidden'),true);
  h.advance(1500);
  assert.equal(h.get('mgResultToast').classList.contains('hidden'),true);
  assert.equal(h.get('speechBubble').classList.contains('hidden'),false,'reaction follows results');
});

test('a new care conversation replaces results and cancels the delayed game reaction',()=>{
  const h=harness();finishResultGame(h,90);h.advance(1000);
  h.api.speakEvent('feed',{petText:'いまはごはん!',partnerChance:0,companionChance:0});h.advance(1);
  assert.equal(h.get('mgResultToast').classList.contains('hidden'),true);
  assert.equal(h.get('speechText').textContent,'いまはごはん!');
  h.advance(6500);
  assert.equal(h.get('speechBubble').classList.contains('hidden'),true,'old game reaction must not return');
});

test('replaying cancels the delayed reaction and old result controls',()=>{
  const h=harness(),game=finishResultGame(h,90);h.advance(1000);
  assert.equal(h.api.tryStartPlay(game),true);
  assert.equal(h.get('mgResultToast').classList.contains('hidden'),true);
  h.advance(6500);
  assert.equal(h.get('mgResultToast').classList.contains('hidden'),true);
  assert.equal(h.get('speechBubble').classList.contains('hidden'),true);
});

// A minimal game exercises the production common controls and callbacks without
// making this test depend on any particular game's scoring/level layout.
function inputGame(h, {continuous = false} = {}) {
  const observed = {presses: 0, held: false, frames: 0, deferred: 0, releaseDeferred: 0};
  const game = {id: 'lifecycle-probe', start(container, done) {
    container.innerHTML = '<button id="left" data-key="left" data-hold="step">◀</button><button id="finish">Finish</button>';
    const btn = container.querySelector('#left'); observed.button = btn; observed.done = done;
    observed.finishButton = container.querySelector('#finish');
    observed.finishButton.addEventListener('click', () => done(50));
    if (continuous) {delete btn.dataset.hold; h.api.bindHeldButton(btn, v => {observed.held = v;});}
    btn.addEventListener('pointerdown', () => {
      observed.presses++;
      h.sandbox.setTimeout(() => {observed.deferred++;}, 100);
    });
    btn.addEventListener('pointercancel', () => {
      h.sandbox.setTimeout(() => {observed.releaseDeferred++;}, 100);
    });
    const frame = () => {observed.frames++; h.sandbox.requestAnimationFrame(frame);};
    h.sandbox.requestAnimationFrame(frame);
  }};
  h.api.startMinigame(game);
  return observed;
}

for (const ending of ['retire', 'complete']) test(`${ending} clears a held key before the next game`, () => {
  const h = harness(), first = inputGame(h);
  h.dispatch(h.document, 'keydown', {key: 'ArrowLeft'});
  assert.equal(first.presses, 1);
  if (ending === 'retire') h.dispatch(h.get('mgQuitYesBtn'), 'click'); else h.dispatch(first.finishButton, 'click');
  const stateAfterEnd = JSON.stringify(h.api.state());
  first.done(100); // A late/duplicate result must not earn rewards.
  assert.equal(JSON.stringify(h.api.state()), stateAfterEnd);
  let ordinaryTimerRan = false;
  h.sandbox.setTimeout(() => {ordinaryTimerRan = true;}, 30);
  const second = inputGame(h);
  h.dispatch(h.document, 'keydown', {key: 'ArrowLeft'});
  assert.equal(second.presses, 1, 'a key left down in the previous game must work in the next');
  h.advance(120);
  assert.equal(first.frames, 0, 'retired game must not render again');
  assert.equal(first.deferred, 0, 'retired input callback must not run');
  assert.equal(first.releaseDeferred, 0, 'cleanup callbacks must also belong to the ended session');
  assert.equal(ordinaryTimerRan, true, 'ordinary timers after retirement must not inherit the ended session');
  assert.ok(second.frames > 0, 'current game animation must continue');
});

for (const interruption of ['blur', 'hidden']) test(`${interruption} releases keyboard steering and allows a new press`, () => {
  const h = harness(), game = inputGame(h, {continuous: true});
  h.dispatch(h.document, 'keydown', {key: 'ArrowLeft'});
  assert.equal(game.held, true);
  if (interruption === 'blur') h.dispatch(h.window, 'blur', {bubbles: false});
  else {h.document.visibilityState = 'hidden'; h.dispatch(h.document, 'visibilitychange', {bubbles: false});}
  assert.equal(game.held, false, 'steering must release even without keyup');
  h.advance(120);
  assert.equal(game.releaseDeferred, 1, 'release callbacks of the active game must still run');
  h.document.visibilityState = 'visible';
  h.dispatch(h.document, 'keydown', {key: 'ArrowLeft'});
  assert.equal(game.presses, 2);
  h.dispatch(h.document, 'keyup', {key: 'ArrowLeft'});
  assert.equal(game.held, false);
});

test('a background switch stops repeating button input without ending the game', () => {
  const h = harness(), game = inputGame(h);
  h.dispatch(h.document, 'keydown', {key: 'ArrowLeft'});
  h.advance(250);
  assert.equal(game.presses, 2, 'hold repeat must work while active');
  h.dispatch(h.window, 'blur', {bubbles: false});
  h.advance(1000);
  assert.equal(game.presses, 2, 'background must not keep repeating the old press');
  assert.equal(game.releaseDeferred, 1, 'focus loss must preserve active-session release callbacks');
  assert.ok(game.frames > 0, 'input reset must not terminate the minigame session');
});

test('a background switch releases a touch-held control without a pointerup', () => {
  const h = harness(), game = inputGame(h, {continuous: true});
  h.dispatch(game.button, 'pointerdown', {pointerId: 7});
  assert.equal(game.held, true);
  h.dispatch(h.window, 'blur', {bubbles: false});
  assert.equal(game.held, false, 'touch steering must not remain held');
});

test('input scope is restored when an event never bubbles to window', () => {
  const h = harness(), game = inputGame(h);
  h.dispatch(h.document, 'keydown', {key: 'ArrowLeft', bubbles: false});
  assert.equal(game.presses, 1);
  h.advance(1); // The existing fallback must restore the owning event's scope.
  h.api.retireMinigame();
  let ordinaryTimerRan = false;
  h.sandbox.setTimeout(() => {ordinaryTimerRan = true;}, 30);
  h.advance(30);
  assert.equal(ordinaryTimerRan, true, 'non-bubbling input must not leave a dead timer scope');
});

test('all 100 registered games can retire without delayed rewards or repopulating the screen', () => {
  const h = harness();
  assert.equal(h.api.games.length, 100);
  for (const game of h.api.games) {
    h.api.reset();
    h.api.startMinigame(game);
    h.api.retireMinigame();
    h.advance(5000);
    assert.equal(h.api.state().lifetime.minigamesPlayed, 0, game.id + ': retirement must not award a completed play');
    assert.equal(h.get('minigameOverlay').innerHTML, '', game.id + ': retired game must leave the screen empty');
  }
});

// The lightweight harness only parses buttons into queryable text nodes.
// Read the rendered .mg-hint element itself so a title cannot satisfy a goal.
function initialBodyHint(view) {
  return view.innerHTML.match(/<div class="mg-hint"[^>]*>([\s\S]*?)<\/div>/)?.[1] || '';
}

test('first-play instructions include each dynamic goal needed to finish the game', async (t) => {
  const cases = [
    ['tilt-maze-3d', /ゴールへ/],
    ['pingpong-3d', /先に5点/],
    ['sudoku-mini', /4×4.*6×6/, /4×4.*1〜4/],
    ['area-claim', /75%/],
    ['beach-volley', /先に7点/],
  ];
  const h = harness();
  for (const [id, goal, bodyGoal = goal] of cases) await t.test(id, () => {
    const game = h.api.games.find((candidate) => candidate.id === id);
    h.api.startMinigame(game, {intro: true});
    const instructions = h.get('minigameOverlay').innerHTML.match(/<div class="mg-intro-controls">([\s\S]*?)<\/div>([\s\S]*?)<\/div>/)?.[2];
    assert.match(instructions || '', goal, `${id}: controls must state the goal even without the short description`);
    const view = h.get('minigameOverlay');
    h.dispatch(view.querySelector('#mgIntroStart'), 'click');
    assert.match(initialBodyHint(view), bodyGoal, `${id}: game instructions must retain the goal after starting`);
    h.api.retireMinigame();
  });
});

for (const [mode, ageTicks, size] of [['easy', 0, 4], ['hard', 100000, 6]]) {
  test(`Sudoku instructions follow the actual ${size}×${size} board`, () => {
    const h = harness();
    h.api.state().lifetime.minigameDifficulty = mode;
    h.api.state().ageTicks = ageTicks;
    h.api.startMinigame(h.api.games.find((g) => g.id === 'sudoku-mini'));
    const view = h.get('minigameOverlay');
    const pad = view.querySelector('#sdPad');
    assert.equal(pad.children.filter((b) => b.dataset.v !== '0').length, size);
    assert.match(initialBodyHint(view), new RegExp(`${size}×${size}.*1〜${size}`));
  });
}

test('Mancala explains sowing toward the right-hand own store and follows that path', () => {
  const h = harness();
  const game = h.api.games.find((g) => g.id === 'mancala-kalah');
  h.api.startMinigame(game, {intro: true});
  const view = h.get('minigameOverlay');
  const intro = view.innerHTML.match(/<div class="mg-intro-controls">([\s\S]*?)<\/div>([\s\S]*?)<\/div>/)?.[2] || '';
  h.dispatch(view.querySelector('#mgIntroStart'), 'click');
  const body = initialBodyHint(view);
  // The third lower pit has four seeds: right through three pits into the store.
  h.dispatch(view.querySelector('#mkCanvas'), 'pointerdown', {clientX: 131, clientY: 140});
  h.advance(561);
  assert.match(view.querySelector('#mkScore').textContent, /🟢 1 - 0 🟠/);
  assert.equal(view.querySelector('#mkTurn').textContent, 'あなたの番', 'ending in own store earns another turn');
  for (const instructions of [intro, body]) {
    assert.match(instructions, /たねを1つずつ[^。]*自分のストア[^。]*まく/);
    assert.doesNotMatch(instructions, /右回り/);
  }
});

// A game whose code throws must not leave the overlay open with gameActive stuck.
test('a game whose frame loop throws is closed without rewards and the next game works', () => {
  const h = harness();
  const before = h.api.state().lifetime.minigamesPlayed;
  let frames = 0;
  const bad = {id: 'crash-probe', start(container, done) {
    container.innerHTML = '<div id="crash">x</div>';
    const frame = () => { frames++; if (frames >= 2) throw new Error('boom'); h.sandbox.requestAnimationFrame(frame); };
    h.sandbox.requestAnimationFrame(frame);
  }};
  h.api.startMinigame(bad);
  h.advance(200);
  assert.equal(frames, 2, 'the loop must stop at the throwing frame');
  assert.equal(h.get('minigameOverlay').innerHTML, '', 'a crashed game must be closed');
  assert.ok(h.get('minigameOverlay').classList.contains('hidden'));
  assert.equal(h.api.state().lifetime.minigamesPlayed, before, 'a crash must not count as a completed play');
  const next = inputGame(h);
  h.advance(50);
  assert.ok(next.frames > 0, 'a new game must run after a crash');
  assert.ok(h.sandbox.__naotocchiErrors.some(e => e.where === 'minigame' && /boom/.test(e.message)), 'the crash is recorded');
});

test('a game that throws while starting is closed cleanly', () => {
  const h = harness();
  h.api.startMinigame({id: 'start-crash', start() { throw new Error('start boom'); }});
  assert.equal(h.get('minigameOverlay').innerHTML, '');
  assert.ok(h.get('minigameOverlay').classList.contains('hidden'));
  const next = inputGame(h);
  h.advance(50);
  assert.ok(next.frames > 0);
});
