const assert = require('node:assert/strict');
const { test } = require('node:test');
const { harness } = require('./helpers/runtime-harness.cjs');

const hidden = (h, id) => h.get(id).classList.contains('hidden');

test('only one main overlay is open at a time', () => {
  const h = harness();
  assert.equal(h.api.overlayState(), null);
  assert.equal(h.api.isAnyMenuOverlayOpen(), false);
  h.api.openExclusiveMenu('dex');
  assert.equal(h.api.overlayState(), 'dex');
  assert.equal(hidden(h, 'dexOverlay'), false);
  h.api.openExclusiveMenu('ach');
  assert.equal(h.api.overlayState(), 'ach');
  assert.equal(hidden(h, 'dexOverlay'), true, 'opening another overlay closes the previous one');
  assert.equal(hidden(h, 'achOverlay'), false);
  assert.equal(h.api.isAnyMenuOverlayOpen(), true);
  h.api.closeAllMenuOverlays(); h.api.render();
  assert.equal(h.api.overlayState(), null);
  assert.equal(hidden(h, 'achOverlay'), true);
  assert.equal(h.api.isAnyMenuOverlayOpen(), false);
});

test('an unknown kind opens nothing and close buttons only close their own overlay', () => {
  const h = harness();
  h.api.openExclusiveMenu('nope');
  assert.equal(h.api.overlayState(), null);
  h.api.openExclusiveMenu('world');
  h.dispatch(h.get('menuCloseBtn'), 'click');
  assert.equal(h.api.overlayState(), 'world', 'the menu close button does not close the world screen');
  h.dispatch(h.get('worldCloseBtn'), 'click');
  assert.equal(h.api.overlayState(), null);
  assert.equal(hidden(h, 'worldOverlay'), true);
});

test('every overlay kind renders its own panel', () => {
  const h = harness();
  const panels = { menu: 'menuOverlay', dex: 'dexOverlay', ach: 'achOverlay', theme: 'themeOverlay', profile: 'profileOverlay', comm: 'commOverlay', item: 'itemOverlay', world: 'worldOverlay', travel: 'travelOverlay' };
  for (const [kind, id] of Object.entries(panels)) {
    h.api.openExclusiveMenu(kind);
    assert.equal(h.api.overlayState(), kind);
    for (const [k2, id2] of Object.entries(panels)) assert.equal(hidden(h, id2), k2 !== kind, `${id2} while ${kind} is open`);
  }
});

test('performance tiers step up on slow frames and back down after sustained fast frames', () => {
  const h = harness();
  assert.equal(h.api.perfTier(), 0);
  assert.equal(h.api.mgPerfDpr(), 2);
  for (let i = 0; i < 92; i++) { h.advance(26); h.api.mgPerfSample(); }
  assert.equal(h.api.perfTier(), 1, '26 ms average frames = tier 1');
  assert.equal(h.api.mgPerfDpr(), 1.5);
  assert.equal(h.api.mgPerfScale(), 0.65);
  for (let i = 0; i < 92; i++) { h.advance(36); h.api.mgPerfSample(); }
  assert.equal(h.api.perfTier(), 2, '36 ms average frames = tier 2');
  assert.equal(h.api.mgPerfDpr(), 1);
  for (let i = 0; i < 92 * 2; i++) { h.advance(10); h.api.mgPerfSample(); }
  assert.equal(h.api.perfTier(), 2, 'two fast windows are not enough to step down');
  for (let i = 0; i < 92; i++) { h.advance(10); h.api.mgPerfSample(); }
  assert.equal(h.api.perfTier(), 1, 'three fast windows step down one tier');
});
