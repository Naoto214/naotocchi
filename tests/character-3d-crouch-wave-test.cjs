const test=require('node:test'),assert=require('node:assert/strict'),SPEC=require('../character-3d/spec.js');
const candidates=()=>require('../character-3d/topology-spec.js')(SPEC.PILOT).frog;
test('original frog03/05/07 change anatomy from hind-only tail to folded adult limbs and eye lobes',async()=>{
 const rows=candidates();assert.ok(rows,'explicit frog representatives');const {quadruped}=await import('../character-3d/archetypes.mjs');
 for(const st of [3,5,7]){const sp=rows.stages[st];assert.ok(sp?.crouch);const r=quadruped(sp,'frog:'+st);assert.equal(r.archetype,'quadruped');assert.ok(r.bones.head&&r.bones.legBL&&r.bones.legBR);assert.equal(r.parts.filter(p=>p.bone==='legFL'||p.bone==='legFR').length,st===3?0:2);assert.equal(r.parts.filter(p=>p.bone==='tail').length,st===7?0:1);
 const g=r.parts.find(p=>p.bone==='legBR').mesh.geometry;g.computeBoundingBox();assert.ok(g.boundingBox.max.x>.18,'folded thigh and splayed digits');assert.ok(g.boundingBox.max.z-g.boundingBox.min.z>.24,'knee-to-ankle fold has depth');
 const h=r.parts.find(p=>p.bone==='head').mesh.geometry;h.computeBoundingBox();if(st===7)assert.ok(h.boundingBox.max.y>sp.head.height*1.2,'raised eye-bearing lobes');
 for(const p of r.parts)assert.ok([...p.mesh.geometry.attributes.position.array].every(Number.isFinite));}
 assert.equal(SPEC.ROLLOUT.frog,undefined,'candidate only');
});
test('crouched representatives carry one projected face and shared canonical motion',async()=>{
 const rows=candidates();assert.ok(rows);const {quadruped}=await import('../character-3d/archetypes.mjs'),{attachFace}=await import('../character-3d/rig.mjs'),{instantiate}=await import('../character-3d/runtime.mjs'),{animate,setEmotion}=await import('../character-3d/animate.mjs');
 for(const st of [3,5,7]){const r=quadruped(rows.stages[st],'frog:'+st);r.faces=[attachFace(r,r.faceSpec,'C')];assert.equal(r.faces[0].eyes.length,2,'both eyes hit continuous head/lobes');if(st===7)for(const eye of r.faces[0].eyes)assert.ok(eye.position.y>.15,'eyes are on raised lobes, not lower mouth');
 for(const em of SPEC.CANONICAL_EMOTIONS)for(const moving of [false,true])for(const animLv of [0,2]){const a=instantiate({rig:r,key:'frog:'+st});setEmotion(a,em);for(let i=0;i<12;i++)animate(a,{dt:.05,moving,animLv});assert.equal(a.faces.length,1);assert.equal(a.face.emotion,em);for(const b of Object.values(a.bones))assert.ok([...b.position.toArray(),...b.scale.toArray(),b.rotation.x,b.rotation.y,b.rotation.z].every(Number.isFinite));if(moving)assert.notEqual(a.bones.legBL.rotation.x,a.bones.legBL.userData.rest.r.x,'hind limb moves even without forelimb meshes');}
 }
});
test('folded feet keep three splayed digits and tadpole tail includes a broad thin membrane',async()=>{
 const rows=candidates();assert.ok(rows);const {quadruped}=await import('../character-3d/archetypes.mjs');for(const st of [3,5,7]){const sp=rows.stages[st],r=quadruped(sp,'frog:'+st),g=r.parts.find(p=>p.bone==='legBR').mesh.geometry,p=g.attributes.position,at=sp.hind.path.at(-1);
 for(const n of [-1,0,1]){const tip=[at[0]+.08+n*.045,at[1]-.008,at[2]+.10-n*.018];let nearest=Infinity;for(let i=0;i<p.count;i++)nearest=Math.min(nearest,Math.hypot(p.getX(i)-tip[0],p.getY(i)-tip[1],p.getZ(i)-tip[2]));assert.ok(nearest<sp.hind.r*.12,'three distinct toe endpoint rings');}
 if(st===3){const t=r.parts.find(p=>p.bone==='tail').mesh.geometry.attributes.position,ys=[],xs=[];for(let i=0;i<t.count;i++)if(t.getZ(i)<-.38&&t.getZ(i)>-.58){ys.push(t.getY(i));xs.push(t.getX(i));}assert.ok(Math.max(...ys)-Math.min(...ys)>.30,'tail is a fin sheet, not just a tube');assert.ok(Math.max(...xs)-Math.min(...xs)<.13,'tail membrane is thin');}
 }
});
