const test=require('node:test'),assert=require('node:assert/strict'),SPEC=require('../character-3d/spec.js');
test('Meguru family shards require exact inventory keys, never empty or partial green',()=>{
 const {stageTargets,validateStages,mergeStages}=require('../tools/character-3d/stage-evidence.cjs');
 const all=stageTargets(SPEC,['--rollout']),fish=stageTargets(SPEC,['--rollout','--line','salmon']);
 const count=Object.values(SPEC.ROLLOUT_STAGE_KEYS).reduce((n,a)=>n+a.length,0);
 assert.equal(all.length,count);assert.ok(count>0);assert.equal(fish.length,8);assert.throws(()=>stageTargets(SPEC,['--rollout','--line','missing']),/unknown/);
 assert.throws(()=>stageTargets(SPEC,['--rollout','--line']),/requires/);
 const record=keys=>Object.fromEntries(keys.map(k=>[k,{player3d:true,specKey:{id:k.split(':')[0],exact:true,stage:Number(k.split(':')[1])},requestedStage:Number(k.split(':')[1]),errors:[],live:{fallbacks:0}}]));
 const valid=record(fish);assert.equal(validateStages(fish,valid),true);assert.equal(validateStages(fish,{}),false);
 const partial={...valid};delete partial['salmon:8'];assert.equal(validateStages(fish,partial),false);
 const shards=Object.keys(SPEC.ROLLOUT).map(line=>({sourceCommit:'source',perSpecies:record(stageTargets(SPEC,['--rollout','--line',line])),verdict:{pass:true}}));
 assert.equal(Object.keys(mergeStages(all,shards,'source')).length,count);
 assert.throws(()=>mergeStages(all,shards.slice(1),'source'),/coverage/);
 assert.throws(()=>mergeStages(all,[...shards,shards[0]],'source'),/duplicate/);
 assert.throws(()=>mergeStages(all,shards,'different'),/source/);
});
