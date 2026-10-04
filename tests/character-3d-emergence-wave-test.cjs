const test=require('node:test'),assert=require('node:assert/strict');
const SPEC=require('../character-3d/spec.js');
test('emergence keeps one butterfly face, articulated narrow wings, and an opened empty shell under a twig',async()=>{
 const {wingedInsect}=await import('../character-3d/archetypes.mjs'),base=SPEC.PILOT.butterfly.stages[8];
 const sp={...base,wings:{...base.wings,span:.68,vertical:.75},normalEye:'round',emergence:{h:.64,r:.17,at:[.43,0,-.06],branchY:.76,colors:{base:'#93ce39',inside:'#d7ed92',dark:'#4d922c'}}};
 const rig=wingedInsect(sp,'emergence-fixture');assert.ok(rig.bones.emptyShell,'visible shell attachment exists');assert.ok(rig.bones.branch,'original twig preserved');assert.equal(Array.isArray(rig.faceSpec),false,'empty shell must not acquire a face');
 const g=rig.parts.find(p=>p.bone==='emptyShell').mesh.geometry;g.computeBoundingBox();assert.ok(g.boundingBox.max.z-g.boundingBox.min.z>.2,'shell has depth');
 const {THREE}=await import('../character-3d/geometry.mjs');
 const mesh=rig.parts.find(p=>p.bone==='emptyShell').mesh;rig.root.updateMatrixWorld(true);
 const ray=new THREE.Raycaster(new THREE.Vector3(.43,.36,1),new THREE.Vector3(0,0,-1));const hits=ray.intersectObject(mesh);
 assert.ok(hits.length>0,'back of empty casing remains');assert.ok(hits[0].point.z<-.03,'opened front exposes interior, not a closed pod');
 assert.equal(rig.faceSpec.normalEye,'round');
});
test('partly unfolded forewings retain less upward span than adult wings',async()=>{
 const {wingedInsect}=await import('../character-3d/archetypes.mjs'),base=SPEC.PILOT.butterfly.stages[8];
 const bounds=sp=>{const r=wingedInsect(sp,'wing-fixture'),g=r.parts.find(p=>p.bone==='wingL').mesh.geometry;g.computeBoundingBox();return g.boundingBox;};
 const adult=bounds(base),emerging=bounds({...base,wings:{...base.wings,foreScale:.50}});
 assert.ok(emerging.max.y<adult.max.y*.7,'forewing profile changes independently from hindwing');assert.ok(Math.abs(emerging.min.y-adult.min.y)<.01,'hindwing is retained');
});
test('original emergence candidate has one canonical face and active wings through reduced motion',async()=>{
 const sp=require('../character-3d/topology-spec.js')(SPEC.PILOT).butterfly?.stages[6];assert.ok(sp,'explicit original-derived06 candidate');
 const {wingedInsect}=await import('../character-3d/archetypes.mjs'),{attachFace}=await import('../character-3d/rig.mjs'),{instantiate}=await import('../character-3d/runtime.mjs'),{animate,setEmotion}=await import('../character-3d/animate.mjs');
 const r=wingedInsect(sp,'butterfly:6');r.faces=[attachFace(r,r.faceSpec,'C')];assert.equal(r.faces[0].eyes.length,2);for(const part of r.parts)assert.ok([...part.mesh.geometry.attributes.position.array].every(Number.isFinite));
 for(const animLv of [0,2]){const a=instantiate({rig:r,key:'butterfly:6'});const before=a.bones.wingL.rotation.y;for(let i=0;i<20;i++)animate(a,{dt:.05,moving:true,animLv});assert.ok(Math.abs(a.bones.wingL.rotation.y-before)>.03);for(const em of SPEC.CANONICAL_EMOTIONS){setEmotion(a,em);animate(a,{dt:.1,moving:true,animLv});assert.equal(a.faces.length,1);assert.equal(a.faces[0].emotion,em);}}
 assert.equal(SPEC.ROLLOUT.butterfly,undefined,'no promotion before image review');
});
