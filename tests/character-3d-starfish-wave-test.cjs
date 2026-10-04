const test=require('node:test'),assert=require('node:assert/strict'),SPEC=require('../character-3d/spec.js');
test('larval contour supports elongated asymmetric lower lobe with displaced face placement',async()=>{
 const {blobArchetype}=await import('../character-3d/archetypes.mjs'),base=SPEC.PILOT.starfish.stages[1];
 const sp={...base,contour:[[0,1],[-.7,.9],[-.8,.65],[-.45,.3],[.9,-.1],[.65,.15],[.55,.4],[.2,.65],[.4,.9]],face:{center:[-.10,.55,.6],half:.6}};
 const r=blobArchetype(sp,'elongated-fixture'),g=r.parts[0].mesh.geometry;g.computeBoundingBox();assert.ok(g.boundingBox.min.y<-.06,'longer lower lobe retained');assert.ok(r.faceSpec.center[0]<-.03,'face follows asymmetric core');
});
test('young radial composite keeps attached translucent larva and one canonical face with shared-state pulse',async()=>{
 const {radial}=await import('../character-3d/archetypes.mjs'),{attachFace}=await import('../character-3d/rig.mjs'),{instantiate}=await import('../character-3d/runtime.mjs'),{animate}=await import('../character-3d/animate.mjs');
 const base=SPEC.PILOT.starfish.stages[4],sp={...base,larvalAttachment:{spec:SPEC.PILOT.starfish.stages[1],at:[-.30,.26,-.12],scale:.65,roll:.25}};
 const r=radial(sp,'transition-fixture');assert.ok(r.bones['larva:body']);assert.equal(r.bones['larva:anchor'].parent,r.bones.body);assert.ok(r.parts.some(p=>p.bone==='larva:body'&&p.mesh.material.transparent));assert.equal(Array.isArray(r.faceSpec),false,'source larval remnant has no extra face');
 r.faces=[attachFace(r,r.faceSpec,'C')];const a=instantiate({rig:r,key:'transition-fixture'});animate(a,{dt:.1,moving:true,animLv:2});assert.notEqual(a.bones['larva:body'].scale.y,1,'secondary body reuses the same actor pulse');
 const plain=radial(base,'plain');plain.faces=[attachFace(plain,plain.faceSpec,'C')];const p=instantiate({rig:plain,key:'plain'});animate(p,{dt:.1,moving:true,animLv:2});assert.equal(a.root.position.y,p.root.position.y,'no duplicated float hover on the primary root');
 const reduced=instantiate({rig:r,key:'transition-reduced'});animate(reduced,{dt:.1,moving:true,animLv:0});assert.equal(reduced.bones['larva:body'].scale.y,1,'reduced mode removes idle pulse');
});
test('starfish transition candidates preserve one source face and canonical finite motion',async()=>{
 const rows=require('../character-3d/topology-spec.js')(SPEC.PILOT).starfish?.stages;assert.ok(rows?.[2]&&rows?.[3]);
 const {BUILDERS}=await import('../character-3d/archetypes.mjs'),{attachFace}=await import('../character-3d/rig.mjs'),{instantiate}=await import('../character-3d/runtime.mjs'),{animate,setEmotion}=await import('../character-3d/animate.mjs');
 for(const s of [2,3]){const sp=rows[s],r=BUILDERS[sp.archetype](sp,'starfish:'+s);r.faces=[attachFace(r,r.faceSpec,'C')];assert.equal(r.faces[0].eyes.length,2);for(const p of r.parts)assert.ok([...p.mesh.geometry.attributes.position.array].every(Number.isFinite));for(const em of SPEC.CANONICAL_EMOTIONS)for(const moving of [false,true])for(const animLv of [0,2]){const a=instantiate({rig:r,key:'starfish:'+s});setEmotion(a,em);for(let n=0;n<10;n++)animate(a,{dt:.05,moving,animLv});assert.equal(a.faces.length,1);assert.equal(a.faces[0].emotion,em);for(const b of Object.values(a.bones))assert.ok([...b.position.toArray(),...b.scale.toArray(),b.rotation.x,b.rotation.y,b.rotation.z].every(Number.isFinite));}}
 assert.equal(SPEC.ROLLOUT.starfish,undefined);
});
test('asymmetric larval core stays within its source outer silhouette',async()=>{
 const {blobArchetype}=await import('../character-3d/archetypes.mjs'),sp=require('../character-3d/topology-spec.js')(SPEC.PILOT).starfish.stages[2],r=blobArchetype(sp,'contained-core');
 const c=sp.contour.map(([x,y])=>[x*sp.r,y*sp.h]);const inside=(x,y)=>{let hit=false;for(let i=0,j=c.length-1;i<c.length;j=i++){const[a,b]=c[i],[d,e]=c[j];if((b>y)!==(e>y)&&x<(d-a)*(y-b)/(e-b)+a)hit=!hit;}return hit;};
 const p=r.parts[1].mesh.geometry.attributes.position;let outside=0;for(let i=0;i<p.count;i++)if(!inside(p.getX(i),p.getY(i)))outside++;assert.equal(outside,0,'opaque inner core must not protrude through transparent outer volume');
});
test('radial stage markings keep pale tips, raised large spots and source neutral eye shape',async()=>{
 const {radial}=await import('../character-3d/archetypes.mjs'),{THREE}=await import('../character-3d/geometry.mjs');const base=SPEC.PILOT.starfish.stages[8],r=radial({...base,normalEye:{left:'round',right:'happy'},dotRadius:.04,colors:{...base.colors,tip:'#fff1d1'}},'radial-marking-fixture');
 assert.deepEqual(r.faceSpec.normalEye,{left:'round',right:'happy'});const g=r.parts[0].mesh.geometry,p=g.attributes.position,c=g.attributes.color;let tips=0;for(let i=0;i<p.count;i++)if(Math.hypot(p.getX(i),p.getY(i))>base.r*.85&&p.getZ(i)>0&&c.getY(i)>.6)tips++;assert.ok(tips>10,'outer arm tips lighten');
 const a=radial({...base,dotRadius:.04},'same-seed'),b=radial({...base,dotRadius:.01},'same-seed');assert.notDeepEqual(Array.from(a.parts[0].mesh.geometry.attributes.position.array).filter((v,i)=>i%3!==2),Array.from(b.parts[0].mesh.geometry.attributes.position.array).filter((v,i)=>i%3!==2),'spot geometry uses source radius');
});
test('all eight starfish candidates are exact original-derived shapes with preserved Pilot stages',async()=>{
 const rows=require('../character-3d/topology-spec.js')(SPEC.PILOT).starfish.stages;assert.deepEqual(Object.keys(rows).map(Number).sort((a,b)=>a-b),[1,2,3,4,5,6,7,8]);
 for(const s of [1,4,8])assert.equal(rows[s],SPEC.PILOT.starfish.stages[s]);
 const {BUILDERS}=await import('../character-3d/archetypes.mjs'),{attachFace}=await import('../character-3d/rig.mjs'),{instantiate}=await import('../character-3d/runtime.mjs'),{animate,setEmotion}=await import('../character-3d/animate.mjs');
 for(const s of [5,6,7]){const sp=rows[s],r=BUILDERS[sp.archetype](sp,'starfish:'+s);r.faces=[attachFace(r,r.faceSpec,'C')];for(const p of r.parts)assert.ok([...p.mesh.geometry.attributes.position.array].every(Number.isFinite));for(const em of SPEC.CANONICAL_EMOTIONS)for(const moving of [false,true])for(const animLv of [0,2]){const a=instantiate({rig:r,key:'starfish:'+s});setEmotion(a,em);for(let n=0;n<10;n++)animate(a,{dt:.05,moving,animLv});assert.equal(a.faces[0].emotion,em);for(const b of Object.values(a.bones))assert.ok([...b.position.toArray(),...b.scale.toArray()].every(Number.isFinite));}}
 assert.ok(rows[6].armR/rows[6].r>rows[7].armR/rows[7].r,'broad orange centre versus slender pink arms');assert.equal(SPEC.ROLLOUT.starfish,undefined);
});
