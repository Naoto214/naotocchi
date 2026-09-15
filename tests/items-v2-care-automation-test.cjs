const assert = require('node:assert/strict');
const {test} = require('node:test');
const vm = require('node:vm');
const {harness} = require('./helpers/runtime-harness.cjs');

function setup(equip) {
  const h = harness(), s = h.api.state();
  Object.assign(s.lifetime, {
    equippedItemId: equip || null,
    weatherMode: 'sunny',
    timeMode: 'day',
    seasonMode: 'spring',
  });
  Object.assign(s, {
    regionId: 'home',
    hunger: 80,
    happiness: 80,
    energy: 80,
    health: 100,
    growth: 0,
    decline: 0,
    recentActionTicks: 0,
  });
  vm.runInContext('Math.random=()=>0.99', h.sandbox);
  return {h, s};
}

function tick(h, n = 1) {
  for (let i = 0; i < n; i += 1) h.api.tick();
}

test('V2 paper clears every poop at the danger threshold without manual-care credit', () => {
  const {h, s} = setup('poop1');
  s.poopCount = 3;
  const clean = s.actionCounts.clean;
  const growth = s.growth;
  tick(h);
  assert.equal(s.poopCount, 0);
  assert.equal(s.actionCounts.clean, clean);
  assert.equal(s.growth, growth);
});

test('V2 pillow makes sleep an immediate full-energy action', () => {
  const {h, s} = setup('sleepboost1');
  s.energy = 11;
  h.dispatch(h.get('sleepBtn'), 'click');
  assert.equal(s.isSleeping, true);
  assert.equal(s.energy, 100);
});

test('V2 bowtie automatically fills hunger when the normal danger band is reached', () => {
  const {h, s} = setup('bowtie');
  s.hunger = 25;
  tick(h);
  assert.equal(s.hunger, 100);
});

test('V2 ribbon automatically fills happiness when the normal danger band is reached', () => {
  const {h, s} = setup('ribbon');
  s.happiness = 25;
  tick(h);
  assert.equal(s.happiness, 100);
});

test('V2 disease equipment automatically cures sickness without pretending it was a manual medicine tap', () => {
  const {h, s} = setup('scarf');
  s.isSick = true;
  s.sicknessType = 'テストのびょうき';
  const manualMedicine = s.actionCounts.medicine;
  const cured = s.lifetime.sicknessCured;
  tick(h);
  assert.equal(s.isSick, false);
  assert.equal(s.sicknessType, null);
  assert.equal(s.actionCounts.medicine, manualMedicine);
  assert.equal(s.lifetime.sicknessCured, cured + 1);
});

test('V2 automation equipment no longer keeps the old passive percentage reductions', () => {
  const baseHunger = setup();
  const bowtie = setup('bowtie');
  baseHunger.s.hunger = bowtie.s.hunger = 80;
  tick(baseHunger.h); tick(bowtie.h);
  assert.equal(bowtie.s.hunger, baseHunger.s.hunger);

  const baseHappy = setup();
  const ribbon = setup('ribbon');
  baseHappy.s.happiness = ribbon.s.happiness = 80;
  tick(baseHappy.h); tick(ribbon.h);
  assert.equal(ribbon.s.happiness, baseHappy.s.happiness);

  const baseCold = setup();
  const scarf = setup('scarf');
  for (const x of [baseCold.s, scarf.s]) {
    x.lifetime.seasonMode = 'winter';
    x.lifetime.weatherMode = 'snow';
    x.hunger = 80;
    x.energy = 80;
  }
  tick(baseCold.h); tick(scarf.h);
  assert.equal(scarf.s.hunger, baseCold.s.hunger);
  assert.equal(scarf.s.energy, baseCold.s.energy);
});
