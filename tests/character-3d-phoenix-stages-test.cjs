const test=require('node:test'),assert=require('node:assert/strict');
// Catch missing candidates, adult geometry substituted for chicks/rebirth, and invalid owned motion.
test('Phoenix source stages build distinct chicks, raised adult wings and a coal-bed rebirth',async()=>{
 const rows=require('../character-3d/mythic-spec.js')().phoenix.stages;
 const {BUILDERS}=await import('../character-3d/archetypes.mjs'),{THREE}=await import('../character-3d/geometry.mjs');
 const rigs={};for(let n=1;n<=8;n++){assert.ok(rows[n],`candidate ${n} exists`);const r=rigs[n]=BUILDERS[rows[n].archetype](rows[n],'phoenix:'+n);r.root.updateMatrixWorld(true);const box=new THREE.Box3().setFromObject(r.root,true);assert.ok(box.min.y>=-.005,`${n} clears ground`);let tris=0;for(const p of r.parts){const g=p.mesh.geometry;assert.ok([...g.attributes.position.array].every(Number.isFinite));tris+=(g.index?.count||g.attributes.position.count)/3;}assert.ok(tris<22000,`${n} triangle budget`);}
 const bounds=n=>new THREE.Box3().setFromObject(rigs[n].root,true),size=n=>bounds(n).getSize(new THREE.Vector3());
 assert.ok(size(1).y<size(3).y*.8,'round hatchling is shorter than upright juvenile');assert.ok(size(2).y<size(3).y*.9,'second chick remains juvenile');
 for(const n of [4,5,6]){const r=rigs[n];for(const bone of ['wingL','wingR']){const b=new THREE.Box3().setFromObject(r.bones[bone],true);assert.ok(b.max.y>r.bones.head.getWorldPosition(new THREE.Vector3()).y+.10,`${n} raised wing silhouette`);}}
 const r=rigs[8];assert.ok(r.bones.embers,'rebirth is seated inside a physical coal mound');assert.ok(!r.bones.footL&&!r.bones.wingL&&!r.bones.tail,'rebirth has no adult limbs/tail');const coals=new THREE.Box3().setFromObject(r.bones.embers,true);assert.ok(coals.getSize(new THREE.Vector3()).x>.75);assert.ok(coals.max.y<r.bones.head.getWorldPosition(new THREE.Vector3()).y,'face projects above coals');assert.ok(size(8).y<size(3).y*.8);
});
test('all Phoenix candidates retain a single face and finite owned motion over all32 states',async()=>{
 const rows=require('../character-3d/mythic-spec.js')().phoenix.stages,SPEC=require('../character-3d/spec.js');
 const {BUILDERS}=await import('../character-3d/archetypes.mjs'),{attachFace}=await import('../character-3d/rig.mjs'),{instantiate}=await import('../character-3d/runtime.mjs'),{animate,setEmotion}=await import('../character-3d/animate.mjs');
 for(let n=1;n<=8;n++){assert.ok(rows[n]);const r=BUILDERS[rows[n].archetype](rows[n],'phoenix:'+n);r.faces=[attachFace(r,r.faceSpec,'C')];const a=instantiate({rig:r,key:'phoenix:'+n});for(const em of SPEC.CANONICAL_EMOTIONS)for(const moving of [false,true])for(const animLv of [0,2]){setEmotion(a,em);for(let i=0;i<20;i++)animate(a,{dt:.05,moving,animLv});assert.equal(a.faces.length,1);assert.equal(a.faces[0].emotion,em);for(const b of Object.values(a.bones))assert.ok([...b.position.toArray(),...b.rotation.toArray().slice(0,3)].every(Number.isFinite));}assert.equal(SPEC.specKeyFor({line:'phoenix',stage:n}),null,'candidate is not prematurely promoted');}
});
