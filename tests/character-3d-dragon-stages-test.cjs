const test=require('node:test'),assert=require('node:assert/strict');
const stages=()=>require('../character-3d/mythic-spec.js')().dragon.stages;
test('Dragon explicit eight-stage candidates retain juvenile support, small wings, breath and seated elder identity',async()=>{
 const rows=stages();assert.deepEqual(Object.keys(rows),['1','2','3','4','5','6','7','8']);
 const {wingedReptile}=await import('../character-3d/winged-reptile.mjs'),{THREE}=await import('../character-3d/geometry.mjs');
 assert.equal(rows[1].wing,null);assert.equal(rows[2].wing,null);assert.ok(rows[1].head.width/rows[1].body.width>rows[2].head.width/rows[2].body.width);
 assert.ok(rows[1].limbs.filter(l=>l.bone.startsWith('legF')).every(l=>l.paw.at[1]<-.12),'juvenile forefeet support the body');
 assert.ok(rows[4].wing.span<rows[5].wing.span*.6,'first small wings distinct from adult wings');assert.equal(rows[5].normalEye,'happy');
 assert.ok(rows[6].breathFlames.length>=3);assert.ok(rows[8].body.y<rows[7].body.y);assert.notEqual(rows[8].colors.body,rows[7].colors.body);assert.equal(rows[8].normalEye,'droop');
 for(const n of [1,2,4,5,6,8]){
  const r=wingedReptile(rows[n],'dragon:'+n);r.root.updateMatrixWorld(true);for(const name of ['legFL','legFR','legBL','legBR','tail','head'])assert.ok(r.bones[name],'owned '+name);let tris=0;
  for(const p of r.parts){const g=p.mesh.geometry;assert.ok([...g.attributes.position.array].every(Number.isFinite));tris+=(g.index?.count||g.attributes.position.count)/3;}
  assert.ok(tris<26000,'bounded stage'+n);assert.ok(new THREE.Box3().setFromObject(r.root,true).min.y>=-.005,'ground stage'+n);
 }
 for(let stage=0;stage<8;stage++)assert.equal(require('../character-3d/spec.js').specKeyFor({line:'dragon',stage}),null,'image gate precedes promotion stage '+stage);
});
test('Dragon06 flame volumes stay owned by the head without hiding the canonical eye targets',async()=>{
 const sp=stages()[6];assert.ok(sp,'sixth stage');
 const {wingedReptile}=await import('../character-3d/winged-reptile.mjs'),{THREE}=await import('../character-3d/geometry.mjs');
 const full=wingedReptile(sp,'dragon:6'),bare=wingedReptile({...sp,breathFlames:[]},'bare');
 const head=r=>r.parts.find(p=>p.bone==='head').mesh.geometry;
 head(full).computeBoundingBox();head(bare).computeBoundingBox();assert.ok(head(full).boundingBox.max.z>head(bare).boundingBox.max.z+.3,'physical forward breath');
 assert.deepEqual(Object.keys(full.bones),Object.keys(bare.bones),'breath is owned geometry, not another actor');
 const mesh=g=>new THREE.Mesh(g,new THREE.MeshBasicMaterial({side:THREE.DoubleSide}));
 const {attachFace}=await import('../character-3d/rig.mjs');const face=attachFace(bare,bare.faceSpec,'C');assert.equal(face.eyes.length,2);
 for(const eye of face.eyes){const ray=new THREE.Raycaster(new THREE.Vector3(eye.position.x,eye.position.y,2),new THREE.Vector3(0,0,-1));const a=ray.intersectObject(mesh(head(full)))[0],b=ray.intersectObject(mesh(head(bare)))[0];assert.ok(a&&b);assert.ok(Math.abs(a.distance-b.distance)<.002,'eyes are not hidden by breath');}
});
test('Dragon all8 candidates preserve one canonical face and finite owned motion across32 states',async()=>{
 const rows=stages();assert.equal(Object.keys(rows).length,8);
 const {wingedReptile}=await import('../character-3d/winged-reptile.mjs'),{attachFace}=await import('../character-3d/rig.mjs'),{instantiate}=await import('../character-3d/runtime.mjs'),{animate,setEmotion}=await import('../character-3d/animate.mjs'),SPEC=require('../character-3d/spec.js');
 for(const [n,sp]of Object.entries(rows)){const r=wingedReptile(sp,'dragon:'+n);r.faces=[attachFace(r,r.faceSpec,'C')];assert.equal(r.faces[0].eyes.length,2,'two projected eyes stage '+n);
 for(const em of SPEC.CANONICAL_EMOTIONS)for(const moving of [false,true])for(const animLv of [0,2]){const a=instantiate({rig:r,key:'dragon:'+n});setEmotion(a,em);for(let i=0;i<10;i++)animate(a,{dt:.05,moving,animLv});assert.equal(a.faces.length,1);assert.equal(a.faces[0].emotion,em);for(const b of Object.values(a.bones))assert.ok([...b.position.toArray(),...b.rotation.toArray().slice(0,3)].every(Number.isFinite));}}
});
test('new Dragon dorsal and tail spine roots intersect their owned body volumes',async()=>{
 const {wingedReptile}=await import('../character-3d/winged-reptile.mjs'),{THREE}=await import('../character-3d/geometry.mjs');
 for(const n of [1,2,4,5,6,8]){const sp=stages()[n],bare=wingedReptile({...sp,spines:[],tail:{...sp.tail,spines:[]}},'bare');
 for(const bone of ['body','tail'])for(const [i,q]of (bone==='body'?sp.spines:sp.tail.spines).entries()){
 const geometry=bare.parts.find(p=>p.bone===bone).mesh.geometry,mesh=new THREE.Mesh(geometry,new THREE.MeshBasicMaterial({side:THREE.DoubleSide}));
 const direction=bone==='body'?new THREE.Vector3(0,0,-1):new THREE.Vector3(0,1,0),ray=new THREE.Raycaster(new THREE.Vector3(...q.at),direction);
 const hit=ray.intersectObject(mesh)[0];assert.ok(hit&&hit.face.normal.dot(direction)>0,'attached root stage '+n+' '+bone+' '+i);
 }
 }
});
test('Dragon04 small wings root inside the juvenile trunk',async()=>{
 const {wingedReptile}=await import('../character-3d/winged-reptile.mjs'),{THREE}=await import('../character-3d/geometry.mjs');
 const sp=stages()[4],r=wingedReptile(sp,'dragon:4'),body=r.parts.find(p=>p.bone==='body').mesh;
 const mesh=new THREE.Mesh(body.geometry,new THREE.MeshBasicMaterial({side:THREE.DoubleSide}));
 for(const name of ['wingL','wingR']){const direction=new THREE.Vector3(0,0,-1),hit=new THREE.Raycaster(r.bones[name].position.clone(),direction).intersectObject(mesh)[0];assert.ok(hit&&hit.face.normal.dot(direction)>0,name+' has a physical trunk attachment');}
});
