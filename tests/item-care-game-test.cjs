const assert = require('node:assert/strict');
const {test} = require('node:test');
const vm = require('node:vm');
const {harness} = require('./helpers/runtime-harness.cjs');
const game = id => ({id, start(c){c.innerHTML='<div></div>';}});
function setup(equip) {
  const h=harness(),s=h.api.state();
  Object.assign(s.lifetime, {equippedItemId:equip, weatherMode:'sunny', timeMode:'day', seasonMode:'spring'});
  Object.assign(s, {regionId:'home', growth:0, decline:0, recentActionTicks:0});
  vm.runInContext('Math.random=()=>0.99',h.sandbox);
  return {h,s};
}
function play(h,score=50,id='probe'){h.api.startMinigame(game(id),{intro:false});h.api.finishMinigame(score);}
function reload(s){return harness({resume:true,storage:{getItem:k=>k==='naotocchi-save-v1'?JSON.stringify(s):null,setItem(){},removeItem(){}}});}
function ticks(h,n){for(let i=0;i<n;i++)h.api.tick();}

test('retired hat uses the ordinary transform rate and needs four games',()=>{
  const {h,s}=setup('hat');
  for (let i=0;i<3;i++)play(h);
  assert.equal(s.transformMeter,75);
  assert.ok(!s.transformOptions);
  play(h);
  assert.ok(s.transformOptions);
  assert.equal(s.lifetime.transforms,0);
});

for(const id of ['hat','energy1','glasses','crown','flower']) {
  test(`retired ${id} has no game effect in a start snapshot`,()=>{
    for(const score of [20,60]) {
      const base=setup(),retired=setup(id);
      for(const {h,s} of [base,retired]) {
        h.api.startMinigame(game('snapshot'));
        s.lifetime.equippedItemId=null;
        h.api.finishMinigame(score);
      }
      for(const key of ['energy','growth','sodachi','happiness','transformMeter','deathMeter','minigameScoreSum'])
        assert.equal(retired.s[key],base.s[key],`${key} at score ${score}`);
      assert.equal(retired.s.lifetime.money,base.s.lifetime.money);
      assert.equal(retired.s.lifetime.minigameRecords.snapshot.last,score);
      assert.doesNotMatch(retired.h.api.getMessage(),/げんきバンド|ごほうび判定/);
    }
  });
}

test('retired crown cannot rescue zero health but the existing miracle still works',()=>{
  const {h,s}=setup('crown');
  assert.equal(Object.hasOwn(s.itemLife,'crownUsed'),false);
  Object.assign(s,{isSick:true,health:0,lowHealthStreak:14,deathMeter:0,miracleGuard:true});
  h.api.tick();
  assert.equal(s.health,40);
  assert.equal(s.miracleGuard,false);
  assert.equal(s.lowHealthStreak,0);
  assert.equal(Object.hasOwn(s.itemLife,'crownUsed'),false);
  // A loaded legacy field is inert even when it says rescue was unused.
  s.itemLife.crownUsed=false;
  s.health=0;s.lowHealthStreak=14;
  h.api.tick();
  assert.equal(s.stage,'dead');
  assert.equal(s.itemLife.crownUsed,false);
});

test('crown does not bypass normal two minute life warning or rescue life death',()=>{
  const {h,s}=setup('crown');
  s.deathMeter=100;
  s.dying=true;
  s.dyingTicks=40;
  h.api.checkMeters();
  assert.notEqual(s.stage,'dead');
  assert.equal(s.dyingTicks,40);
  s.deathMeter=100;
  s.dyingTicks=0;
  h.api.checkMeters();
  assert.equal(s.stage,'dead');
  assert.equal(Object.hasOwn(s.itemLife,'crownUsed'),false);
});

test('retired crown snapshot cannot reduce failed-game life damage',()=>{
  const {h,s}=setup('crown');
  s.deathMeter=0;
  h.api.startMinigame(game('crown-snapshot'));
  s.lifetime.equippedItemId=null;
  h.api.finishMinigame(0);
  assert.equal(s.deathMeter,2);
});

test('star pays ordinary success immediately and never adds a delayed set reward',()=>{
  const {h,s}=setup();
  s.lifetime.money=10000;
  h.api.buyOrEquipShopItem('star');
  play(h,30,'a');
  play(h,30,'b');
  play(h,30,'c');
  s.lifetime.itemProgress.ticks=99;
  h.api.tick();
  assert.equal(s.lifetime.money,270);
  assert.equal(s.lifetime.itemProgress.starGames,undefined);
  assert.equal(s.lifetime.itemProgress.readyAt.star,undefined);
});

test('star menu describes immediate ordinary-success coins without stamp or waiting UI', () => {
  const {h,s} = setup();
  s.lifetime.money = 10000;
  h.api.buyOrEquipShopItem('star');
  h.api.openExclusiveMenu('item');
  const status = () => h.get('shopItemGrid').children.find(b => b.dataset.id === 'star').textContent;
  assert.match(status(), /通常.*コイン.*3倍/);
  assert.doesNotMatch(status(), /星[0-3]\/3|あと.*種類|受取|300秒/);
  h.api.closeAllMenuOverlays();
  const cash = s.lifetime.money;
  play(h,40,'star-first');
  assert.equal(s.lifetime.money, cash + 90);
  h.api.openExclusiveMenu('item');
  assert.match(status(), /みにつけている/);
  assert.doesNotMatch(status(), /星[0-3]\/3|受取/);
});

// Isolate game coins from growth milestones and daily bonuses.
for (const [score, coins] of [[0,0],[29,0],[30,30],[69,30],[70,60],[100,60]]) {
  for (const [atStart, atFinish, multiplier] of [[null,null,1],['star',null,3],[null,'star',1]]) {
    test(`ordinary score ${score}, equipment ${atStart} -> ${atFinish} pays ${coins * multiplier}`, () => {
      const {h,s}=setup(atStart);
      Object.assign(s,{stage:'growing',sodachi:80,maxSodachi:80,growth:0});
      const before=s.lifetime.money;
      h.api.startMinigame(game('ordinary-snapshot'),{intro:false});
      s.lifetime.equippedItemId=atFinish;
      h.api.finishMinigame(score);
      assert.equal(s.lifetime.money-before,coins * multiplier);
    });
  }
}
for (const id of ['quick-run','quick-solo']) {
  for (const [score,coins] of [[0,0],[50,2],[70,13]]) {
    for (const equipment of [null,'star']) test(`${id} score ${score} retains base ${coins} with ${equipment}`,()=>{
      const {h,s}=setup(equipment);
      Object.assign(s,{stage:'growing',sodachi:80,maxSodachi:80,growth:0});
      const before=s.lifetime.money;
      play(h,score,id);
      assert.equal(s.lifetime.money-before,coins);
    });
  }
}

function passSetup(){
  const {h,s}=setup('gamepass1');
  Object.assign(s,{sodachi:80,maxSodachi:80,growth:0,happiness:40,decline:10,transformMeter:0});
  h.api.render();
  return {h,s};
}
test('game pass applies exactly ordinary score-50 care and 30 coins without starting a game',()=>{
  const {h,s}=passSetup();
  const before=s.lifetime.money;
  let started=false;
  assert.equal(h.api.tryStartPlay({id:'pass-probe',noIntro:true,start(){started=true;}}),true);
  assert.equal(started,false);
  assert.equal(s.energy,78);
  assert.equal(s.happiness,55);
  assert.equal(s.growth,7);
  assert.equal(s.decline,7);
  assert.equal(s.transformMeter,30);
  assert.equal(s.lifetime.money-before,30);
});
test('game pass preserves all real-play records, consumable reservations and Lucky stock',()=>{
  const {h,s}=passSetup();
  s.items.c_coin2=3;
  Object.assign(s.oneTimeBoosts,{minigameBoost:'big',greatReward:true,safetyNet:true});
  s.boostTicks=100;
  const snapshot=()=>JSON.stringify([s.actionCounts,s.lifetime.minigameRecords,s.lifetime.minigamePlayCounts,s.lifetime.envPlays,s.minigameScoreSum,s.minigameCount,s.lifetime.minigamesPlayed,s.lifeLog,s.lifetime.achievements,s.lifetime.dailyChallenge,s.lifetime.stickers,s.oneTimeBoosts,s.items]);
  h.api.checkMeters();
  h.api.saveState();
  const before=snapshot(),cash=s.lifetime.money;
  h.dispatch(h.get('playBtn'),'click');
  assert.equal(s.lifetime.money-cash,30);
  assert.equal(snapshot(),before);
  assert.equal(s.growth,14,'existing growth multiplier still applies');
  assert.equal(s.boostTicks,100);
  assert.equal(s.oneTimeBoosts.doubleCoins,undefined);
});
