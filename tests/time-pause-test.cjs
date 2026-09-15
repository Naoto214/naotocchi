const assert = require('node:assert/strict');
const { test } = require('node:test');
const { harness } = require('./helpers/runtime-harness.cjs');

// せわが できない がめんが ひらいている あいだは、じかん(tick)が すすまない
// ことを たしかめる。めぐっている あいだに おなかが へって しんでしまう、
// ゲームちゅうに としを とる、へんしんを えらんでいる あいだに よわる、
// といった ことが おきない ように する

function living(h, extra = {}) {
  const s = h.api.state();
  Object.assign(s, { stage: 'growing', isSleeping: false, isSick: false, energy: 60, health: 100, hunger: 60, happiness: 60, speciesLine: 'dog', stageIndex: 4, ageTicks: 500, transformOptions: null, ...extra });
  s.petKey = `dog:${h.api.currentFormStageIndex()}`;
  s.discoveredStages = [s.petKey, 'cat:2', 'penguin:3'];
  s.regionId = 'forest';
  h.api.render();
  return s;
}
function snapshot(s) { return { ageTicks: s.ageTicks, hunger: s.hunger, happiness: s.happiness, energy: s.energy }; }
function loops(h, n) { for (let i = 0; i < n; i++) h.api.loop(); }

test('the clock runs on the home screen but stops while めぐる is open, and resumes after returning', () => {
  const h = harness(); const s = living(h);
  const before = snapshot(s);
  loops(h, 3);
  assert.equal(s.ageTicks, before.ageTicks + 3, 'time passes on the plain home screen');
  assert.ok(s.hunger < before.hunger, 'hunger decays on the home screen');
  const atStart = snapshot(s);
  assert.equal(h.api.startMeguru(), true);
  assert.equal(h.api.isTimePaused(), true);
  loops(h, 40);
  assert.deepEqual(snapshot(s), atStart, 'nothing ages or decays while exploring');
  assert.equal(s.stage, 'growing');
  h.api.stopMeguru();
  assert.equal(h.api.isTimePaused(), false);
  loops(h, 2);
  assert.equal(s.ageTicks, atStart.ageTicks + 2, 'time resumes after coming home');
});

test('a starving pet cannot die while exploring, only once it is back home', () => {
  const h = harness(); const s = living(h, { hunger: 1, happiness: 1, health: 3, energy: 1 });
  assert.equal(h.api.startMeguru(), true);
  loops(h, 200);
  assert.equal(s.stage, 'growing', 'still alive after a long walk');
  assert.equal(s.health, 3, 'health did not move while exploring');
  h.api.stopMeguru();
  assert.equal(s.stage, 'growing');
});

test('the clock stops during a minigame and during quick mode, and resumes when the game ends', () => {
  const h = harness(); const s = living(h);
  const atStart = snapshot(s);
  h.api.startMinigame({ id: 'pause-probe', name: 'probe', start() {} });
  assert.equal(h.api.isTimePaused(), true);
  loops(h, 30);
  assert.deepEqual(snapshot(s), atStart, 'no aging or decay while a minigame owns the screen');
  h.api.retireMinigame();
  h.advance(7000);
  assert.equal(h.api.isTimePaused(), false);
  loops(h, 2);
  assert.equal(s.ageTicks, atStart.ageTicks + 2);
  if (h.api.QUICK_RUN) {
    const again = snapshot(s);
    h.api.startQuickRun();
    if (h.api.isTimePaused()) {
      loops(h, 10);
      assert.equal(s.ageTicks, again.ageTicks, 'quick mode is a minigame: paused too');
      h.api.retireMinigame();
      h.advance(7000);
    }
  }
});

test('the clock stops while the transformation choice is open, and resumes after choosing to stay', () => {
  const h = harness(); const s = living(h);
  s.transformOptions = ['cat'];
  h.api.render();
  assert.equal(h.get('transformOverlay').classList.contains('hidden'), false, 'the choice screen is showing');
  assert.equal(h.api.isTimePaused(), true);
  const atStart = snapshot(s);
  loops(h, 30);
  assert.deepEqual(snapshot(s), atStart, 'no decay while choosing a new form');
  h.dispatch(h.get('transformSkipBtn'), 'click');
  assert.equal(s.transformOptions, null);
  assert.equal(h.api.isTimePaused(), false);
  loops(h, 1);
  assert.equal(s.ageTicks, atStart.ageTicks + 1);
});

test('every menu overlay kind pauses the clock and closing it resumes', () => {
  const h = harness(); const s = living(h);
  for (const kind of ['menu', 'dex', 'ach', 'theme', 'profile', 'comm', 'item', 'world', 'travel', 'sticker']) {
    h.api.openExclusiveMenu(kind);
    assert.equal(h.api.overlayState(), kind, kind + ' opens');
    assert.equal(h.api.isTimePaused(), true, kind + ' pauses time');
    const at = snapshot(s);
    loops(h, 5);
    assert.deepEqual(snapshot(s), at, kind + ': nothing changes while open');
    h.api.closeAllMenuOverlays(); h.api.render();
    assert.equal(h.api.isTimePaused(), false, kind + ' closed resumes');
  }
  loops(h, 1);
  assert.equal(s.ageTicks, 501);
});

test('while めぐる is open no companion invitation, idle chatter or care notice is layered over it, and menus refuse to open', () => {
  const h = harness(); const s = living(h);
  s.lifetime.companionsRecruited = [];
  s.companions = [];
  h.sandbox.Math = Object.create(Math); h.sandbox.Math.random = () => 0;
  assert.equal(h.api.startMeguru(), true);
  assert.equal(h.api.isAnyMenuOverlayOpen(), true, 'めぐる counts as an open screen');
  // なかまの さそい・でんせつとの であい は めぐるちゅう には おきない
  h.advance(300000);
  assert.equal(h.get('companionInviteOverlay').classList.contains('hidden'), true, 'no invitation while exploring');
  assert.equal(h.api.meguruActive(), true, 'still exploring');
  h.api.openExclusiveMenu('menu');
  assert.equal(h.api.overlayState(), null, 'menus stay closed while exploring');
  assert.equal(h.get('meguruOverlay').classList.contains('hidden'), false);
  // Escape で めぐるを とじる(ハーネスの そざいは 'hidden' を もたないので、
  // さいしょから とじている「やりなおし」の かくにん がめんを とじた あつかいに する)
  for (const id of ['wipeConfirmOverlay', 'wipeOverlay', 'lifeCardOverlay']) h.get(id).classList.add('hidden');
  h.dispatch(h.document, 'keydown', { key: 'Escape' });
  assert.equal(h.api.meguruActive(), false, 'Escape closes めぐる');
  assert.equal(h.get('screenNormal').classList.contains('hidden'), false);
});

test('the clock also stays stopped for date, duel, companion invitation and the grand goal celebration screens', () => {
  const h = harness(); const s = living(h);
  const at = snapshot(s);
  s.partner = { id: 'forest_bear', label: 'もりのくま', emoji: '🐻', affection: 50, married: false };
  h.api.goOnDate?.();
  if (h.api.isDateOpen && h.api.isDateOpen()) {
    loops(h, 5);
    assert.deepEqual(snapshot(s), at, 'nothing changes while a date is open');
    h.api.closeDateOverlay();
  }
  h.api.closeAllMenuOverlays(); h.api.render();
  assert.equal(h.api.isTimePaused(), false);
});
