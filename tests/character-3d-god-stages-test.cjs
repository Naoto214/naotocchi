const test=require('node:test'),assert=require('node:assert/strict');
test('God source stages retain seed, winged infant, staff bearers and radiant rebirth identities',async()=>{
 const rows=require('../character-3d/mythic-spec.js')().god.stages,{BUILDERS}=await import('../character-3d/archetypes.mjs'),{THREE}=await import('../character-3d/geometry.mjs'),{attachFace}=await import('../character-3d/rig.mjs');
 for(let n=1;n<=8;n++){
  assert.ok(rows[n],`stage ${n} exists`);const r=BUILDERS[rows[n].archetype](rows[n],'god:'+n);assert.equal(attachFace(r,r.faceSpec,'C').eyes.length,2);r.root.updateMatrixWorld(true);assert.ok(new THREE.Box3().setFromObject(r.root,true).min.y>=-.005,'ground '+n);let tris=0;for(const p of r.parts){const g=p.mesh.geometry;assert.ok([...g.attributes.position.array].every(Number.isFinite));tris+=(g.index?.count||g.attributes.position.count)/3;}assert.ok(tris<26000,'budget '+n);
  if([1,2,8].includes(n)){assert.ok(!r.bones.armL&&!r.bones.legL,'orb does not reuse adult limbs');assert.ok(!r.bones.robe);}
  if(n===1)assert.ok(!r.bones.celestialWing0L,'seed is wingless');if([2,8].includes(n))assert.ok(r.bones.celestialWing0L,'infant/rebirth wing pair');if(n===8)assert.ok(r.bones.radiance,'rebirth has gold star rays');
  if([4,5,6].includes(n)){assert.ok(r.bones.staff);assert.equal(r.bones.staff.parent,r.bones.armR);const p=r.bones.staff.position;assert.ok(Math.abs(p.y+rows[n].arms.len+rows[n].arms.r*.7)<.001,'staff grip is at hand');}
 }
 assert.notDeepEqual(rows[5].celestial.robe,rows[4].celestial.robe);assert.equal(rows[6].normalEye,'content');
});
test('God all-stage candidates keep one face and owned props across32 states after image-approved promotion',async()=>{
 const rows=require('../character-3d/mythic-spec.js')().god.stages,SPEC=require('../character-3d/spec.js'),{BUILDERS}=await import('../character-3d/archetypes.mjs'),{attachFace}=await import('../character-3d/rig.mjs'),{instantiate}=await import('../character-3d/runtime.mjs'),{animate,setEmotion}=await import('../character-3d/animate.mjs');
 for(let n=1;n<=8;n++){assert.ok(rows[n]);const r=BUILDERS[rows[n].archetype](rows[n],'god:'+n);r.faces=[attachFace(r,r.faceSpec,'C')];for(const em of SPEC.CANONICAL_EMOTIONS)for(const moving of [false,true])for(const animLv of [0,2]){const a=instantiate({rig:r,key:'god:'+n});setEmotion(a,em);for(let i=0;i<20;i++)animate(a,{dt:.05,moving,animLv});assert.equal(a.faces.length,1);assert.equal(a.faces[0].emotion,em);for(const b of Object.values(a.bones))assert.ok([...b.position.toArray(),...b.rotation.toArray().slice(0,3)].every(Number.isFinite));}assert.deepEqual(SPEC.specKeyFor({line:'god',stage:n-1}),{id:'god',stage:n,exact:true});}
});
test('winged God orbs animate their attached wings in floating gait',async()=>{
 const rows=require('../character-3d/mythic-spec.js')().god.stages,{BUILDERS}=await import('../character-3d/archetypes.mjs'),{instantiate}=await import('../character-3d/runtime.mjs'),{animate}=await import('../character-3d/animate.mjs');
 for(const n of [2,8]){const r=BUILDERS[rows[n].archetype](rows[n],'god:'+n);r.faces=[];const a=instantiate({rig:r,key:'god:'+n});for(let i=0;i<20;i++)animate(a,{dt:.05,moving:true,animLv:2});for(const name of ['celestialWing0L','celestialWing0R']){assert.equal(a.bones[name].parent,a.bones.body);assert.ok(Math.abs(a.bones[name].rotation.y-a.bones[name].userData.rest.r.y)>.01,'floating wing actually moves '+n+'/'+name);}}
});
test('staff finials stay outside the head silhouette instead of disappearing into hair',async()=>{
 const rows=require('../character-3d/mythic-spec.js')().god.stages,{BUILDERS}=await import('../character-3d/archetypes.mjs'),{THREE}=await import('../character-3d/geometry.mjs');
 for(const n of [4,5,6]){const sp=rows[n],r=BUILDERS[sp.archetype](sp,'god:'+n);r.root.updateMatrixWorld(true);const top=r.bones.staff.localToWorld(new THREE.Vector3(0,sp.celestial.staff.above,0)),head=r.bones.head.getWorldPosition(new THREE.Vector3());assert.ok(top.x-sp.celestial.staff.r>head.x+sp.head.r*1.1,'finial clears hair/head '+n);}
});
