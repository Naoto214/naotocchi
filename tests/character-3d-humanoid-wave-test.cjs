const test=require('node:test'),assert=require('node:assert/strict');
const SPEC=require('../character-3d/spec.js');
test('school and sports human representatives retain hair length, flared skirt, held bag and layered hood volumes',async()=>{
 const rows=require('../character-3d/humanoid-spec.js')(SPEC.PILOT);assert.ok(rows.woman?.stages[4]&&rows.ren?.stages[3]&&rows.ren?.stages[5],'original-derived representatives exist');
 const {humanoid}=await import('../character-3d/archetypes.mjs');
 const school=humanoid(rows.woman.stages[4],'woman:4'),sport=humanoid(rows.ren.stages[3],'ren:3'),hood=humanoid(rows.ren.stages[5],'ren:5');
 assert.ok(school.bones.skirt,'skirt is volume');const skirt=school.parts.find(p=>p.bone==='skirt').mesh.geometry;skirt.computeBoundingBox();assert.ok(skirt.boundingBox.max.x>rows.woman.stages[4].body.r*1.25);
 const head=school.parts.find(p=>p.bone==='head').mesh.geometry;head.computeBoundingBox();assert.ok(head.boundingBox.min.y<-.08,'long hair falls below head origin toward shoulders');
 assert.ok(school.bones.heldBag.parent===school.bones.armL,'strap and bag share hand pose');assert.deepEqual(school.bones.heldBag.position.toArray(),school.meta.handEnds.left);
 assert.ok(hood.bones.hood,'hood has rear volume rather than painted collar');assert.ok(sport.bones.playBall,'sports identity keeps the ball');
 for(const rig of [school,sport,hood])for(const p of rig.parts)assert.ok([...p.mesh.geometry.attributes.position.array].every(Number.isFinite));
});
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
test('sports signature stride releases into locomotion and jersey number stays a shared marking',async()=>{
 const rows=require('../character-3d/humanoid-spec.js')(SPEC.PILOT),sp=rows.ren.stages[3],{humanoid}=await import('../character-3d/archetypes.mjs'),{attachFace}=await import('../character-3d/rig.mjs'),{instantiate}=await import('../character-3d/runtime.mjs'),{animate}=await import('../character-3d/animate.mjs');
 assert.equal(sp.wardrobe.number,'26');
 function make(){const rig=humanoid(sp,'ren:3');rig.faces=[attachFace(rig,rig.faceSpec,'C')];return instantiate({rig,key:'ren:3'});}
 for(const animLv of [0,2]){const idle=make(),walk=make();for(let i=0;i<40;i++){animate(idle,{dt:1/30,moving:false,animLv});animate(walk,{dt:1/30,moving:true,animLv});}assert.ok(idle.bones.legR.rotation.x-idle.bones.legL.rotation.x>.7,'sports original has an asymmetric play stride');assert.ok(Math.abs(walk.bones.legR.rotation.x+walk.bones.legL.rotation.x)<.05,'signature offset releases into shared gait');}
 const withNumber=humanoid(sp,'ren:3'),without=humanoid({...sp,wardrobe:{...sp.wardrobe,number:null}},'ren:3');
 const tris=rig=>rig.parts.reduce((n,p)=>n+p.mesh.geometry.index.count/3,0);assert.ok(tris(withNumber)>tris(without));assert.ok(tris(withNumber)-tris(without)<100,'number is a bounded shared vertex-colour marking');assert.equal(withNumber.parts.length,without.parts.length,'no extra draw per numeral');
});
test('original neutral wink is per-eye and releases for every canonical emotion',async()=>{
 const sp=require('../character-3d/humanoid-spec.js')(SPEC.PILOT).woman.stages[4],{humanoid}=await import('../character-3d/archetypes.mjs'),{attachFace,applyFaceExpression}=await import('../character-3d/rig.mjs');
 const rig=humanoid(sp,'woman:4'),face=attachFace(rig,rig.faceSpec,'C');applyFaceExpression(face,'normal');assert.deepEqual(face.eyes.map(e=>e.userData.shape),['happy','round']);
 for(const em of SPEC.CANONICAL_EMOTIONS.filter(e=>e!=='normal')){applyFaceExpression(face,em);assert.ok(face.eyes.every(e=>e.userData.shape===SPEC.expressionParams(em).eye.shape));}
 assert.ok(sp.legs.len-sp.wardrobe.skirt.length>.17,'school skirt leaves calves visible');
});
test('seated held-pet profile preserves two faces and releases chair and bent knees into walking',async()=>{
 const sp=require('../character-3d/humanoid-spec.js')(SPEC.PILOT).woman.stages[8];assert.ok(sp,'seated original has an explicit candidate');
 const {humanoid}=await import('../character-3d/archetypes.mjs'),{attachFace}=await import('../character-3d/rig.mjs'),{instantiate}=await import('../character-3d/runtime.mjs'),{animate,setEmotion}=await import('../character-3d/animate.mjs');
 function make(){const rig=humanoid(sp,'woman:8');assert.ok(rig.parts.filter(p=>p.bone.startsWith('heldPet:')).length<=2,'held secondary body is merged instead of paying for unused walking subrig draws');assert.equal(rig.faceSpec.length,2,'held pet has its own face, same actor');rig.faces=rig.faceSpec.map(f=>attachFace(rig,f,'C'));return instantiate({rig,key:'woman:8'});}
 for(const animLv of [0,2]){const rest=make(),walk=make();for(let i=0;i<40;i++){animate(rest,{dt:1/30,moving:false,animLv});animate(walk,{dt:1/30,moving:true,animLv});}assert.ok(rest.bones.seatedSkirt,'seated cloth has a knee-covering volume');rest.root.updateMatrixWorld(true);const {THREE}=await import('../character-3d/geometry.mjs');assert.ok(new THREE.Box3().setFromObject(rest.bones.seatedSkirt||rest.bones.skirt).min.y>=-.005,'seated hem remains above the ground');assert.ok(rest.bones.kneeL.rotation.x>1,'sitting bends at the knee');assert.ok(Math.abs(walk.bones.kneeL.rotation.x)<.01,'walk releases knee');assert.ok(rest.bones.chair.scale.x>.9);assert.ok(walk.bones.chair.scale.x<.01,'support prop is not dragged as a chair-walk');assert.ok(rest.bones.body.position.y<walk.bones.body.position.y-.1);assert.ok(walk.bones['heldPet:root'].parent===walk.bones.body);for(const emotion of SPEC.CANONICAL_EMOTIONS){setEmotion(walk,emotion);animate(walk,{dt:.1,moving:true,animLv});assert.ok(walk.faces.every(f=>f.emotion===emotion));}}
});
test('all 24 original human stages build exact distinct candidates without changing Pilot references',async()=>{
 const rows=require('../character-3d/humanoid-spec.js')(SPEC.PILOT),{humanoid}=await import('../character-3d/archetypes.mjs');
 for(const id of ['man','woman','ren']){assert.deepEqual(Object.keys(rows[id].stages).map(Number),[1,2,3,4,5,6,7,8]);let prior;for(let stage=1;stage<=8;stage++){const sp=rows[id].stages[stage],sig=JSON.stringify([sp.head,sp.body,sp.legs,sp.clothing,sp.hair,sp.attachments,sp.poseProfile]);assert.notEqual(sig,prior);prior=sig;const rig=humanoid(sp,id+':'+stage);for(const part of rig.parts)assert.ok([...part.mesh.geometry.attributes.position.array].every(Number.isFinite));}}
 for(const stage of [1,4,8])assert.deepEqual(rows.man.stages[stage],SPEC.PILOT.man.stages[stage]);
 const hat=humanoid(rows.man.stages[3],'man:3'),plain=humanoid({...rows.man.stages[3],attachments:[]},'man:3');const hg=hat.parts.find(p=>p.bone==='head').mesh.geometry,pg=plain.parts.find(p=>p.bone==='head').mesh.geometry;hg.computeBoundingBox();pg.computeBoundingBox();assert.ok(hg.boundingBox.max.x-hg.boundingBox.min.x>pg.boundingBox.max.x-pg.boundingBox.min.x+.03,'hat brim changes silhouette, not just counts');
 const infant=humanoid(rows.ren.stages[1],'ren:1');assert.ok(infant.bones.pacifier);
 assert.ok(humanoid(rows.man.stages[2],'man:2').bones.groundToy);
 const girl=humanoid(rows.woman.stages[2],'woman:2');assert.ok(girl.bones['heldPet:root'].parent===girl.bones.armL,'held toy follows the grip');assert.equal(girl.faceSpec.length,2);
});
test('every human candidate keeps canonical faces and finite idle/walk/reduced poses',async()=>{
 const rows=require('../character-3d/humanoid-spec.js')(SPEC.PILOT),{humanoid}=await import('../character-3d/archetypes.mjs'),{attachFace}=await import('../character-3d/rig.mjs'),{instantiate}=await import('../character-3d/runtime.mjs'),{animate,setEmotion}=await import('../character-3d/animate.mjs');
 for(const[id,row]of Object.entries(rows))for(const[stage,sp]of Object.entries(row.stages)){
  const rig=humanoid(sp,id+':'+stage);rig.faces=(Array.isArray(rig.faceSpec)?rig.faceSpec:[rig.faceSpec]).map(f=>attachFace(rig,f,'C'));
  assert.ok(rig.faces.every(f=>f.eyes.length===2),id+':'+stage+' faces project onto body surface');
  for(const animLv of [0,2])for(const moving of [false,true]){const actor=instantiate({rig,key:id+':'+stage});for(const emotion of SPEC.CANONICAL_EMOTIONS){setEmotion(actor,emotion);animate(actor,{dt:.1,moving,animLv});assert.ok(actor.faces.every(f=>f.emotion===emotion));for(const b of Object.values(actor.bones))assert.ok([...b.position.toArray(),...b.scale.toArray(),b.rotation.x,b.rotation.y,b.rotation.z].every(Number.isFinite));}}
 }
});
