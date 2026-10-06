const test=require('node:test'),assert=require('node:assert/strict'),SPEC=require('../character-3d/spec.js');
test('phoenix representatives have a physical crest, layered wings, curved plume tails and two clawed feet',async()=>{
 const rows=require('../character-3d/mythic-spec.js')().phoenix?.stages;assert.ok(rows,'original03and07 representatives');assert.deepEqual(Object.keys(rows),['3','7']);
 const {BUILDERS}=await import('../character-3d/archetypes.mjs'),{attachFace}=await import('../character-3d/rig.mjs'),{THREE}=await import('../character-3d/geometry.mjs');
 for(const n of [3,7]){const sp=rows[n],r=BUILDERS[sp.archetype](sp,'phoenix:'+n);assert.equal(attachFace(r,r.faceSpec,'C').eyes.length,2);assert.ok(r.bones.wingL&&r.bones.wingR&&r.bones.tail&&r.bones.footL&&r.bones.footR);assert.ok(sp.crest.length>=5&&sp.tail.feathers.length>=4);assert.ok(sp.wings.left.length>=5&&sp.wings.right.length>=5);
 const noCrest=BUILDERS[sp.archetype]({...sp,crest:[]},'crestless');assert.ok(r.parts.find(p=>p.bone==='head').mesh.geometry.attributes.position.count>noCrest.parts.find(p=>p.bone==='head').mesh.geometry.attributes.position.count+500,'crest is layered volume');
 const single=BUILDERS[sp.archetype]({...sp,wings:{...sp.wings,left:sp.wings.left.slice(0,1),right:sp.wings.right.slice(0,1)}},'single-layer');assert.ok(r.parts.find(p=>p.bone==='wingL').mesh.geometry.attributes.position.count>single.parts.find(p=>p.bone==='wingL').mesh.geometry.attributes.position.count*3,'wing has physical overlapping feather layers');
 for(const name of ['footL','footR']){const g=r.parts.find(p=>p.bone===name).mesh.geometry;g.computeBoundingBox();assert.ok(g.boundingBox.max.x-g.boundingBox.min.x>.12,'toes splay physically around the narrow ankle');}
 const tail=r.parts.find(p=>p.bone==='tail').mesh.geometry;tail.computeBoundingBox();assert.ok(tail.boundingBox.max.x-tail.boundingBox.min.x>.5,'original tail has long outward flowing plumes');assert.ok(tail.boundingBox.max.z-tail.boundingBox.min.z>.12,'plumes spread through depth');
 let tri=0;for(const p of r.parts){const g=p.mesh.geometry;assert.ok([...g.attributes.position.array].every(Number.isFinite));tri+=(g.index?.count||g.attributes.position.count)/3;}assert.ok(tri<22000);r.root.updateMatrixWorld(true);assert.ok(new THREE.Box3().setFromObject(r.root,true).min.y>=-.005,'feet and tail clear ground');
 }
 assert.notEqual(rows[3].colors.base,rows[7].colors.base,'aged source has muted plumage');assert.notDeepEqual(rows[3].tail.feathers,rows[7].tail.feathers,'long drooping older tail is explicit, not scaled young tail');assert.equal(SPEC.specKeyFor({line:'phoenix',stage:6}),null);
});
test('phoenix keeps one canonical face with owned wing and tail motion across32 states',async()=>{
 const rows=require('../character-3d/mythic-spec.js')().phoenix?.stages;assert.ok(rows);
 const {BUILDERS}=await import('../character-3d/archetypes.mjs'),{attachFace}=await import('../character-3d/rig.mjs'),{instantiate}=await import('../character-3d/runtime.mjs'),{animate,setEmotion}=await import('../character-3d/animate.mjs');
 for(const n of [3,7]){const r=BUILDERS[rows[n].archetype](rows[n],'phoenix:'+n);r.faces=[attachFace(r,r.faceSpec,'C')];for(const em of SPEC.CANONICAL_EMOTIONS)for(const moving of [false,true])for(const animLv of [0,2]){const a=instantiate({rig:r,key:'phoenix:'+n});setEmotion(a,em);for(let i=0;i<20;i++)animate(a,{dt:.05,moving,animLv});assert.equal(a.faces.length,1);assert.equal(a.faces[0].emotion,em);for(const b of Object.values(a.bones))assert.ok([...b.position.toArray(),...b.rotation.toArray().slice(0,3)].every(Number.isFinite));}
 const a=instantiate({rig:r,key:'phoenix:'+n});setEmotion(a,'normal');for(let i=0;i<20;i++)animate(a,{dt:.05,moving:true,animLv:2});assert.ok(Math.abs(a.bones.tail.rotation.y-a.bones.tail.userData.rest.r.y)>.01,'tail plumage follows owner gait');assert.equal(a.bones.tail.parent,a.bones.body);
 }
});

test('aged phoenix retains the source cream breast and distinct pale feather edges',async()=>{
 const sp=require('../character-3d/mythic-spec.js')().phoenix.stages[7],{BUILDERS}=await import('../character-3d/archetypes.mjs'),r=BUILDERS[sp.archetype](sp,'phoenix:7');
 for(const name of ['body','wingL','wingR','tail']){const c=r.parts.find(p=>p.bone===name).mesh.geometry.attributes.color;let pale=0,dark=0;for(let i=0;i<c.count;i++){if(c.getX(i)>.8&&c.getY(i)>.65&&c.getZ(i)>.4)pale++;if(c.getY(i)<.35)dark++;}assert.ok(pale>50,`${name} keeps visible cream feather accents`);assert.ok(dark>50,`${name} retains contrasting warm feather centers`);}
});
