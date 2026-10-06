const test=require('node:test'),assert=require('node:assert/strict');
test('armored grubs preserve curved segmented cream body, dark head and exactly three thoracic foot pairs',async()=>{
 const rows=require('../character-3d/armored-spec.js')(),{BUILDERS}=await import('../character-3d/archetypes.mjs'),{attachFace}=await import('../character-3d/rig.mjs');
 for(const id of ['beetle','stagbeetle']){
  const sp=rows[id].stages[3];assert.ok(sp,'explicit original-derived curved grub');assert.equal(sp.archetype,'larva');
  assert.equal(sp.thoracicFeet.length,3);assert.ok(sp.bodyPath.length>=5);assert.equal(sp.feetPerSection,0);
  const r=BUILDERS.larva(sp,id+':3');assert.equal(r.locomotion,'inchCrawl');assert.equal(attachFace(r,r.faceSpec,'C').eyes.length,2);
  if(id==='stagbeetle')assert.deepEqual(r.faceSpec.normalEye,{left:'round',right:'happy'},'original grub has a round eye and a wink');
  const antenna=BUILDERS.larva({...sp,antennae:true},'antennae');assert.ok(r.parts.find(p=>p.bone==='head').mesh.geometry.attributes.position.count<antenna.parts.find(p=>p.bone==='head').mesh.geometry.attributes.position.count,'grub head omits unrelated pale antennae');
  const without=BUILDERS.larva({...sp,thoracicFeet:[]},'no-legs');assert.ok(r.parts.reduce((n,p)=>n+p.mesh.geometry.attributes.position.count,0)>without.parts.reduce((n,p)=>n+p.mesh.geometry.attributes.position.count,0)+200,'six physical folded legs');
  assert.ok(r.bones.head.position.y>.45&&r.bones.head.position.x>.15,'C-shaped centerline places head above and to the side of the tail');
  const colors=r.parts.flatMap(p=>[...p.mesh.geometry.attributes.color.array]);assert.ok(colors.every(Number.isFinite));
  for(const p of r.parts)assert.ok([...p.mesh.geometry.attributes.position.array].every(Number.isFinite));
 }
});
test('amber pupae have a ringed upright abdomen, folded limb cases and species-specific developing head organs',async()=>{
 const rows=require('../character-3d/armored-spec.js')(),{BUILDERS}=await import('../character-3d/archetypes.mjs'),{attachFace}=await import('../character-3d/rig.mjs');
 for(const id of ['beetle','stagbeetle']){
  const sp=rows[id].stages[4];assert.ok(sp,'explicit amber pupa');assert.equal(sp.shape,'insectPupa');
  const r=BUILDERS.pod(sp,id+':4');assert.equal(r.locomotion,'hopSway');assert.equal(r.bones.head.parent,r.bones.body);assert.equal(attachFace(r,r.faceSpec,'C').eyes.length,2);
  assert.equal(r.meta.foldedLegs,6);assert.equal(r.meta.developingHorn,id==='beetle');
  const bare=BUILDERS.pod({...sp,foldedLegs:[]},'bare-pupa');assert.ok(r.parts.find(p=>p.bone==='body').mesh.geometry.attributes.position.count>bare.parts.find(p=>p.bone==='body').mesh.geometry.attributes.position.count+200,'folded legs are physical');
  const noHorn=BUILDERS.pod({...sp,horn:null},'no-horn');if(id==='beetle')assert.ok(r.parts.find(p=>p.bone==='head').mesh.geometry.attributes.position.count>noHorn.parts.find(p=>p.bone==='head').mesh.geometry.attributes.position.count+100,'developing forked horn is physical');
  for(const p of r.parts)assert.ok([...p.mesh.geometry.attributes.position.array].every(Number.isFinite));
 }
});
test('grub and pupa representatives retain canonical faces and finite whole-actor motion',async()=>{
 const rows=require('../character-3d/armored-spec.js')(),SPEC=require('../character-3d/spec.js');
 const {BUILDERS}=await import('../character-3d/archetypes.mjs'),{attachFace}=await import('../character-3d/rig.mjs'),{instantiate}=await import('../character-3d/runtime.mjs'),{animate,setEmotion}=await import('../character-3d/animate.mjs');
 for(const id of ['beetle','stagbeetle'])for(const stage of [3,4]){
  const sp=rows[id].stages[stage],r=BUILDERS[sp.archetype](sp,id+':'+stage);r.faces=[attachFace(r,r.faceSpec,'C')];
  for(const em of SPEC.CANONICAL_EMOTIONS)for(const moving of [false,true])for(const animLv of [0,2]){
   const a=instantiate({rig:r,key:id+':'+stage});setEmotion(a,em);for(let n=0;n<20;n++)animate(a,{dt:.05,moving,animLv});assert.equal(a.faces[0].emotion,em);
   for(const b of Object.values(a.bones))assert.ok([...b.position.toArray(),...b.scale.toArray(),...b.rotation.toArray().slice(0,3)].every(Number.isFinite));
  }
 }
});

test('grub tail is sealed and pupal abdomen rings visibly project outside the body',async()=>{
 const rows=require('../character-3d/armored-spec.js')(),{BUILDERS}=await import('../character-3d/archetypes.mjs');
 for(const id of ['beetle','stagbeetle']){
  const sp=rows[id].stages[3],r=BUILDERS.larva(sp,'sealed'),open=BUILDERS.larva({...sp,tailSeal:false},'open');
  assert.ok(r.parts[0].mesh.geometry.attributes.position.count>open.parts[0].mesh.geometry.attributes.position.count+100,'physical rounded seal closes the visible tail opening');
  const p=rows[id].stages[4],pu=BUILDERS.pod(p,'rings'),g=pu.parts[0].mesh.geometry.attributes.position;
  let front=-Infinity;for(let i=0;i<g.count;i++)if(Math.abs(g.getX(i))<.025&&Math.abs(g.getY(i)-p.h*.26)<.014)front=Math.max(front,g.getZ(i));
  assert.ok(front>p.r*.855,'second abdomen ring protrudes beyond the unringed profile');
 }
});
