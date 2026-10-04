const test=require('node:test'),assert=require('node:assert/strict');
const SPEC=require('../character-3d/spec.js');
test('fish wave identity mechanisms produce yolk volume, lateral parr marks, fork and hooked jaw',async()=>{
 const rows=require('../character-3d/fish-spec.js')(SPEC.PILOT);
 const {fish}=await import('../character-3d/archetypes.mjs');
 const build=n=>fish(rows.salmon.stages[n],'salmon:'+n);
 const yolk=build(1).parts.find(p=>p.bone==='yolk');assert.ok(yolk,'01 visible yolk volume');
 yolk.mesh.geometry.computeBoundingBox();assert.ok(yolk.mesh.geometry.boundingBox.getSize(new (await import('../character-3d/geometry.mjs')).THREE.Vector3()).y>.15);
 const barsOnly=JSON.parse(JSON.stringify(rows.salmon.stages[3]));barsOnly.sideMarks.spots=0;
 const marked=fish(barsOnly,'bars').parts[0].mesh.geometry.attributes.color.array;
 const plainSpec=JSON.parse(JSON.stringify(barsOnly));delete plainSpec.sideMarks;
 assert.notDeepEqual(marked,fish(plainSpec,'bars').parts[0].mesh.geometry.attributes.color.array,'parr marks change surface colour independently of spots');
 const mature=build(7).parts[0].mesh.geometry,withoutSpots=JSON.parse(JSON.stringify(rows.salmon.stages[7]));withoutSpots.sideMarks.spots=0;
 assert.equal((mature.index.count-fish(withoutSpots,'salmon:7').parts[0].mesh.geometry.index.count)/3,32*6,'small surface spots stay merged into body with bounded geometry');
 const fork=build(3).parts.find(p=>p.bone==='tail').mesh.geometry.attributes.position;
 const center=[],rim=[];for(let i=0;i<fork.count;i++){if(Math.abs(fork.getY(i))<.005)center.push(fork.getZ(i));if(Math.abs(fork.getY(i))>.08)rim.push(fork.getZ(i));}
 assert.ok(Math.min(...rim)<Math.min(...center)-.05,'fork lobes extend behind the central notch');
 const jaw=build(7).parts.find(p=>p.bone==='jaw');assert.ok(jaw,'mature jaw is volume, not a drawn line');
 for(const n of [1,3,7])for(const p of build(n).parts)assert.ok([...p.mesh.geometry.attributes.position.array].every(Number.isFinite));
});
test('schooling attachment carries three distinct faces without gameplay actors',async()=>{
 const sp=require('../character-3d/fish-spec.js')(SPEC.PILOT).clownfish.stages[5];
 const {fish}=await import('../character-3d/archetypes.mjs');const {attachFace}=await import('../character-3d/rig.mjs');
 const {instantiate}=await import('../character-3d/runtime.mjs');const {animate,setEmotion}=await import('../character-3d/animate.mjs');
 const rig=fish(sp,'clownfish:5');assert.equal(rig.faceSpec.length,3);
 rig.faces=rig.faceSpec.map(f=>attachFace(rig,f,'B'));const inst=instantiate({rig,key:'school'});
 for(const emotion of ['normal','positive','dislike','tired','sleeping','strained','wantsPlay','sick'])for(const animLv of [0,2]){
  setEmotion(inst,emotion);animate(inst,{dt:.1,moving:true,animLv});inst.root.updateMatrixWorld(true);
  assert.ok(inst.faces.every(f=>f.emotion===emotion));assert.ok(Object.values(inst.bones).every(b=>b.matrixWorld.elements.every(Number.isFinite)));
 }
 assert.ok(rig.parts.reduce((n,p)=>n+(p.mesh.geometry.index?.count||p.mesh.geometry.attributes.position.count)/3,0)<8500,'bounded secondary fish');
});


test('fish wave all original stages build finite templates and outward pectoral silhouettes',async()=>{
 const rows=require('../character-3d/fish-spec.js')(SPEC.PILOT),{fish}=await import('../character-3d/archetypes.mjs');
 for(const[id,row]of Object.entries(rows))for(let stage=1;stage<=8;stage++){
  const sp=row.stages[stage];assert.ok(sp,id+'/'+stage);
  const rig=fish(sp,id+':'+stage);assert.equal(rig.locomotion,'swimHover');
  for(const part of rig.parts)assert.ok([...part.mesh.geometry.attributes.position.array].every(Number.isFinite));
  if(sp.fins.spread){const fin=rig.parts.find(p=>p.bone==='finR').mesh.geometry;fin.computeBoundingBox();assert.ok(fin.boundingBox.max.x>.05,'pectoral fin spreads outside flank rather than folding into body');}
  if(stage>1)assert.notDeepEqual(sp.body,row.stages[stage-1].body,'explicit volume/proportion growth, not uniform scale');
 }
 for(const stage of [1,4,8])assert.deepEqual(rows.clownfish.stages[stage],SPEC.PILOT.clownfish.stages[stage]);
});
