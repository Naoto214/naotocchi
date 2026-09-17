const assert = require('node:assert/strict');
const {test} = require('node:test');
const vm = require('node:vm');
const {harness} = require('./helpers/runtime-harness.cjs');
const copy = value => JSON.parse(JSON.stringify(value));
const careFields = ['stage','speciesLine','stageIndex','ageTicks','hunger','happiness','energy','health',
  'sodachi','maxSodachi','growth','decline','boostTicks','recentActionTicks','deathMeter','dying','dyingTicks',
  'transformMeter','transformOptions','transformsThisLife','transformStageDone','affectionStreak','travelStreak',
  'partner','companions','traitCounts','isSick','sicknessType','poopCount','lifeLog'];
function care(s) { return copy(Object.fromEntries(careFields.map(key => [key,s[key]]))); }
function setup(options) {
  const h = harness(options), s = h.api.state();
  Object.assign(s,{sodachi:80,maxSodachi:80,growth:0,decline:17,happiness:43,energy:45,
    deathMeter:19,transformMeter:0,affectionStreak:4,travelStreak:3,recentActionTicks:7,boostTicks:11});
  h.api.setRandom(() => 0);
  h.api.saveState(); // Register the existing form before checking reward-only sticker changes.
  return h;
}
function date(h, day) {
  // Substitute only the calendar; the existing session clock still drives timers.
  h.sandbox.calendarDate = day;
  vm.runInContext(`if (!globalThis.OriginalDate) globalThis.OriginalDate = Date;
    Date = class extends OriginalDate { constructor(...args) { super(...(args.length ? args : [calendarDate + 'T12:00:00'])); } };`, h.sandbox);
}
function settleDaily(h, score = 30) {
  h.api.startMinigame(h.api.dailyChallengeGame(), {intro:false});
  h.api.finishMinigame(score);
}
function storage() {
  const values = new Map();
  return {getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,v),removeItem:k=>values.delete(k)};
}

for (const [solo,score,coins] of [[null,0,0],[null,30,0],[null,95,0],[null,100,100],['knock',100,0]]) {
  for (const equipment of [null,'star']) test(`Quick ${solo || 'mixed'} score ${score} pays ${coins} with ${equipment} and preserves care`, () => {
    const h=setup(),s=h.api.state();
    Object.assign(s.lifetime,{equippedItemId:equipment,weatherMode:'sunny',timeMode:'day',seasonMode:'spring'});
    const before=care(s),money=s.lifetime.money,stickers=copy(s.lifetime.stickers);
    assert.equal(h.api.startQuickRun(solo),true);
    assert.deepEqual(care(s),before,'starting Quick must preserve care');
    h.api.finishMinigame(score);
    assert.equal(s.lifetime.money-money,coins);
    assert.deepEqual(care(s),before,'finishing Quick must preserve care');
    assert.deepEqual(copy(s.lifetime.stickers),stickers,'Quick has no S-rank sticker');
    assert.equal(s.lifetime.minigamesPlayed,1);
    assert.equal(s.lifetime.minigameRecords[solo?'quick-solo':'quick-run'].last,score);
    assert.equal(h.api.itemStock('c_coin2'),0);
  });
}
for (const solo of [null,'knock']) test(`Quick ${solo || 'mixed'} starts at zero energy and quitting has no care or coin effect`,()=>{
  const h=setup(),s=h.api.state();s.energy=0;
  const before=care(s),money=s.lifetime.money;
  assert.equal(h.api.startQuickRun(solo),true);
  assert.deepEqual(care(s),before);
  h.api.retireMinigame();
  assert.deepEqual(care(s),before);
  assert.equal(s.lifetime.money,money);
});
test('Quick bypasses recruitment, story care, and meter processing even with a pending encounter',()=>{
  const h=setup(),s=h.api.state();
  const id=h.api.normalCompanions[0].id;
  h.api.setPendingCompanion(id);s.deathMeter=100;
  const before=care(s),recruited=copy(s.lifetime.companionsRecruited);
  h.api.startQuickRun();h.api.finishMinigame(100);
  assert.deepEqual(care(s),before);
  assert.deepEqual(copy(s.lifetime.companionsRecruited),recruited);
});
test('Quick session callback ignores duplicates and stale callbacks while a new run can settle',()=>{
  const h=setup(),s=h.api.state(),callbacks=[];
  const game={id:'quick-run',noIntro:true,start(container,done){callbacks.push(done);}};
  const money=s.lifetime.money;
  h.api.tryStartPlay(game);callbacks[0](100);callbacks[0](100);
  assert.equal(s.lifetime.money,money+100);
  h.api.tryStartPlay(game);callbacks[0](100);
  assert.equal(s.lifetime.money,money+100);
  callbacks[1](100);assert.equal(s.lifetime.money,money+200);
  assert.equal(s.lifetime.minigamesPlayed,2);
});

for (const [score,base,stock] of [[29,0,0],[30,30,1],[70,60,1],[100,60,1]]) {
  for (const equipment of [null,'star']) test(`designated daily score ${score}, ${equipment}: only ${base} ordinary base coins and Lucky ${stock}`,()=>{
    const h=setup(),s=h.api.state();date(h,'2026-09-16');s.lifetime.equippedItemId=equipment;
    const money=s.lifetime.money,boost=s.boostTicks,stickers=copy(s.lifetime.stickers);
    settleDaily(h,score);
    assert.equal(h.api.itemStock('c_coin2'),stock);
    assert.equal(s.lifetime.money-money,base*(equipment==='star'?3:1));
    assert.equal(s.boostTicks,boost,'daily award must not add a daily or S-rank boost');
    assert.deepEqual(copy(s.lifetime.stickers),stickers,'no daily or S-rank sticker');
    assert.equal(!!h.api.dailyChallengeToday(),!!stock);
    assert.equal(s.lifetime.dailyStreak,0);
    assert.equal(s.lifetime.dailyLastDate,null);
  });
}
for (const entry of ['daily-button','game-list']) test(`designated game completion from ${entry} grants once`,()=>{
  const h=setup(),s=h.api.state(),game=h.api.dailyChallengeGame();
  const grid=h.get('gameListGrid');
  grid.closest=selector=>selector===(entry==='daily-button'?'.daily-start':'.game-cell')?{dataset:{gameId:game.id}}:null;
  h.dispatch(grid,'click');h.api.finishMinigame(30);
  assert.equal(h.api.itemStock('c_coin2'),1);
  assert.equal(s.lifetime.dailyChallenge.gameId,game.id);
  settleDaily(h,30);assert.equal(h.api.itemStock('c_coin2'),1);
});
test('wrong game, quit, Quick and gamepass cannot claim a daily reward',()=>{
  for (const mode of ['wrong','quit','quick','gamepass']) {
    const h=setup(),s=h.api.state(),daily=h.api.dailyChallengeGame();
    if(mode==='wrong') {h.api.startMinigame(h.api.games.find(g=>g.id!==daily.id),{intro:false});h.api.finishMinigame(30);}
    if(mode==='quit') {h.api.startMinigame(daily,{intro:false});h.api.retireMinigame();}
    if(mode==='quick') {h.api.startQuickRun();h.api.finishMinigame(100);}
    if(mode==='gamepass') {s.lifetime.equippedItemId='gamepass1';h.api.tryStartPlay(daily);}
    assert.equal(h.api.itemStock('c_coin2'),0,mode);
    assert.equal(h.api.dailyChallengeToday(),null,mode);
  }
});
test('daily validates the designated ID on the settlement date across midnight',()=>{
  const h=setup();date(h,'2026-09-16');const yesterday=h.api.dailyChallengeGame();
  h.api.startMinigame(yesterday,{intro:false});date(h,'2026-09-17');
  assert.notEqual(h.api.dailyChallengeGame().id,yesterday.id);
  h.api.finishMinigame(30);assert.equal(h.api.itemStock('c_coin2'),0);
  settleDaily(h,30);assert.equal(h.api.itemStock('c_coin2'),1);
  assert.equal(h.api.state().lifetime.dailyChallenge.date,'2026-09-17');
});
test('same-date claim survives JSON reload, infinite mode and a new life; next date grants one anew',()=>{
  const saves=storage();let h=setup({storage:saves});date(h,'2026-09-16');
  settleDaily(h);assert.equal(h.api.itemStock('c_coin2'),1);
  h=harness({storage:saves,resume:true});date(h,'2026-09-16');
  settleDaily(h);assert.equal(h.api.itemStock('c_coin2'),1);
  h.api.enterInfinite();settleDaily(h);assert.equal(h.api.itemStock('c_coin2'),1);
  h.api.exitInfinite();settleDaily(h);assert.equal(h.api.itemStock('c_coin2'),1);
  h.dispatch(h.get('resetBtn'),'click');h.api.hatchEgg();
  settleDaily(h);assert.equal(h.api.itemStock('c_coin2'),1);
  date(h,'2026-09-17');settleDaily(h);assert.equal(h.api.itemStock('c_coin2'),2);
  settleDaily(h);assert.equal(h.api.itemStock('c_coin2'),2);
});
test('legacy same-day claimed record and active shared boost load intact and block a second reward',()=>{
  const saves=storage(),h=setup({storage:saves}),s=h.api.state();date(h,'2026-09-16');
  const claim={date:'2026-09-16',gameId:h.api.dailyChallengeGame().id,score:10,rank:'D'};
  Object.assign(s.lifetime,{dailyChallenge:claim,dailyStreak:30,dailyLastDate:'2026-09-16'});
  s.boostTicks=123;h.api.saveState();
  const loaded=harness({storage:saves,resume:true});date(loaded,'2026-09-16');
  assert.deepEqual(copy(loaded.api.state().lifetime.dailyChallenge),claim);
  assert.equal(loaded.api.state().boostTicks,123);
  settleDaily(loaded);
  assert.equal(loaded.api.itemStock('c_coin2'),0);
  assert.deepEqual(copy(loaded.api.state().lifetime.dailyChallenge),claim);
  loaded.api.renderGameList();
  assert.doesNotMatch(loaded.get('gameListGrid').innerHTML,/30日連続|10〜60|連続ボーナス|せいちょう2ばい/);
});
test('after the daily award, another ordinary S rank retains its ordinary boost rule',()=>{
  const h=setup(),s=h.api.state();s.boostTicks=0;
  settleDaily(h,100);assert.equal(s.boostTicks,0);assert.equal(h.api.itemStock('c_coin2'),1);
  settleDaily(h,100);assert.equal(s.boostTicks,40);assert.equal(h.api.itemStock('c_coin2'),1);
});

test('failure from the daily button remains unclaimed and can be retried successfully',()=>{
  const h=setup(),grid=h.get('gameListGrid'),game=h.api.dailyChallengeGame();
  grid.closest=selector=>selector==='.daily-start'?{dataset:{gameId:game.id}}:null;
  h.dispatch(grid,'click');h.api.finishMinigame(29);
  assert.equal(h.api.itemStock('c_coin2'),0);
  assert.equal(h.api.dailyChallengeToday(),null);
  h.dispatch(grid,'click');h.api.finishMinigame(30);
  assert.equal(h.api.itemStock('c_coin2'),1);
});
