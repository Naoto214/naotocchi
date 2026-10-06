const test=require('node:test'),assert=require('node:assert/strict'),SPEC=require('../character-3d/spec.js');
test('hermit representatives have real hollow spiral shells, six walking legs, two open claws and one stalk-eyed face',async()=>{
 const rows=require('../character-3d/armored-spec.js')().hermit_crab?.stages;assert.ok(rows,'original03and07 representatives');assert.deepEqual(Object.keys(rows),['1','2','3','4','5','6','7','8']);
 const {armoredInsect}=await import('../character-3d/armored-insect.mjs'),{THREE}=await import('../character-3d/geometry.mjs'),{attachFace}=await import('../character-3d/rig.mjs');
 for(const n of [1,2,3,4,5,6,7,8]){const sp=rows[n],r=armoredInsect(sp,'hermit:'+n);assert.ok(sp.coiledShell);assert.equal(sp.eyestalks.length,2);assert.equal(sp.claws.length,2);assert.equal(Object.keys(r.bones).filter(k=>/^leg\d$/.test(k)).length,6);assert.ok(r.bones.coiledShell);assert.ok(r.bones.claw0&&r.bones.claw1);
 const f=attachFace(r,r.faceSpec,'C');assert.equal(f.eyes.length,2);assert.ok(f.eyes.every(e=>e.position.y>.16),'canonical eyes land on elevated stalk tips, not cheek');assert.ok(Math.abs(f.eyes[0].position.x-f.eyes[1].position.x)>.18);r.root.updateMatrixWorld(true);
 const plain=armoredInsect({...sp,claws:sp.claws.map(q=>({...q,fingers:[]}))},'palm-only');const tall=g=>{g.computeBoundingBox();return g.boundingBox.max.y;};assert.ok(tall(r.parts.find(p=>p.bone==='claw0').mesh.geometry)>tall(plain.parts.find(p=>p.bone==='claw0').mesh.geometry)+.08,'curved fingers extend above the physical palm');
 assert.ok(new THREE.Box3().setFromObject(r.root,true).min.y>=-.005,'shell props and walking feet stay above the ground');
 const {coiledShell}=await import('../character-3d/coiled-shell.mjs');const curled=coiledShell(sp.coiledShell),straight=coiledShell({...sp.coiledShell,turns:0});assert.ok(curled.attributes.position.array.some((v,i)=>Math.abs(v-straight.attributes.position.array[i])>.03),'winding physically changes the shell surface');
 const shell=r.parts.find(p=>p.bone==='coiledShell').mesh,s=sp.coiledShell;const origin=r.bones.coiledShell.localToWorld(new THREE.Vector3(...s.mouth).add(new THREE.Vector3(0,0,.5))),dir=new THREE.Vector3(0,0,-1).transformDirection(r.bones.coiledShell.matrixWorld);const hits=new THREE.Raycaster(origin,dir).intersectObject(shell);assert.ok(hits.length);assert.ok(hits[0].distance>.58,'mouth opens into a cavity, not a painted dark disk');
 shell.geometry.computeBoundingBox();assert.ok(shell.geometry.boundingBox.max.x-shell.geometry.boundingBox.min.x>.5,'spiral extends along its conical axis');assert.ok(shell.geometry.boundingBox.max.y-shell.geometry.boundingBox.min.y>.4,'coiled shell has full volume');
 let tris=0;for(const p of r.parts){const g=p.mesh.geometry;assert.ok([...g.attributes.position.array].every(Number.isFinite));tris+=(g.index?.count||g.attributes.position.count)/3;}assert.ok(tris<22000,'bounded articulated shell model');
 }
 assert.ok(rows[3].emptyShell,'03 separate small empty shell prop');assert.equal(rows[7].emptyShell,undefined);assert.notDeepEqual(rows[3].coiledShell,rows[7].coiledShell,'different source shell shapes and patterns');assert.equal(SPEC.specKeyFor({line:'hermit_crab',stage:6}),null,'representatives remain isolated');
});
test('hermit stalk eyes retain canonical emotion and blink ownership through32 states with attached shell and claws',async()=>{
 const rows=require('../character-3d/armored-spec.js')().hermit_crab?.stages;assert.ok(rows);
 const {armoredInsect}=await import('../character-3d/armored-insect.mjs'),{attachFace}=await import('../character-3d/rig.mjs'),{instantiate}=await import('../character-3d/runtime.mjs'),{animate,setEmotion}=await import('../character-3d/animate.mjs');
 for(const n of [1,2,3,4,5,6,7,8]){const r=armoredInsect(rows[n],'hermit:'+n);r.faces=[attachFace(r,r.faceSpec,'C')];for(const em of SPEC.CANONICAL_EMOTIONS)for(const moving of [false,true])for(const animLv of [0,2]){const a=instantiate({rig:r,key:'hermit:'+n});setEmotion(a,em);for(let i=0;i<20;i++)animate(a,{dt:.05,moving,animLv});assert.equal(a.faces.length,1);assert.equal(a.faces[0].eyes.length,2);assert.equal(a.faces[0].emotion,em);assert.equal(a.bones.coiledShell.parent,a.bones.body);for(const b of Object.values(a.bones))assert.ok([...b.position.toArray(),...b.rotation.toArray().slice(0,3)].every(Number.isFinite));}}
});
test('shell whorls fill the narrow conical core instead of separating into a curled tube',async()=>{
 const rows=require('../character-3d/armored-spec.js')().hermit_crab.stages,{coiledShell}=await import('../character-3d/coiled-shell.mjs'),{THREE}=await import('../character-3d/geometry.mjs');
 for(const n of [1,2,3,4,5,6,7,8]){const s=rows[n].coiledShell,mesh=new THREE.Mesh(coiledShell(s),new THREE.MeshBasicMaterial({side:THREE.DoubleSide}));mesh.updateMatrixWorld(true);
 for(let i=2;i<=9;i++){const t=i/10,x=-s.length*(1-t),innerHalf=s.radius*t*.50;for(const f of [-1,0,1]){const y=f*innerHalf,hit=new THREE.Raycaster(new THREE.Vector3(x,y,1),new THREE.Vector3(0,0,-1)).intersectObject(mesh)[0];assert.ok(hit,'compact conical shell covers its central silhouette at '+n+'/'+i+'/'+f);}}
 }
});

test('hermit eight-stage shell proportions and aged moss remain explicit source features',async()=>{
 const rows=require('../character-3d/armored-spec.js')().hermit_crab.stages;assert.equal(Object.keys(rows).length,8);
 assert.ok(rows[1].coiledShell.length/rows[1].coiledShell.radius<1.6,'young shell is compact');assert.ok(rows[6].coiledShell.length/rows[6].coiledShell.radius>3.2,'teal shell elongated');assert.ok(rows[8].coiledShell.length/rows[8].coiledShell.radius<2.2,'old shell broad');
 assert.ok(rows[8].coiledShell.moss);assert.ok(rows[8].shellSprigs?.length>=2);assert.deepEqual(Object.entries(rows).filter(([,s])=>s.emptyShell).map(([n])=>n),['3']);
 const {armoredInsect}=await import('../character-3d/armored-insect.mjs');const r=armoredInsect(rows[8],'hermit:8');assert.ok(r.parts.some(p=>p.bone==='shellSprigs'),'physical attached plant sprigs');assert.equal(r.bones.shellSprigs.parent,r.bones.coiledShell);
 const g=r.parts.find(p=>p.bone==='coiledShell').mesh.geometry,c=g.attributes.color;let green=0;for(let i=0;i<c.count;i++)if(c.getY(i)>c.getX(i)*1.2&&c.getY(i)>c.getZ(i)*1.4)green++;assert.ok(green>100,'visible moss coverage on aged shell');
});
