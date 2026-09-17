const assert = require('node:assert/strict');
const {test} = require('node:test');
const I = require('../item-system.js');
const clone = value => JSON.parse(JSON.stringify(value));

test('final consumable catalog publishes exactly the twelve approved products', () => {
  const expected = {
    c_coin2:['ラッキーコイン',300,'ルーレットでコインがもらえる。'], c_life:['いのちのくすり',300,'いのちを満タンにする。'],
    c_time_back:['ときのチケット・まえ',300,'ひとつ前の姿に5分だけ変わる。'], c_time_forward:['ときのチケット・あと',300,'ひとつ後の姿に5分だけ変わる。'],
    c_life_charm:['いのちのおまもり',1000,'死んでしまうとき、1回だけ助かる。'], c_friend:['おともだちチケット',3000,'好きな未加入のなかまを呼べる。'],
    c_match:['おみあいチケット',3000,'恋愛できる相手を1人選んで呼べる。'], c_transform:['へんしんチケット',6000,'3つの候補から、好きな姿にへんしんできる。'],
    c_rare_friend:['レアなかまチケット',8000,'好きな未加入のレアなかまを呼べる。'], c_egg_normal:['ふしぎなたまご',8000,'次の人生が、まだ育てていない通常種族になる。'],
    c_egg_rare:['レアなたまご',10000,'次の人生が、まだ育てていないレア種族になる。'], c_dex:['ずかんチケット',10000,'好きな姿を選んで、5分だけへんしんできる。'],
  };
  const actual = Object.fromEntries(Object.entries(I.CATALOG).filter(([id,v]) => id !== 'new_themed_pack' && v.kind === 'consumable' && v.price !== null)
    .map(([id,v]) => [id,[v.label,v.price,v.desc]]));
  assert.deepEqual(actual,expected);
  assert.equal(I.CATALOG.new_themed_pack?.label,'テーマシールパック');
  assert.equal(I.CATALOG.c_dex.guard,'未発見を含む通常種族と8種のレア種族の姿から選び、実種族の判定は変えない。');
});

test('legacy stock converts or refunds once before retired IDs are filtered', () => {
  const s={lifetime:{money:10,itemInventory:{c_safety:2,new_life_patch:3,new_transform_mirror:1},dreamEggs:{normal:2,rare:1}},oneTimeBoosts:{safetyNet:true},itemLife:{}};
  I.normalize(s);
  assert.equal(s.lifetime.money,150);
  assert.equal(I.stock(s,'c_life'),3);assert.equal(I.stock(s,'c_egg_normal'),2);assert.equal(I.stock(s,'c_egg_rare'),1);
  assert.deepEqual(s.lifetime.dreamEggs,{});assert.equal(s.lifetime.itemMigrations.consumablesV2,true);assert.equal(s.lifetime.itemMigrations.dreamEggsV2,true);
  I.normalize(s);assert.equal(s.lifetime.money,150);
});

test('every retired stock ID refunds its old unit price and purchase history adds nothing', () => {
  const prices={c_safety:20,c_mgsmall:40,c_mgbig:120,c_sickshield:60,c_growth:90,c_courtsmall:50,c_breakhalf:60,c_breakfull:100,c_travel:70,new_transform_mirror:80};
  for(const [id,price] of Object.entries(prices)){
    const s={lifetime:{money:7,itemInventory:{[id]:2},itemPurchases:{[id]:99}}};I.normalize(s);
    assert.equal(s.lifetime.money,7+price*2,id);assert.equal(s.lifetime.itemInventory[id],undefined,id);
  }
});

test('authoritative lifetime bag prevents live and snapshot copies from duplicating refunds', () => {
  const s={items:{c_safety:90,new_life_patch:90},lifetime:{money:0,itemInventory:{c_safety:2,new_life_patch:3},dreamEggs:{normal:1}},
    infiniteReturn:{items:{c_safety:2,new_life_patch:3},lifetime:{dreamEggs:{normal:1}}}};
  I.normalize(s);assert.equal(s.lifetime.money,40);assert.equal(I.stock(s,'c_life'),3);assert.equal(I.stock(s,'c_egg_normal'),1);assert.equal(s.items,s.lifetime.itemInventory);
});

test('invalid counts and unsafe sums cannot create unsafe money or stock', () => {
  const s={lifetime:{money:Number.MAX_SAFE_INTEGER-10,itemInventory:{c_safety:1,c_mgsmall:0,c_mgbig:-1,c_sickshield:1.5,c_growth:'2',new_life_patch:Number.MAX_SAFE_INTEGER,c_life:1},dreamEggs:{normal:Number.MAX_SAFE_INTEGER,rare:Infinity}}};
  I.normalize(s);assert.equal(s.lifetime.money,Number.MAX_SAFE_INTEGER-10);assert.equal(I.stock(s,'c_life'),1);
  assert.equal(I.stock(s,'c_egg_normal'),Number.MAX_SAFE_INTEGER);assert.equal(I.stock(s,'c_egg_rare'),0);
});

test('deduplicates prepaid reservations across live and infinite snapshots', () => {
  const b={safetyNet:true,minigameBoost:'small',greatReward:true,courtBoost:'small',breakupShield:'half',travelGuarantee:true};
  const s={lifetime:{money:0,itemInventory:{}},oneTimeBoosts:clone(b),itemLife:{},infiniteReturn:{oneTimeBoosts:{...clone(b),minigameBoost:'big',breakupShield:'full'},itemLife:{}}};
  I.normalize(s);assert.equal(s.lifetime.money,20+40+120+50+60+70);
  for(const snapshot of [s,s.infiniteReturn]) assert.deepEqual(snapshot.oneTimeBoosts,{});
  I.normalize(s);assert.equal(s.lifetime.money,360);
});

test('separately paid small and great minigame reservations refund both once', () => {
  // f94 runtime: buy/use c_mgsmall then c_mgbig debits 40+120 and
  // consumes both stocks, leaving these two independent unused effects.
  const paidPair={minigameBoost:'small',greatReward:true};
  for (const [live,returned] of [
    [paidPair,{}], [paidPair,paidPair], [{},paidPair],
    [paidPair,{minigameBoost:'big',greatReward:true}],
    [{minigameBoost:'big',greatReward:true},paidPair],
  ]) {
    const s={lifetime:{money:840,itemInventory:{}},oneTimeBoosts:clone(live),itemLife:{},
      infiniteReturn:{oneTimeBoosts:clone(returned),itemLife:{}}};
    I.normalize(s);assert.equal(s.lifetime.money,1000,JSON.stringify([live,returned]));
    assert.deepEqual(s.oneTimeBoosts,{});assert.deepEqual(s.infiniteReturn.oneTimeBoosts,{});
    assert.equal(I.stock(s,'c_mgsmall'),0);assert.equal(I.stock(s,'c_mgbig'),0);
    I.normalize(s);assert.equal(s.lifetime.money,1000);
    const reloaded=clone(s);I.normalize(reloaded);assert.equal(reloaded.lifetime.money,1000);
  }
});

test('one logical minigame reservation refunds only its highest evidenced tier', () => {
  for(const [live,returned,want] of [
    [{minigameBoost:'small'},{},40],
    [{minigameBoost:'small'},{minigameBoost:'big'},120],
    [{minigameBoost:'small'},{greatReward:true},120],
    [{minigameBoost:'big',greatReward:true},{minigameBoost:'small'},120],
  ]){
    const s={lifetime:{money:0,itemInventory:{}},oneTimeBoosts:live,itemLife:{},infiniteReturn:{oneTimeBoosts:returned,itemLife:{}}};
    I.normalize(s);assert.equal(s.lifetime.money,want,JSON.stringify([live,returned]));
  }
});

test('pending funded reservations add no refund beyond their bag stock', () => {
  const ids=['c_safety','c_mgsmall','c_mgbig','c_courtsmall','c_breakhalf','c_travel'];
  const s={lifetime:{money:0,itemInventory:Object.fromEntries(ids.map(id=>[id,1]))},oneTimeBoosts:{safetyNet:true,minigameBoost:'small',greatReward:true,courtBoost:'small',breakupShield:'half',travelGuarantee:true},itemLife:{pendingItems:Object.fromEntries(ids.map(id=>[id,true]))}};
  I.normalize(s);assert.equal(s.lifetime.money,20+40+120+50+60+70);assert.deepEqual(s.itemLife.pendingItems,{});
});

test('active and partly used effects end without refund while a fully unused sickness shield refunds once', () => {
  for(const [remaining,want] of [[3,60],[2,0],[1,0]]){
    const s={lifetime:{money:0,itemInventory:{}},oneTimeBoosts:{sicknessShieldCount:remaining},itemLife:{relationshipShields:{old:true}},partner:{itemGraceUntil:999},boostTicks:77,infiniteReturn:{oneTimeBoosts:{sicknessShieldCount:remaining},itemLife:{relationshipShields:{old:true}},partner:{itemGraceUntil:999},boostTicks:77}};
    I.normalize(s);assert.equal(s.lifetime.money,want,`remaining ${remaining}`);assert.equal(s.oneTimeBoosts.sicknessShieldCount,undefined);assert.equal(s.infiniteReturn.oneTimeBoosts.sicknessShieldCount,undefined);
    assert.equal(s.itemLife.relationshipShields,undefined);assert.equal(s.infiniteReturn.itemLife.relationshipShields,undefined);assert.equal(s.partner.itemGraceUntil,undefined);assert.equal(s.infiniteReturn.partner.itemGraceUntil,undefined);assert.equal(s.boostTicks,0);assert.equal(s.infiniteReturn.boostTicks,0);
    s.boostTicks=55;I.normalize(s);assert.equal(s.boostTicks,55);
  }
});

test('a partially used sickness snapshot overrides a duplicate fully unused snapshot', () => {
  for(const [live,returned] of [[3,2],[2,3],[3,1],[1,3]]){
    const s={lifetime:{money:0,itemInventory:{}},oneTimeBoosts:{sicknessShieldCount:live},itemLife:{},infiniteReturn:{oneTimeBoosts:{sicknessShieldCount:returned},itemLife:{}}};
    I.normalize(s);assert.equal(s.lifetime.money,0,`${live} vs ${returned}`);
  }
});

test('old court-big compatibility pays 350 once and is cleared even with flags', () => {
  const fresh={lifetime:{money:4,itemInventory:{}},oneTimeBoosts:{courtBoost:'big'},infiniteReturn:{oneTimeBoosts:{courtBoost:'big'}}};
  I.normalize(fresh);assert.equal(fresh.lifetime.money,354);I.normalize(fresh);assert.equal(fresh.lifetime.money,354);
  const marked={lifetime:{money:4,itemInventory:{},itemSystemVersion:1,itemMigrations:{consumablesV2:true,dreamEggsV2:true}},oneTimeBoosts:{courtBoost:'big'}};
  I.normalize(marked);assert.equal(marked.lifetime.money,4);assert.equal(marked.oneTimeBoosts.courtBoost,undefined);
});

test('reserved dream species survives conversion and reload-shaped normalization', () => {
  const s={lifetime:{money:0,itemInventory:{},dreamEggs:{normal:2,rare:1},nextEggLine:'dog',nextEggKind:'normal'},itemLife:{}};I.normalize(s);
  assert.equal(s.lifetime.nextEggLine,'dog');assert.equal(s.lifetime.nextEggKind,'normal');assert.equal(I.stock(s,'c_egg_normal'),2);assert.equal(I.stock(s,'c_egg_rare'),1);
  const reloaded=clone(s);I.normalize(reloaded);assert.equal(reloaded.lifetime.nextEggLine,'dog');assert.equal(I.stock(reloaded,'c_egg_normal'),2);
});

test('already migrated saves and return snapshots clear obsolete effects without credit', () => {
  const s={lifetime:{money:9,itemInventory:{c_life:2},dreamEggs:{normal:4},itemMigrations:{consumablesV2:true,dreamEggsV2:true}},oneTimeBoosts:{safetyNet:true,greatReward:true},itemLife:{pendingItems:{c_travel:true}},boostTicks:12,infiniteReturn:{items:{c_safety:8},oneTimeBoosts:{travelGuarantee:true},itemLife:{pendingItems:{c_safety:true}},boostTicks:13}};
  I.normalize(s);assert.equal(s.lifetime.money,9);assert.equal(I.stock(s,'c_life'),2);assert.deepEqual(s.oneTimeBoosts,{});assert.deepEqual(s.infiniteReturn.oneTimeBoosts,{});
  assert.deepEqual(s.itemLife.pendingItems,{});assert.deepEqual(s.infiniteReturn.itemLife.pendingItems,{});assert.equal(s.boostTicks,12);assert.equal(s.infiniteReturn.boostTicks,13);
  assert.deepEqual(s.lifetime.dreamEggs,{});assert.deepEqual(s.infiniteReturn.items,{});
});

test('a funded old Lucky pending item is cleared without duplicating its bag stock', () => {
  const s={lifetime:{money:0,itemInventory:{c_coin2:2},itemMigrations:{consumablesV2:true,dreamEggsV2:true}},oneTimeBoosts:{doubleCoins:true},itemLife:{pendingItems:{c_coin2:true}}};
  I.normalize(s);assert.equal(I.stock(s,'c_coin2'),2);assert.equal(s.oneTimeBoosts.doubleCoins,undefined);assert.equal(s.itemLife.pendingItems.c_coin2,undefined);
});

test('malformed migration markers cannot skip conversion', () => {
  for(const marker of [false,0,'true',{},null]){
    const s={lifetime:{money:0,itemInventory:{c_safety:1},dreamEggs:{rare:1},itemMigrations:{consumablesV2:marker,dreamEggsV2:marker}}};
    I.normalize(s);assert.equal(s.lifetime.money,20);assert.equal(I.stock(s,'c_egg_rare'),1);
    assert.equal(s.lifetime.itemMigrations.consumablesV2,true);assert.equal(s.lifetime.itemMigrations.dreamEggsV2,true);
  }
});
