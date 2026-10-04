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
