const assert = require('node:assert/strict');
const { test } = require('node:test');
const { harness } = require('./helpers/runtime-harness.cjs');

function living() {
  const h = harness(), s = h.api.state();
  Object.assign(s, { stage:'growing', ageTicks:500, deathMeter:75, health:23,
    hunger:7, energy:11, isSick:true, dying:true, dyingTicks:12 });
  return { h, s };
}

test('life medicine refills only life and can be used again after life falls', () => {
  const { h, s } = living();
  s.items.c_life = 2;
  assert.equal(h.api.useConsumableItem('c_life'), true);
  assert.equal(s.deathMeter, 0); assert.equal(s.dying, false); assert.equal(s.dyingTicks, 0);
  assert.deepEqual({health:s.health,hunger:s.hunger,energy:s.energy,isSick:s.isSick},
    {health:23,hunger:7,energy:11,isSick:true});
  assert.equal(h.api.itemStock('c_life'), 1);
  s.deathMeter = 42;
  assert.equal(h.api.useConsumableItem('c_life'), true);
  assert.equal(s.deathMeter, 0); assert.equal(h.api.itemStock('c_life'), 0);
});

test('life medicine at full life or outside a living finite life does not consume', () => {
  for (const state of [
    {stage:'growing',deathMeter:0,infinite:false}, {stage:'egg',deathMeter:50,infinite:false},
    {stage:'dead',deathMeter:50,infinite:false}, {stage:'farewell',deathMeter:50,infinite:false},
    {stage:'growing',deathMeter:50,infinite:true},
  ]) {
    const { h, s } = living(); Object.assign(s, state); s.items.c_life = 1;
    assert.equal(h.api.useConsumableItem('c_life'), false, JSON.stringify(state));
    assert.equal(h.api.itemStock('c_life'), 1, JSON.stringify(state));
  }
});

test('life charm automatically prevents actual death without changing its causes', () => {
  const { h, s } = living(); s.items.c_life_charm = 2;
  Object.assign(s, {deathMeter:100,dying:true,dyingTicks:0});
  const causes = {health:s.health,hunger:s.hunger,energy:s.energy,isSick:s.isSick};
  assert.equal(h.api.checkMeters(), true);
  assert.equal(s.stage, 'growing'); assert.equal(s.deathMeter, 0);
  assert.equal(s.dying, false); assert.equal(s.dyingTicks, 0); assert.equal(s.lifetime.deaths, 0);
  assert.equal(s.lifeLog.some(e => /てんごく/.test(e.text)), false);
  assert.deepEqual({health:s.health,hunger:s.hunger,energy:s.energy,isSick:s.isSick}, causes);
  assert.equal(h.api.itemStock('c_life_charm'), 1);
  Object.assign(s, {deathMeter:100,dying:true,dyingTicks:0}); h.api.checkMeters();
  assert.equal(s.stage, 'growing'); assert.equal(h.api.itemStock('c_life_charm'), 0);
  Object.assign(s, {deathMeter:100,dying:true,dyingTicks:0}); h.api.checkMeters();
  assert.equal(s.stage, 'dead'); assert.equal(s.lifetime.deaths, 1);
});

test('life charm waits through grace and is never spent for farewell or infinity', () => {
  const { h, s } = living(); s.items.c_life_charm = 3;
  Object.assign(s, {deathMeter:100,dying:true,dyingTicks:4});
  assert.equal(h.api.checkMeters(), false); assert.equal(h.api.itemStock('c_life_charm'), 3);
  s.stage='farewell'; s.dyingTicks=0;
  assert.equal(h.api.checkMeters(), false); assert.equal(h.api.itemStock('c_life_charm'), 3);
  Object.assign(s, {stage:'growing',infinite:true,deathMeter:100});
  assert.equal(h.api.checkMeters(), false); assert.equal(h.api.itemStock('c_life_charm'), 3);
});

test('life charm is automatic and has no manual use control', () => {
  const { h, s } = living(); s.items.c_life_charm = 1;
  assert.equal(h.api.useConsumableItem('c_life_charm'), false);
  h.api.renderItemOverlay();
  assert.doesNotMatch(h.get('onetimeItemGrid').innerHTML, /data-item-action="use" data-id="c_life_charm"/);
  assert.equal(h.api.itemStock('c_life_charm'), 1);
});

test('retired consumables have no sale, use, or active-effect behavior', () => {
  const { h, s } = living();
  const retired=['c_safety','c_mgsmall','c_mgbig','c_sickshield','c_growth',
    'c_courtsmall','c_breakhalf','c_breakfull','c_travel','new_life_patch','new_transform_mirror'];
  s.lifetime.money=100000;
  Object.assign(s.oneTimeBoosts,{safetyNet:true,minigameBoost:'big',greatReward:true,
    sicknessShieldCount:3,courtBoost:'small',breakupShield:'full',travelGuarantee:true});
  for(const id of retired) {
    s.items[id]=2;
    assert.equal(h.api.buyConsumableItem(id),false,id);
    assert.equal(h.api.useConsumableItem(id),false,id);
  }
  const before={energy:s.energy,deathMeter:s.deathMeter,decline:s.decline,growth:s.growth};
  h.api.startMinigame({id:'legacy-effect-probe',start(c){c.innerHTML='<div></div>'; }},{intro:false});
  h.api.finishMinigame(0);
  assert.equal(s.energy,Math.max(0,before.energy-12));
  assert.equal(s.deathMeter,before.deathMeter+2);
  assert.equal(s.decline,before.decline+8);
  assert.equal(s.growth,before.growth);
  h.api.renderItemOverlay();
  for(const id of retired) assert.doesNotMatch(h.get('onetimeItemGrid').innerHTML,new RegExp(`data-id="${id}"`));
});
