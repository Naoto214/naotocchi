const test=require('node:test'),assert=require('node:assert/strict'),SPEC=require('../character-3d/spec.js');
test('adult antlion representative has narrow ringed abdomen, four long veined wings and two long antennae',async()=>{
 const sp=require('../character-3d/armored-spec.js')().antlion?.stages[7];assert.ok(sp,'explicit original-derived antlion adult representative');
 const {armoredInsect}=await import('../character-3d/armored-insect.mjs'),{attachFace}=await import('../character-3d/rig.mjs');const r=armoredInsect(sp,'antlion:7');
 assert.equal(attachFace(r,r.faceSpec,'C').eyes.length,2);assert.equal(sp.shell,null);assert.ok(sp.body.width/sp.body.length<.2,'long slender segmented abdomen');assert.equal(sp.antennae.length,2);
 assert.equal(Object.keys(r.bones).filter(n=>/^wing\d$/.test(n)).length,4);assert.equal(Object.keys(r.bones).filter(n=>/^leg\d$/.test(n)).length,6);
 const short=armoredInsect({...sp,antennae:undefined},'short');assert.ok(r.parts.find(p=>p.bone==='head').mesh.geometry.attributes.position.count>short.parts.find(p=>p.bone==='head').mesh.geometry.attributes.position.count+100,'long antennae are physical curves');
 for(const a of sp.antennae)assert.ok(Math.max(...a.path.map(v=>v[1]))>.35,'original tall antennae rise above the head');
 for(let i=0;i<4;i++)assert.ok(r.parts.find(p=>p.bone==='veins'+i).mesh.geometry.attributes.position.count>200,'wing venation is physical');
 let tris=0;for(const p of r.parts){const g=p.mesh.geometry;assert.ok([...g.attributes.position.array].every(Number.isFinite));tris+=(g.index?.count||g.attributes.position.count)/3;}assert.ok(tris<22000);
});
test('adult antlion candidate retains one owned face in32 canonical motion states and stays outside runtime',async()=>{
 const {candidateConfig}=require('../tools/character-3d/candidate-spec.cjs');const c=candidateConfig(['--candidate-armored','--rollout','--species-only','--line','antlion']);assert.ok(c);assert.equal(SPEC.specKeyFor({line:'antlion',stage:7}),null);
 const {armoredInsect}=await import('../character-3d/armored-insect.mjs'),{attachFace}=await import('../character-3d/rig.mjs'),{instantiate}=await import('../character-3d/runtime.mjs'),{animate,setEmotion}=await import('../character-3d/animate.mjs');
 const r=armoredInsect(c.spec.stageSpec('antlion',7),'antlion:7');r.faces=[attachFace(r,r.faceSpec,'C')];
 for(const em of SPEC.CANONICAL_EMOTIONS)for(const moving of [false,true])for(const animLv of [0,2]){const a=instantiate({rig:r,key:'antlion:7'});setEmotion(a,em);for(let i=0;i<20;i++)animate(a,{dt:.05,moving,animLv});assert.equal(a.faces[0].emotion,em);for(const b of Object.values(a.bones))assert.ok([...b.position.toArray(),...b.rotation.toArray().slice(0,3)].every(Number.isFinite));}
});
