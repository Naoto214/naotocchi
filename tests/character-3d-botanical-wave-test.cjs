const test=require('node:test'),assert=require('node:assert/strict'),SPEC=require('../character-3d/spec.js');
test('flowering sakura has rooted branch volume, attached five-petal blossom clusters and one trunk face',async()=>{
 const rows=require('../character-3d/botanical-spec.js')(),sp=rows.sakura.stages[4];assert.ok(sp);
 const {branchOrganism}=await import('../character-3d/branch-organism.mjs'),{attachFace}=await import('../character-3d/rig.mjs');
 const r=branchOrganism(sp,'sakura:4'),bare=branchOrganism({...sp,blossoms:[]},'bare');assert.equal(r.locomotion,'plantSway');assert.ok(sp.blossoms.length>=15);
 assert.ok(r.parts[0].mesh.geometry.attributes.position.count>bare.parts[0].mesh.geometry.attributes.position.count+2000,'flowers are physical petal volumes');
 assert.equal(attachFace(r,r.faceSpec,'C').eyes.length,2);assert.ok(r.faceSpec.center[1]<.5,'one face belongs to the lower trunk, not the flowers');
 let tri=0;for(const p of r.parts){assert.ok([...p.mesh.geometry.attributes.position.array].every(Number.isFinite));tri+=(p.mesh.geometry.index?.count||p.mesh.geometry.attributes.position.count)/3;}assert.ok(tri<22000);
 assert.ok(sp.branches.filter(b=>b.path.at(-1)[1]<.08).length>=4,'splayed original roots are explicit');
});
test('botanical candidate lookup is isolated and canonical emotions retain the single owning tree',async()=>{
 const {candidateConfig}=require('../tools/character-3d/candidate-spec.cjs'),before=JSON.stringify(SPEC.ROLLOUT);
 const c=candidateConfig(['--candidate-botanical','--rollout','--species-only','--line','sakura']);assert.ok(c);assert.equal(c.spec.stageSpec('sakura',4).archetype,'branch_organism');assert.equal(JSON.stringify(SPEC.ROLLOUT),before);assert.equal(SPEC.specKeyFor({line:'sakura',stage:3}),null);
 assert.throws(()=>candidateConfig(['--candidate-botanical','--candidate-armored','--rollout','--species-only','--line','sakura']));
 const {branchOrganism}=await import('../character-3d/branch-organism.mjs'),{attachFace}=await import('../character-3d/rig.mjs'),{instantiate}=await import('../character-3d/runtime.mjs'),{animate,setEmotion}=await import('../character-3d/animate.mjs');const r=branchOrganism(c.spec.stageSpec('sakura',4),'sakura:4');r.faces=[attachFace(r,r.faceSpec,'C')];
 for(const emotion of SPEC.CANONICAL_EMOTIONS)for(const moving of [false,true])for(const animLv of [0,2]){const a=instantiate({rig:r,key:'sakura:4'});setEmotion(a,emotion);for(let n=0;n<20;n++)animate(a,{dt:.05,moving,animLv});assert.equal(a.faces.length,1);assert.equal(a.faces[0].emotion,emotion);for(const b of Object.values(a.bones))assert.ok([...b.position.toArray(),...b.rotation.toArray().slice(0,3)].every(Number.isFinite));}
});
test('flower canopy has outward-oriented side blossoms rather than one parallel plane',async()=>{
 const sp=require('../character-3d/botanical-spec.js')().sakura.stages[4],{branchOrganism}=await import('../character-3d/branch-organism.mjs');
 const r=branchOrganism(sp,'rounded'),flat=branchOrganism({...sp,blossoms:sp.blossoms.map(f=>({...f,tilt:[0,0,0]}))},'flat');
 const actual=r.parts[0].mesh.geometry.attributes.position.array,baseline=flat.parts[0].mesh.geometry.attributes.position.array;
 assert.ok(actual.length!==baseline.length||actual.some((v,i)=>v!==baseline[i]),'blossom orientations must affect physical petal positions');
 assert.ok(sp.blossoms.filter(f=>Math.abs(f.tilt?.[1]||0)>.7).length>=8,'side-facing flowers fill the side silhouette');
 for(const f of sp.blossoms)assert.ok(sp.branches.some(b=>Math.hypot(...b.path.at(-1).map((v,i)=>v-f.at[i]))<.02),'every depth-layer flower has an attached branch tip');
 assert.ok(Math.max(...sp.blossoms.map(f=>f.at[2]))-Math.min(...sp.blossoms.map(f=>f.at[2]))>.65,'three-dimensional crown depth');
});
test('leafy tree and suspended three-cherry cluster retain distinct topology and face ownership',async()=>{
 const rows=require('../character-3d/botanical-spec.js')().sakura.stages;assert.ok(rows[3]&&rows[7],'leafy tree and cherry representatives');
 const {branchOrganism}=await import('../character-3d/branch-organism.mjs'),{attachFace}=await import('../character-3d/rig.mjs');
 const tree=branchOrganism(rows[3],'sakura:3'),bare=branchOrganism({...rows[3],foliage:[]},'bare');assert.ok(tree.parts[0].mesh.geometry.attributes.position.count>bare.parts[0].mesh.geometry.attributes.position.count+1000,'physical leaf crown');assert.equal(attachFace(tree,tree.faceSpec,'C').eyes.length,2);
 const fruit=branchOrganism(rows[7],'sakura:7');assert.equal(fruit.faceSpec.length,3,'three original cherries each own a face');assert.deepEqual(fruit.faceSpec.map(f=>f.bone),['unit0','unit1','unit2']);
 for(const f of fruit.faceSpec)assert.equal(attachFace(fruit,f,'C').eyes.length,2);
 const grounded=branchOrganism({...rows[7],suspended:false},'grounded');assert.ok(fruit.parts.reduce((n,p)=>n+p.mesh.geometry.attributes.position.count,0)<grounded.parts.reduce((n,p)=>n+p.mesh.geometry.attributes.position.count,0),'hanging berries have stems to common fork, not ground pedestals');
 for(const r of [tree,fruit])for(const p of r.parts)assert.ok([...p.mesh.geometry.attributes.position.array].every(Number.isFinite));
});
test('leaf and cherry representatives retain all owned canonical faces through normal and reduced motion',async()=>{
 const rows=require('../character-3d/botanical-spec.js')().sakura.stages,{branchOrganism}=await import('../character-3d/branch-organism.mjs'),{attachFace}=await import('../character-3d/rig.mjs'),{instantiate}=await import('../character-3d/runtime.mjs'),{animate,setEmotion}=await import('../character-3d/animate.mjs');
 for(const stage of [3,7]){const r=branchOrganism(rows[stage],'sakura:'+stage);r.faces=(Array.isArray(r.faceSpec)?r.faceSpec:[r.faceSpec]).map(f=>attachFace(r,f,'C'));
  let tris=0;for(const p of r.parts)tris+=(p.mesh.geometry.index?.count||p.mesh.geometry.attributes.position.count)/3;assert.ok(tris<22000);
  for(const em of SPEC.CANONICAL_EMOTIONS)for(const moving of [false,true])for(const animLv of [0,2]){const a=instantiate({rig:r,key:'sakura:'+stage});setEmotion(a,em);for(let n=0;n<20;n++)animate(a,{dt:.05,moving,animLv});assert.equal(a.faces.length,stage===7?3:1);assert.ok(a.faces.every(f=>f.emotion===em));for(const b of Object.values(a.bones))assert.ok([...b.position.toArray(),...b.rotation.toArray().slice(0,3)].every(Number.isFinite));}
 }
});
