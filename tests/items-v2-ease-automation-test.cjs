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

test('V2 star badge triples only the ordinary minigame success coin payout', () => {
  const base = setup();
  const star = setup('star');
  const baseMoney = base.s.lifetime.money;
  const starMoney = star.s.lifetime.money;
  play(base.h, 50, 'ordinary-base');
  play(star.h, 50, 'ordinary-star');
  assert.equal(base.s.lifetime.money - baseMoney, 30);
  assert.equal(star.s.lifetime.money - starMoney, 90);
  assert.equal(star.s.lifetime.itemProgress.starGames, undefined);
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


test('retired star and reunion state is discarded without changing companion records', () => {
  const { h, s } = setup('star');
  s.lifetime.itemProgress.starGames = ['a', 'b', 'c'];
  Object.assign(s.lifetime.itemProgress.readyAt, { star: 100, reunion: 200, lantern: 300 });
  s.itemLife.departedCompanions = ['shiba'];
  s.lifetime.companionsRecruited = ['shiba'];
  h.api.ITEM_SYSTEM.normalize(s);
  assert.equal(s.lifetime.itemProgress.starGames, undefined);
  assert.equal(s.lifetime.itemProgress.readyAt.star, undefined);
  assert.equal(s.lifetime.itemProgress.readyAt.reunion, undefined);
  assert.equal(s.lifetime.itemProgress.readyAt.lantern, undefined);
  assert.equal(s.itemLife.departedCompanions, undefined);
  assert.deepEqual(Array.from(s.lifetime.companionsRecruited), ['shiba']);
});

test('friend badge no longer offers a reunion game or retired lantern actions', () => {
  const { h, s } = setup('bond1');
  s.lifetime.ownedNaotoItems = ['naoto_lantern'];
  s.lifetime.regionsVisited = ['home'];
  h.api.renderItemOverlay();
  assert.doesNotMatch(h.get('itemRelationActions').innerHTML, /再会|さいかい|reunion/);
  assert.doesNotMatch(h.get('itemRelationActions').innerHTML, /lantern/);
});

test('social equipment preserves ordinary decay and does not automate relationship decisions or award records', () => {
  for (const id of ['partner1', 'bond1']) {
    const base = setup(); const equipped = setup(id);
    for (const { h, s } of [base, equipped]) {
      partner(h, s).affection = 80;
      s.partner.mismatched = true; s.partner.repair = 1;
      s.companions = [{ id: h.api.normalCompanions[0].id, bond: 80 }];
      h.api.decayRelationship(); h.api.decayCompanionBonds();
    }
    assert.equal(equipped.s.partner.affection, base.s.partner.affection);
    assert.equal(equipped.s.companions[0].bond, base.s.companions[0].bond);
    const records = JSON.stringify({ actions: equipped.s.actionCounts, recruited: equipped.s.lifetime.companionsRecruited, achievements: equipped.s.achievementsUnlocked, letters: equipped.s.lifetime.itemMemories.letters });
    equipped.s.partner.affection = 25; equipped.s.companions[0].bond = 25;
    equipped.h.api.decayRelationship(); equipped.h.api.decayCompanionBonds();
    assert.equal(equipped.s.partner.mismatched, true);
    assert.equal(equipped.s.partner.repair, 1);
    assert.equal(equipped.s.partner.married, false);
    assert.equal(JSON.stringify({ actions: equipped.s.actionCounts, recruited: equipped.s.lifetime.companionsRecruited, achievements: equipped.s.achievementsUnlocked, letters: equipped.s.lifetime.itemMemories.letters }), records);
  }
});

test('star badge triples great-result coins and leaves failed-result at zero', () => {
  for (const [score, baseCoins, starCoins] of [[0,0,0], [90,60,180]]) {
    const base = setup(); const star = setup('star');
    for (const {s} of [base,star]) Object.assign(s,{stage:'growing',sodachi:80,maxSodachi:80,growth:0});
    const beforeBase=base.s.lifetime.money, beforeStar=star.s.lifetime.money;
    play(base.h, score); play(star.h, score);
    assert.equal(base.s.lifetime.money-beforeBase,baseCoins);
    assert.equal(star.s.lifetime.money-beforeStar,starCoins);
  }
});

for(const id of ['energy1','crown']) test(`retired ${id} does not soften ordinary care decay`,()=>{
  const base=setup(),retired=setup(id);
  for(const {h,s} of [base,retired]) {
    Object.assign(s,{isSick:true,health:20,hunger:20,happiness:20,deathMeter:10});
    h.api.tick();
  }
  assert.equal(retired.s.energy,base.s.energy);
  assert.equal(retired.s.deathMeter,base.s.deathMeter);
});
