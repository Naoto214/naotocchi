const assert = require('node:assert/strict');
const { test } = require('node:test');
const { harness } = require('./helpers/runtime-harness.cjs');

test('consumables are bought into stock and arm one effect at a time', () => {
  const h=harness(),state=h.api.state();state.lifetime.money=1000;
  h.api.buyConsumableItem('c_mgbig');assert.equal(state.lifetime.money,880);
  h.api.useConsumableItem('c_mgbig');assert.equal(state.oneTimeBoosts.greatReward,true);
  h.api.buyConsumableItem('c_mgsmall');h.api.useConsumableItem('c_mgsmall');
  assert.equal(state.oneTimeBoosts.greatReward,true);assert.equal(state.oneTimeBoosts.minigameBoost,'small');assert.equal(h.api.itemStock('c_mgsmall'),0);
  h.api.buyConsumableItem('c_mgbig');h.api.useConsumableItem('c_mgbig');
  assert.equal(h.api.itemStock('c_mgbig'),1,'only one great reward reservation');
  assert.ok(h.api.activeBoostSummary().length>=2);
  state.lifetime.money=5;assert.equal(h.api.buyConsumableItem('c_sickshield'),false);
  h.api.useConsumableItem('c_sickshield');assert.equal(state.oneTimeBoosts.sicknessShieldCount,0);
});

test('daily streak rewards grow and pay milestone bonuses', () => {
  const h = harness();
  assert.equal(h.api.dailyStreakReward(1).coins, 10);
  assert.equal(h.api.dailyStreakReward(2).coins, 15);
  assert.equal(h.api.dailyStreakReward(3).coins, 20 + 30);
  assert.equal(h.api.dailyStreakReward(7).coins, 40 + 100);
  assert.equal(h.api.dailyStreakReward(11).coins, 60);
  assert.equal(h.api.dailyStreakReward(40).coins, 60);
  assert.match(h.api.dailyStreakReward(30).milestone, /30/);
});

for (const equipment of [null,'star']) test(`daily and Lucky payouts stay independent with ${equipment}`,()=>{
  const h=harness(),s=h.api.state();
  Object.assign(s,{stage:'growing',sodachi:80,maxSodachi:80,growth:0});
  Object.assign(s.lifetime,{equippedItemId:equipment,weatherMode:'sunny',timeMode:'day',seasonMode:'spring'});
  require('node:vm').runInContext('Math.random=()=>0.8',h.sandbox);
  const before=s.lifetime.money;
  h.api.startDaily({id:'daily-reward-probe',start(){}});
  h.api.finishMinigame(50);
  assert.equal(s.lifetime.money-before,equipment==='star'?100:40,'base reward plus unchanged 10 daily coins');
  const afterGame=s.lifetime.money;
  assert.equal(h.api.useConsumableItem('c_coin2'),true);
  assert.equal(s.lifetime.money-afterGame,500,'daily Lucky grant retains immediate roulette payout');
});

test('Star does not multiply either side of a duel settlement',()=>{
  const a=harness(),b=harness();
  for(const h of [a,b]) Object.assign(h.api.state().lifetime,{money:100,equippedItemId:'star'});
  a.api.startDuelChallenge(40);
  for(let i=0;i<5;i++){a.api.chooseDuelTruth('a');a.api.chooseDuelHonesty(false);}
  a.api.finalizeDuelChallenge();
  const d=b.api.startDuelGuess(a.api.encodeDuelChallenge());assert.ok(!d.error);
  d.items.forEach(e=>b.api.setDuelGuess(e.qId,'lie'));
  b.api.confirmDuelGuesses();b.api.chooseDuelSuspicion(d.items[0].qId);
  assert.ok(!a.api.resolveDuelWithGuessCode(b.api.encodeDuelGuess()).error);
  assert.ok(!b.api.resolveDuelWithRevealCode(a.api.encodeDuelReveal()).error);
  assert.equal(a.api.state().lifetime.money,140);
  assert.equal(b.api.state().lifetime.money,60);
});
