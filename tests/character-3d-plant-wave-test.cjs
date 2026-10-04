const test=require('node:test'),assert=require('node:assert/strict');
const SPEC=require('../character-3d/spec.js');
// Removing closed-bud volume must lose vertical depth; substituting a flat flower is invalid.
test('closed bud has tall continuous head and overlapping green sepals',async()=>{
 const {plant}=await import('../character-3d/archetypes.mjs');
 const base=SPEC.PILOT.dandelion.stages[6];
 const sp={...base,form:'bud',stem:.62,head:.29,bud:{height:.76,depth:.27,sepals:5},colors:{...base.colors,face:'#ffe342'}};
 const rig=plant(sp,'bud-fixture'),target=rig.faceSpec.target;target.computeBoundingBox();const b=target.boundingBox;
 assert.ok(b.max.y-b.min.y>.70,'closed bud retains vertical volume');
 assert.ok(b.max.z-b.min.z>.45,'bud has back volume, not a flower disc');
 assert.ok(rig.parts.some(p=>p.bone==='head'&&p.mesh.geometry.attributes.position.count>target.attributes.position.count),'sepals overlap head in shared draw');
});
// Rooted puff must keep the stem/root and rounded lobes rather than the detached cluster.
test('rooted seed head keeps soft three-dimensional ring and a connected stem',async()=>{
 const {plant}=await import('../character-3d/archetypes.mjs');
 const base=SPEC.PILOT.dandelion.stages[6],sp={...base,form:'seedHead',head:.42,seedHead:{lobes:22,depth:.28},colors:{...base.colors,face:'#fff4df',pappus:'#fffdf4'}};
 const rig=plant(sp,'seed-head-fixture');
 assert.ok(rig.bones.head.parent===rig.bones.stem);
 const target=rig.faceSpec.target;target.computeBoundingBox();assert.ok(target.boundingBox.max.z-target.boundingBox.min.z>.45,'rooted head has volume');
 const g=rig.parts.find(p=>p.bone==='head').mesh.geometry;g.computeBoundingBox();assert.ok(g.boundingBox.max.x-g.boundingBox.min.x>1.0,'soft lobes surround central face');
 assert.ok(g.index.count/3<5000,'bounded merged lobe geometry');
});
test('original bud and rooted-puff candidates retain all canonical expressions and finite motion',async()=>{
 const fs=require('node:fs');assert.ok(fs.existsSync(require('node:path').join(__dirname,'../character-3d/topology-spec.js')),'topology candidates exist');
 const row=require('../character-3d/topology-spec.js')(SPEC.PILOT).dandelion;
 const {plant}=await import('../character-3d/archetypes.mjs'),{attachFace}=await import('../character-3d/rig.mjs'),{instantiate}=await import('../character-3d/runtime.mjs'),{animate,setEmotion}=await import('../character-3d/animate.mjs');
 for(const stage of [5,7]){
  const sp=row.stages[stage],rig=plant(sp,'dandelion:'+stage);rig.faces=[attachFace(rig,rig.faceSpec,'C')];assert.equal(rig.faces[0].eyes.length,2,'face projects onto actual head');
  for(const part of rig.parts)assert.ok([...part.mesh.geometry.attributes.position.array].every(Number.isFinite));
  for(const moving of [false,true])for(const animLv of [0,2]){const actor=instantiate({rig,key:'dandelion:'+stage});for(const emotion of SPEC.CANONICAL_EMOTIONS){setEmotion(actor,emotion);animate(actor,{dt:.1,moving,animLv});assert.equal(actor.faces[0].emotion,emotion);for(const b of Object.values(actor.bones))assert.ok([...b.position.toArray(),...b.scale.toArray(),b.rotation.x,b.rotation.y,b.rotation.z].every(Number.isFinite));}}
 }
 assert.equal(SPEC.ROLLOUT.dandelion,undefined,'unreviewed candidates stay outside promoted runtime');
});
