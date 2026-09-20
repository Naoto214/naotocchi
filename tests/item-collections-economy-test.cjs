const assert = require('node:assert/strict');
const {test} = require('node:test');
const {harness} = require('./helpers/runtime-harness.cjs');
const storage = () => {const data=new Map(); return {getItem:k=>data.get(k)||null,setItem:(k,v)=>data.set(k,v),removeItem:k=>data.delete(k)};};
const boot = store => harness({resume:true,storage:store});
function host(h, bet=40, lies=0) {
  const d=h.api.startDuelChallenge(bet); assert.ok(d);
  for(let i=0;i<5;i++) {h.api.chooseDuelTruth('a');h.api.chooseDuelHonesty(i<lies);}
  h.api.finalizeDuelChallenge(); return h.api.encodeDuelChallenge();
}
function guess(h,code,answers) {
  const d=h.api.startDuelGuess(code); assert.ok(!d.error);
  d.items.forEach((e,i)=>h.api.setDuelGuess(e.qId,answers[i]));
  h.api.confirmDuelGuesses(); h.api.chooseDuelSuspicion(d.items[0].qId);
  return h.api.encodeDuelGuess();
}
test('egg menu reserves random new stock, hides the species and consumes once across reload',()=>{
  const store=storage(); let h=boot(store), s=h.api.state(); s.items.c_egg_normal=1;s.items.c_egg_rare=1;
  h.dispatch(h.get('itemBtn'),'click'); h.api.useConsumableItem('c_egg_normal');
  const line=s.lifetime.nextEggLine;assert.ok(h.api.normalLines.includes(line));assert.equal(h.api.itemStock('c_egg_normal'),1);
  assert.match(h.get('onetimeItemGrid').innerHTML,/次の人生：？？？/);assert.equal(h.api.useConsumableItem('c_egg_rare'),false);
  h.api.cancelNextEgg(`c_egg_${s.lifetime.nextEggKind || 'normal'}`);assert.equal(s.lifetime.nextEggLine,null);assert.equal(h.api.itemStock('c_egg_normal'),1);
  h.api.useConsumableItem('c_egg_rare');assert.ok(h.api.rareLines.includes(s.lifetime.nextEggLine));assert.notEqual(s.lifetime.nextEggLine,'ren');
  h.api.cancelNextEgg(`c_egg_${s.lifetime.nextEggKind || 'normal'}`);h.api.openDreamPicker('normal');const chosen=s.lifetime.nextEggLine;h.api.saveState();
  h=boot(store);h.api.hatchEgg();assert.equal(h.api.state().speciesLine,chosen);assert.equal(h.api.itemStock('c_egg_normal'),0);
  h.api.saveState();h=boot(store);assert.equal(h.api.pickDreamLine(),null);assert.equal(h.api.itemStock('c_egg_normal'),0);
});
test('invalid or unavailable hatch reservation clears without spending; growing pets can reserve',()=>{
  const h=harness(),s=h.api.state();s.stage='egg';s.items.c_egg_normal=1;s.items.c_egg_rare=1;
  for(const line of ['ren','nope','dog']){s.lifetime.nextEggLine=line;s.lifetime.nextEggKind='rare';assert.equal(h.api.pickDreamLine(),null);}
  s.lifetime.nextEggLine='dog';s.lifetime.nextEggKind='normal';delete s.items.c_egg_normal;
  assert.equal(h.api.pickDreamLine(),null);assert.equal(s.lifetime.nextEggLine,null);
  s.stage='growing';assert.equal(h.api.openDreamPicker('rare'),true);assert.equal(h.api.itemStock('c_egg_rare'),1);
});
test('duplicate stickers stay as copies and stop at the nine-copy cap',()=>{
  const h=harness(),store=h.api.stickerStore();
  for(let i=0;i<h.api.STICKER_COPY_MAX;i++) assert.ok(h.api.grantSticker('scenery:tree'));
  assert.equal(store.owned['scenery:tree'],9);
  assert.equal(h.api.grantSticker('scenery:tree'),null);
  assert.equal(Object.hasOwn(store,'kakera'),false);
});
test('theme costs 60 and draws only chosen category with the secret gate; ordinary stays 30/3',()=>{
  const h=harness(),s=h.api.state();s.lifetime.money=260;
  // The upper-edge draw selects the rare tier and its last form: ren:7 if eligible.
  // Use the identical draw before and after discovery so an absent gate always fails.
  h.sandbox.Math=Object.assign(Object.create(Math),{random:()=>1-Number.EPSILON});
  assert.equal(h.api.openThemedStickerPack('invalid'),null);assert.equal(s.lifetime.money,260);
  const scenery=h.api.openThemedStickerPack('scenery');
  assert.equal(scenery.length,3);assert.ok(scenery.every(x=>x.sticker.kind==='scenery'));
  assert.equal(s.lifetime.money,200);
  const undiscovered=h.api.openThemedStickerPack('form');
  assert.equal(undiscovered.length,3);assert.ok(undiscovered.every(x=>x.sticker.kind==='form'&&!x.sticker.secret));
  assert.ok(undiscovered.every(x=>!x.sticker.id.startsWith('form:ren:')));
  assert.equal(s.lifetime.money,140);
  s.discoveredStages.push('ren:0');
  const discovered=h.api.openThemedStickerPack('form');
  assert.equal(discovered.length,3);assert.ok(discovered.every(x=>x.sticker.id==='form:ren:7'));
  assert.equal(s.lifetime.money,80);assert.equal(h.api.openStickerPack().length,3);assert.equal(s.lifetime.money,50);
  assert.equal(h.api.openThemedStickerPack('item'),null);assert.equal(s.lifetime.money,50);
});

test('legacy sticker counts and positions merge idempotently without replacing character history',()=>{
  const h=harness(),s=h.api.state();s.lifetime.stickers={owned:{'item:flower2':2,'item:flower':1,'partner:old':1},pages:{home:[{k:1,id:'item:flower2',x:.2,y:.7,r:42,s:1.2},{k:2,id:'item:flower',x:.8,y:.1}]},seen:['item:flower2'],tasksDone:['home-form-3']};
  s.lifetime.pastLives=[{partner:{id:'old'}}]; h.api.ITEM_SYSTEM.normalize(s);h.api.ITEM_SYSTEM.normalize(s);
  const st=h.api.stickerStore();assert.equal(st.owned['item:flower'],3);assert.equal(st.owned['item:flower2'],undefined);
  assert.deepEqual(JSON.parse(JSON.stringify(st.pages['page-1'])),[{k:1,id:'item:flower',x:.2,y:.7,r:42,s:1.2},{k:2,id:'item:flower',x:.8,y:.1}]);
  assert.equal(s.lifetime.pastLives[0].partner.id,'old');assert.equal(st.owned['partner:old'],1); assert.equal(h.api.stickerCatalog().length,342); assert.equal(h.api.stickerCatalog().some(x=>x.id==='item:itemluck1'),false);
});
test('sticker catalog offers all current items while retaining other collection categories',()=>{
  const catalog=harness().api.stickerCatalog();
  assert.deepEqual(Array.from(catalog.filter(x=>x.kind==='item'),x=>x.id).sort(),[
    'item:bond1','item:bowtie','item:gamepass1','item:partner1','item:poop1',
    'item:ribbon','item:scarf','item:sleepboost1','item:star','item:travel1',
    'item:c_coin2','item:c_life','item:c_time_back','item:c_time_forward','item:c_life_charm',
    'item:c_friend','item:c_match','item:c_transform','item:c_rare_friend','item:c_egg_normal','item:c_egg_rare','item:c_dex',
    'item:naoto_charm','item:naoto_lantern','item:naoto_ring','item:naoto_crown','item:new_themed_pack',
  ].sort());
  assert.deepEqual(catalog.reduce((counts,item)=>{
    if(item.kind!=='item')counts[item.kind]=(counts[item.kind]||0)+1;
    return counts;
  },{}),{form:248,companion:26,partner:18,scenery:23});
});
for(const [name,answers,wantA,wantB] of [
 ['host win',['lie','lie','lie','lie','lie'],140,60],
 ['guest win',['honest','honest','honest','honest','honest'],60,140],
 ['draw',['honest','honest','honest','lie','lie'],100,100]]) {
 test(`duel ${name}: both reserve, purchases cannot spend stake, settlement/reload/replay is exact once`,()=>{
  const as=storage(),bs=storage();let a=boot(as),b=boot(bs);a.api.state().lifetime.money=100;b.api.state().lifetime.money=100;
  const c=host(a);assert.equal(a.api.state().lifetime.money,60);
  const g=guess(b,c,answers);assert.equal(b.api.state().lifetime.money,60);
  assert.equal(b.api.buyConsumableItem('c_life'),false);assert.equal(b.api.state().lifetime.money,60);
  a.api.saveState();a=boot(as);assert.ok(!a.api.resolveDuelWithGuessCode(g).error);const r=a.api.encodeDuelReveal();
  b.api.saveState();b=boot(bs);assert.ok(!b.api.resolveDuelWithRevealCode(r).error);
  assert.equal(a.api.state().lifetime.money,wantA);assert.equal(b.api.state().lifetime.money,wantB);
  assert.ok(a.api.resolveDuelWithGuessCode(g).error);assert.ok(b.api.resolveDuelWithRevealCode(r).error);
  b.dispatch(b.get('duelResultCloseBtn'),'click');b.api.saveState();b=boot(bs);assert.ok(b.api.startDuelGuess(c).error);assert.equal(b.api.state().lifetime.money,wantB);
 });
}
test('unpublished cancel refunds once; published abandonment forfeits and close/new life preserve stake',()=>{
  const h=harness();h.api.state().lifetime.money=100;h.api.startDuelChallenge(40);
  assert.equal(h.api.state().lifetime.money,60);h.dispatch(h.get('duelCancelMatchBtn'),'click');assert.equal(h.api.state().lifetime.money,100);
  h.dispatch(h.get('duelCancelMatchBtn'),'click');assert.equal(h.api.state().lifetime.money,100);
  host(h);h.dispatch(h.get('duelCloseBtn'),'click');const id=h.api.state().duel.matchId;
  h.dispatch(h.get('resetBtn'),'click');assert.equal(h.api.state().duel.matchId,id);assert.equal(h.api.state().lifetime.money,60);
  assert.equal(h.api.abandonDuelChallenge(),true);assert.equal(h.api.state().lifetime.money,60);assert.equal(h.api.abandonDuelChallenge(),null);
});
test('old unfunded progress terminates without minting while completed old matches retain money/statistics',()=>{
  const h=harness(),s=h.api.state();s.lifetime.money=3;s.duel={role:'challenger',step:'ready',bet:100};
  h.api.ITEM_SYSTEM.normalize(s);assert.equal(s.duel,null);assert.equal(s.lifetime.money,3);assert.ok(s.lifetime.duelNotice);
  s.duel={role:'challenger',step:'done',bet:100,moneyDelta:100};s.lifetime.duelWins=7;
  h.api.ITEM_SYSTEM.normalize(s);assert.equal(s.duel.step,'done');assert.equal(s.lifetime.money,3);assert.equal(s.lifetime.duelWins,7);
});
test('repeated hatch callback does not change an already committed newborn',()=>{
  const h=harness(),s=h.api.state();s.stage='egg';s.items.c_egg_normal=2;s.lifetime.nextEggLine='dog';
  h.api.hatchEgg();const first=JSON.stringify({species:s.speciesLine,gender:s.gender,logs:s.lifeLog});
  h.api.hatchEgg();assert.equal(JSON.stringify({species:s.speciesLine,gender:s.gender,logs:s.lifeLog}),first);assert.equal(h.api.itemStock('c_egg_normal'),1);
});
test('result-only close and rematch handlers cannot discard a reserved match',()=>{
  const h=harness();h.api.state().lifetime.money=100;host(h);const id=h.api.state().duel.matchId;
  h.dispatch(h.get('duelResultCloseBtn'),'click');assert.equal(h.api.state().duel?.matchId,id);
  h.dispatch(h.get('duelRematchBtn'),'click');assert.equal(h.api.state().duel?.matchId,id);assert.equal(h.api.state().lifetime.money,60);
});
test('infinite snapshot reload and return preserve live duel rather than resurrecting an earlier settlement',()=>{
  const store=storage();let h=boot(store);h.api.state().lifetime.money=100;h.api.state().lifetime.perfectCleared=true;host(h);
  const id=h.api.state().duel.matchId;h.api.enterInfinite();h.api.saveState();h=boot(store);h.api.exitInfinite();
  assert.equal(h.api.state().duel.matchId,id);assert.equal(h.api.state().lifetime.money,60);
  h.api.enterInfinite();h.api.abandonDuelChallenge();h.api.exitInfinite();assert.equal(h.api.state().duel,null);assert.equal(h.api.state().lifetime.money,60);
});
test('duel spends available coins normally and still settles backed stakes',()=>{
  const a=harness(),b=harness();a.api.state().lifetime.money=340;b.api.state().lifetime.money=100;
  const c=host(a),g=guess(b,c,['honest','honest','honest','honest','honest']);
  assert.equal(a.api.buyConsumableItem('c_life'),true);assert.equal(a.api.state().lifetime.money,0);
  a.api.resolveDuelWithGuessCode(g);b.api.resolveDuelWithRevealCode(a.api.encodeDuelReveal());
  assert.equal(a.api.state().lifetime.money,0);assert.equal(a.api.state().duel.moneyDelta,-40);assert.equal(b.api.state().lifetime.money,140);
});
test('different match IDs, old-format and duplicate-question codes never reserve or settle',()=>{
  const a=harness(),b=harness(),other=harness();for(const h of [a,b,other])h.api.state().lifetime.money=200;
  const c=host(a),g=guess(b,c,['lie','lie','lie','lie','lie']);host(other);
  assert.ok(other.api.resolveDuelWithGuessCode(g).error);assert.equal(other.api.state().lifetime.money,160);
  const payload=JSON.parse(decodeURIComponent(atob(c.split(':')[1])));delete payload.matchId;
  const legacy='NAOTOCCHIDUELC1:'+btoa(encodeURIComponent(JSON.stringify(payload)));
  const fresh=harness();fresh.api.state().lifetime.money=100;assert.ok(fresh.api.startDuelGuess(legacy).error);assert.equal(fresh.api.state().lifetime.money,100);
  const duplicate=JSON.parse(decodeURIComponent(atob(c.split(':')[1])));duplicate.q[1]=duplicate.q[0];
  assert.ok(fresh.api.startDuelGuess('NAOTOCCHIDUELC2:'+btoa(encodeURIComponent(JSON.stringify(duplicate)))).error);assert.equal(fresh.api.state().lifetime.money,100);
});
test('real sticker menu buys the selected category and has no point-exchange controls',()=>{
  const h=harness(),s=h.api.state();s.stage='egg';s.lifetime.money=120;
  h.api.openExclusiveMenu('sticker');
  h.get('stickerThemeKind').value='scenery';h.dispatch(h.get('stickerThemeKind'),'change');
  h.dispatch(h.get('stickerThemePackBtn'),'click');
  assert.equal(s.lifetime.money,60);
  assert.ok(Object.keys(h.api.stickerStore().owned).length>0);
  assert.ok(Object.keys(h.api.stickerStore().owned).every(id=>id.startsWith('scenery:')));
  assert.equal(Object.hasOwn(h.api.stickerStore(),'kakera'),false);
});
test('maxed stickers are excluded from pack draws',()=>{
  const h=harness(),s=h.api.state(),store=h.api.stickerStore();s.lifetime.money=100;
  store.owned['scenery:tree']=h.api.STICKER_COPY_MAX;
  assert.ok(!h.api.stickerDrawablePool().some(x=>x.id==='scenery:tree'));
  const result=h.api.openStickerPack();
  assert.equal(result.length,3);
  assert.ok(result.every(x=>x.sticker.id!=='scenery:tree'));
});
test('host ID generation remains usable at a zero random draw',()=>{
  const h=harness();h.api.state().lifetime.money=100;h.sandbox.Math=Object.assign(Object.create(Math),{random:()=>0});
  const d=h.api.startDuelChallenge(40);assert.ok(d);assert.equal(h.api.state().lifetime.money,60);
});
test('completed legacy duels reopen as results, without a new unsupported settlement code',()=>{
  const store=storage(),h=boot(store);h.api.state().lifetime.money=100;const b=harness();b.api.state().lifetime.money=100;
  const code=host(h),g=guess(b,code,['lie','lie','lie','lie','lie']);h.api.resolveDuelWithGuessCode(g);
  delete h.api.state().duel.matchId;h.api.state().lifetime.duelStakes={};h.api.saveState();
  const loaded=boot(store);loaded.dispatch(loaded.get('openDuelBtn'),'click');
  assert.equal(loaded.get('duelResultSection').classList.contains('hidden'),false);
  assert.equal(loaded.get('duelCodeOutSection').classList.contains('hidden'),true);assert.equal(loaded.api.state().lifetime.money,140);
});
test('real duel create, join, publish and import controls use the reserved transaction',()=>{
  const a=harness(),b=harness();for(const h of [a,b]) {h.api.state().lifetime.money=100;h.dispatch(h.get('openDuelBtn'),'click');}
  a.dispatch(a.get('duelStartChallengeBtn'),'click');a.get('duelBetInput').value='40';a.dispatch(a.get('duelBetConfirmBtn'),'click');
  assert.equal(a.api.state().lifetime.money,60);assert.match(a.get('duelCancelMatchBtn').textContent,/もどす/);
  for(let i=0;i<5;i++) {a.dispatch(a.get('duelChoiceABtn'),'click');a.dispatch(a.get('duelHonestBtn'),'click');}
  a.dispatch(a.get('duelFinalizeChallengeBtn'),'click');assert.match(a.get('duelCancelMatchBtn').textContent,/あきらめ/);
  const code=a.get('duelCodeOutBox').value;assert.match(code,/^NAOTOCCHIDUELC2:/);
  b.dispatch(b.get('duelStartGuessBtn'),'click');b.get('duelGuessCodeInput').value=code;b.dispatch(b.get('duelGuessCodeBtn'),'click');
  assert.equal(b.api.state().lifetime.money,60);assert.match(b.get('duelCancelMatchBtn').textContent,/あきらめ/);
  for(const item of b.api.state().duel.items)b.api.setDuelGuess(item.qId,'honest');
  b.dispatch(b.get('duelGuessConfirmBtn'),'click');b.api.chooseDuelSuspicion(b.api.state().duel.items[0].qId);
  a.get('duelCodeInInput').value=b.api.encodeDuelGuess();a.dispatch(a.get('duelCodeInBtn'),'click');
  assert.equal(a.api.state().lifetime.money,60);assert.equal(a.api.state().duel.step,'done');
  b.get('duelCodeInInput').value=a.api.encodeDuelReveal();b.dispatch(b.get('duelCodeInBtn'),'click');assert.equal(b.api.state().lifetime.money,140);
});
test('guest abandonment and full wipe cannot return a published stake',()=>{
  const a=harness(),b=harness();a.api.state().lifetime.money=100;b.api.state().lifetime.money=100;
  const code=host(a);b.api.startDuelGuess(code);const id=b.api.state().duel.matchId;
  b.dispatch(b.get('duelCancelMatchBtn'),'click');assert.equal(b.api.state().lifetime.money,60);assert.equal(b.api.state().lifetime.duelStakes[id].status,'forfeited');
  assert.ok(b.api.startDuelGuess(code).error);b.api.doWipe();assert.equal(b.api.state().lifetime.money,0);assert.equal(Object.keys(b.api.state().lifetime.duelStakes).length,0);assert.equal(b.api.state().duel,null);
});
