const test=require('node:test'),assert=require('node:assert/strict');
const specs=()=>require('../character-3d/botanical-spec.js')().venus_flytrap.stages;
test('Venus remaining stages preserve original seed, young traps, insect cup and flowering crown',async()=>{
 const rows=specs();assert.deepEqual(Object.keys(rows),['1','2','3','4','5','6','7','8']);
 const {branchOrganism}=await import('../character-3d/branch-organism.mjs'),{attachFace}=await import('../character-3d/rig.mjs'),{THREE}=await import('../character-3d/geometry.mjs');
 const counts={1:1,2:1,4:3,5:4,6:1,8:3};
 for(const n of [1,2,4,5,6,8]){const r=branchOrganism(rows[n],'venus_flytrap:'+n),faces=(Array.isArray(r.faceSpec)?r.faceSpec:[r.faceSpec]).map(f=>attachFace(r,f,'C'));assert.equal(faces.length,counts[n]);assert.ok(faces.every(f=>f.eyes.length===2));r.root.updateMatrixWorld(true);const b=new THREE.Box3().setFromObject(r.root,true);assert.ok(b.min.y>=-.01,'ground stage'+n);let tris=0;for(const p of r.parts){const g=p.mesh.geometry;assert.ok([...g.attributes.position.array].every(Number.isFinite));tris+=(g.index?.count||g.attributes.position.count)/3;}assert.ok(tris<32000,'bounded geometry stage'+n);}
 assert.ok(rows[1].body.lean>.1);assert.equal(rows[1].foliage.length,0);
 assert.equal(rows[2].colony.filter(u=>u.spec.trap).length,2);assert.ok(rows[2].stones.length>=4);
 assert.equal(rows[4].colony.filter(u=>u.spec.trap).length,2);assert.equal(rows[5].colony.filter(u=>u.spec.trap).length,3);
 const cup=rows[6].colony.find(u=>u.spec.trap);assert.ok(cup.spec.body.width>.4&&cup.face===false);assert.equal(rows[6].colony.filter(u=>u.face!==false).length,1);
 assert.equal(rows[8].colony.filter(u=>u.spec.blossoms?.length).length,6);assert.equal(rows[8].colony.filter(u=>u.spec.trap).length,2);
 assert.equal(require('../character-3d/spec.js').specKeyFor({line:'venus_flytrap',stage:0}),null,'unreviewed candidates stay isolated');
});
test('all eight Venus candidates retain finite bones and source face ownership across32 states',async()=>{
 const rows=specs();assert.equal(Object.keys(rows).length,8);const {branchOrganism}=await import('../character-3d/branch-organism.mjs'),{attachFace}=await import('../character-3d/rig.mjs'),{instantiate}=await import('../character-3d/runtime.mjs'),{animate,setEmotion}=await import('../character-3d/animate.mjs'),SPEC=require('../character-3d/spec.js');
 for(const [n,sp]of Object.entries(rows)){const r=branchOrganism(sp,'venus_flytrap:'+n);r.faces=(Array.isArray(r.faceSpec)?r.faceSpec:[r.faceSpec]).map(f=>attachFace(r,f,'C'));for(const em of SPEC.CANONICAL_EMOTIONS)for(const moving of [false,true])for(const animLv of [0,2]){const a=instantiate({rig:r,key:'venus_flytrap:'+n});setEmotion(a,em);for(let i=0;i<10;i++)animate(a,{dt:.05,moving,animLv});assert.equal(a.faces.length,r.faces.length);assert.ok(a.faces.every(f=>f.emotion===em));for(const b of Object.values(a.bones))assert.ok([...b.position.toArray(),...b.rotation.toArray().slice(0,3)].every(Number.isFinite));}}
});
test('Venus06 trap has a deep enclosing cup around its insect instead of a thin plate',async()=>{
 const {branchOrganism}=await import('../character-3d/branch-organism.mjs'),{THREE}=await import('../character-3d/geometry.mjs');
 const sp=specs()[6],cup=sp.colony.find(u=>u.spec.trap),rig=branchOrganism(cup.spec,'cup');
 rig.root.updateMatrixWorld(true);const bounds=new THREE.Box3().setFromObject(rig.root,true),size=bounds.getSize(new THREE.Vector3());
 assert.ok(size.z/size.x>.25,'cup must have substantial side depth relative to width');
 const insect=sp.colony.find(u=>u.face!==false),mesh=rig.parts.find(p=>p.bone==='body').mesh;
 const local=new THREE.Vector3(0,insect.at[1]-cup.at[1],insect.at[2]-cup.at[2]);
 const rim=new THREE.Vector3(0,0,cup.spec.body.depth).applyEuler(new THREE.Euler(...cup.spec.trap.tilt,'YXZ'));
 assert.ok(rim.z>local.z+.06,'insect sits within the enclosing rim');
 const hit=new THREE.Raycaster(new THREE.Vector3(.32,0,2),new THREE.Vector3(0,0,-1)).intersectObject(mesh)[0];
 assert.ok(hit&&hit.point.z>-.1,'cup remains a continuous visible surface');
});
