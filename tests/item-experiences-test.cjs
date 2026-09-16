const assert = require('node:assert/strict');
const {test} = require('node:test');
const vm = require('node:vm');
const items = require('../item-system.js');
const {harness} = require('./helpers/runtime-harness.cjs');
const retired = ['fun_candy','fun_bubbles','fun_balloon','fun_fireworks','fun_camera','fun_musicbox','fun_surprise'];
test('retirement refunds stock and tool ownership exactly once, never history or duplicate reservations', () => {
  const s = {items:{fun_candy:2,fun_bubbles:3,fun_balloon:4,fun_fireworks:5,fun_camera:9,c_safety:2},itemLife:{balloon:{readyAt:10},candyUntil:20},lifetime:{money:17,itemSystemVersion:1,ownedTools:['fun_camera','fun_camera','fun_musicbox','fun_surprise'],ownedConsumableItems:['fun_candy'],itemPurchases:{fun_candy:100,c_safety:2}}};
  items.normalize(s);
  assert.equal(s.lifetime.money,3292); // 17 + 20 + 75 + 140 + 300 + 900 + 1200 + 600 + 40 retired safety stock
  assert.equal(s.items.c_safety,undefined);
  assert.ok(retired.every(id => !Object.hasOwn(s.items,id)));
  assert.equal(s.itemLife.balloon,undefined);
  assert.equal(s.itemLife.candyUntil,undefined);
  assert.equal(s.lifetime.itemPurchases.c_safety,undefined);
  assert.equal(s.lifetime.itemPurchases.fun_candy,undefined);
  assert.equal(s.lifetime.funItemsRetiredVersion,1);
  items.normalize(s);const again=JSON.parse(JSON.stringify(s));items.normalize(again);assert.equal(again.lifetime.money,3292);
  assert.equal(s.lifetime.money,3292);
});
test('legacy tool use counts as ownership only before the original item migration', () => {
  for (const [version,want] of [[undefined,2705],[1,5]]) {
    const s={items:{fun_candy:-2,fun_bubbles:1.5,fun_balloon:'3',fun_fireworks:NaN},lifetime:{money:5,itemSystemVersion:version,ownedConsumableItems:['fun_camera','fun_musicbox','fun_surprise','fun_fireworks']}};
    items.normalize(s);assert.equal(s.lifetime.money,want);
  }
});
test('retirement preserves shared memories and cooldowns while removing fun-only records and sticker placements', () => {
  const s={lifetime:{money:0,itemMemories:{letters:[{key:'letter'}],lights:[{key:'light'}],photos:[{key:'photo'}],tunes:[{key:'tune'}],reactions:[{key:'crown'}],specials:[{key:'travel:1',event:'travel-detour'},{key:'date:1'},{key:'fireworks:2'},{itemId:'fun_fireworks'}]},itemProgress:{ticks:8,readyAt:{lantern:20,musicbox:80,surprise:99}},stickers:{owned:{'item:fun_camera':3,'item:flower':1},seen:['item:fun_camera','item:flower'],pages:{one:[{id:'item:fun_camera'},{id:'item:flower'}]}}}};
  items.normalize(s);
  assert.deepEqual(Object.keys(s.lifetime.itemMemories).sort(),['letters','lights','specials']);
  assert.equal(s.lifetime.itemMemories.specials.length,2);
  assert.deepEqual(s.lifetime.itemProgress.readyAt,{lantern:20});
  assert.deepEqual(s.lifetime.stickers.pages.one,[{id:'item:flower'}]);
  assert.deepEqual(s.lifetime.stickers.seen,['item:flower']);
  assert.equal(s.lifetime.stickers.owned['item:fun_camera'],undefined);
});
test('retired items cannot be bought, granted, used or selected as stickers; equipment completion ignores stale ids', () => {
  const h=harness(),s=h.api.state();s.lifetime.money=9999;
  for(const id of retired){assert.equal(h.api.buyConsumableItem(id),false);assert.equal(items.grant(s,id),false);assert.equal(h.api.useConsumableItem(id),false);assert.equal(h.api.stickerById('item:'+id),null);}
  h.api.renderItemOverlay();assert.ok(!h.get('onetimeItemGrid').innerHTML.includes('fun_'));
  const achievement=h.api.achievements.find(a=>a.id==='item-all');
  s.lifetime.ownedShopItems=Array(100).fill('obsolete');assert.equal(achievement.condition(s.lifetime),false);
  s.lifetime.ownedShopItems=h.api.SHOP_ITEMS.map(i=>i.id);assert.equal(achievement.condition(s.lifetime),true);
  assert.ok(!h.api.achievements.some(a=>a.id==='consumable-all'));
});
test('refund survives reload, new lives and infinite return without reviving old reservations', () => {
  const seed=JSON.parse(JSON.stringify(harness().api.state()));delete seed.lifetime.funItemsRetiredVersion;
  seed.lifetime.money=4;seed.lifetime.itemInventory={fun_camera:2,fun_balloon:1};seed.items=seed.lifetime.itemInventory;
  seed.itemLife.balloon={readyAt:1};seed.infiniteReturn=JSON.parse(JSON.stringify(seed));seed.infinite=true;
  const storage={getItem:k=>k==='naotocchi-save-v1'?JSON.stringify(seed):null,setItem(){},removeItem(){}};
  const h=harness({resume:true,storage});assert.equal(h.api.state().lifetime.money,939);
  h.api.exitInfinite();assert.equal(h.api.state().lifetime.money,939);assert.equal(h.api.state().itemLife.balloon,undefined);
  h.dispatch(h.get('resetBtn'),'click');assert.equal(h.api.state().lifetime.money,939);
  items.normalize(h.api.state());assert.equal(h.api.state().lifetime.money,939);
});
test('great games and offline visits retain ordinary rewards without granting retired items', () => {
  const h=harness(),s=h.api.state();vm.runInContext('Math.random=()=>0',h.sandbox);s.lifetime.money=0;
  h.api.startMinigame({id:'retirement-test',start(){}},{intro:false});h.api.finishMinigame(80);
  assert.ok(s.lifetime.money>0);assert.ok(retired.every(id=>!s.items[id]));
  s.savedAt=1000-60*60*1000;const before=s.lifetime.money;
  const result=h.api.applyOfflineProgress(1000);assert.equal(result.coins,12);assert.equal(s.lifetime.money,before+12);assert.ok(retired.every(id=>!s.items[id]));
});

test('infinite snapshots and retired achievement metadata are cleared without extra compensation', () => {
  const s={items:{fun_balloon:2},lifetime:{money:0,achievementUnlockedAt:{'consumable-all':123,'shop-1':234}},infiniteReturn:{items:{fun_balloon:2,c_safety:1},itemLife:{balloon:{readyAt:10}},achievementsUnlocked:['consumable-all','shop-1']}};
  items.normalize(s);
  assert.equal(s.lifetime.money,70);
  assert.deepEqual(s.infiniteReturn.items,{});
  assert.equal(s.infiniteReturn.itemLife.balloon,undefined);
  assert.deepEqual(s.infiniteReturn.achievementsUnlocked,['shop-1']);
  assert.deepEqual(s.lifetime.achievementUnlockedAt,{'shop-1':234});
});
