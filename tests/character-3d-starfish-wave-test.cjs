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
