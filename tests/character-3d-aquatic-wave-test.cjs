const test=require('node:test'),assert=require('node:assert/strict'),SPEC=require('../character-3d/spec.js');
const candidates=()=>require('../character-3d/aquatic-spec.js')(SPEC.PILOT);
test('coral representatives have rounded connected branches in one bounded mesh',async()=>{
 const {BUILDERS}=await import('../character-3d/archetypes.mjs');
 const rows=candidates().coral.stages;
 for(const stage of [2,5]){
  const sp=rows[stage],r=BUILDERS[sp.archetype](sp,'coral:'+stage);
  assert.equal(r.locomotion,'plantSway');assert.ok(r.bones.body&&r.bones.leavesA&&r.bones.leavesB);
  const branch=r.parts.find(p=>p.bone==='body').mesh.geometry;branch.computeBoundingBox();
  assert.ok(branch.boundingBox.max.x>.40,'lateral organic branches extend beyond face-bearing body');
  assert.ok(branch.boundingBox.max.y>.65,'upper branches retain source silhouette');
  assert.ok(branch.boundingBox.max.z-branch.boundingBox.min.z>.25,'coherent side volume');
  assert.ok(r.parts.length<=3,'branches are merged, not one draw each');
  for(const p of r.parts)assert.ok([...p.mesh.geometry.attributes.position.array].every(Number.isFinite));
  const bare=structuredClone(sp);bare.branches=[];
  const r0=BUILDERS[sp.archetype](bare,'coral:'+stage);
  assert.ok(branch.attributes.position.count>r0.parts.find(p=>p.bone==='body').mesh.geometry.attributes.position.count+500,'removing branches must remove real geometry');
 }
 assert.equal(SPEC.ROLLOUT.coral,undefined,'candidate is not counted as reviewed runtime coverage');
});
test('aquatic representative faces follow canonical emotions and reduced motion without actor state',async()=>{
 const {BUILDERS}=await import('../character-3d/archetypes.mjs'),{attachFace}=await import('../character-3d/rig.mjs'),{instantiate}=await import('../character-3d/runtime.mjs'),{animate,setEmotion}=await import('../character-3d/animate.mjs');
 for(const [stage,sp]of Object.entries(candidates().coral.stages)){
 const r=BUILDERS[sp.archetype](sp,'coral:'+stage);r.faces=[attachFace(r,r.faceSpec,'C')];
 for(const em of SPEC.CANONICAL_EMOTIONS)for(const moving of [false,true])for(const animLv of [0,2]){
  const a=instantiate({rig:r,key:'coral:'+stage});setEmotion(a,em);for(let n=0;n<20;n++)animate(a,{dt:.05,moving,animLv});
  assert.equal(a.faces[0].emotion,em);if(moving&&animLv===2&&em==='normal')assert.ok(a.root.position.y>0,'existing plant locomotion moves the single root');for(const b of Object.values(a.bones))assert.ok([...b.position.toArray(),...b.scale.toArray(),...b.rotation.toArray().slice(0,3)].every(Number.isFinite));
 }
 }
});
test('aquatic candidate overlay is isolated and requires an exact family',()=>{
 const {candidateConfig}=require('../tools/character-3d/candidate-spec.cjs');
 const c=candidateConfig(['--candidate-aquatic','--rollout','--species-only','--line','coral']);
 assert.ok(c,'aquatic candidate route exists');assert.equal(c.spec.stageSpec('coral',5).archetype,'branch_organism');
 assert.equal(SPEC.stageSpec('coral',5),null);
 assert.throws(()=>candidateConfig(['--candidate-aquatic','--candidate-topology','--rollout','--species-only','--line','coral']));
 assert.throws(()=>candidateConfig(['--candidate-aquatic','--rollout','--species-only','--line','missing']));
});
