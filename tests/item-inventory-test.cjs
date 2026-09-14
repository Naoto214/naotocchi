const assert = require('node:assert/strict');
const {test} = require('node:test');
const {harness} = require('./helpers/runtime-harness.cjs');
function reload(s) {
  return harness({resume:true,storage:{getItem:key => key === 'naotocchi-save-v1' ? JSON.stringify(s) : null,setItem(){},removeItem(){}}});
}
const game = {id:'inventory-probe',start(c){c.innerHTML='<div></div>';}};
test('buy stores a drink without arming; only the whole five minutes can be used', () => {
  const h=harness(),s=h.api.state(); s.lifetime.money=100;s.boostTicks=101;
  h.api.buyConsumableItem('c_growth');
  assert.equal(s.lifetime.money,10);assert.equal(h.api.itemStock('c_growth'),1);
  h.api.useConsumableItem('c_growth');assert.equal(h.api.itemStock('c_growth'),1);
  s.boostTicks=100;h.api.useConsumableItem('c_growth');
  assert.equal(s.boostTicks,200);assert.equal(h.api.itemStock('c_growth'),0);
});
test('new life preserves unused stock and drops active effects', () => {
  const h=harness(),s=h.api.state();s.items.fun_candy=3;s.items.reward=2;s.items.c_safety=1;s.oneTimeBoosts.doubleCoins=true;
  h.dispatch(h.get('resetBtn'),'click'); const n=h.api.state();
  assert.equal(n.items.fun_candy,3);assert.equal(n.items.reward,2);assert.equal(n.items.c_safety,1);
  assert.equal(n.oneTimeBoosts.doubleCoins,false);assert.equal(n.items,n.lifetime.itemInventory);
});
test('legacy tools migrate stock and used history with spare scenes', () => {
  const s=JSON.parse(JSON.stringify(harness().api.state()));s.items.fun_camera=3;s.lifetime.ownedConsumableItems=['fun_musicbox'];
  delete s.lifetime.itemSystemVersion;delete s.lifetime.itemInventory;
  const n=reload(s).api.state();
  assert.ok(n.lifetime.ownedTools?.includes('fun_camera'));assert.ok(n.lifetime.ownedTools.includes('fun_musicbox'));
  assert.equal(n.items.fun_camera || 0,0);assert.equal(n.lifetime.itemExtraScenes.fun_camera,2);
});
test('legacy use history keeps every unused scene for the same permanent tool', () => {
  const s=JSON.parse(JSON.stringify(harness().api.state()));
  s.items.fun_camera=3;s.lifetime.ownedConsumableItems=['fun_camera'];
  delete s.lifetime.itemSystemVersion;delete s.lifetime.itemInventory;
  const n=reload(s).api.state();
  assert.ok(n.lifetime.ownedTools.includes('fun_camera'));
  assert.equal(n.items.fun_camera || 0,0);
  assert.equal(n.lifetime.itemExtraScenes.fun_camera,3);
  const again=reload(n).api.state();
  assert.equal(again.lifetime.itemExtraScenes.fun_camera,3);
  assert.equal(again.lifetime.ownedTools.filter(id=>id==='fun_camera').length,1);
});
test('big court reservation refunds 350 exactly once through reload', () => {
  const s=harness().api.state();s.lifetime.money=17;s.oneTimeBoosts.courtBoost='big';s.oneTimeBoosts.sicknessShieldCount=2;
  delete s.lifetime.itemSystemVersion;
  const n=reload(s).api.state();assert.equal(n.lifetime.money,367);assert.equal(n.oneTimeBoosts.courtBoost,null);
  assert.equal(n.oneTimeBoosts.sicknessShieldCount,2);assert.equal(reload(n).api.state().lifetime.money,367);
});
test('milestones are fixed and paid once even after spending', () => {
  const h=harness(),s=h.api.state();s.lifetime.money=0;s.maxSodachi=100;
  h.api.onSodachiMilestone(100);assert.equal(s.lifetime.money,800);
  s.lifetime.money=0;h.api.onSodachiMilestone(100);assert.equal(s.lifetime.money,0);
});
test('ordinary completion pays two coins', () => {
  const h=harness(),s=h.api.state();s.lifetime.money=0;
  h.api.startMinigame(game,{intro:false});h.api.finishMinigame(50);assert.equal(s.lifetime.money,2);
});
test('daily completion adds lucky inventory even with a reservation', () => {
  const h=harness(),s=h.api.state();s.items.c_coin2=2;s.oneTimeBoosts.doubleCoins=true;
  h.api.startDaily(game);h.api.finishMinigame(50);
  assert.equal(s.items.c_coin2,3);assert.equal(s.oneTimeBoosts.doubleCoins,true);
});
test('invalid stock cannot be spent and normalization does not create wealth', () => {
  const s=JSON.parse(JSON.stringify(harness().api.state()));s.lifetime.money=5;s.items={fun_candy:-5,c_growth:NaN,unknown:999};
  delete s.lifetime.itemInventory;delete s.lifetime.itemSystemVersion;
  const h=reload(s),n=h.api.state();h.api.useItem('fun_candy');h.api.useConsumableItem('c_growth');
  assert.equal(n.lifetime.money,5);assert.equal(n.lifetime.consumablesUsed,0);assert.equal(n.items.unknown,undefined);
  assert.equal(n.items.fun_candy || 0,0);assert.equal(n.items.c_growth || 0,0);
});
test('module validates transactions and persists cooldowns and structured memories', () => {
  const m=harness().sandbox.NaotocchiItems;assert.ok(m,'inventory module is loaded');
  const s={items:{fun_candy:2},lifetime:{money:8}};m.normalize(s);
  assert.equal(m.take(s,'fun_candy',-1),false);assert.equal(m.take(s,'fun_candy',3),false);
  assert.equal(m.take(s,'fun_candy'),true);m.grant(s,'fun_candy',2);assert.equal(m.stock(s,'fun_candy'),3);
  m.grant(s,'fun_camera');assert.equal(m.ownsTool(s,'fun_camera'),true);assert.equal(m.stock(s,'fun_camera'),0);
  m.cooldown(s,'camera',2);assert.equal(m.ready(s,'camera'),false);m.advance(s);
  const n=JSON.parse(JSON.stringify(s));m.advance(n);assert.equal(m.ready(n,'camera'),true);
  const r=m.remember(n,'photos',{key:'photo-1',age:40,environment:{weather:'snow'}});
  assert.equal(r.age,40);assert.equal(n.lifetime.itemMemories.photos[0].environment.weather,'snow');
  assert.equal(m.stock(n,'toString'),0);assert.equal(m.take(n,'__proto__'),false);assert.equal(n.lifetime.money,8);
});
test('bag buttons buy stock and then activate, with egg and full-cap guards', () => {
  const h=harness(),s=h.api.state();s.lifetime.money=100;h.api.openExclusiveMenu('item');
  const grid=h.get('onetimeItemGrid');
  const click=(id,action) => {
    const button=grid.children.find(b=>b.dataset.id===id && b.dataset['item-action']===action);
    assert.ok(button, `${action} button for ${id}`);
    button.dataset.itemAction=action;button.closest=()=>button;
    grid.listeners.find(l=>l.type==='click').fn({target:button});
  };
  click('c_safety','buy');assert.equal(s.lifetime.money,80);assert.equal(s.items.c_safety,1);assert.equal(s.oneTimeBoosts.safetyNet,false);
  assert.equal(s.lifetime.itemPurchases?.c_safety,1);assert.equal(s.lifetime.consumablesUsed,0);
  click('c_safety','use');assert.equal(s.items.c_safety || 0,0);assert.equal(s.oneTimeBoosts.safetyNet,true);
  s.items.c_growth=1;s.stage='egg';assert.equal(h.api.useConsumableItem('c_growth'),false);assert.equal(s.items.c_growth,1);
  s.stage='growing';s.sodachi=100;assert.equal(h.api.useConsumableItem('c_growth'),false);assert.equal(s.items.c_growth,1);
});
test('tool purchase stays owned, and infinite return shares inventory and activity time', () => {
  const h=harness(),s=h.api.state();s.lifetime.money=1000;
  assert.equal(h.api.buyConsumableItem('fun_camera'),true);assert.equal(s.lifetime.money,100);
  assert.equal(h.api.buyConsumableItem('fun_camera'),false);h.api.useItem('fun_camera');h.api.useItem('fun_camera');
  assert.equal(s.lifetime.consumablesUsed,0);assert.ok(s.lifetime.ownedConsumableItems.includes('fun_camera'));
  s.items.fun_candy=3;h.api.enterInfinite();h.api.tick();s.items.fun_candy=2;h.api.exitInfinite();
  const n=h.api.state();assert.equal(n.items.fun_candy,2);assert.equal(n.items,n.lifetime.itemInventory);assert.equal(n.lifetime.itemProgress.ticks,1);
});
