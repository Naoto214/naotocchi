const test=require('node:test'),assert=require('node:assert/strict'),SPEC=require('../character-3d/spec.js');
test('jellyfish representatives change rooted polyp into a volumetric bell with connected tentacles',async()=>{
 const rows=require('../character-3d/aquatic-spec.js')().jellyfish;assert.ok(rows,'original-derived polyp and bell representatives');
 const {BUILDERS}=await import('../character-3d/archetypes.mjs'),{attachFace}=await import('../character-3d/rig.mjs'),{instantiate}=await import('../character-3d/runtime.mjs'),{animate,setEmotion}=await import('../character-3d/animate.mjs');
 for(const stage of [1,4,7]){const sp=rows.stages[stage],r=BUILDERS[sp.archetype](sp,'jellyfish:'+stage);r.faces=[attachFace(r,r.faceSpec,'C')];
  for(const p of r.parts)assert.ok([...p.mesh.geometry.attributes.position.array].every(Number.isFinite));
  if(stage!==1){assert.ok(r.parts.some(p=>p.bone==='body'&&p.mesh.material.transparent),'translucent physical bell');assert.equal(Object.keys(r.bones).filter(n=>n.startsWith('tentacle')).length,4,'merged tentacle groups retain bounded draw cost');const body=r.parts.find(p=>p.bone==='body').mesh.geometry;body.computeBoundingBox();assert.ok(body.boundingBox.max.z-body.boundingBox.min.z>.5,'bell side volume');}
  for(const em of SPEC.CANONICAL_EMOTIONS)for(const moving of [false,true])for(const animLv of [0,2]){const a=instantiate({rig:r,key:'jellyfish:'+stage});setEmotion(a,em);for(let n=0;n<20;n++)animate(a,{dt:.05,moving,animLv});assert.equal(a.faces[0].emotion,em);if(stage!==1&&em==='normal'&&animLv===2&&!moving)assert.notEqual(a.bones.tentacle0.rotation.z,0,'attached filaments respond to owner time');for(const b of Object.values(a.bones))assert.ok([...b.position.toArray(),...b.scale.toArray(),...b.rotation.toArray().slice(0,3)].every(Number.isFinite));}
 }
 assert.ok(rows.stages[7].tentacles.length>rows.stages[4].tentacles.length,'mature fine trailing filaments');
 assert.equal(SPEC.ROLLOUT.jellyfish,undefined,'representatives do not inflate coverage');
});
test('jellyfish face stays on the visible inner volume above the bell rim',async()=>{
 const {jellyOrganism}=await import('../character-3d/jelly-organism.mjs'),{THREE,faceFrame,projectPoint}=await import('../character-3d/geometry.mjs');
 const rows=require('../character-3d/aquatic-spec.js')().jellyfish.stages;
 for(const stage of [4,7]){const sp=rows[stage],r=jellyOrganism(sp,'face:'+stage),f=r.faceSpec;
  assert.ok(f.center[1]-f.half*18/64>sp.bell.height*.15,'mouth remains above the lower rim');
  assert.equal(r.parts.find(p=>p.bone==='body'&&!p.mesh.material.transparent).mesh.geometry.attributes.position.count,f.target.attributes.position.count,'face projects onto the rendered inner volume');
  const mesh=new THREE.Mesh(f.target,new THREE.MeshBasicMaterial({side:THREE.DoubleSide}));mesh.updateMatrixWorld(true);const fr=faceFrame(f.center,f.fwd,[0,1,0]);
  for(const [px,py]of [[40,56],[88,56],[64,82],[26,72],[102,72]])assert.ok(projectPoint(mesh,fr,(px-64)*f.half/64,(64-py)*f.half/64,.001),'eyes, mouth and cheeks all hit the inner volume');
 }
});
