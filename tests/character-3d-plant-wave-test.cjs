const test=require('node:test'),assert=require('node:assert/strict');
const SPEC=require('../character-3d/spec.js');
// Removing closed-bud volume must lose vertical depth; substituting a flat flower is invalid.
test('closed bud has tall continuous head and overlapping green sepals',async()=>{
 const {plant}=await import('../character-3d/archetypes.mjs');
 const base=SPEC.PILOT.dandelion.stages[6];
 const sp={...base,form:'bud',stem:.62,head:.29,bud:{height:.76,depth:.27,sepals:5},colors:{...base.colors,face:'#ffe342'}};
 const rig=plant(sp,'bud-fixture'),target=rig.faceSpec.target;target.computeBoundingBox();const b=target.boundingBox;
 assert.ok(b.max.y-b.min.y>.70,'closed bud retains vertical volume');
 assert.ok(b.max.z-b.min.z>.45,'bud has back volume, not a flower disc');
 assert.ok(rig.parts.some(p=>p.bone==='head'&&p.mesh.geometry.attributes.position.count>target.attributes.position.count),'sepals overlap head in shared draw');
});
// Rooted puff must keep the stem/root and rounded lobes rather than the detached cluster.
test('rooted seed head keeps soft three-dimensional ring and a connected stem',async()=>{
 const {plant}=await import('../character-3d/archetypes.mjs');
 const base=SPEC.PILOT.dandelion.stages[6],sp={...base,form:'seedHead',head:.42,seedHead:{lobes:22,depth:.28},colors:{...base.colors,face:'#fff4df',pappus:'#fffdf4'}};
 const rig=plant(sp,'seed-head-fixture');
 assert.ok(rig.bones.head.parent===rig.bones.stem);
 const target=rig.faceSpec.target;target.computeBoundingBox();assert.ok(target.boundingBox.max.z-target.boundingBox.min.z>.45,'rooted head has volume');
 const g=rig.parts.find(p=>p.bone==='head').mesh.geometry;g.computeBoundingBox();assert.ok(g.boundingBox.max.x-g.boundingBox.min.x>1.0,'soft lobes surround central face');
 assert.ok(g.index.count/3<5000,'bounded merged lobe geometry');
});
test('original bud and rooted-puff candidates retain all canonical expressions and finite motion',async()=>{
 const fs=require('node:fs');assert.ok(fs.existsSync(require('node:path').join(__dirname,'../character-3d/topology-spec.js')),'topology candidates exist');
 const row=require('../character-3d/topology-spec.js')(SPEC.PILOT).dandelion;
 const {plant}=await import('../character-3d/archetypes.mjs'),{attachFace}=await import('../character-3d/rig.mjs'),{instantiate}=await import('../character-3d/runtime.mjs'),{animate,setEmotion}=await import('../character-3d/animate.mjs');
 for(const stage of [2,3,5,7]){
  const sp=row.stages[stage],rig=plant(sp,'dandelion:'+stage);rig.faces=[attachFace(rig,rig.faceSpec,'C')];assert.equal(rig.faces[0].eyes.length,2,'face projects onto actual head');
  for(const part of rig.parts)assert.ok([...part.mesh.geometry.attributes.position.array].every(Number.isFinite));
  for(const moving of [false,true])for(const animLv of [0,2]){const actor=instantiate({rig,key:'dandelion:'+stage});for(const emotion of SPEC.CANONICAL_EMOTIONS){setEmotion(actor,emotion);animate(actor,{dt:.1,moving,animLv});assert.equal(actor.faces[0].emotion,emotion);for(const b of Object.values(actor.bones))assert.ok([...b.position.toArray(),...b.scale.toArray(),b.rotation.x,b.rotation.y,b.rotation.z].every(Number.isFinite));}}
 }
 assert.deepEqual(SPEC.ROLLOUT.dandelion,row,'reviewed plant batch promoted unchanged');
});
test('bud sepals remain exposed over the lower head surface and rooted leaves stay low',async()=>{
 const {plant}=await import('../character-3d/archetypes.mjs'),{THREE}=await import('../character-3d/geometry.mjs');
 const rows=require('../character-3d/topology-spec.js')(SPEC.PILOT).dandelion.stages,sp=rows[5],rig=plant(sp,'dandelion:5');
 const g=rig.parts.find(p=>p.bone==='head').mesh.geometry,p=g.attributes.position,c=g.attributes.color,want=new THREE.Color(sp.colors.leaf).toArray();let exposed=0;
 for(let i=0;i<p.count;i++)if(p.getY(i)>-sp.bud.height*.35&&p.getY(i)<-sp.bud.height*.1&&Math.hypot(p.getX(i),p.getZ(i))>sp.head*.9&&[c.getX(i),c.getY(i),c.getZ(i)].every((v,k)=>Math.abs(v-want[k])<.001))exposed++;
 assert.ok(exposed>10,'green sepals must emerge outside yellow core, not merely add hidden triangles');
 for(const stage of [5,7]){const r=plant(rows[stage],'dandelion:'+stage);const leaf=r.parts.find(p=>p.bone==='leavesA').mesh.geometry;leaf.computeBoundingBox();assert.ok(leaf.boundingBox.max.y<.25,'low original rosette');}
});
test('plant signature neutral eyes use existing canonical face resolution',async()=>{
 const {plant}=await import('../character-3d/archetypes.mjs'),{attachFace,applyFaceExpression}=await import('../character-3d/rig.mjs');const rows=require('../character-3d/topology-spec.js')(SPEC.PILOT).dandelion.stages;
 for(const [stage,want]of [[5,['content','content']],[7,['happy','round']]]){const r=plant(rows[stage],'dandelion:'+stage),f=attachFace(r,r.faceSpec,'C');applyFaceExpression(f,'normal');assert.deepEqual(f.eyes.map(e=>e.userData.shape),want);for(const em of SPEC.CANONICAL_EMOTIONS.filter(e=>e!=='normal')){applyFaceExpression(f,em);assert.ok(f.eyes.every(e=>e.userData.shape===SPEC.expressionParams(em).eye.shape));}}
});
test('sprout has two raised oval cotyledons with connected bases and grounded bulb feet',async()=>{
 const {plant}=await import('../character-3d/archetypes.mjs');
 const sp={...SPEC.PILOT.dandelion.stages[6],...SPEC.PILOT.dandelion.stages[4],form:'sprout',bulb:.30,cotyledons:{len:.55,width:.16,lift:.62},colors:{...SPEC.PILOT.dandelion.stages[4].colors,bulb:'#e99938',foot:'#b57936'}};
 const r=plant(sp,'sprout-fixture');for(const b of ['leavesA','leavesB']){const g=r.parts.find(p=>p.bone===b).mesh.geometry;g.computeBoundingBox();assert.ok(g.boundingBox.min.y>.30,'cotyledon base attaches to bulb crown');assert.ok(g.boundingBox.max.y>.7,'cotyledons rise above bulb');}
 const g=r.parts.find(p=>p.bone==='body').mesh.geometry;g.computeBoundingBox();assert.ok(g.boundingBox.min.y<.02,'bulb remains grounded');
 const {THREE}=await import('../character-3d/geometry.mjs');const pc=g.attributes.position,cc=g.attributes.color,foot=new THREE.Color(sp.colors.foot).toArray();let footVertices=0;for(let i=0;i<pc.count;i++)if(Math.abs(pc.getX(i))>.15&&pc.getY(i)<.06&&[cc.getX(i),cc.getY(i),cc.getZ(i)].every((v,k)=>Math.abs(v-foot[k])<.001))footVertices++;assert.ok(footVertices>10,'two grounded feet have original brown volume');
 assert.ok(r.meta.form==='sprout');assert.equal(r.faceSpec.bone,'body');
});
test('all eight dandelion candidates preserve Pilot references and exact stage topology',async()=>{
 const rows=require('../character-3d/topology-spec.js')(SPEC.PILOT).dandelion.stages;assert.deepEqual(Object.keys(rows).map(Number),[1,2,3,4,5,6,7,8]);
 for(const n of [1,4,6,8])assert.deepEqual(rows[n],SPEC.PILOT.dandelion.stages[n]);
 assert.equal(rows[2].form,'sprout');assert.equal(rows[3].form,'rosette');assert.ok(rows[3].leafLen/rows[3].bulb>4,'early rosette has small pale face within large canopy');
 const {BUILDERS}=await import('../character-3d/archetypes.mjs');for(const [stage,sp]of Object.entries(rows)){const r=BUILDERS[sp.archetype](sp,'dandelion:'+stage);for(const part of r.parts)assert.ok([...part.mesh.geometry.attributes.position.array].every(Number.isFinite));}
});
