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
