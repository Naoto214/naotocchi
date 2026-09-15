const assert = require('node:assert/strict');
const { test } = require('node:test');
const vm = require('node:vm');
const { harness } = require('./helpers/runtime-harness.cjs');

const game = id => ({ id, start(c) { c.innerHTML = '<div></div>'; } });

function setup(equipped) {
  const h = harness();
  const s = h.api.state();
  Object.assign(s.lifetime, {
    equippedItemId: equipped || null,
    weatherMode: 'sunny',
    timeMode: 'day',
    seasonMode: 'spring',
  });
  Object.assign(s, {
    regionId: 'home',
    hunger: 80,
    happiness: 80,
    energy: 80,
    growth: 0,
    decline: 0,
    recentActionTicks: 0,
  });
  vm.runInContext('Math.random=()=>0.99', h.sandbox);
  return { h, s };
}

function play(h, score = 50, id = 'probe') {
  h.api.startMinigame(game(id), { intro: false });
  h.api.finishMinigame(score);
}

function partner(h, s) {
  const source = h.api.REGIONS.flatMap(r => r.candidates || [])[0];
  s.partner = JSON.parse(JSON.stringify({ ...source, affection: 25, bondCount: 0, married: false }));
  return s.partner;
}

test('V2 backpack makes ordinary travel cost zero hunger and zero energy while fatigue still applies', () => {
  const { h, s } = setup('travel1');
  s.travelStreak = 100;
  const before = { energy: s.energy, hunger: s.hunger, happiness: s.happiness };
  h.api.travelToRegion(h.api.REGIONS.find(r => r.id === 'forest'));
  assert.equal(s.regionId, 'forest');
  assert.equal(s.energy, before.energy);
  assert.equal(s.hunger, before.hunger);
  assert.equal(s.happiness, before.happiness - 3);
});

test('V2 star badge doubles only the ordinary minigame success coin payout', () => {
  const base = setup();
  const star = setup('star');
  const baseMoney = base.s.lifetime.money;
  const starMoney = star.s.lifetime.money;
  play(base.h, 50, 'ordinary-base');
  play(star.h, 50, 'ordinary-star');
  assert.equal(base.s.lifetime.money - baseMoney, 2);
  assert.equal(star.s.lifetime.money - starMoney, 4);
  assert.equal(star.s.lifetime.itemProgress.starGames.length, 0);
});

test('V2 love letter restores partner affection to max at the danger threshold', () => {
  const { h, s } = setup('partner1');
  const p = partner(h, s);
  h.api.decayRelationship();
  assert.equal(s.partner, p);
  assert.equal(p.affection, 100);
});

test('V2 friend badge restores companion bond to max at the danger threshold', () => {
  const { h, s } = setup('bond1');
  const c = h.api.normalCompanions[0];
  s.companions = [{ id: c.id, bond: 25 }];
  h.api.decayCompanionBonds();
  assert.equal(s.companions.length, 1);
  assert.equal(s.companions[0].bond, 100);
});
