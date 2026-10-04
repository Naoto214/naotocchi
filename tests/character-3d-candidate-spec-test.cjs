const test=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),path=require('path'),vm=require('vm');
test('human QA overlay exposes exact candidates only in served QA source, leaving runtime registry immutable',()=>{
 const {humanCandidateSource,loadHumanCandidates}=require('../tools/character-3d/candidate-spec.cjs');
 const source=fs.readFileSync(path.join(__dirname,'../character-3d/spec.js'),'utf8'),runtime=require('../character-3d/spec.js'),qa=loadHumanCandidates();
 assert.equal(runtime.ROLLOUT.woman,undefined);assert.equal(runtime.ROLLOUT.ren,undefined);
 assert.deepEqual(JSON.parse(JSON.stringify(qa.specKeyFor({line:'woman',stage:7}))),{id:'woman',stage:8,exact:true});assert.equal(qa.specKeyFor({line:'woman',stage:1}),null,'no generic gap filling');assert.ok(qa.ROLLOUT.man.stages[2]);
 const context={NaotocchiCharacter3DRollout:require('../character-3d/rollout-spec.js')};vm.runInNewContext(humanCandidateSource(source),context);assert.equal(context.NaotocchiCharacter3DSpec.ROLLOUT.woman.stages[8].poseProfile.seated,true);
 assert.equal(fs.readFileSync(path.join(__dirname,'../character-3d/spec.js'),'utf8'),source);assert.equal(runtime.ROLLOUT.woman,undefined);assert.throws(()=>humanCandidateSource('bad source'),/boundary/);
});
