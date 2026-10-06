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
test('antlion representatives retain one owned face in32 canonical motion states and stay outside runtime',async()=>{
 const {candidateConfig}=require('../tools/character-3d/candidate-spec.cjs');const c=candidateConfig(['--candidate-armored','--rollout','--species-only','--line','antlion']);assert.ok(c);assert.equal(SPEC.specKeyFor({line:'antlion',stage:7}),null);
 const {armoredInsect}=await import('../character-3d/armored-insect.mjs'),{attachFace}=await import('../character-3d/rig.mjs'),{instantiate}=await import('../character-3d/runtime.mjs'),{animate,setEmotion}=await import('../character-3d/animate.mjs');
 for(const stage of [3,7]){const r=armoredInsect(c.spec.stageSpec('antlion',stage),'antlion:'+stage);r.faces=[attachFace(r,r.faceSpec,'C')];
 for(const em of SPEC.CANONICAL_EMOTIONS)for(const moving of [false,true])for(const animLv of [0,2]){const a=instantiate({rig:r,key:'antlion:'+stage});setEmotion(a,em);for(let i=0;i<20;i++)animate(a,{dt:.05,moving,animLv});assert.equal(a.faces[0].emotion,em);for(const b of Object.values(a.bones))assert.ok([...b.position.toArray(),...b.rotation.toArray().slice(0,3)].every(Number.isFinite));}
 }
});
test('antlion forewings have visibly larger blade area than the short hindwings',async()=>{
 const sp=require('../character-3d/armored-spec.js')().antlion.stages[7],{armoredInsect}=await import('../character-3d/armored-insect.mjs');const r=armoredInsect(sp,'antlion:7');
 const area=g=>{const p=g.attributes.position,idx=g.index;let sum=0;for(let i=0;i<idx.count;i+=3){const [a,b,c]=[idx.getX(i),idx.getX(i+1),idx.getX(i+2)];sum+=Math.abs((p.getX(b)-p.getX(a))*(p.getY(c)-p.getY(a))-(p.getY(b)-p.getY(a))*(p.getX(c)-p.getX(a)))*.5;}return sum;};
 const fore=area(r.parts.find(p=>p.bone==='wing0').mesh.geometry),hind=area(r.parts.find(p=>p.bone==='wing1').mesh.geometry);assert.ok(fore>hind*1.8,'original large forewing/small hindwing silhouette');
});
test('antlion pit representative contains a genuinely concave soil surface and one larval face',async()=>{
 const sp=require('../character-3d/armored-spec.js')().antlion?.stages[3];assert.ok(sp,'pit larva representative');
 const {armoredInsect}=await import('../character-3d/armored-insect.mjs'),{THREE}=await import('../character-3d/geometry.mjs'),{attachFace}=await import('../character-3d/rig.mjs');const r=armoredInsect(sp,'antlion:3');assert.equal(attachFace(r,r.faceSpec,'C').eyes.length,2);assert.equal(Array.isArray(r.faceSpec),false);assert.equal(r.bones.wing0,undefined);assert.ok(r.bones.pit);assert.equal(sp.mandibles.length,2);
 r.root.updateMatrixWorld(true);const mesh=r.parts.find(p=>p.bone==='pit').mesh;const height=x=>new THREE.Raycaster(new THREE.Vector3(x,2,0),new THREE.Vector3(0,-1,0)).intersectObject(mesh)[0]?.point.y;
 assert.ok(Number.isFinite(height(.06))&&Number.isFinite(height(.58)));assert.ok(height(.58)-height(.06)>.20,'raised rim surrounds a lower interior, not a solid mound');
 let tris=0;for(const p of r.parts){const g=p.mesh.geometry;assert.ok([...g.attributes.position.array].every(Number.isFinite));tris+=(g.index?.count||g.attributes.position.count)/3;}assert.ok(tris<22000);
});
