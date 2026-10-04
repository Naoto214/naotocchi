const test=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),path=require('path'),vm=require('vm');
test('human QA overlay exposes exact candidates only in served QA source, leaving runtime registry immutable',()=>{
 const {humanCandidateSource,loadHumanCandidates}=require('../tools/character-3d/candidate-spec.cjs');
 const source=fs.readFileSync(path.join(__dirname,'../character-3d/spec.js'),'utf8'),runtime=require('../character-3d/spec.js'),keys=Object.keys(runtime.ROLLOUT),factory=pilot=>({qaHumanFixture:pilot.man}),qa=loadHumanCandidates(factory);
 assert.equal(runtime.ROLLOUT.qaHumanFixture,undefined);
 assert.deepEqual(JSON.parse(JSON.stringify(qa.specKeyFor({line:'qaHumanFixture',stage:7}))),{id:'qaHumanFixture',stage:8,exact:true});assert.equal(qa.specKeyFor({line:'koala',stage:1}),null,'no generic species filling');assert.ok(qa.ROLLOUT.man.stages[2]);
 const context={NaotocchiCharacter3DRollout:require('../character-3d/rollout-spec.js')};vm.runInNewContext(humanCandidateSource(source,factory),context);assert.equal(context.NaotocchiCharacter3DSpec.ROLLOUT.qaHumanFixture.stages[8].clothing,'cardigan');
 assert.equal(fs.readFileSync(path.join(__dirname,'../character-3d/spec.js'),'utf8'),source);assert.deepEqual(Object.keys(runtime.ROLLOUT),keys);assert.equal(runtime.ROLLOUT.qaHumanFixture,undefined);assert.throws(()=>humanCandidateSource('bad source'),/boundary/);
});
test('topology QA selection is isolated, explicit and rejects unknown lines or mixed modes',()=>{
 const {candidateConfig}=require('../tools/character-3d/candidate-spec.cjs');assert.equal(typeof candidateConfig,'function');
 const args=['--candidate-topology','--rollout','--species-only','--line','dandelion'],c=candidateConfig(args);
 assert.equal(c.kind,'topology');assert.deepEqual(Object.keys(c.spec.ROLLOUT.dandelion.stages),['1','2','3','4','5','6','7','8']);
 assert.equal(require('../character-3d/spec.js').ROLLOUT.dandelion,undefined);
 for(const a of [['--candidate-topology'],[...args,'--candidate-human'],['--candidate-topology','--rollout','--species-only','--line','man']])assert.throws(()=>candidateConfig(a));
});
