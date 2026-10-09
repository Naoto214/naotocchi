const test=require('node:test'),assert=require('node:assert/strict');
test('Parrot reuses plumed bird with yellow fan crest, asymmetric white wings, long tail and hooked gray beak',async()=>{
 const row=require('../character-3d/nonplayer-spec.js')()['companion:parrot'];assert.ok(row);const s=row.spec,{BUILDERS}=await import('../character-3d/archetypes.mjs'),{THREE}=await import('../character-3d/geometry.mjs'),r=BUILDERS[s.archetype](s,'companion:parrot:0');assert.equal(s.archetype,'plumed_bird');assert.ok(s.crest.length>=6);assert.ok(s.crest.every(q=>new THREE.Color(q.color).r>.8&&new THREE.Color(q.color).b<.5));assert.ok(s.wings.left.length>=5&&s.wings.right.length>=5);assert.notDeepEqual(s.wings.left,s.wings.right);assert.ok(s.tail.feathers.length>=3);assert.ok(s.beak.path.at(-1)[1]<s.beak.path[0][1]-.06);r.root.updateMatrixWorld(true);assert.ok(new THREE.Box3().setFromObject(r.root,true).min.y>=-.005);let tris=0;for(const p of r.parts){const g=p.mesh.geometry;assert.ok([...g.attributes.position.array].every(Number.isFinite));tris+=(g.index?.count||g.attributes.position.count)/3;}assert.ok(tris<18000);assert.equal(require('../character-3d/spec.js').specKeyFor({kind:'companion',id:'parrot'}),null);
});
test('Parrot retains canonical face and owned finite motion in all32 states',async()=>{
 const row=require('../character-3d/nonplayer-spec.js')()['companion:parrot'];assert.ok(row);const SPEC=require('../character-3d/spec.js'),{BUILDERS}=await import('../character-3d/archetypes.mjs'),{attachFace}=await import('../character-3d/rig.mjs'),{instantiate}=await import('../character-3d/runtime.mjs'),{animate,setEmotion}=await import('../character-3d/animate.mjs'),r=BUILDERS[row.spec.archetype](row.spec,'companion:parrot:0');r.faces=[attachFace(r,r.faceSpec,'C')];for(const emotion of SPEC.CANONICAL_EMOTIONS)for(const moving of [false,true])for(const animLv of [0,2]){const a=instantiate({rig:r,key:'companion:parrot:0'});setEmotion(a,emotion);for(let i=0;i<20;i++)animate(a,{dt:.05,moving,animLv});assert.equal(a.faces.length,1);assert.equal(a.faces[0].emotion,emotion);for(const b of Object.values(a.bones))assert.ok([...b.position.toArray(),...b.rotation.toArray().slice(0,3)].every(Number.isFinite));}
});

test('Parrot has source-short exposed legs and white face space around eyes and mouth',async()=>{
 const s=require('../character-3d/nonplayer-spec.js')()['companion:parrot'].spec,{BUILDERS}=await import('../character-3d/archetypes.mjs'),{THREE,faceFrame}=await import('../character-3d/geometry.mjs'),r=BUILDERS.plumed_bird(s,'parrot');r.root.updateMatrixWorld(true);assert.ok(new THREE.Box3().setFromObject(r.parts.find(p=>p.bone==='body').mesh,true).min.y<.10,'low white belly covers upper legs');const f=r.faceSpec;assert.ok(f.layout.mouthY+f.layout.mouthW*.6+3.8<128,'all mouth strokes fit atlas cell');const fr=faceFrame(f.center,f.fwd,[0,1,0]),mesh=new THREE.Mesh(f.target,new THREE.MeshBasicMaterial({side:THREE.DoubleSide}));for(const [u,v]of [[-f.layout.eyeX/64*f.half,(64-f.layout.eyeY)/64*f.half],[f.layout.eyeX/64*f.half,(64-f.layout.eyeY)/64*f.half],[0,(64-f.layout.mouthY)/64*f.half],[0,(70-f.layout.mouthY)/64*f.half]]){const p=fr.c.clone().addScaledVector(fr.r,u).addScaledVector(fr.u,v),ray=new THREE.Raycaster(p.addScaledVector(fr.f,2),fr.f.clone().negate()),hit=ray.intersectObject(mesh)[0];assert.ok(hit);const col=f.target.attributes.color;assert.ok([hit.face.a,hit.face.b,hit.face.c].every(i=>col.getX(i)>.5),'beak does not cover canonical features');}
});

// Source cockatoo crest rises from the crown and fans backward, including in
// side projection. Raycast the assembled head so hidden feather layers do not count.
test('Parrot assembled crest keeps a backward layered silhouette in front, three-quarter and side views',async()=>{
 const s=require('../character-3d/nonplayer-spec.js')()['companion:parrot'].spec,
  {BUILDERS}=await import('../character-3d/archetypes.mjs'),
  {THREE}=await import('../character-3d/geometry.mjs'),
  {plumeGeometry}=await import('../character-3d/plumed-bird.mjs'),
  r=BUILDERS.plumed_bird(s,'parrot-crest');
 r.root.updateMatrixWorld(true);
 const head=r.parts.find(p=>p.bone==='head').mesh,
  bare=BUILDERS.plumed_bird({...s,crest:[]},'bare').parts.find(p=>p.bone==='head').mesh.geometry;
 let offset=bare.attributes.position.count;
 const ranges=s.crest.map(q=>{const g=plumeGeometry(q),range=[offset,offset+g.attributes.position.count];offset=range[1];g.dispose();return range;});
 const center=r.bones.head.getWorldPosition(new THREE.Vector3());
 for(const [view,yaw]of [['front',0],['three-quarter',Math.PI/4],['side',Math.PI/2]]){
  const forward=new THREE.Vector3(Math.sin(yaw),0,Math.cos(yaw)),right=new THREE.Vector3(Math.cos(yaw),0,-Math.sin(yaw));
  const layers=new Set(),bands=[0,0,0];let rear=0;
  for(let u=-.10;u<=.40;u+=.008)for(let v=.224;v<=.46;v+=.008){
   const origin=center.clone().addScaledVector(right,u).add(new THREE.Vector3(0,v,0)).addScaledVector(forward,2),
    hit=new THREE.Raycaster(origin,forward.clone().negate()).intersectObject(head)[0];
   if(!hit)continue;
   const feather=ranges.findIndex(([a,b])=>hit.face.a>=a&&hit.face.a<b);
   if(feather<0)continue;
   layers.add(feather);
   if(view!=='front'){
    if(u>.06&&v>.37)bands[0]++;
    if(u>.12&&v>.29&&v<.37)bands[1]++;
    if(u>.20&&v<.29)bands[2]++;
    rear=Math.max(rear,u);
   }
  }
  assert.ok(layers.size>=5,`${view}: at least five individually visible crest feathers (${layers.size})`);
  if(view!=='front'){
   assert.ok(rear>.24,`${view}: crest extends behind the head rather than collapsing to a spike (${rear})`);
   assert.ok(bands.every(n=>n>=5),`${view}: upper, middle and low backward fan remain visible (${bands})`);
  }
 }
});
