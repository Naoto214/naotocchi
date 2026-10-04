const test=require('node:test'),assert=require('node:assert/strict'),SPEC=require('../character-3d/spec.js');
test('mycelium has a central face and bounded tapered branching arms with real depth',async()=>{
 const {fungus}=await import('../character-3d/archetypes.mjs'),base=SPEC.PILOT.mushroom.stages[4];
 const sp={...base,form:'mycelium',core:{r:.27,h:.26,depth:.23},branches:{count:12,reach:.70,r:.025},colors:{...base.colors,branch:'#f9e6c9'},attachments:[]};
 const r=fungus(sp,'mycelium-fixture');assert.equal(r.faceSpec.bone,'body');assert.equal(r.bones.cap,undefined,'no hidden or vestigial cap');assert.equal(r.parts.length,1,'non-articulated branches merge into one body mesh');
 const g=r.parts[0].mesh.geometry;g.computeBoundingBox();assert.ok(g.boundingBox.max.x-g.boundingBox.min.x>1.25);assert.ok(g.boundingBox.max.z-g.boundingBox.min.z>.4);assert.ok(g.index.count/3<9000,'bounded branch mesh');
 const {THREE}=await import('../character-3d/geometry.mjs');r.root.updateMatrixWorld(true);const forkRay=new THREE.Raycaster(new THREE.Vector3(.451,.717,1),new THREE.Vector3(0,0,-1));assert.ok(forkRay.intersectObject(r.parts[0].mesh).length,'branch forks occupy space away from primary radial arms');
 const core=r.faceSpec.target;core.computeBoundingBox();assert.ok(core.boundingBox.max.x-core.boundingBox.min.x<.6,'face projects onto core, not branches');
});
test('upturned cap rim rises above its centre and separate scalloped collar follows stem',async()=>{
 const {fungus}=await import('../character-3d/archetypes.mjs'),base=SPEC.PILOT.mushroom.stages[8];const sp={...base,cap:{r:.86,h:.28,shape:'upturned'},stem:{h:.66,r:.21},collar:{r:.30,h:.12,at:.50},attachments:[]};
 const r=fungus(sp,'upturned-fixture'),g=r.parts.find(p=>p.bone==='cap').mesh.geometry,p=g.attributes.position;let rim=-Infinity,centre=-Infinity;for(let i=0;i<p.count;i++){const rad=Math.hypot(p.getX(i),p.getZ(i));if(rad>.75)rim=Math.max(rim,p.getY(i));if(rad<.12)centre=Math.max(centre,p.getY(i));}assert.ok(rim>centre+.1,'concave open cap, not inherited flat dome');assert.ok(r.bones.collar);assert.equal(r.bones.collar.parent,r.bones.body);
});
test('optional cap patches are vertex colours and cap-face lower volume fades to cream',async()=>{
 const {fungus}=await import('../character-3d/archetypes.mjs'),{THREE}=await import('../character-3d/geometry.mjs');const base=SPEC.PILOT.mushroom.stages[4];
 const r=fungus({...base,cap:{r:.55,h:.42,shape:'flat',spots:[[-.3,.25,.28]]},colors:{...base.colors,cap:'#ec9584',capDark:'#c96862',capFace:'#fff0d2',spot:'#fff8e4'}},'patch-fixture');
 const g=r.parts.find(p=>p.bone==='cap').mesh.geometry,c=g.attributes.color,p=g.attributes.position,want=new THREE.Color('#fff8e4').toArray();let patches=0,cream=0;for(let i=0;i<c.count;i++){if([c.getX(i),c.getY(i),c.getZ(i)].every((v,k)=>Math.abs(v-want[k])<.001))patches++;if(p.getY(i)>.025&&p.getY(i)<.12&&c.getY(i)>.65)cream++;}assert.ok(patches>2,'visible pale spots on cap');assert.ok(cream>10,'cream face area has volume, not separate mask');
});
test('mycelium young cap and upturned cap candidates retain source face placement and canonical actor motion',async()=>{
 const row=require('../character-3d/topology-spec.js')(SPEC.PILOT).mushroom;assert.ok(row,'explicit representative candidates');
 const {fungus}=await import('../character-3d/archetypes.mjs'),{attachFace}=await import('../character-3d/rig.mjs'),{instantiate}=await import('../character-3d/runtime.mjs'),{animate,setEmotion}=await import('../character-3d/animate.mjs');
 for(const [s,bone]of [[2,'body'],[3,'cap'],[6,'body']]){const r=fungus(row.stages[s],'mushroom:'+s);assert.equal(r.faceSpec.bone,bone);r.faces=[attachFace(r,r.faceSpec,'C')];assert.equal(r.faces[0].eyes.length,2);for(const p of r.parts)assert.ok([...p.mesh.geometry.attributes.position.array].every(Number.isFinite));for(const em of SPEC.CANONICAL_EMOTIONS)for(const moving of [false,true])for(const animLv of [0,2]){const a=instantiate({rig:r,key:'mushroom:'+s});setEmotion(a,em);for(let n=0;n<10;n++)animate(a,{dt:.05,moving,animLv});assert.equal(a.faces[0].emotion,em);for(const b of Object.values(a.bones))assert.ok([...b.position.toArray(),...b.scale.toArray(),b.rotation.x,b.rotation.y,b.rotation.z].every(Number.isFinite));}}
 assert.equal(SPEC.ROLLOUT.mushroom,undefined,'representatives require image/distance review');
});
test('young cap face is above the lower rim and upturned underside keeps pale gills',async()=>{
 const {fungus}=await import('../character-3d/archetypes.mjs'),{attachFace}=await import('../character-3d/rig.mjs');const rows=require('../character-3d/topology-spec.js')(SPEC.PILOT).mushroom.stages;
 const young=fungus(rows[3],'young-face');assert.ok(young.faceSpec.center[1]>.20,'mouth/cheeks have cap volume below their centre');assert.equal(young.faceSpec.normalEye,'round');assert.equal(attachFace(young,young.faceSpec,'C').eyes.length,2);
 const mature=fungus(rows[6],'pale-gills'),g=mature.parts.find(p=>p.bone==='cap').mesh.geometry,p=g.attributes.position,n=g.attributes.normal,c=g.attributes.color;let underside=0,pale=0;for(let i=0;i<p.count;i++)if(Math.hypot(p.getX(i),p.getZ(i))>.3&&n.getY(i)<-.2){underside++;if(c.getY(i)>.2&&c.getZ(i)>.1)pale++;}assert.ok(underside>20);assert.ok(pale/underside>.9,'underside belongs to gill surface, not red cap');
});
test('leaning fungus keeps spore faces and bounded secondary bob under its own actor',async()=>{
 const {fungus}=await import('../character-3d/archetypes.mjs'),{attachFace}=await import('../character-3d/rig.mjs'),{instantiate}=await import('../character-3d/runtime.mjs'),{animate,setEmotion}=await import('../character-3d/animate.mjs');
 const base=SPEC.PILOT.mushroom.stages[8],sp={...base,attachments:['dirt'],stem:{h:.7,r:.24,lean:.20},sporeCluster:{spec:{...SPEC.PILOT.mushroom.stages[1],count:3,spread:.28},at:[.74,.54,.02],scale:.55}};
 const r=fungus(sp,'spore-fixture');assert.ok(r.bones['spores:u0'],'spores are actual geometry');assert.equal(r.bones['spores:u0'].parent,r.bones['spores:anchor']);assert.ok(r.bones.body.rotation.z>.15,'stem and cap lean together');assert.equal(r.faceSpec.length,4,'parent plus three source spore faces');
 r.faces=r.faceSpec.map(f=>attachFace(r,f,'C'));const a=instantiate({rig:r,key:'spore-fixture'});setEmotion(a,'tired');const rest=a.bones['spores:u0'].position.y;animate(a,{dt:.1,moving:true,animLv:2});assert.notEqual(a.bones['spores:u0'].position.y,rest,'secondary bob receives owner phase');for(const f of a.faces)assert.equal(f.emotion,'tired');
 const p=fungus({...sp,sporeCluster:undefined},'plain');p.faces=[attachFace(p,p.faceSpec,'C')];const b=instantiate({rig:p,key:'plain'});setEmotion(b,'tired');animate(b,{dt:.1,moving:true,animLv:2});assert.equal(a.root.position.y,b.root.position.y,'no second root hop');
 const reduced=instantiate({rig:r,key:'reduced'});animate(reduced,{dt:.1,moving:false,animLv:0});assert.equal(reduced.bones['spores:u0'].position.y,rest);
});
test('spore-release stage keeps source lean, secondary faces and finite canonical motion as an unpromoted candidate',async()=>{
 const sp=require('../character-3d/topology-spec.js')(SPEC.PILOT).mushroom.stages[7];assert.ok(sp,'explicit original-derived release stage');
 const {fungus}=await import('../character-3d/archetypes.mjs'),{attachFace}=await import('../character-3d/rig.mjs'),{instantiate}=await import('../character-3d/runtime.mjs'),{animate,setEmotion}=await import('../character-3d/animate.mjs');
 const r=fungus(sp,'mushroom:7');assert.equal(r.faceSpec.length,4);assert.ok(r.bones.body.rotation.z>.1);r.faces=r.faceSpec.map(f=>attachFace(r,f,'C'));
 for(const em of SPEC.CANONICAL_EMOTIONS)for(const moving of [false,true])for(const animLv of [0,2]){const a=instantiate({rig:r,key:'mushroom:7'});setEmotion(a,em);for(let n=0;n<10;n++)animate(a,{dt:.05,moving,animLv});for(const f of a.faces)assert.equal(f.emotion,em);for(const b of Object.values(a.bones))assert.ok([...b.position.toArray(),...b.scale.toArray()].every(Number.isFinite));}
 assert.equal(SPEC.ROLLOUT.mushroom,undefined);
});
test('mature red cap keeps original raised crown inside upturned rim rather than an empty bowl',async()=>{
 const {fungus}=await import('../character-3d/archetypes.mjs'),sp=require('../character-3d/topology-spec.js')(SPEC.PILOT).mushroom.stages[6],r=fungus(sp,'crowned-cap'),p=r.parts.find(x=>x.bone==='cap').mesh.geometry.attributes.position;
 let peak=-Infinity;for(let i=0;i<p.count;i++)if(Math.hypot(p.getX(i),p.getZ(i))<.12)peak=Math.max(peak,p.getY(i));assert.ok(peak>sp.cap.h*.75,'red centre has source dome volume');
});
test('all fungus stages preserve Pilot and separate red dome, open rim and leaning release shapes',async()=>{
 const rows=require('../character-3d/topology-spec.js')(SPEC.PILOT).mushroom.stages;assert.deepEqual(Object.keys(rows).map(Number).sort((a,b)=>a-b),[1,2,3,4,5,6,7,8]);for(const s of [1,4,8])assert.equal(rows[s],SPEC.PILOT.mushroom.stages[s]);
 const {fungus}=await import('../character-3d/archetypes.mjs'),{attachFace}=await import('../character-3d/rig.mjs'),{instantiate}=await import('../character-3d/runtime.mjs'),{animate,setEmotion}=await import('../character-3d/animate.mjs');
 const r=fungus(rows[5],'mushroom:5');assert.equal(r.faceSpec.bone,'body');assert.equal(r.bones.child,undefined);r.faces=[attachFace(r,r.faceSpec,'C')];assert.equal(r.faces[0].eyes.length,2);for(const em of SPEC.CANONICAL_EMOTIONS)for(const moving of [false,true])for(const animLv of [0,2]){const a=instantiate({rig:r,key:'mushroom:5'});setEmotion(a,em);for(let n=0;n<10;n++)animate(a,{dt:.05,moving,animLv});assert.equal(a.faces[0].emotion,em);for(const b of Object.values(a.bones))assert.ok([...b.position.toArray(),...b.scale.toArray()].every(Number.isFinite));}
 assert.ok(rows[5].cap.h/rows[5].cap.r>rows[6].cap.h/rows[6].cap.r,'young red dome is taller than opened rim');assert.equal(SPEC.ROLLOUT.mushroom,undefined);
});
test('released spore cluster follows original rising path instead of symmetric horizontal grouping',async()=>{
 const {fungus}=await import('../character-3d/archetypes.mjs'),sp=require('../character-3d/topology-spec.js')(SPEC.PILOT).mushroom.stages[7],r=fungus(sp,'release-path');const p=[0,1,2].map(i=>r.bones['spores:u'+i].position);assert.ok(p[1].y>p[0].y+.2&&p[2].y>p[1].y+.2,'ascending separate units');const width=Math.max(...p.map(v=>v.x))-Math.min(...p.map(v=>v.x));assert.ok(p[2].y-p[0].y>width*2,'vertical source gesture');
});
