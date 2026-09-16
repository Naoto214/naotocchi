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

test('protected failure has no game energy, decline or life damage, ordinary preserves insurance',()=>{
  const {h,s}=setup();
  s.items.c_safety=1;
  h.api.useConsumableItem('c_safety');
  const life=s.deathMeter;
  play(h,0);
  assert.equal(s.energy,90);
  assert.equal(s.decline,0);
  assert.equal(s.deathMeter,life);
  assert.equal(s.oneTimeBoosts.safetyNet,false);
  s.oneTimeBoosts.safetyNet=true;
  play(h,50);
  assert.equal(s.energy,78);
  assert.equal(s.oneTimeBoosts.safetyNet,true);
});

test('great charm waits for real seventy and awards growth 28 or 56',()=>{
  for(const boost of [0,100]){const {h,s}=setup('glasses');
    s.items.c_mgbig=1;
    h.api.useConsumableItem('c_mgbig');
    play(h,60);
    assert.equal(s.oneTimeBoosts.greatReward,true);
    s.sodachi=80;
    s.maxSodachi=80;
    s.growth=0;
    s.boostTicks=boost;
    play(h,70);
    assert.equal(s.sodachi,boost?81:80);
    assert.equal(s.growth,boost?24:28);
    assert.equal(s.oneTimeBoosts.greatReward,false);
  }
});

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

test('life patch bought into bag, allowed at life forty and during warning, only once per life',()=>{
  const {h,s}=setup();
  s.lifetime.money=320;
  assert.equal(h.api.buyConsumableItem('new_life_patch'),true);
  s.deathMeter=59;
  assert.equal(h.api.useConsumableItem('new_life_patch'),false);
  s.deathMeter=90;
  s.health=95;
  s.dying=true;
  s.dyingTicks=30;
  assert.equal(h.api.useConsumableItem('new_life_patch'),true);
  assert.equal(s.deathMeter,60);
  assert.equal(s.health,100);
  assert.equal(s.dying,false);
  h.api.buyConsumableItem('new_life_patch');
  assert.equal(h.api.useConsumableItem('new_life_patch'),false);
  assert.equal(h.api.itemStock('new_life_patch'),1);
});

test('life patch rejects egg dead farewell and infinite',()=>{
  for(const stage of ['egg','dead','farewell','growing']){const {h,s}=setup();
    s.stage=stage;
    s.infinite=stage==='growing';
    s.deathMeter=80;
    s.items.new_life_patch=1;
    assert.equal(h.api.useConsumableItem('new_life_patch'),false);
    assert.equal(h.api.itemStock('new_life_patch'),1);
  }
});

test('mirror bag and transform controls reroll one excluding every shown candidate; cancellation is free',()=>{
  const {h,s}=setup();
  s.lifetime.money=160;
  h.api.buyConsumableItem('new_transform_mirror');
  s.transformOptions=['cat','bird'];
  h.api.useConsumableItem('new_transform_mirror');
  h.api.closePicker();
  assert.equal(h.api.itemStock('new_transform_mirror'),1);
  h.api.useConsumableItem('new_transform_mirror');
  h.api.resolvePickerSelection('cat');
  assert.equal(h.api.itemStock('new_transform_mirror'),0);
  assert.equal(s.transformOptions[1],'bird');
  assert.ok(!['dog','cat','bird','ren'].includes(s.transformOptions[0]));
  h.api.buyConsumableItem('new_transform_mirror');
  assert.equal(h.api.useConsumableItem('new_transform_mirror'),false);
  assert.equal(h.api.itemStock('new_transform_mirror'),1);
});

test('mirror cannot spend if no legal alternative or selected candidate has disappeared',()=>{
  const {h,s}=setup();
  s.items.new_transform_mirror=1;
  s.transformOptions=[...h.api.normalLines];
  h.api.useConsumableItem('new_transform_mirror');
  h.api.resolvePickerSelection('cat');
  assert.equal(h.api.itemStock('new_transform_mirror'),1);
  s.transformOptions=['cat','bird'];
  h.api.useConsumableItem('new_transform_mirror');
  s.transformOptions=null;
  h.api.resolvePickerSelection('cat');
  assert.equal(h.api.itemStock('new_transform_mirror'),1);
});

test('retired crown snapshot cannot reduce failed-game life damage',()=>{
  const {h,s}=setup('crown');
  s.deathMeter=0;
  h.api.startMinigame(game('crown-snapshot'));
  s.lifetime.equippedItemId=null;
  h.api.finishMinigame(0);
  assert.equal(s.deathMeter,2);
});

test('mirror actual transform button opens cancellable candidate picker',()=>{
  const {h,s}=setup();
  s.items.new_transform_mirror=1;
  s.transformOptions=['cat','bird'];
  h.api.render();
  const b=h.get('transformChoices').children.find(x=>x.textContent==='こかがみをつかう');
  assert.ok(b);
  h.dispatch(b,'click');
  assert.match(h.get('pickerGrid').innerHTML,/data-picker-value="cat"/);
  h.api.closePicker();
  assert.equal(s.items.new_transform_mirror,1);
});

test('failed and invalid completion retain great charm and interrupted games do not arm scores',()=>{
  const {h,s}=setup();
  s.items.c_mgbig=1;
  h.api.useConsumableItem('c_mgbig');
  play(h,0);
  assert.equal(s.oneTimeBoosts.greatReward,true);
  assert.equal(s.decline,8);
  h.api.startMinigame(game('abort'));
  h.api.finishMinigame(NaN);
  h.api.retireMinigame();
  assert.equal(s.oneTimeBoosts.greatReward,true);
  assert.equal(s.lifetime.minigameRecords.abort,undefined);
  assert.equal(s.items.reward,undefined);
});

test('saved reservations survive reload and life limits reset',()=>{
  const {h,s}=setup();
  s.items.c_mgbig=1;
  h.api.useConsumableItem('c_mgbig');
  s.itemLife.crownUsed=true;
  s.itemLife.lifePatchUsed=true;
  const n=reload(s),r=n.api.state();
  assert.equal(r.oneTimeBoosts.greatReward,true);
  assert.equal(r.itemLife.crownUsed,true);
  n.dispatch(n.get('resetBtn'),'click');
  assert.equal(Object.hasOwn(n.api.state().itemLife,'crownUsed'),false);
  assert.equal(n.api.state().itemLife.lifePatchUsed,false);
  assert.equal(n.api.state().oneTimeBoosts.greatReward,false);
});

test('life patch works at exactly forty life and cannot postpone age one hundred',()=>{
  const {h,s}=setup();
  s.items.new_life_patch=2;
  s.deathMeter=60;
  s.health=20;
  assert.equal(h.api.useConsumableItem('new_life_patch'),true);
  assert.equal(s.deathMeter,30);
  assert.equal(s.health,40);
  s.itemLife.lifePatchUsed=false;
  s.ageTicks=2000;
  s.deathMeter=80;
  assert.equal(h.api.useConsumableItem('new_life_patch'),false);
  assert.equal(s.items.new_life_patch,1);
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

test('disease shield shows the prevented illness and remaining two uses',()=>{
  const {h,s}=setup();
  s.items.c_sickshield=1;
  h.api.useConsumableItem('c_sickshield');
  s.hunger=10;
  vm.runInContext('Math.random=()=>0',h.sandbox);
  h.api.tick();
  assert.equal(s.isSick,false);
  assert.equal(s.oneTimeBoosts.sicknessShieldCount,2);
  assert.match(h.api.getMessage(),/ふせいだ.*2/);
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
