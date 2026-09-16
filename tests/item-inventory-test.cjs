const assert = require('node:assert/strict');
const {test} = require('node:test');
const {harness} = require('./helpers/runtime-harness.cjs');
function reload(s) {
  return harness({resume:true,storage:{getItem:key => key === 'naotocchi-save-v1' ? JSON.stringify(s) : null,setItem(){},removeItem(){}}});
}
const game = {id:'inventory-probe',start(c){c.innerHTML='<div></div>';}};
test('dedicated reward inventory is retired and legacy reward stock is discarded', () => {
  const h=harness(),m=h.sandbox.NaotocchiItems;
  assert.equal(m.CATALOG.reward,undefined);
  const s=JSON.parse(JSON.stringify(h.api.state()));s.items.reward=3;s.lifetime.itemInventory=s.items;
  const n=reload(s).api.state();
  assert.equal(n.items.reward,undefined);
});
test('milestones are fixed and paid once even after spending', () => {
  const h=harness(),s=h.api.state();s.lifetime.money=0;s.maxSodachi=100;
  h.api.onSodachiMilestone(100);assert.equal(s.lifetime.money,800);
  s.lifetime.money=0;h.api.onSodachiMilestone(100);assert.equal(s.lifetime.money,0);
});
test('ordinary completion pays thirty coins', () => {
  const h=harness(),s=h.api.state();s.lifetime.money=0;
  h.api.startMinigame(game,{intro:false});h.api.finishMinigame(50);assert.equal(s.lifetime.money,30);
});
test('daily completion adds one Lucky inventory without a reservation', () => {
  const h=harness(),s=h.api.state();s.items.c_coin2=2;
  h.api.startDaily(game);h.api.finishMinigame(50);
  assert.equal(s.items.c_coin2,3);assert.equal(s.oneTimeBoosts.doubleCoins,undefined);
});
test('invalid stock cannot be spent and normalization does not create wealth', () => {
  const s=JSON.parse(JSON.stringify(harness().api.state()));s.lifetime.money=5;s.items={fun_candy:-5,c_growth:NaN,unknown:999};
  delete s.lifetime.itemInventory;delete s.lifetime.itemSystemVersion;
  const h=reload(s),n=h.api.state();h.api.useConsumableItem('c_growth');
  assert.equal(n.lifetime.money,5);assert.equal(n.lifetime.consumablesUsed,0);assert.equal(n.items.unknown,undefined);
  assert.equal(n.items.fun_candy || 0,0);assert.equal(n.items.c_growth || 0,0);
});
test('module validates transactions and persists cooldowns and structured memories', () => {
  const m=harness().sandbox.NaotocchiItems;assert.ok(m,'inventory module is loaded');
  const s={items:{c_life:2},lifetime:{money:8}};m.normalize(s);
  assert.equal(m.take(s,'c_life',-1),false);assert.equal(m.take(s,'c_life',3),false);
  assert.equal(m.take(s,'c_life'),true);m.grant(s,'c_life',2);assert.equal(m.stock(s,'c_life'),3);
  m.cooldown(s,'lantern',2);assert.equal(m.ready(s,'lantern'),false);m.advance(s);
  const n=JSON.parse(JSON.stringify(s));m.advance(n);assert.equal(m.ready(n,'lantern'),true);
  const r=m.remember(n,'lights',{key:'photo-1',age:40,environment:{weather:'snow'}});
  assert.equal(r.age,40);assert.equal(n.lifetime.itemMemories.lights[0].environment.weather,'snow');
  assert.equal(m.stock(n,'toString'),0);assert.equal(m.take(n,'__proto__'),false);assert.equal(n.lifetime.money,8);
});
test('normal equipment catalog contains only the final ten products', () => {
  const catalog=harness().sandbox.NaotocchiItems.CATALOG;
  const ids=['poop1','sleepboost1','bowtie','ribbon','scarf','travel1','partner1','bond1','gamepass1','star'];
  assert.deepEqual(Object.keys(catalog).filter(id=>catalog[id].kind==='equipment').sort(),[...ids].sort());
});

const normalEquipmentPrices={
  poop1:1000,sleepboost1:3000,bowtie:3000,ribbon:3000,scarf:3000,
  travel1:3000,partner1:5000,bond1:5000,gamepass1:8000,star:10000,
};
const normalEquipmentDescriptions={
  poop1:'うんちが3個たまると、自動できれいにする。',
  sleepboost1:'ねると、すぐに元気が満タンになる。',
  bowtie:'おなかがへると、自動で満タンにする。',
  ribbon:'ごきげんが下がると、自動で満タンにする。',
  scarf:'病気になると、自動で治してくれる。',
  travel1:'たびで、おなかと元気が減らなくなる。',
  partner1:'こいびとの仲良し度が下がると、自動で満タンにする。',
  bond1:'なかまの仲良し度が下がると、自動で満タンにする。',
  gamepass1:'ミニゲームを遊ばず、通常成功にできる。',
  star:'通常ミニゲームでもらえるコインが3倍になる。',
};
for(const [id,price] of Object.entries(normalEquipmentPrices)){
  test(`normal equipment ${id} has its final catalog price and shop price`,()=>{
    const h=harness();
    assert.equal(h.sandbox.NaotocchiItems.CATALOG[id]?.price,price,`${id} catalog price`);
    h.api.openExclusiveMenu('item');h.api.render();
    const button=h.get('shopItemGrid').innerHTML.match(new RegExp(`<button\\b[^>]*data-id="${id}"[^>]*>[\\s\\S]*?<\\/button>`))?.[0];
    assert.ok(button,`${id} is for sale`);
    const status=button.match(/<span class="shop-item-status">([^<]+)<\/span>/)?.[1];
    assert.equal(status?.replaceAll(',',''),`💰${price}`,`${id} displayed price`);
  });
  test(`normal equipment ${id} has its final catalog and shop description`,()=>{
    const h=harness(),desc=normalEquipmentDescriptions[id];
    assert.equal(h.sandbox.NaotocchiItems.CATALOG[id]?.desc,desc,`${id} catalog description`);
    h.api.openExclusiveMenu('item');h.api.render();
    const button=h.get('shopItemGrid').innerHTML.match(new RegExp(`<button\\b[^>]*data-id="${id}"[^>]*>[\\s\\S]*?<\\/button>`))?.[0];
    assert.ok(button,`${id} is for sale`);
    assert.ok(button.includes(`<span class="shop-item-desc">${desc}</span>`),`${id} displayed description`);
  });
}

test('normal equipment V2 retains all nine continuing IDs with no price difference charged', () => {
  const ids=['poop1','sleepboost1','bowtie','ribbon','scarf','travel1','partner1','bond1','star'];
  for(const equippedItemId of ids){
    const state=reload({schemaVersion:5,stage:'egg',lifetime:{money:41,ownedShopItems:ids,equippedItemId}}).api.state();
    assert.deepEqual([...state.lifetime.ownedShopItems],ids);
    assert.equal(state.lifetime.equippedItemId,equippedItemId);
    assert.equal(state.lifetime.money,41);
    assert.equal(state.lifetime.itemMigrations.normalEquipmentV2,true);
    assert.equal(state.lifetime.ownedShopItems.includes('gamepass1'),false);
  }
});
