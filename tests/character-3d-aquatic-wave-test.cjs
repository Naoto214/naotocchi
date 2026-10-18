const test=require('node:test'),assert=require('node:assert/strict'),SPEC=require('../character-3d/spec.js');
const candidates=()=>require('../character-3d/aquatic-spec.js')(SPEC.PILOT);
test('coral representatives have rounded connected branches in one bounded mesh',async()=>{
 const {BUILDERS}=await import('../character-3d/archetypes.mjs');
 const rows=candidates().coral.stages;
 for(const stage of [2,5]){
  const sp=rows[stage],r=BUILDERS[sp.archetype](sp,'coral:'+stage);
  assert.equal(r.locomotion,'plantSway');assert.ok(r.bones.body&&r.bones.leavesA&&r.bones.leavesB);
  const branch=r.parts.find(p=>p.bone==='body').mesh.geometry;branch.computeBoundingBox();
  assert.ok(branch.boundingBox.max.x>.40,'lateral organic branches extend beyond face-bearing body');
  assert.ok(branch.boundingBox.max.y>.65,'upper branches retain source silhouette');
  assert.ok(branch.boundingBox.max.z-branch.boundingBox.min.z>.25,'coherent side volume');
  assert.ok(r.parts.length<=3,'branches are merged, not one draw each');
  for(const p of r.parts)assert.ok([...p.mesh.geometry.attributes.position.array].every(Number.isFinite));
  const bare=structuredClone(sp);bare.branches=[];
  const r0=BUILDERS[sp.archetype](bare,'coral:'+stage);
  assert.ok(branch.attributes.position.count>r0.parts.find(p=>p.bone==='body').mesh.geometry.attributes.position.count+500,'removing branches must remove real geometry');
 }
 assert.deepEqual(SPEC.ROLLOUT.coral.stages,rows,'only reviewed coral stages are runtime promoted');
});
test('aquatic representative faces follow canonical emotions and reduced motion without actor state',async()=>{
 const {BUILDERS}=await import('../character-3d/archetypes.mjs'),{attachFace}=await import('../character-3d/rig.mjs'),{instantiate}=await import('../character-3d/runtime.mjs'),{animate,setEmotion}=await import('../character-3d/animate.mjs');
 for(const [stage,sp]of Object.entries(candidates().coral.stages)){
 const r=BUILDERS[sp.archetype](sp,'coral:'+stage);r.faces=[r.faceSpec].flat().map(f=>attachFace(r,f,'C'));
 for(const em of SPEC.CANONICAL_EMOTIONS)for(const moving of [false,true])for(const animLv of [0,2]){
  const a=instantiate({rig:r,key:'coral:'+stage});setEmotion(a,em);for(let n=0;n<20;n++)animate(a,{dt:.05,moving,animLv});
  assert.equal(a.faces[0].emotion,em);if(moving&&animLv===2&&em==='normal')assert.ok(a.root.position.y>0,'existing plant locomotion moves the single root');for(const b of Object.values(a.bones))assert.ok([...b.position.toArray(),...b.scale.toArray(),...b.rotation.toArray().slice(0,3)].every(Number.isFinite));
 }
 }
});
test('aquatic candidate overlay is isolated and requires an exact family',()=>{
 const {candidateConfig}=require('../tools/character-3d/candidate-spec.cjs');
 const before=JSON.stringify(SPEC.ROLLOUT);
 const c=candidateConfig(['--candidate-aquatic','--rollout','--species-only','--line','coral']);
 assert.ok(c,'aquatic candidate route exists');assert.equal(c.spec.stageSpec('coral',5).archetype,'branch_organism');
 assert.equal(JSON.stringify(SPEC.ROLLOUT),before,'QA overlay does not mutate the runtime registry');
 assert.throws(()=>candidateConfig(['--candidate-aquatic','--candidate-topology','--rollout','--species-only','--line','coral']));
 assert.throws(()=>candidateConfig(['--candidate-aquatic','--rollout','--species-only','--line','missing']));
});
test('coral eight original stages preserve single versus colony face counts and shared actor motion',async()=>{
 const rows=candidates().coral.stages;assert.deepEqual(Object.keys(rows).map(Number),[1,2,3,4,5,6,7,8]);
 const {BUILDERS}=await import('../character-3d/archetypes.mjs'),{attachFace}=await import('../character-3d/rig.mjs'),{instantiate}=await import('../character-3d/runtime.mjs'),{animate,setEmotion}=await import('../character-3d/animate.mjs');
 for(const [s,want]of [[1,1],[3,1],[4,1],[6,4],[7,3],[8,5]]){
  const r=BUILDERS[rows[s].archetype](rows[s],'coral:'+s),faces=[r.faceSpec].flat();assert.equal(faces.length,want);
  assert.equal(new Set(faces.map(f=>f.bone)).size,want,'each projected face has a distinct owning bone');
  r.faces=faces.map(f=>attachFace(r,f,'C'));const a=instantiate({rig:r,key:'coral:'+s});
  for(const em of SPEC.CANONICAL_EMOTIONS)for(const moving of [false,true])for(const animLv of [0,2]){
   setEmotion(a,em);animate(a,{dt:.05,moving,animLv});assert.ok(a.faces.every(f=>f.emotion===em));
   for(const b of Object.values(a.bones))assert.ok([...b.position.toArray(),...b.scale.toArray()].every(Number.isFinite));
  }
  let tris=0;for(const p of r.parts){const g=p.mesh.geometry;assert.ok([...g.attributes.position.array].every(Number.isFinite));tris+=(g.index?.count||g.attributes.position.count)/3;}
  assert.ok(tris<30000,'merged colony topology is bounded');
 }
 assert.equal(rows[1].branches.length,0);assert.equal(rows[1].stones.length,0);
 assert.notDeepEqual(rows[3].branches,rows[4].branches,'tentacle growth versus lobed forks');
});
test('anemone lobes extend around the face disk in depth as well as silhouette',async()=>{
 const {branchOrganism}=await import('../character-3d/branch-organism.mjs'),sp=candidates().coral.stages[8].colony[1].spec;
 const r=branchOrganism(sp,'anemone');const g=r.parts[0].mesh.geometry;g.computeBoundingBox();
 assert.ok(g.boundingBox.max.x>sp.body.width*1.25,'rounded peripheral lobes distinguish anemone from bare sphere');
 assert.ok(g.boundingBox.max.z-g.boundingBox.min.z>.15,'not a flat flower sprite');
});
test('elevated coral colony members remain physically rooted to the shared substrate',async()=>{
 const {branchOrganism}=await import('../character-3d/branch-organism.mjs'),{THREE}=await import('../character-3d/geometry.mjs');
 for(const s of [6,7]){const sp=candidates().coral.stages[s],r=branchOrganism(sp,'rooted:'+s);
 for(const [i,u]of sp.colony.entries()){
  const bottom=u.at[1]+(u.spec.body.y-u.spec.body.height)*u.scale;
  if(bottom<=.10)continue;
  const localY=(.07+(bottom-.07)*.5-u.at[1])/u.scale;
  const p=r.parts.find(p=>p.bone==='unit'+i),mesh=new THREE.Mesh(p.mesh.geometry,new THREE.MeshBasicMaterial({side:THREE.DoubleSide}));mesh.updateMatrixWorld(true);
  const ray=new THREE.Raycaster(new THREE.Vector3(0,localY,2),new THREE.Vector3(0,0,-1));
  assert.ok(ray.intersectObject(mesh).length,'stage '+s+' member '+i+' has a solid root across the former gap');
 }
 }
});
