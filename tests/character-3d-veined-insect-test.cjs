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
 const SPEC=require('../character-3d/spec.js');
 const {armoredInsect}=await import('../character-3d/armored-insect.mjs'),{attachFace}=await import('../character-3d/rig.mjs'),{instantiate}=await import('../character-3d/runtime.mjs'),{animate,setEmotion}=await import('../character-3d/animate.mjs');
 for(const [stage,sp] of Object.entries(require('../character-3d/armored-spec.js')().cicada.stages)){
 const r=armoredInsect(sp,'cicada:'+stage);r.faces=[attachFace(r,r.faceSpec,'C')];
 let tris=0;for(const p of r.parts)tris+=(p.mesh.geometry.index?.count||p.mesh.geometry.attributes.position.count)/3;assert.ok(tris<22000);
 for(const em of SPEC.CANONICAL_EMOTIONS)for(const moving of [false,true])for(const animLv of [0,2]){
  const a=instantiate({rig:r,key:'cicada:'+stage});setEmotion(a,em);for(let n=0;n<20;n++)animate(a,{dt:.05,moving,animLv});assert.equal(a.faces[0].emotion,em);
  if(sp.wings&&em==='normal'&&moving&&animLv===2)assert.notEqual(a.bones.wing0.rotation.y,r.bones.wing0.rotation.y,'attached wings move with owner time');
  for(const b of Object.values(a.bones))assert.ok([...b.position.toArray(),...b.rotation.toArray().slice(0,3)].every(Number.isFinite));
 }
 }
});
test('cicada silhouette tapers at the tail and its resting membranes slope down beside the abdomen',async()=>{
 const sp=require('../character-3d/armored-spec.js')().cicada.stages[7];
 const {armoredInsect}=await import('../character-3d/armored-insect.mjs'),{THREE}=await import('../character-3d/geometry.mjs');
 const r=armoredInsect(sp,'cicada:7'),plain=armoredInsect({...sp,body:{...sp.body,taper:0}},'untapered');
 const width=(rig,z)=>{const p=rig.parts[0].mesh.geometry.attributes.position;let w=0;for(let i=0;i<p.count;i++)if(Math.abs(p.getZ(i)-z)<.045)w=Math.max(w,Math.abs(p.getX(i)));return w;};
 assert.ok(width(r,-.12-sp.body.length*.72)<width(plain,-.12-sp.body.length*.72)*.6,'physical narrowing beyond a rounded beetle abdomen');
 r.root.updateMatrixWorld(true);
 for(let i=0;i<4;i++){const w=r.bones['wing'+i],q=sp.wings[i].outline.reduce((a,b)=>Math.abs(a[0])>Math.abs(b[0])?a:b),tip=w.localToWorld(new THREE.Vector3(q[0],q[1],0)),root=w.getWorldPosition(new THREE.Vector3());assert.ok(tip.y<root.y-.035,'resting outer membrane slopes down, not a flat fly wing');}
 assert.deepEqual(r.faceSpec.normalEye,{left:'happy',right:'round'},'source mature left wink');
});
test('cicada nymph has six legs with broad digging foreclaws and thick wing pads instead of adult membranes',async()=>{
 const sp=require('../character-3d/armored-spec.js')().cicada.stages[3];assert.ok(sp,'explicit nymph representative');
 const {armoredInsect}=await import('../character-3d/armored-insect.mjs'),{attachFace}=await import('../character-3d/rig.mjs');
 const r=armoredInsect(sp,'cicada:3');assert.equal(Object.keys(r.bones).filter(k=>k.startsWith('wing')).length,0);assert.equal(Object.keys(r.bones).filter(k=>/^leg/.test(k)).length,6);assert.equal(attachFace(r,r.faceSpec,'C').eyes.length,2);
 const body=r.parts.find(p=>p.bone==='body').mesh.geometry.attributes.position;let rearWidth=0;for(let i=0;i<body.count;i++)if(body.getZ(i)<-.20&&body.getZ(i)>-.42)rearWidth=Math.max(rearWidth,Math.abs(body.getX(i)));assert.ok(rearWidth>sp.thorax.width,'nymph abdomen is broad, not an adult-like pointed spike');
 const plain=armoredInsect({...sp,legs:sp.legs.map(l=>({...l,claw:null})),nymphPads:[]},'plain');
 for(const bone of ['leg0','leg1','body'])assert.ok(r.parts.find(p=>p.bone===bone).mesh.geometry.attributes.position.count>plain.parts.find(p=>p.bone===bone).mesh.geometry.attributes.position.count+100,'physical digging claw or folded wing pad');
 for(const p of r.parts)assert.ok([...p.mesh.geometry.attributes.position.array].every(Number.isFinite));
});
test('emerging cicada has one adult face above an open empty exuvia with folded legs',async()=>{
 const sp=require('../character-3d/armored-spec.js')().cicada.stages[5];assert.ok(sp,'explicit emerging adult on empty nymph casing');
 const {armoredInsect}=await import('../character-3d/armored-insect.mjs'),{THREE}=await import('../character-3d/geometry.mjs'),{attachFace}=await import('../character-3d/rig.mjs');
 const r=armoredInsect(sp,'cicada:5');assert.equal(Array.isArray(r.faceSpec),false,'empty casing has no second canonical face');assert.equal(attachFace(r,r.faceSpec,'C').eyes.length,2);assert.ok(r.bones.emptyShell);assert.ok(r.bones.body.position.y>sp.exuvia.at[1]+sp.exuvia.h);
 const mesh=r.parts.find(p=>p.bone==='emptyShell').mesh;r.root.updateMatrixWorld(true);const ray=new THREE.Raycaster(new THREE.Vector3(sp.exuvia.at[0],sp.exuvia.at[1]+sp.exuvia.h*.58,1),new THREE.Vector3(0,0,-1)),hits=ray.intersectObject(mesh);assert.ok(hits.length>0);assert.ok(hits[0].point.z<sp.exuvia.at[2],'split front exposes continuous inner back surface');
 const noLegs=armoredInsect({...sp,exuvia:{...sp.exuvia,legs:[]}},'empty');assert.ok(mesh.geometry.attributes.position.count>noLegs.parts.find(p=>p.bone==='emptyShell').mesh.geometry.attributes.position.count+200,'physical folded empty-casing legs');
});
test('emerging adult rises vertically with a forward-facing head and original nymph and aged eyes',async()=>{
 const stages=require('../character-3d/armored-spec.js')().cicada.stages,{armoredInsect}=await import('../character-3d/armored-insect.mjs'),{THREE}=await import('../character-3d/geometry.mjs');
 for(const stage of [3,5,8])assert.equal(armoredInsect(stages[stage],'cicada:'+stage).faceSpec.normalEye,'round','original open round eyes');
 const sp=stages[5],r=armoredInsect(sp,'cicada:5');r.root.updateMatrixWorld(true);
 const rear=r.bones.body.localToWorld(new THREE.Vector3(0,0,-sp.body.length-.12)),head=r.bones.head.getWorldPosition(new THREE.Vector3());
 assert.ok(head.y-rear.y>.75,'adult long axis rises above the shell instead of projecting horizontally');
 const fwd=new THREE.Vector3(0,0,1).transformDirection(r.bones.head.matrixWorld);assert.ok(fwd.z>.9,'upright body does not turn the face skyward');
 assert.ok(rear.y<sp.exuvia.h+.10&&rear.y>sp.exuvia.h-.2,'abdomen emerges from the shell opening');
 assert.ok(Math.abs(rear.z-sp.exuvia.at[2])<.05,'emerging abdomen aligns with the shell opening in depth');
});
test('early cicada nymphs and soil emergence have explicit different anatomy and one face each',async()=>{
 const rows=require('../character-3d/armored-spec.js')().cicada.stages,{armoredInsect}=await import('../character-3d/armored-insect.mjs'),{attachFace}=await import('../character-3d/rig.mjs');
 for(const n of [1,2,4]){assert.ok(rows[n],'explicit juvenile stage '+n);const r=armoredInsect(rows[n],'cicada:'+n);assert.equal(attachFace(r,r.faceSpec,'C').eyes.length,2);assert.equal(Object.keys(r.bones).filter(k=>/^leg\d$/.test(k)).length,6);assert.equal(r.bones.wing0,undefined);}
 assert.notEqual(rows[1].body.width/rows[1].body.length,rows[2].body.width/rows[2].body.length,'early growth changes proportions, not uniform scale');assert.notEqual(rows[1].abdomenBands.count,rows[2].abdomenBands.count);assert.equal(rows[1].legs[0].claw.teeth.length,2);
 const soil=armoredInsect(rows[4],'emerging'),bare=armoredInsect({...rows[4],soil:null},'bare');assert.ok(soil.bones.ground);assert.equal(bare.bones.ground,undefined);const g=soil.parts.find(p=>p.bone==='ground').mesh.geometry;assert.ok(g.attributes.position.count>500,'raised dirt clods are physical');
 soil.root.updateMatrixWorld(true);const {THREE}=await import('../character-3d/geometry.mjs');assert.ok(soil.bones.head.getWorldPosition(new THREE.Vector3()).y>.5,'head and forebody rise out of dirt');
 for(const p of soil.parts.filter(p=>/^leg[0-5]$/.test(p.bone)))assert.ok(new THREE.Box3().setFromObject(p.mesh,true).min.y>=0,'visible emergence legs must not dangle below the soil base');
});
