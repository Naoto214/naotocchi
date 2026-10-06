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
 const c=candidateConfig(['--candidate-botanical','--rollout','--species-only','--line','sakura']);assert.ok(c);assert.equal(c.spec.stageSpec('sakura',4).archetype,'branch_organism');assert.equal(JSON.stringify(SPEC.ROLLOUT),before);assert.equal(SPEC.specKeyFor({line:'sakura',stage:3}).exact,true);
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
test('leafy crown exposes leaf surfaces from the side and keeps each depth leaf attached',async()=>{
 const sp=require('../character-3d/botanical-spec.js')().sakura.stages[3];
 assert.ok(sp.foliage.filter(l=>Math.abs(l.tilt[1])>1).length>=6,'side-facing leaf blades prevent an edge-on crown');
 for(const leaf of sp.foliage.filter(l=>Math.abs(l.at[2])>.2))assert.ok(sp.branches.some(b=>Math.hypot(...b.path.at(-1).map((v,i)=>v-leaf.at[i]))<.025),'depth leaves meet branch tips');
 const {branchOrganism}=await import('../character-3d/branch-organism.mjs');
 const actual=branchOrganism(sp,'leafy'),flat=branchOrganism({...sp,foliage:sp.foliage.map(l=>({...l,tilt:[0,0,l.tilt[2]]}))},'flat');
 const a=actual.parts[0].mesh.geometry.attributes.position.array,b=flat.parts[0].mesh.geometry.attributes.position.array;
 assert.ok(a.some((v,i)=>v!==b[i]),'leaf rotations affect physical geometry');
});
test('sakura seed, sprout, five buds, two flowers and bare tree retain explicit original topology',async()=>{
 const rows=require('../character-3d/botanical-spec.js')().sakura.stages;
 for(const n of [1,2,5,6,8])assert.ok(rows[n],'explicit sakura stage '+n);
 const {branchOrganism}=await import('../character-3d/branch-organism.mjs'),{attachFace}=await import('../character-3d/rig.mjs');
 for(const [n,count] of [[1,1],[2,1],[5,5],[6,2],[8,1]]){const r=branchOrganism(rows[n],'sakura:'+n),fs=Array.isArray(r.faceSpec)?r.faceSpec:[r.faceSpec];assert.equal(fs.length,count,'original face count for '+n);for(const f of fs)assert.equal(attachFace(r,f,'C').eyes.length,2);let tris=0;for(const p of r.parts){const g=p.mesh.geometry;assert.ok([...g.attributes.position.array].every(Number.isFinite));tris+=(g.index?.count||g.attributes.position.count)/3;}assert.ok(tris<22000,'bounded sakura topology '+n);}
 assert.equal(rows[2].foliage.length,2,'two large seedling leaves');assert.ok(rows[1].body.taper>.4,'pointed almond seed');assert.equal(rows[8].blossoms.length,0);assert.ok(rows[8].foliage.length<5,'bare tree has only a few dry leaves');
 assert.ok(rows[5].colony.every(u=>u.spec.body.taper>.4),'five pointed buds, not a tree canopy');assert.equal(rows[6].colony.filter(u=>u.face!==false).length,2,'two flower centers own faces; small buds do not');
 const pointed=branchOrganism(rows[1],'seed'),rounded=branchOrganism({...rows[1],body:{...rows[1].body,taper:0}},'rounded');const a=pointed.parts[0].mesh.geometry.attributes.position.array,b=rounded.parts[0].mesh.geometry.attributes.position.array;assert.ok(a.length!==b.length||a.some((v,i)=>v!==b[i]),'seed taper changes physical geometry');
});
test('all sakura candidates preserve original face ownership across32 canonical states after reviewed runtime promotion',async()=>{
 const rows=require('../character-3d/botanical-spec.js')().sakura.stages,{branchOrganism}=await import('../character-3d/branch-organism.mjs'),{attachFace}=await import('../character-3d/rig.mjs'),{instantiate}=await import('../character-3d/runtime.mjs'),{animate,setEmotion}=await import('../character-3d/animate.mjs');
 for(const [n,count] of [[1,1],[2,1],[5,5],[6,2],[8,1]]){assert.ok(rows[n]);assert.equal(SPEC.specKeyFor({line:'sakura',stage:n-1}).stage,n);const r=branchOrganism(rows[n],'sakura:'+n);r.faces=(Array.isArray(r.faceSpec)?r.faceSpec:[r.faceSpec]).map(f=>attachFace(r,f,'C'));
 for(const em of SPEC.CANONICAL_EMOTIONS)for(const moving of [false,true])for(const animLv of [0,2]){const a=instantiate({rig:r,key:'sakura:'+n});setEmotion(a,em);for(let i=0;i<20;i++)animate(a,{dt:.05,moving,animLv});assert.equal(a.faces.length,count);assert.ok(a.faces.every(f=>f.emotion===em));for(const b of Object.values(a.bones))assert.ok([...b.position.toArray(),...b.rotation.toArray().slice(0,3)].every(Number.isFinite));}}
});
test('pointed seed keeps a smooth broad equator instead of a diamond corner',async()=>{
 const sp=require('../character-3d/botanical-spec.js')().sakura.stages[1],{branchOrganism}=await import('../character-3d/branch-organism.mjs');const r=branchOrganism({...sp,branches:[],foliage:[],blossoms:[]},'seed-core'),p=r.parts[0].mesh.geometry.attributes.position;
 const width=t=>{let w=0;for(let i=0;i<p.count;i++)if(Math.abs((p.getY(i)-sp.body.y)/sp.body.height-t)<.025)w=Math.max(w,Math.abs(p.getX(i)));return w;};
 assert.ok(width(.222)>width(0)*.92,'almond contour stays rounded near its broad middle');assert.ok(width(.901)<width(0)*.32,'seed ends remain tapered');
});
test('flower center volume leaves both canonical eye regions visible from the front',async()=>{
 const units=require('../character-3d/botanical-spec.js')().sakura.stages[6].colony.filter(u=>u.face!==false),{branchOrganism}=await import('../character-3d/branch-organism.mjs'),{THREE}=await import('../character-3d/geometry.mjs');
 for(const u of units){const sp=u.spec,r=branchOrganism(sp,'flower'),target=new THREE.Mesh(r.faceSpec.target,new THREE.MeshBasicMaterial({side:THREE.DoubleSide}));r.root.updateMatrixWorld(true);target.updateMatrixWorld(true);
 for(const side of [-1,1]){const ray=new THREE.Raycaster(new THREE.Vector3(side*sp.body.width*.4,sp.body.y+.01,1),new THREE.Vector3(0,0,-1)),core=ray.intersectObject(target)[0],actual=ray.intersectObject(r.parts[0].mesh)[0];assert.ok(core&&actual);assert.ok(Math.abs(core.point.z-actual.point.z)<.002,'petal center must not cover the facial target');}}
});
test('bare sakura has rounded terminal buds and preserves original open upper-left bud eyes',async()=>{
 const rows=require('../character-3d/botanical-spec.js')().sakura.stages,sp=rows[8],tips=sp.branches.filter(b=>b.path.at(-1)[1]>.4);
 assert.ok(tips.filter(b=>b.bulb>1).length>=20,'original bare crown ends in many round orange buds');
 assert.ok(tips.every(b=>b.r*(1-b.taper)>.009),'bare branches end with rounded thickness, not needles');
 const {branchOrganism}=await import('../character-3d/branch-organism.mjs'),r=branchOrganism(sp,'bare'),plain=branchOrganism({...sp,branches:sp.branches.map(b=>({...b,bulb:1}))},'unbudded');assert.ok(r.parts[0].mesh.geometry.attributes.position.count>plain.parts[0].mesh.geometry.attributes.position.count+1000,'terminal buds have actual volume');
 assert.equal(rows[5].colony[0].spec.normalEye,'round','source upper-left bud has open eyes');
});
test('venus flytrap representatives retain a broad rosette and five cupped red traps with physical rim teeth',async()=>{
 const row=require('../character-3d/botanical-spec.js')().venus_flytrap;assert.ok(row,'explicit original-derived representatives');assert.deepEqual(Object.keys(row.stages),['3','7']);
 const {branchOrganism}=await import('../character-3d/branch-organism.mjs'),{THREE}=await import('../character-3d/geometry.mjs'),{attachFace}=await import('../character-3d/rig.mjs');
 const rosette=row.stages[3];assert.ok(rosette.foliage.length>=9);assert.ok(rosette.foliage.every(l=>l.width>.08),'broad smooth leaves, not spines');const r=branchOrganism(rosette,'venus:3');assert.equal(attachFace(r,r.faceSpec,'C').eyes.length,2);
 const adult=row.stages[7];assert.equal(adult.colony.length,5);const a=branchOrganism(adult,'venus:7');assert.equal(a.faceSpec.length,5);assert.deepEqual(a.faceSpec.map(f=>f.bone),['unit0','unit1','unit2','unit3','unit4']);
 for(const u of adult.colony){const sp=u.spec;assert.ok(sp.trap?.teeth>=18);const unit=branchOrganism(sp,'trap'),g=unit.faceSpec.target;g.computeBoundingBox();assert.ok(g.boundingBox.max.z-g.boundingBox.min.z>.055,'cup has physical front/back depth');const mesh=new THREE.Mesh(g,new THREE.MeshBasicMaterial({side:THREE.DoubleSide}));mesh.updateMatrixWorld(true);unit.root.updateMatrixWorld(true);
 const rayAt=(x,y)=>new THREE.Raycaster(new THREE.Vector3(x,y,1),new THREE.Vector3(0,0,-1));const center=rayAt(0,sp.body.y).intersectObject(mesh)[0],edge=rayAt(sp.body.width*.86,sp.body.y).intersectObject(mesh)[0];assert.ok(center&&edge);assert.ok(edge.point.z-center.point.z>.025,'red trap is concave rather than a flat disk or convex ball');
 for(const side of [-1,1]){const ray=rayAt(side*sp.body.width*.4,sp.body.y+.01),target=ray.intersectObject(mesh)[0],actual=ray.intersectObject(unit.parts[0].mesh)[0];assert.ok(target&&actual);assert.ok(Math.abs(target.point.z-actual.point.z)<.002,'rim and teeth leave the facial area open');}
 const plain=branchOrganism({...sp,trap:{...sp.trap,teeth:0}},'toothless');assert.ok(unit.parts[0].mesh.geometry.attributes.position.count>plain.parts[0].mesh.geometry.attributes.position.count+300,'teeth contribute real volume');}
 for(const rig of [r,a]){let tris=0;for(const p of rig.parts){const g=p.mesh.geometry;assert.ok([...g.attributes.position.array].every(Number.isFinite));tris+=(g.index?.count||g.attributes.position.count)/3;}assert.ok(tris<22000);}
 assert.equal(SPEC.specKeyFor({line:'venus_flytrap',stage:6}),null,'candidate does not bypass image gate');
});
test('venus representatives keep all original faces and one actor clock through32 emotion/motion states',async()=>{
 const rows=require('../character-3d/botanical-spec.js')().venus_flytrap?.stages;assert.ok(rows);
 const {branchOrganism}=await import('../character-3d/branch-organism.mjs'),{attachFace}=await import('../character-3d/rig.mjs'),{instantiate}=await import('../character-3d/runtime.mjs'),{animate,setEmotion}=await import('../character-3d/animate.mjs');
 for(const n of [3,7]){const rig=branchOrganism(rows[n],'venus:'+n);rig.faces=(Array.isArray(rig.faceSpec)?rig.faceSpec:[rig.faceSpec]).map(f=>attachFace(rig,f,'C'));
 for(const em of SPEC.CANONICAL_EMOTIONS)for(const moving of [false,true])for(const animLv of [0,2]){const a=instantiate({rig,key:'venus:'+n});setEmotion(a,em);for(let i=0;i<20;i++)animate(a,{dt:.05,moving,animLv});assert.equal(a.faces.length,n===7?5:1);assert.ok(a.faces.every(f=>f.emotion===em));for(const b of Object.values(a.bones))assert.ok([...b.position.toArray(),...b.rotation.toArray().slice(0,3)].every(Number.isFinite));}}
});
