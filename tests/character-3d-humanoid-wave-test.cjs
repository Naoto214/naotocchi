const test=require('node:test'),assert=require('node:assert/strict');
const SPEC=require('../character-3d/spec.js');
test('human candidates have short clothing volume and a case joined to the moving hand',async()=>{
 const rows=require('../character-3d/humanoid-spec.js')(SPEC.PILOT),{humanoid}=await import('../character-3d/archetypes.mjs');
 const toddler=humanoid(rows.man.stages[2],'man:2'),adult=humanoid(rows.man.stages[6],'man:6');
 const {THREE}=await import('../character-3d/geometry.mjs');
 const colourInRegion=(bone,minY,maxY,hex)=>{const g=toddler.parts.find(p=>p.bone===bone).mesh.geometry,p=g.attributes.position,c=g.attributes.color,expected=new THREE.Color(hex).toArray();let n=0;for(let i=0;i<p.count;i++)if(p.getY(i)>minY&&p.getY(i)<maxY&&[c.getX(i),c.getY(i),c.getZ(i)].every((v,k)=>Math.abs(v-expected[k])<.001))n++;return n;};
 assert.ok(colourInRegion('armL',-.25,-.14,rows.man.stages[2].colors.skin)>0,'forearm itself has skin, excluding the hand');
 assert.ok(colourInRegion('legL',-.20,-.14,rows.man.stages[2].colors.skin)>0,'calf itself has skin, excluding socks/shoes');
 assert.ok(adult.bones.heldCase.parent===adult.bones.armL,'prop shares the hand motion');
 assert.deepEqual(adult.bones.heldCase.position.toArray(),adult.meta.handEnds.left);
 assert.ok(adult.parts.find(p=>p.bone==='heldCase'),'visible bag and handle volume');
 for(const rig of [toddler,adult]){rig.root.updateMatrixWorld(true);const l=new THREE.Box3().setFromObject(rig.bones.legL),r=new THREE.Box3().setFromObject(rig.bones.legR);assert.ok(r.min.x-l.max.x>.01,'original standing feet have a readable gap');}
 for(const rig of [toddler,adult])for(const part of rig.parts)assert.ok([...part.mesh.geometry.attributes.position.array].every(Number.isFinite));
 assert.equal(SPEC.ROLLOUT.man,undefined,'candidates do not silently promote before visual review');
});
test('spread-arm identity releases into existing locomotion without changing canonical emotions',async()=>{
 const row=require('../character-3d/humanoid-spec.js')(SPEC.PILOT).man,{humanoid}=await import('../character-3d/archetypes.mjs'),{attachFace}=await import('../character-3d/rig.mjs'),{instantiate}=await import('../character-3d/runtime.mjs'),{animate,setEmotion}=await import('../character-3d/animate.mjs');
 function inst(){const rig=humanoid(row.stages[2],'man:2');rig.faces=[attachFace(rig,rig.faceSpec,'C')];return instantiate({rig,key:'man:2'});}
 for(const animLv of [0,2]){
  const idle=inst(),moving=inst();for(let i=0;i<40;i++){animate(idle,{dt:1/30,moving:false,animLv});animate(moving,{dt:1/30,moving:true,animLv});}
  assert.ok(Math.abs(idle.bones.armL.rotation.z)>.8,'normal pose spreads the arms');
  assert.ok(Math.abs(moving.bones.armL.rotation.z)<.3,'walk releases the pose');
  for(const emotion of ['normal','positive','dislike','tired','sleeping','strained','wantsPlay','sick']){setEmotion(moving,emotion);animate(moving,{dt:.1,moving:true,animLv});assert.equal(moving.faces[0].emotion,emotion);}
 }
});
