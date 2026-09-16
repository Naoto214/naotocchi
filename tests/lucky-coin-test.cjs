const assert = require('node:assert/strict');
const {test} = require('node:test');
const vm = require('node:vm');
const fs = require('node:fs');
const {harness} = require('./helpers/runtime-harness.cjs');
const copy = s => JSON.parse(JSON.stringify(s));
const reload = s => harness({resume:true,storage:{getItem:k=>k==='naotocchi-save-v1'?JSON.stringify(s):null,setItem(){},removeItem(){}}});
const random = (h,n) => vm.runInContext(`Math.random=()=>${n}`,h.sandbox);
const game = {id:'lucky-probe',start(c){c.innerHTML='<div></div>';}};
test('Lucky catalog and shop offer 300 coin immediate roulette',()=>{
 const h=harness(),s=h.api.state();s.lifetime.money=600;
 assert.equal(h.api.ITEM_SYSTEM.CATALOG.c_coin2.price,300);
 assert.equal(h.api.ITEM_SYSTEM.CATALOG.c_coin2.desc,'ルーレットでコインがもらえる。');
 assert.equal(h.api.buyConsumableItem('c_coin2'),true);assert.equal(s.lifetime.money,300);assert.equal(s.items.c_coin2,1);
 assert.equal(h.api.buyConsumableItem('c_coin2'),true);assert.equal(s.lifetime.money,0);assert.equal(s.items.c_coin2,2);
 assert.equal(h.api.buyConsumableItem('c_coin2'),false);
 h.api.openExclusiveMenu('item');assert.match(h.get('onetimeItemGrid').innerHTML,/かう（300コイン）/);
});
for(const [low,high,amount] of [[0,.15,10],[.15,.35,20],[.35,.60,50],[.60,.80,100],[.80,.92,500],[.92,.99,1000],[.99,1,10000]]) {
 for(const draw of [low,high-Number.EPSILON]) test(`roulette draw ${draw} immediately pays ${amount}`,()=>{
  const h=harness(),s=h.api.state();s.items.c_coin2=2;s.lifetime.money=37;random(h,draw);
  assert.equal(h.api.useConsumableItem('c_coin2'),true);
  assert.equal(s.lifetime.money,37+amount);assert.equal(s.items.c_coin2,1);assert.equal(s.lifetime.consumablesUsed,1);
  assert.match(h.api.getMessage(),new RegExp(`${amount}コイン`));
  assert.equal('doubleCoins' in s.oneTimeBoosts,false);assert.ok(!h.api.activeBoostSummary().includes('ラッキーコイン'));
  assert.equal(h.api.useConsumableItem('c_coin2'),true);assert.equal(s.lifetime.money,37+2*amount);assert.equal(h.api.itemStock('c_coin2'),0);
  assert.equal(h.api.useConsumableItem('c_coin2'),false);assert.equal(s.lifetime.money,37+2*amount);
 });
}
for(const equipment of [null,'poop1','sleepboost1','bowtie','ribbon','scarf','travel1','partner1','bond1','gamepass1','star']) test(`roulette independent of equipment ${equipment}`,()=>{
 const h=harness(),s=h.api.state();s.lifetime.equippedItemId=equipment;s.items.c_coin2=1;s.lifetime.money=0;random(h,.92);
 h.api.useConsumableItem('c_coin2');assert.equal(s.lifetime.money,1000);
});
for(const reservations of [[false,false],[true,false],[false,true],[true,true]]) test(`legacy reservation migration ${reservations} is once across reload reset infinite return`,()=>{
 const seed=copy(harness().api.state());seed.items.c_coin2=4;seed.lifetime.itemInventory.c_coin2=4;
 seed.oneTimeBoosts.doubleCoins=reservations[0];seed.infinite=true;seed.infiniteReturn=copy(seed);delete seed.infiniteReturn.infiniteReturn;
 seed.infiniteReturn.oneTimeBoosts.doubleCoins=reservations[1];
 const h=reload(seed),s=h.api.state(),expected=4+Number(reservations.some(Boolean));
 assert.equal(s.items.c_coin2,expected);assert.equal('doubleCoins' in s.oneTimeBoosts,false);assert.equal('doubleCoins' in s.infiniteReturn.oneTimeBoosts,false);
 for(let i=0;i<3;i++)h.api.ITEM_SYSTEM.normalize(s);assert.equal(s.items.c_coin2,expected);
 const resumed=reload(s);assert.equal(resumed.api.state().items.c_coin2,expected);
 resumed.api.exitInfinite();assert.equal(resumed.api.state().items.c_coin2,expected);
 assert.equal('doubleCoins' in resumed.api.state().oneTimeBoosts,false);
 resumed.dispatch(resumed.get('resetBtn'),'click');assert.equal(resumed.api.state().items.c_coin2,expected);
 assert.equal(reload(resumed.api.state()).api.state().items.c_coin2,expected);
});
for(const score of [0,50,95]) test(`ordinary result ${score} never spends Lucky stock or boosts reward`,()=>{
 const outcomes=[false,true].map(use=>{const h=harness(),s=h.api.state();s.stage='growing';s.items.c_coin2=3;random(h,0);
 if(use)h.api.useConsumableItem('c_coin2');const before=s.lifetime.money;
 h.api.startMinigame(game,{intro:false});h.api.finishMinigame(score);
 assert.equal(s.items.c_coin2,use?2:3);assert.equal('doubleCoins' in s.oneTimeBoosts,false);return s.lifetime.money-before;});
 assert.equal(outcomes[0],outcomes[1]);
});
test('runtime has no Lucky reservation or doubled-reward code',()=>{
 const source=fs.readFileSync('script.js','utf8');assert.doesNotMatch(source,/doubleCoins|つぎのミニゲーム大成功でもらうおかねが2ばい/);
 assert.doesNotMatch(JSON.stringify(harness().api.ITEM_SYSTEM.CATALOG.c_coin2),/次の大成功|発動予約|2ばい/);
});
for(const id of [null,'knock','tickle']) test(`Quick ${id || 'mixed'} never spends stock or changes Lucky payout`,()=>{
 const h=harness(),s=h.api.state();Object.assign(s,{stage:'growing',isSleeping:false,isSick:false,energy:100,health:100,hunger:80});
 s.lifetime.equippedItemId='star';s.items.c_coin2=2;h.api.render();
 assert.equal(h.api.startQuickRun(id),true);h.advance(40);h.api.finishMinigame(30);
 assert.equal(s.items.c_coin2,2);const before=s.lifetime.money;random(h,.8);h.api.useConsumableItem('c_coin2');
 assert.equal(s.lifetime.money-before,500);assert.equal(s.items.c_coin2,1);assert.equal('doubleCoins' in s.oneTimeBoosts,false);
});
test('duel settlement and Lucky payout are independent',()=>{
 const a=harness(),b=harness();for(const h of [a,b]){h.api.state().lifetime.money=100;h.api.state().items.c_coin2=2;}
 a.api.startDuelChallenge(40);for(let i=0;i<5;i++){a.api.chooseDuelTruth('a');a.api.chooseDuelHonesty(false);}a.api.finalizeDuelChallenge();
 const d=b.api.startDuelGuess(a.api.encodeDuelChallenge());assert.ok(!d.error);
 d.items.forEach(e=>b.api.setDuelGuess(e.qId,'lie'));b.api.confirmDuelGuesses();b.api.chooseDuelSuspicion(d.items[0].qId);
 random(a,.35);a.api.useConsumableItem('c_coin2');assert.equal(a.api.state().lifetime.money,110);
 assert.ok(!a.api.resolveDuelWithGuessCode(b.api.encodeDuelGuess()).error);
 assert.ok(!b.api.resolveDuelWithRevealCode(a.api.encodeDuelReveal()).error);
 assert.equal(a.api.state().lifetime.money,190);assert.equal(b.api.state().lifetime.money,60);
 assert.equal(a.api.state().items.c_coin2,1);assert.equal(b.api.state().items.c_coin2,2);
});
test('spent reservation recovery never reappears after save and return',()=>{
 const seed=copy(harness().api.state());seed.items.c_coin2=0;seed.lifetime.itemInventory.c_coin2=0;seed.oneTimeBoosts.doubleCoins=true;
 seed.infinite=true;seed.infiniteReturn=copy(seed);delete seed.infiniteReturn.infiniteReturn;
 const h=reload(seed);random(h,0);assert.equal(h.api.useConsumableItem('c_coin2'),true);assert.equal(h.api.itemStock('c_coin2'),0);
 const next=reload(h.api.state());next.api.exitInfinite();assert.equal(next.api.itemStock('c_coin2'),0);
 next.dispatch(next.get('resetBtn'),'click');assert.equal(reload(next.api.state()).api.itemStock('c_coin2'),0);
});
