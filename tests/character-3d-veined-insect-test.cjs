const test=require('node:test'),assert=require('node:assert/strict');
test('cicada adult has four thin physical veined wings and ringed abdomen on the shared six-leg body',async()=>{
 const sp=require('../character-3d/armored-spec.js')().cicada?.stages[7];assert.ok(sp,'original-derived mature cicada');
 const {armoredInsect}=await import('../character-3d/armored-insect.mjs'),{attachFace}=await import('../character-3d/rig.mjs');
 const r=armoredInsect(sp,'cicada:7');assert.equal(Object.keys(r.bones).filter(k=>k.startsWith('wing')).length,4);assert.equal(r.bones.shellL,undefined,'membranous wings are not beetle covers');assert.equal(attachFace(r,r.faceSpec,'C').eyes.length,2);
 for(const p of r.parts.filter(p=>p.bone.startsWith('wing'))){assert.ok(p.mesh.material.transparent,'thin translucent membrane');p.mesh.geometry.computeBoundingBox();assert.ok(p.mesh.geometry.boundingBox.max.z-p.mesh.geometry.boundingBox.min.z>0,'volumetric membrane, not billboard');}
 assert.equal(r.parts.filter(p=>p.bone.startsWith('veins')).length,4,'opaque veins stay visible over membrane');
 const plain=armoredInsect({...sp,abdomenBands:null},'plain');assert.notDeepEqual([...r.parts[0].mesh.geometry.attributes.color.array],[...plain.parts[0].mesh.geometry.attributes.color.array],'abdomen rings are rendered');
 for(const p of r.parts)assert.ok([...p.mesh.geometry.attributes.position.array].every(Number.isFinite));
});
test('veined wings use the owner motion clock while canonical expressions and reduced motion stay intact',async()=>{
 const sp=require('../character-3d/armored-spec.js')().cicada.stages[7],SPEC=require('../character-3d/spec.js');
 const {armoredInsect}=await import('../character-3d/armored-insect.mjs'),{attachFace}=await import('../character-3d/rig.mjs'),{instantiate}=await import('../character-3d/runtime.mjs'),{animate,setEmotion}=await import('../character-3d/animate.mjs');
 const r=armoredInsect(sp,'cicada:7');r.faces=[attachFace(r,r.faceSpec,'C')];
 let tris=0;for(const p of r.parts)tris+=(p.mesh.geometry.index?.count||p.mesh.geometry.attributes.position.count)/3;assert.ok(tris<22000);
 for(const em of SPEC.CANONICAL_EMOTIONS)for(const moving of [false,true])for(const animLv of [0,2]){
  const a=instantiate({rig:r,key:'cicada:7'});setEmotion(a,em);for(let n=0;n<20;n++)animate(a,{dt:.05,moving,animLv});assert.equal(a.faces[0].emotion,em);
  if(em==='normal'&&moving&&animLv===2)assert.notEqual(a.bones.wing0.rotation.y,r.bones.wing0.rotation.y,'attached wings move with owner time');
  for(const b of Object.values(a.bones))assert.ok([...b.position.toArray(),...b.rotation.toArray().slice(0,3)].every(Number.isFinite));
 }
});
