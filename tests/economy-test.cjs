const assert = require('node:assert/strict');
const { test } = require('node:test');
const { harness } = require('./helpers/runtime-harness.cjs');

for (const equipment of [null,'star']) test(`daily and Lucky payouts stay independent with ${equipment}`,()=>{
  const h=harness(),s=h.api.state();
  Object.assign(s,{stage:'growing',sodachi:80,maxSodachi:80,growth:0});
  Object.assign(s.lifetime,{equippedItemId:equipment,weatherMode:'sunny',timeMode:'day',seasonMode:'spring'});
  require('node:vm').runInContext('Math.random=()=>0.8',h.sandbox);
  const before=s.lifetime.money;
  h.api.startMinigame(h.api.dailyChallengeGame(),{intro:false});
  h.api.finishMinigame(50);
  assert.equal(s.lifetime.money-before,equipment==='star'?90:30,'only ordinary game coins');
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
