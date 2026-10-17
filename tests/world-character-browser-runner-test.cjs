const test=require('node:test');
const assert=require('node:assert/strict');
const {validateSample,validateBoundary,validateReducedMotion,makeSave,REGIONS}=require('../tools/meguru-3d-qa/character-integration.cjs');
const sample=()=>({is3D:true,failed:false,player:{ok:true,mode:'3d'},holders:3,stats:{live:3,created:8,removed:5,failedTemplates:0}});
test('browser gate rejects vanished player, orphan holders, resource leaks, and 2D city',()=>{
  validateSample(sample());
  for(const mutate of [s=>s.player.ok=false,s=>s.holders++,s=>s.stats.removed--,s=>s.is3D=false,s=>s.player.mode='2d',s=>s.stats.failedTemplates++]){const s=sample();mutate(s);assert.throws(()=>validateSample(s));}
});
test('save isolation requires all four independently observed boundaries',()=>{
  validateBoundary({state:true,storage:true,writes:true,getter:true});
  for(const key of ['state','storage','writes','getter']){const p={state:true,storage:true,writes:true,getter:true};p[key]=false;assert.throws(()=>validateBoundary(p));}
});
test('browser fixture uses native production player and companion identities',()=>{
  const s=JSON.parse(makeSave());assert.equal(s.speciesLine,'dog');assert.equal(s.stageIndex,3);assert.deepEqual(s.companions.map(a=>a.id),['shiba','cat_friend']);assert.deepEqual(s.lifetime.regionsVisited,REGIONS);
});

test('reduced motion checks actual app motion and animation, not only matchMedia',()=>{
  const d={reduced:true,cameraMotion:false,animLevel:0};validateReducedMotion(d);
  for(const bad of [{...d,reduced:false},{...d,cameraMotion:true},{...d,animLevel:2}])assert.throws(()=>validateReducedMotion(bad));
});

test('normal startup accepts one visible player while explicit cast still requires three bodies',()=>{
  const s=sample();s.holders=1;s.stats={live:1,created:1,removed:0,failedTemplates:0};
  validateSample(s,true,1);
  assert.throws(()=>validateSample(s,true,3));
});

test('normal and explicit browser fixtures keep saved relationships intact and cannot pass empty',()=>{
  const {placeCast,normalState,validateNormal}=require('../tools/meguru-3d-qa/cast-fixture.cjs');
  const h=require('./helpers/runtime-harness.cjs').harness({deterministic:true}),M=h.api.meguruMod,s=h.api.state();
  Object.assign(s,{stage:'growing',companions:[...h.api.normalCompanions,...h.api.rareCompanions].map(c=>({id:c.id,bond:100})),partner:{...h.api.partnerCandidates[0],affection:100}});
  s.lifetime.companionsRecruited=s.companions.map(c=>c.id);s.lifetime.partnersRecorded=[s.partner.id];
  const sim=M.createSimulation({regionId:'home'}),save=JSON.stringify(s);
  globalThis.__meguruRun={sim,get world(){return sim.world;},get party(){return sim.party;}};
  globalThis.__meguruBridge={getState:()=>s};globalThis.installNaotocchiMeguru=()=>M;
  globalThis.NaotocchiRelationshipLife=require('../relationship-life.js');
  try {
    const normal=normalState();validateNormal(normal,27);
    for(const mutate of [n=>n.party=1,n=>n.socialAvailable=false,n=>n.related.pop(),n=>n.related[0].withPlayer=true,n=>n.residentKeys=[]]){
      const n=structuredClone(normal);mutate(n);assert.throws(()=>validateNormal(n,27));
    }
    const f=placeCast();assert.equal(f.count,27);assert.equal(sim.party.length,27);
    assert.equal(sim.party.filter(a=>a.kind==='partner').length,1);
    assert.equal(new Set([...sim.party,...sim.world.residents].map(a=>a.key)).size,sim.party.length+sim.world.residents.length);
    sim.step(.1,{});assert.equal(sim.party.length,27);assert.equal(JSON.stringify(s),save);
    assert.throws(()=>placeCast(),/zero-party/);
    sim.enterRegion('forest');validateNormal(normalState(),27);
  } finally {for(const key of ['__meguruRun','__meguruBridge','installNaotocchiMeguru','NaotocchiRelationshipLife'])delete globalThis[key];}
});

test('smoke gate requires separate normal startup and nonempty explicit rendered cast',()=>{
  const {summarize}=require('../tools/meguru-3d-qa/ci-summary.cjs');
  const keys=Array.from({length:27},(_,i)=>'actor:'+i);
  const sample={is3D:true,failed:false,party:27,castKeys:keys,liveCast:keys,playerVisible:{ok:true,mode:'3d'}};
  const row={normal:{...sample,party:0,related:keys.map(key=>({key,withPlayer:false})),residentKeys:['actor:0'],expectedResidentKeys:['actor:0'],socialAvailable:true},fixture:{explicit:true,count:27,keys,saveUnchanged:true},entry:sample,afterWalk:sample,atSpot:sample,pen:{n:30,party:0,player:0},errors:[],consoleErrors:[],fallbackWarnings:[]};
  const results=Object.fromEntries(REGIONS.map(id=>[id,structuredClone(row)]));
  assert.deepEqual(summarize('smoke',results).issues,[]);
  for(const mutate of [r=>delete r.normal,r=>r.normal.party=27,r=>r.fixture.explicit=false,r=>r.entry.liveCast.pop(),r=>r.atSpot.party=0,r=>r.pen.n=0,r=>r.entry.playerVisible.ok=false]){
    const bad=structuredClone(results);mutate(bad.home);assert.ok(summarize('smoke',bad).issues.length>0);
  }
});
