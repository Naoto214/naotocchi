const assert=require('node:assert/strict');
const {test}=require('node:test');
const {harness}=require('./helpers/runtime-harness.cjs');
function setup(items=['naoto_lantern','naoto_ring']) {
  const h=harness(),s=h.api.state();
  s.stage='growing';s.growth=0;s.boostTicks=0;s.sodachi=20;
  s.lifetime.ownedNaotoItems=items;s.discoveredStages=[];
  s.lifetime.companionsRecruited=[];s.lifetime.rareCompanionsRecruited=[];s.lifetime.partnersRecorded=[];
  return h;
}
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-9,`${a} != ${b}`);
for(const [owned,expected] of [[false,3],[true,3.3]]) test(`lantern ownership ${owned}: positive growth`,()=>{
 const h=setup(owned?['naoto_lantern']:[]);h.api.applyGrowth(3);near(h.api.state().growth,expected);
});
test('lantern stacks once with existing boost, retaining fractional growth',()=>{
 const h=setup(),s=h.api.state();s.boostTicks=5;h.api.applyGrowth(.1);near(s.growth,.22);
 h.api.applyGrowth(.1);near(s.growth,.44);
});
test('lantern does not boost loss, decline, initial sodachi or zero',()=>{
 const h=setup(),s=h.api.state();s.growth=5;h.api.applyGrowth(-2);assert.equal(s.growth,3);
 h.api.applyGrowth(0);assert.equal(s.growth,3);assert.equal(s.sodachi,20);
 s.decline=0;h.api.applyDecline(2);assert.equal(s.decline,2);
});
test('lantern leaves eggs and infinite mode unchanged',()=>{
 const h=setup(),s=h.api.state();s.stage='egg';h.api.applyGrowth(1);assert.equal(s.growth,1);
 s.stage='growing';s.infinite=true;h.api.applyGrowth(1);assert.equal(s.growth,1);
});
test('lantern crosses the unchanged sodachi threshold with one level and a fraction',()=>{
 const h=setup(),s=h.api.state(),cost=h.api.sodachiCost(20),before=s.lifetime.evolutions;
 h.api.applyGrowth(cost);assert.equal(s.sodachi,21);near(s.growth,cost*.1);
 assert.equal(s.lifetime.evolutions,before+1);assert.equal(Number.isInteger(s.sodachi),true);
});
test('normal game remains one real play and unchanged coins with lantern',()=>{
 const h=setup(),s=h.api.state(),before=s.minigameCount,money=s.lifetime.money;
 h.api.startMinigame({id:'lantern-probe',start(){}});h.api.finishMinigame(60);
 assert.equal(s.minigameCount,before+1);assert.equal(s.lifetime.money,money+30);
});
for(const kind of ['species','companion','partner']) test(`ring ${kind}: unknown doubles; registered immediately restores base`,()=>{
 const h=setup(),s=h.api.state();let c;
 if(kind==='species') c=h.api.normalLines.find(x=>x!==s.speciesLine);
 if(kind==='companion') c=h.api.normalCompanions[0];
 if(kind==='partner') {s.gender='male';s.attractedTo=['male','female','nonbinary'];c=h.api.partnerCandidates.find(x=>h.api.mutualRomanticMatch(s,x));assert.ok(c);}
 assert.equal(h.api.ringDexWeight(kind,c),2);
 s.lifetime.ownedNaotoItems=[];assert.equal(h.api.ringDexWeight(kind,c),1);s.lifetime.ownedNaotoItems=['naoto_ring'];
 if(kind==='species')h.api.recordDiscoveryKey(`${c}:${h.api.currentFormStageIndex()}`);
 if(kind==='companion')s.lifetime.companionsRecruited.push(c.id);
 if(kind==='partner')s.lifetime.partnersRecorded.push(c.id);
 assert.equal(h.api.ringDexWeight(kind,c),1);
});
test('ring species uses the actual form dex, including ticket registrations, not raised species',()=>{
 const h=setup(),s=h.api.state(),line=h.api.normalLines[1],stage=h.api.currentFormStageIndex();
 s.lifetime.raisedSpecies=[line];s.discoveredStages=[`${line}:${(stage+1)%8}`];
 assert.equal(h.api.ringDexWeight('species',line),2);
 s.discoveredStages.push(`${line}:${stage}`);assert.equal(h.api.ringDexWeight('species',line),1);
});
test('rare companion registration use the same dex predicate',()=>{
 const h=setup(),s=h.api.state(),c=h.api.rareCompanions[0];
 assert.equal(h.api.ringDexWeight('companion',c),2);s.lifetime.rareCompanionsRecruited=[c.id];
 assert.equal(h.api.ringDexWeight('companion',c),1);
});
test('ring never targets crown pools, risks, manual settings, or secret ren',()=>{
 const h=setup();for(const kind of ['game','sticker','moment','weather','time','death','decline'])assert.equal(h.api.ringDexWeight(kind,{id:'unknown'}),1);
 assert.equal(h.api.ringDexWeight('species','ren'),1);
});
test('ring does not promote romantically incompatible candidates',()=>{
 const h=setup(),s=h.api.state();s.attractedTo=[];
 for(const c of h.api.partnerCandidates)assert.equal(h.api.ringDexWeight('partner',c),1);
});
test('ring and crown do not multiply one candidate to four',()=>{
 const h=setup(['naoto_ring','naoto_crown']),s=h.api.state();s.lifetime.dexCleared=true;
 const c=h.api.normalCompanions[0];assert.equal(h.api.ringDexWeight('companion',c),2);assert.equal(h.api.crownAchievementWeight('companion',c),1);
 assert.equal(h.api.ringDexWeight('game',{id:'unplayed'}),1);
});
test('weighted ring sampler doubles each unknown candidate and preserves known base mass',()=>{
 const h=setup(),s=h.api.state(),pool=h.api.normalCompanions.slice(0,3);s.lifetime.companionsRecruited=[pool[0].id];
 const counts=[0,0,0];for(let i=0;i<7;i++){h.api.setRandom(()=>(i+.5)/7);counts[pool.indexOf(h.api.pickRingCandidate(pool,'companion',c=>c===pool[0]?3:1))]++;}
 assert.deepEqual(counts,[3,2,2]);assert.equal(h.api.pickRingCandidate([],'companion'),null);
});
test('normal companion draw retains regional 4:1 mass before ring bonus',()=>{
 const h=setup(),s=h.api.state(),local={...h.api.normalCompanions[0],preferredRegions:['home']},remote={...h.api.normalCompanions[1],preferredRegions:['forest']};
 s.regionId=local.preferredRegions[0];s.lifetime.companionsRecruited=[local.id];const counts=[0,0],pool=[local,remote];
 for(let i=0;i<6;i++){h.api.setRandom(()=>(i+.5)/6);counts[pool.indexOf(h.api.pickCompanionByRegion(pool))]++;}assert.deepEqual(counts,[4,2]);
});
test('natural transform excludes current, excluded and locked rares, biases only legal choices',()=>{
 const h=setup(),s=h.api.state(),pool=h.api.normalLines.filter(x=>x!==s.speciesLine).slice(0,2),excluded=h.api.normalLines.filter(x=>!pool.includes(x));
 s.careSum=0;s.careTicks=0;s.minigameCount=0;s.traitCounts={};s.sicknessCuredThisLife=0;
 s.discoveredStages=[`${pool[0]}:${h.api.currentFormStageIndex()}`];const counts=[0,0];
 for(let i=0;i<6;i++){h.api.setRandom(()=>(i+.5)/6);const out=h.api.pickTransformCandidates(excluded,1);assert.equal(out.length,1);assert.ok(pool.includes(out[0]));counts[pool.indexOf(out[0])]++;}
 assert.deepEqual(counts,[2,4]);
});
test('transform ticket output is identical with and without ring for the same random stream',()=>{
 const h=setup(),s=h.api.state();h.api.setRandom(()=>.37);const withRing=[...h.api.pickTicketTransformCandidates()];
 s.lifetime.ownedNaotoItems=[];h.api.setRandom(()=>.37);assert.deepEqual([...h.api.pickTicketTransformCandidates()],withRing);
});
for(const source of ['ownership','goal-history'])test(`old save ${source} restores passives without new save fields`,()=>{
 const h=setup(),s=h.api.state();s.lifetime.endingTiersReached=[0,1,2];
 if(source==='goal-history')s.lifetime.ownedNaotoItems=[];
 const old=JSON.parse(JSON.stringify(s));const storage=new Map([['naotocchi-save-v1',JSON.stringify(old)]]),restored=harness({storage,resume:true}),r=restored.api.state();
 r.stage='growing';r.growth=0;r.boostTicks=0;restored.api.applyGrowth(1);near(r.growth,1.1);
 assert.equal(restored.api.ringDexWeight('companion',restored.api.normalCompanions[0]),2);
});
