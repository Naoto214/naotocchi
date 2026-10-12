const test=require('node:test'),assert=require('node:assert/strict');
const mod=n=>import('../character-3d/'+n);
test('puff connector is pale translucent and fine while the existing halo and six faces remain',async()=>{
 const rt=await mod('runtime.mjs'),t=rt.getTemplate('dandelion',8);assert.equal(t.status,'ok');
 for(const {mesh}of t.rig.parts.filter(p=>p.bone.startsWith('u'))){const c=mesh.geometry.attributes.color,p=mesh.geometry.attributes.position;let connector=0;
  for(let i=0;i<c.count;i++)if(c.itemSize===4&&Math.abs(c.getW(i)-.22)<.001){connector++;assert.ok(Math.abs(p.getX(i))<.012,'no thick central shaft');assert.ok(c.getX(i)>.8,'pale connection');}
  assert.ok(connector>=12,'soft connector fades into puff');
 }assert.equal(t.rig.faces.length,6);assert.ok(t.meshes<=14);assert.ok(t.tris<6500);
 const {softHalo}=await mod('geometry.mjs'),h=softHalo(1,'test'),hc=h.attributes.color;assert.equal(hc.getW(0),0,'crossed halo planes must not draw a hard inner seam');assert.equal(hc.getW(21),0);assert.ok(hc.getW(42)>.7,'outer halo preserved');
});
test('winged insect limbs are joined to the body without extra meshes or changed wings',async()=>{
 const {wingedInsect}=await mod('archetypes.mjs'),SPEC=require('../character-3d/spec.js'),sp=SPEC.PILOT.butterfly.stages[8];
 const a=wingedInsect(sp,'qa'),b=wingedInsect({...sp,legs:null},'qa');assert.equal(a.parts.length,b.parts.length);
 const body=r=>r.parts.find(p=>p.bone==='body').mesh.geometry;
 const extra=body(a).attributes.position.count-body(b).attributes.position.count;assert.ok(extra>60,'three pairs of readable bent limbs');assert.ok(extra<600);
 const {THREE}=await mod('geometry.mjs'),surface=new THREE.Mesh(body(b),new THREE.MeshBasicMaterial({side:THREE.DoubleSide}));surface.updateMatrixWorld(true);
 const pos=body(a).attributes.position,base=body(b).attributes.position.count,per=extra/6;
 for(let limb=0;limb<6;limb++){const center=new THREE.Vector3();for(let k=0;k<6;k++)center.add(new THREE.Vector3().fromBufferAttribute(pos,base+limb*per+21+k));center.divideScalar(6);const hit=new THREE.Raycaster(center,new THREE.Vector3(0,0,1)).intersectObject(surface);assert.ok(hit.length>0,'every leg root is embedded inside the torso');}
 surface.material.dispose();
 for(const name of ['wingL','wingR']){const g=r=>r.parts.find(p=>p.bone===name).mesh.geometry;assert.deepEqual(g(a).attributes.position.array,g(b).attributes.position.array);assert.deepEqual(g(a).attributes.color.array,g(b).attributes.color.array);}
});
test('feline normal eyes have wider half lids and raised outer corners without changing emotion vocabulary',async()=>{
 const rt=await mod('runtime.mjs'),rg=await mod('rig.mjs'),t=rt.getTemplate('cat_friend',0),face=t.rig.face;
 assert.equal(face.normalEye,'droop');assert.equal(face.eyes.length,2);
 for(const m of face.eyes){assert.ok(m.userData.baseScale>.075);assert.ok(m.userData.eyeProfile.width>=1.2);assert.ok(m.userData.eyeProfile.tilt>.05);}
 const profile=face.eyes[0].userData.eyeProfile,g=rg.eyeGeometry('droop',1,profile),old=rg.eyeGeometry('droop',1);g.computeBoundingBox();old.computeBoundingBox();assert.ok(g.boundingBox.max.x-g.boundingBox.min.x>(old.boundingBox.max.x-old.boundingBox.min.x)*1.15);
 assert.deepEqual(rt.SPEC.CANONICAL_EMOTIONS,['normal','positive','dislike','tired','sleeping','strained','wantsPlay','sick']);
 for(const e of rt.SPEC.CANONICAL_EMOTIONS){rg.applyFaceExpression(face,e);assert.equal(face.emotion,e);assert.ok(face.eyes.every(m=>m.geometry.attributes.position.count>0));}
});
