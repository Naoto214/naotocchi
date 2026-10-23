const assert = require('node:assert/strict');
const {test} = require('node:test');
const {harness} = require('./helpers/runtime-harness.cjs');

// Phase 2 PR 2-1 (docs/audit/minigame-phase2-plan-2026-10-22 F6-F9, R3, R4):
// クイックの はんていの ぬけみち と、ゆびの もちこし・かいしちょくごの ごタップ。
const noop = () => {};
function seededRandom(seed) {
  let value = seed >>> 0;
  return () => ((value = (1664525 * value + 1013904223) >>> 0) / 4294967296);
}
// fillText だけを きろくする ctx(ほかの そうさは なにも しない)
function recorder() {
  const texts = [];
  const ctx = new Proxy({fillText(ch, x, y) { texts.push({ch: String(ch), x, y}); }, createLinearGradient: () => ({addColorStop: noop})},
    {get: (t, k) => (k in t ? t[k] : noop), set: () => true});
  return {ctx, texts};
}
function create(h, id, level, out) {
  const def = h.api.QUICK_GAMES.find((g) => g.id === id);
  const k = level - 1;
  return def.create({W: 300, H: 300, level, speed: 1 + h.api.QUICK_RULES.SPEED_UP * k, extra: Math.floor(k / 2), feint: level >= 3,
    win: () => { if (!out.result) out.result = 'win'; }, lose: () => { if (!out.result) out.result = 'lose'; }});
}

test('F6: stack never starts above the tower, so a tap at t=0 fails, and the target still solves it', () => {
  const h = harness();
  h.api.setRandom(seededRandom(7));
  for (let level = 1; level <= 6; level++) {
    for (let i = 0; i < 60; i++) {
      const out = {}; const game = create(h, 'stack', level, out);
      game.onTap(150, 150);
      assert.equal(out.result, 'lose', `Lv${level}: tapping as soon as the cue appears is not a free success`);
    }
    for (let i = 0; i < 30; i++) {
      const out = {}; const game = create(h, 'stack', level, out);
      const limit = Math.round(3800 * Math.max(0.6, 1 - h.api.QUICK_RULES.TIME_SHRINK * (level - 1)));
      for (let el = 0; el < limit && !out.result; el += 16) { if (game.target().ready) game.onTap(150, 150); else game.update(0.016); }
      assert.equal(out.result, 'win', `Lv${level}: the block reaches the tower in time and the target hint solves it`);
    }
  }
});

test('F7: count puts the right answer at any rank of three consecutive numbers, never below 1', () => {
  const h = harness();
  h.api.setRandom(seededRandom(11));
  const ranks = new Set();
  for (let level = 1; level <= 6; level++) for (let i = 0; i < 80; i++) {
    const out = {}; const game = create(h, 'count', level, out);
    const {ctx, texts} = recorder(); game.draw(ctx);
    const nums = texts.filter((t) => /^\d+$/.test(t.ch)).map((t) => ({v: Number(t.ch), x: t.x}));
    assert.equal(nums.length, 3);
    const vs = nums.map((n) => n.v).sort((a, b) => a - b);
    assert.ok(vs[0] >= 1, 'no zero or negative choice');
    assert.deepEqual(vs, [vs[0], vs[0] + 1, vs[0] + 2], 'three consecutive numbers');
    const answer = nums.find((n) => n.x === game.target().x).v;
    ranks.add(vs.indexOf(answer));
    game.onTap(game.target().x, game.target().y);
    assert.equal(out.result, 'win', 'the target is the star count');
  }
  assert.deepEqual([...ranks].sort(), [0, 1, 2], 'the answer is not always the middle number');
});

test('F8: tapping the catch decoy is a miss, while the companion itself still wins', () => {
  const h = harness();
  h.api.setRandom(seededRandom(5));
  const DECOYS = ['🍂', '🪨', '🧸'];
  let checked = 0;
  for (let i = 0; i < 200 && checked < 20; i++) {
    const out = {}; const game = create(h, 'catch', 3, out);
    const {ctx, texts} = recorder(); game.draw(ctx);
    const d = texts.find((t) => DECOYS.includes(t.ch));
    assert.ok(d, 'feint levels show a decoy');
    const m = game.target();
    if (Math.hypot(d.x - m.x, d.y - m.y) < 80) continue; // なかまと かさなる ときは なかまが さき
    game.onTap(d.x, d.y);
    assert.equal(out.result, 'lose', 'the decoy works as a trap');
    checked++;
  }
  assert.ok(checked >= 10);
  const out = {}; const game = create(h, 'catch', 3, out); const m = game.target(); game.onTap(m.x, m.y);
  assert.equal(out.result, 'win');
});

test('F8: the relighting candle in flames is not always the leftmost one', () => {
  const h = harness();
  h.api.setRandom(seededRandom(3));
  const which = new Set();
  for (let i = 0; i < 60; i++) {
    const out = {}; const game = create(h, 'flames', 3, out);
    const lit = () => { const {ctx, texts} = recorder(); game.draw(ctx); return texts.filter((t) => t.ch === '🔥').map((t) => t.x); };
    const xs = lit().sort((a, b) => a - b);
    for (let n = 0; n < xs.length + 1; n++) { const t = game.target(); if (t.ready === false) break; game.onTap(t.x, t.y); }
    assert.equal(lit().length, 0, 'all flames are out');
    for (let k = 0; k < 60; k++) game.update(0.05);
    const back = lit();
    assert.equal(back.length, 1, 'exactly one candle relights');
    which.add(xs.indexOf(back[0]));
    for (let n = 0; n < 3 && !out.result; n++) { const t = game.target(); game.onTap(t.x, t.y); }
    assert.equal(out.result, 'win', 'blowing it out again still clears the game');
  }
  assert.ok(which.size >= 3, `the relit candle moves around: ${[...which]}`);
});

function solo(id) {
  const h = harness(), s = h.api.state();
  Object.assign(s, {stage: 'growing', isSleeping: false, isSick: false, energy: 100, health: 100, hunger: 80, transformMeter: 0});
  h.api.render();
  assert.equal(h.api.startQuickRun(id), true);
  h.advance(40);
  const run = h.api.quickSoloRun(id)._run;
  const ov = h.get('minigameOverlay');
  const canvas = ov.querySelector('#qkCanvas');
  const flashShown = () => !ov.querySelector('#qkFlash').classList.contains('hidden');
  const ptr = (type, x, y) => h.dispatch(canvas, type, {pointerId: 1, clientX: x, clientY: y});
  return {h, run, ov, flashShown, ptr};
}

test('F9/R3: a finger held over from the previous game does not swipe the next one', () => {
  const {h, run, flashShown, ptr} = solo('flee');
  const first = run.current;
  h.advance(300);
  ptr('pointerdown', 150, 150); // おしたまま、うごかさずに 時間切れ
  for (let i = 0; i < 400 && run.current === first; i++) h.advance(16);
  assert.notEqual(run.current, first, 'the next game began while the finger is still down');
  const second = run.current;
  h.advance(300);
  assert.equal(flashShown(), false);
  ptr('pointermove', 230, 150);
  h.advance(16);
  assert.equal(run.current, second);
  assert.equal(flashShown(), false, 'the carried-over pointer is not read as a swipe in the new game');
  ptr('pointerup', 230, 150);
  // あたらしく おせば ふつうに スワイプできる
  ptr('pointerdown', 150, 150); ptr('pointermove', 200, 150); h.advance(16);
  assert.equal(flashShown(), true, 'a fresh press in the new game is accepted');
});

test('R4: a press in the first moments of a touch-to-fail game is ignored, later presses still count', () => {
  const {h, run, flashShown, ptr} = solo('wait');
  const cur = run.current;
  ptr('pointerdown', 150, 150); ptr('pointerup', 150, 150);
  h.advance(16);
  assert.equal(flashShown(), false, 'a leftover tap right at the start does not fail まて');
  assert.equal(run.current, cur);
  h.advance(200);
  ptr('pointerdown', 150, 150);
  h.advance(16);
  assert.equal(flashShown(), true, 'touching after the grace still fails まて');
});

test('R4: only games that can fail on any first touch carry a short start grace', () => {
  const h = harness();
  const fatal = ['wait', 'button', 'stop', 'cliff', 'shutter', 'stack', 'swipe', 'flee', 'throw', 'umbrella', 'fish', 'sort'];
  for (const g of h.api.QUICK_GAMES) {
    if (fatal.includes(g.id)) assert.ok(g.graceMs > 0 && g.graceMs <= 200, `${g.id} has a short grace: ${g.graceMs}`);
    else assert.equal(g.graceMs, undefined, `${g.id} accepts the first touch at once`);
  }
});
