const test=require('node:test'),assert=require('node:assert/strict');
test('QA records all real colony faces instead of the multi-face wrapper setter',async()=>{
 const {snapshotCharacterState}=await import('../tools/character-3d/qa-state.mjs');
 const {branchOrganism}=await import('../character-3d/branch-organism.mjs'),{attachFace,applyFaceExpression}=await import('../character-3d/rig.mjs'),{instantiate}=await import('../character-3d/runtime.mjs'),{setEmotion}=await import('../character-3d/animate.mjs');
 const sp=require('../character-3d/aquatic-spec.js')().coral.stages[7],r=branchOrganism(sp,'coral:7');r.faces=r.faceSpec.map(f=>attachFace(r,f,'C'));
 const a=instantiate({rig:r,key:'coral:7'});setEmotion(a,'positive');
 const s=snapshotCharacterState(a);assert.equal(s.emotion,'positive');assert.deepEqual(s.faceEmotions,['positive','positive','positive']);
 applyFaceExpression(a.faces[1],'lonely');assert.throws(()=>snapshotCharacterState(a),/face emotion/);
});
