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
test('larval forebody lift and foot rhythm vary without changing inherited Pilot posture',async()=>{
 const {larva}=await import('../character-3d/archetypes.mjs');const base=SPEC.PILOT.butterfly.stages[1];
 const low=larva(base,'low'),raised=larva({...base,foreRise:2.4,feetPerSection:2},'raised');assert.ok(raised.bones.head.position.y>low.bones.head.position.y+.15,'upright forebody raises the head');
 const count=r=>r.parts.filter(p=>p.bone.startsWith('seg')).reduce((n,p)=>n+p.mesh.geometry.attributes.position.count,0);assert.ok(count(raised)<count(low),'six foot pairs differ from inherited nine');
});
test('all eight butterfly candidates preserve Pilot topology and distinguish larval growth and unfolded wings',async()=>{
 const row=require('../character-3d/topology-spec.js')(SPEC.PILOT).butterfly;assert.deepEqual(Object.keys(row.stages).map(Number),[1,2,3,4,5,6,7,8]);
 for(const s of [1,4,5,8])assert.deepEqual(row.stages[s],SPEC.PILOT.butterfly.stages[s]);
 const {BUILDERS}=await import('../character-3d/archetypes.mjs'),{attachFace}=await import('../character-3d/rig.mjs'),{instantiate}=await import('../character-3d/runtime.mjs'),{animate,setEmotion}=await import('../character-3d/animate.mjs');
 for(const s of [2,3,6,7]){const sp=row.stages[s],r=BUILDERS[sp.archetype](sp,'butterfly:'+s);r.faces=[attachFace(r,r.faceSpec,'C')];assert.equal(r.faces[0].eyes.length,2);for(const p of r.parts)assert.ok([...p.mesh.geometry.attributes.position.array].every(Number.isFinite));for(const em of SPEC.CANONICAL_EMOTIONS)for(const moving of [false,true])for(const animLv of [0,2]){const a=instantiate({rig:r,key:'butterfly:'+s});setEmotion(a,em);for(let n=0;n<10;n++)animate(a,{dt:.05,moving,animLv});assert.equal(a.faces[0].emotion,em);for(const b of Object.values(a.bones))assert.ok([...b.position.toArray(),...b.scale.toArray(),b.rotation.x,b.rotation.y,b.rotation.z].every(Number.isFinite));}}
 assert.ok(row.stages[3].head.r/row.stages[3].len>row.stages[2].head.r/row.stages[2].len,'older larva has relatively larger head');
 assert.equal(BUILDERS.larva(row.stages[2],'larva2').faceSpec.normalEye,'round');assert.deepEqual(BUILDERS.larva(row.stages[3],'larva3').faceSpec.normalEye,{left:'round',right:'happy'});assert.deepEqual(BUILDERS.winged_insect(row.stages[7],'young-wing').faceSpec.normalEye,{left:'round',right:'happy'});
 const emerging=BUILDERS.winged_insect(row.stages[6],'emerging'),g=emerging.parts.find(p=>p.bone==='wingL').mesh.geometry;g.computeBoundingBox();assert.ok(-g.boundingBox.min.y>g.boundingBox.max.y*1.8,'newly emerged wings hang below the head');
});
