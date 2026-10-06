const test=require('node:test'),assert=require('node:assert/strict'),SPEC=require('../character-3d/spec.js');
test('flowering sakura has rooted branch volume, attached five-petal blossom clusters and one trunk face',async()=>{
 const rows=require('../character-3d/botanical-spec.js')(),sp=rows.sakura.stages[4];assert.ok(sp);
 const {branchOrganism}=await import('../character-3d/branch-organism.mjs'),{attachFace}=await import('../character-3d/rig.mjs');
 const r=branchOrganism(sp,'sakura:4'),bare=branchOrganism({...sp,blossoms:[]},'bare');assert.equal(r.locomotion,'plantSway');assert.ok(sp.blossoms.length>=15);
 assert.ok(r.parts[0].mesh.geometry.attributes.position.count>bare.parts[0].mesh.geometry.attributes.position.count+2000,'flowers are physical petal volumes');
 assert.equal(attachFace(r,r.faceSpec,'C').eyes.length,2);assert.ok(r.faceSpec.center[1]<.5,'one face belongs to the lower trunk, not the flowers');
 let tri=0;for(const p of r.parts){assert.ok([...p.mesh.geometry.attributes.position.array].every(Number.isFinite));tri+=(p.mesh.geometry.index?.count||p.mesh.geometry.attributes.position.count)/3;}assert.ok(tri<22000);
 assert.ok(sp.branches.filter(b=>b.path.at(-1)[1]<.08).length>=4,'splayed original roots are explicit');
});
test('botanical candidate lookup is isolated and canonical emotions retain the single owning tree',async()=>{
 const {candidateConfig}=require('../tools/character-3d/candidate-spec.cjs'),before=JSON.stringify(SPEC.ROLLOUT);
 const c=candidateConfig(['--candidate-botanical','--rollout','--species-only','--line','sakura']);assert.ok(c);assert.equal(c.spec.stageSpec('sakura',4).archetype,'branch_organism');assert.equal(JSON.stringify(SPEC.ROLLOUT),before);assert.equal(SPEC.specKeyFor({line:'sakura',stage:3}),null);
 assert.throws(()=>candidateConfig(['--candidate-botanical','--candidate-armored','--rollout','--species-only','--line','sakura']));
 const {branchOrganism}=await import('../character-3d/branch-organism.mjs'),{attachFace}=await import('../character-3d/rig.mjs'),{instantiate}=await import('../character-3d/runtime.mjs'),{animate,setEmotion}=await import('../character-3d/animate.mjs');const r=branchOrganism(c.spec.stageSpec('sakura',4),'sakura:4');r.faces=[attachFace(r,r.faceSpec,'C')];
 for(const emotion of SPEC.CANONICAL_EMOTIONS)for(const moving of [false,true])for(const animLv of [0,2]){const a=instantiate({rig:r,key:'sakura:4'});setEmotion(a,emotion);for(let n=0;n<20;n++)animate(a,{dt:.05,moving,animLv});assert.equal(a.faces.length,1);assert.equal(a.faces[0].emotion,emotion);for(const b of Object.values(a.bones))assert.ok([...b.position.toArray(),...b.rotation.toArray().slice(0,3)].every(Number.isFinite));}
});
