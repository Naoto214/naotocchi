const test=require('node:test'),assert=require('node:assert/strict'),SPEC=require('../character-3d/spec.js');
test('stag mandibles remain below the projected mouth instead of crossing the canonical face',async()=>{
 const stages=require('../character-3d/armored-spec.js')().stagbeetle.stages;
 const {BUILDERS}=await import('../character-3d/archetypes.mjs'),{attachFace}=await import('../character-3d/rig.mjs');
 for(const stage of [5,6,7,8]){const sp=stages[stage];assert.ok(sp);
 const r=BUILDERS[sp.archetype](sp,'stagbeetle:7'),face=attachFace(r,r.faceSpec,'B');
 const mouth=face.feats.mouths.smile;
 for(const q of sp.mandibles){
  const upper=Math.max(...q.path.map(p=>p[1]),...q.teeth.map(p=>p[1]))+q.r;
  assert.ok(upper<mouth.position.y-.01,'upper jaw envelope must clear the mouth');
  const root=q.path[0];
  assert.ok((root[0]/sp.head.width)**2+(root[1]/sp.head.height)**2+(root[2]/sp.head.depth)**2<1.15,'jaw root remains attached to head');
 }
 }
});
test('beetle and stag originals keep six rooted articulated legs and distinct horn versus paired jaws',async()=>{
 const rows=require('../character-3d/armored-spec.js')();
 const {BUILDERS}=await import('../character-3d/archetypes.mjs'),{attachFace}=await import('../character-3d/rig.mjs'),{instantiate}=await import('../character-3d/runtime.mjs'),{animate,setEmotion}=await import('../character-3d/animate.mjs');
 for(const id of ['beetle','stagbeetle'])for(const stage of [5,6,7,8]){
  const sp=rows[id].stages[stage];assert.ok(sp,id+' explicit adult stage '+stage);
  const r=BUILDERS[sp.archetype](sp,id+':'+stage);r.faces=[attachFace(r,r.faceSpec,'C')];
  assert.equal(Object.keys(r.bones).filter(n=>/^leg[0-5]$/.test(n)).length,6);
  assert.equal(r.faces[0].eyes.length,2,'both eyes project onto the actual head');
  assert.ok(r.parts.some(p=>p.bone==='shellL')&&r.parts.some(p=>p.bone==='shellR'),'left/right elytra with longitudinal seam');
  if(stage===6&&id==='beetle'){assert.ok(Math.abs(r.bones.shellL.rotation.z)>.2,'young red beetle has raised angled covers');assert.ok(r.bones.shellL.rotation.z*r.bones.shellR.rotation.z<0,'opposite attached cover opening');}
  const bare=structuredClone(sp);bare.horn=null;bare.mandibles=[];const r0=BUILDERS[sp.archetype](bare,id+':bare');
  assert.ok(r.parts.find(p=>p.bone==='head').mesh.geometry.attributes.position.count>r0.parts.find(p=>p.bone==='head').mesh.geometry.attributes.position.count+100,'horn or mandibles add real connected geometry');
  assert.equal(r.meta.horns,id==='beetle'?1:0);assert.equal(r.meta.mandibles,id==='stagbeetle'?2:0);
  let tris=0;for(const p of r.parts){const g=p.mesh.geometry;assert.ok([...g.attributes.position.array].every(Number.isFinite));tris+=(g.index?.count||g.attributes.position.count)/3;}assert.ok(tris<22000,'bounded six-leg topology');
  for(const em of SPEC.CANONICAL_EMOTIONS)for(const moving of [false,true])for(const animLv of [0,2]){
   const a=instantiate({rig:r,key:id+':7'});setEmotion(a,em);for(let n=0;n<20;n++)animate(a,{dt:.05,moving,animLv});assert.equal(a.faces[0].emotion,em);
   for(const b of Object.values(a.bones))assert.ok([...b.position.toArray(),...b.rotation.toArray().slice(0,3)].every(Number.isFinite));
   if(em==='normal'&&moving&&animLv===2){assert.notEqual(a.bones.leg0.rotation.y,0);assert.ok(a.bones.leg0.rotation.y*a.bones.leg1.rotation.y<0,'alternating tripod phase');}
  }
  assert.deepEqual(SPEC.ROLLOUT[id].stages[stage],sp,'reviewed adult data matches runtime promotion');
 }
});
test('armored candidate overlay resolves only an explicit candidate family',()=>{
 const {candidateConfig}=require('../tools/character-3d/candidate-spec.cjs');
 const before=JSON.stringify(SPEC.ROLLOUT);const c=candidateConfig(['--candidate-armored','--rollout','--species-only','--line','beetle']);assert.ok(c);assert.equal(c.spec.stageSpec('beetle',7).archetype,'armored_insect');assert.deepEqual(SPEC.stageSpec('beetle',7),JSON.parse(JSON.stringify(c.spec.stageSpec('beetle',7))));assert.equal(JSON.stringify(SPEC.ROLLOUT),before,'overlay never mutates runtime registry');assert.equal(SPEC.specKeyFor({line:'star',stage:6}),null,'unreviewed Star remains isolated');
 assert.throws(()=>candidateConfig(['--candidate-armored','--candidate-aquatic','--rollout','--species-only','--line','beetle']));
});
