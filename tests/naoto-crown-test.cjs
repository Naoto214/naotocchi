const assert = require('node:assert/strict');
const {test} = require('node:test');
const {harness} = require('./helpers/runtime-harness.cjs');
function setup(pending = []) {
  const h = harness(), s = h.api.state();
  s.lifetime.ownedNaotoItems = ['naoto_crown']; s.lifetime.dexCleared = true;
  s.achievementsUnlocked = h.api.achievements.map(a => a.id).filter(id => !pending.includes(id));
  return h;
}
const game = {id:'crown-fixture'};
const sticker = {id:'form:dog:0', kind:'form', rarity:'common'};
const safe = {happiness:5}, negative = {energy:-3, happiness:8};
function factor(h, kind, candidate) { return h.api.crownAchievementWeight(kind, candidate); }
for (const [kind,candidate,id] of [['game',game,'games-played-25'],['sticker',sticker,'sticker-10'],['moment',safe,'env-moments-10']]) {
  test(`${kind}: only owned crown after dex completion doubles a relevant candidate`, () => {
    const h=setup([id]),s=h.api.state();
    assert.equal(factor(h,kind,candidate),2);
    s.lifetime.ownedNaotoItems=[];assert.equal(factor(h,kind,candidate),1);
    s.lifetime.ownedNaotoItems=['naoto_crown'];s.lifetime.dexCleared=false;
    assert.equal(factor(h,kind,candidate),1);
    s.discoveredStages=h.api.ALL_LINES.flatMap(line=>Array.from({length:8},(_,i)=>`${line}:${i}`));
    assert.equal(factor(h,kind,candidate),2);
  });
  test(`${kind}: achievement completion removes bias despite other unfinished achievements`, () => {
    const h=setup(['age-100']);assert.equal(factor(h,kind,candidate),1);
  });
}
test('unplayed and record targets form a union, never 4x, and ring ownership has no effect',()=>{
  const h=setup(['games-played-25','record-rank-a-20','record-rank-s-15']);
  assert.equal(factor(h,'game',game),2);
  h.api.state().lifetime.ownedNaotoItems.push('naoto_ring');assert.equal(factor(h,'game',game),2);
  h.api.state().lifetime.minigamePlayCounts[game.id]=1;
  h.api.state().lifetime.minigameRecords[game.id]={best:90};assert.equal(factor(h,'game',game),1);
  h.api.state().lifetime.minigameRecords[game.id].best=80;assert.equal(factor(h,'game',game),2);
  h.api.state().achievementsUnlocked.push('record-rank-s-15');assert.equal(factor(h,'game',game),1);
});
test('actual achievement conditions stop bias before the next achievement notification',()=>{
  const h=setup(['record-rank-s-1']);h.api.state().lifetime.minigameRecords[h.api.games[0].id]={best:90};
  assert.equal(factor(h,'game',game),1);
});
test('danger, manual environment and ring pools never receive a crown multiplier',()=>{
  const h=setup(harness().api.achievements.map(a=>a.id));
  for(const kind of ['sickness','death','decline','weather','time','region','partner','companion','species','quick'])
    assert.equal(factor(h,kind,{id:'unknown'}),1,kind);
  for(const candidate of [negative,{happiness:-2},{health:-1},{hunger:-1}])assert.equal(factor(h,'moment',candidate),1);
});
test('all achievements complete disables every crown target, even with stale missing counters',()=>{
  const h=setup();for(const [kind,candidate] of [['game',game],['sticker',sticker],['moment',safe]])assert.equal(factor(h,kind,candidate),1);
});
test('unowned sticker bias ends at the collection threshold and never boosts an owned copy',()=>{
  const h=setup(['sticker-10']);assert.equal(factor(h,'sticker',sticker),2);
  h.api.state().lifetime.stickers.owned[sticker.id]=1;assert.equal(factor(h,'sticker',sticker),1);
});
test('task bias only fills a missing supply; enough unplaced copies require manual placement',()=>{
  const h=setup(['sticker-tasks-5']), store=h.api.stickerStore();
  // Four recorded tasks; remaining tasks other than home-item can already be done from existing stock.
  store.tasksDone=['home-form-3','travel-scenery-3','friends-companion-3','memory-elder-1'];
  for(const entry of h.api.stickerCatalog())if(entry.kind!=='item')store.owned[entry.id]=12;
  const item=h.api.stickerCatalog().find(s=>s.kind==='item');
  assert.equal(factor(h,'sticker',item),2);
  store.owned[item.id]=2;assert.equal(factor(h,'sticker',item),1);
  store.owned[item.id]=1;assert.equal(factor(h,'sticker',item),2);
  store.tasksDone.push('home-item-2');assert.equal(factor(h,'sticker',item),1);
});
test('sticker candidate weights preserve rarity mass while doubling only the target',()=>{
  const h=setup(['sticker-10']),owned={id:'owned',kind:'form',rarity:'common'},fresh={id:'fresh',kind:'form',rarity:'common'},rare={id:'rare',kind:'form',rarity:'rare'};
  h.api.stickerStore().owned={owned:1,rare:1};
  // Base masses 35,35,5 -> 35,70,5. Midpoints of 110 equal slices have exact counts.
  const counts={owned:0,fresh:0,rare:0};
  for(let i=0;i<110;i++){h.api.setRandom(()=> (i+.5)/110);counts[h.api.drawRandomSticker([owned,fresh,rare],false).id]++;}
  assert.deepEqual(counts,{owned:35,fresh:70,rare:5});
  h.api.setRandom(()=>.99);assert.equal(h.api.drawRandomSticker([owned,fresh,rare],true).id,'fresh');
  assert.equal(h.api.drawRandomSticker([],false),null);
});
test('environment joint lottery is 90:55 with all-safe candidates, not 90 percent',()=>{
  const h=setup(['env-moments-10']);let events=0;
  for(let i=0;i<145;i++){h.api.setRandom(()=>(i+.5)/145);if(h.api.drawEnvironmentMoment([safe]))events++;}
  assert.equal(events,90);
});
test('mixed environment keeps negative raw weight and doubles safe weight only',()=>{
  const h=setup(['env-moments-10']);const counts={safe:0,negative:0,none:0};
  // 22.5 safe + 22.5 negative + 55 none -> 45 + 22.5 + 55 = 122.5.
  for(let i=0;i<245;i++){h.api.setRandom(()=>(i+.5)/245);const m=h.api.drawEnvironmentMoment([safe,negative]);counts[m===safe?'safe':m===negative?'negative':'none']++;}
  assert.deepEqual(counts,{safe:90,negative:45,none:110});
});
test('inactive environment remains 45:55 and empty pools cannot produce events',()=>{
  const h=setup();let events=0;
  for(let i=0;i<100;i++){h.api.setRandom(()=>(i+.5)/100);if(h.api.drawEnvironmentMoment([safe]))events++;}
  assert.equal(events,45);assert.equal(h.api.drawEnvironmentMoment([]),null);
});
test('real scheduled environment event uses crown odds and counts exactly once',()=>{
  const h=setup(['env-moments-10']),s=h.api.state();
  s.regionId='mountain';s.lifetime.weatherMode='sunny';s.lifetime.timeMode='day';
  h.api.setRandom(()=>.5);h.api.scheduleEnvironmentMoment();h.advance(225000);
  assert.equal(s.lifetime.envMoments,1);
});
test('legacy crown save reload preserves rewards/history and activates only with dex proof',()=>{
  for(const dex of [false,true]){
    const h=setup(['games-played-25']),seed=JSON.parse(JSON.stringify(h.api.state()));
    seed.lifetime.dexCleared=dex;delete seed.lifetime.minigamePlayCounts;delete seed.lifetime.minigameRecords;
    const loaded=harness({resume:true,storage:{getItem:k=>k==='naotocchi-save-v1'?JSON.stringify(seed):null,setItem(){},removeItem(){}}});
    assert.equal(factor(loaded,'game',game),dex?2:1);
    assert.ok(loaded.api.state().lifetime.ownedNaotoItems.includes('naoto_crown'));
    assert.deepEqual([...loaded.api.state().achievementsUnlocked],seed.achievementsUnlocked);
  }
});
test('queue crown ordering changes but candidate multiplicity and play count stay intact',()=>{
  const normal=setup(['games-complete-100']),crown=setup(['games-complete-100']);
  for(const h of [normal,crown]){for(const g of h.api.games)h.api.state().lifetime.minigamePlayCounts[g.id]=1;delete h.api.state().lifetime.minigamePlayCounts[h.api.games[0].id];let n=42;h.api.setRandom(()=>((n=(n*1664525+1013904223)>>>0)+.5)/4294967296);}
  normal.api.state().lifetime.ownedNaotoItems=[];
  normal.api.refillMinigameQueue();crown.api.refillMinigameQueue();
  assert.deepEqual([...normal.api.queue()].sort(),[...crown.api.queue()].sort());
  assert.notDeepEqual([...normal.api.queue()],[...crown.api.queue()]);
  const before=crown.api.queue().length;const picked=crown.api.pickRandomMinigame();
  assert.equal(crown.api.queue().length,before-1);
  assert.equal(crown.api.state().lifetime.minigamePlayCounts[picked.id],picked.id===crown.api.games[0].id?1:2);
});
