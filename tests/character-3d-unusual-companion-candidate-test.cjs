const test=require('node:test'),assert=require('node:assert/strict');
const IDS=['sekizou','unicorn','many_tail_fox','watcher'],SPEC=require('../character-3d/spec.js');
function row(id){const r=require('../character-3d/nonplayer-spec.js')()['companion:'+id];assert.ok(r,`${id} isolated source candidate exists`);return r;}
async function build(id){const s=row(id).spec,{BUILDERS}=await import('../character-3d/archetypes.mjs');assert.ok(['rigid_object','quadruped','soft_toy','cosmic'].includes(s.archetype),'established source factory');return BUILDERS[s.archetype](s,'companion:'+id+':0');}
function closed(g,label){const p=g.attributes.position,idx=g.index,edges=new Map(),key=i=>[p.getX(i),p.getY(i),p.getZ(i)].map(n=>Math.round(n*1e5)).join(',');for(let i=0;i<idx.count;i+=3){const v=[key(idx.getX(i)),key(idx.getX(i+1)),key(idx.getX(i+2))];if(new Set(v).size<3)continue;for(let j=0;j<3;j++){const e=[v[j],v[(j+1)%3]].sort().join('/');edges.set(e,(edges.get(e)||0)+1);}}assert.ok([...edges.values()].every(n=>n%2===0),label+' closed volume edges');}
function decalPoint(THREE,mesh,px,py){const g=mesh.geometry,p=g.attributes.position,uv=g.attributes.uv,idx=g.index,u=px/128,v=1-py/128;for(let i=0;i<idx.count;i+=3){const a=idx.getX(i),b=idx.getX(i+1),c=idx.getX(i+2),ax=uv.getX(a),ay=uv.getY(a),bx=uv.getX(b),by=uv.getY(b),cx=uv.getX(c),cy=uv.getY(c),d=(by-cy)*(ax-cx)+(cx-bx)*(ay-cy),wa=((by-cy)*(u-cx)+(cx-bx)*(v-cy))/d,wb=((cy-ay)*(u-cx)+(ax-cx)*(v-cy))/d,wc=1-wa-wb;if(Math.min(wa,wb,wc)>=-1e-6)return new THREE.Vector3().fromBufferAttribute(p,a).multiplyScalar(wa).addScaledVector(new THREE.Vector3().fromBufferAttribute(p,b),wb).addScaledVector(new THREE.Vector3().fromBufferAttribute(p,c),wc).applyMatrix4(mesh.matrixWorld);}throw Error('mouth outside canonical decal');}
// Sample the produced eye's front cap relative to its own depth, for every shape.
function frontEyeSamples(THREE,eye,label){
 const g=eye.geometry,p=g.attributes.position,n=g.attributes.normal;g.computeBoundingBox();
 const lo=g.boundingBox.min.z,hi=g.boundingBox.max.z;
 assert.ok(Number.isFinite(lo)&&Number.isFinite(hi)&&hi>lo,`${label}: finite eye depth`);
 const front=[];for(let i=0;i<p.count;i++)if(p.getZ(i)>=hi-(hi-lo)*.35&&n.getZ(i)>.25)front.push(i);
 assert.ok(front.length>0,`${label}: nonempty actual front-surface eye samples`);
 const step=Math.max(1,Math.ceil(front.length/24));
 return front.filter((_,i)=>i%step===0).map(i=>new THREE.Vector3().fromBufferAttribute(p,i).applyMatrix4(eye.matrixWorld));
}
function assertEyesClear(THREE,eyes,obstacles,toward,label){
 const ray=new THREE.Raycaster();for(const eye of eyes){const samples=frontEyeSamples(THREE,eye,`${label}/${eye.name}`);
  assert.ok(samples.length>0,`${label}/${eye.name}: every checked state/frame samples this eye`);
  for(const p of samples){ray.set(p.clone().addScaledVector(toward,2),toward.clone().negate());const hit=ray.intersectObjects(obstacles)[0];
   assert.ok(!hit||hit.distance>=1.994,`${label}/${eye.name}: source volume covers canonical eye (${hit?.object.name}, distance=${hit?.distance})`);
  }
 }
}
test('four candidates remain runtime-isolated, finite, grounded, closed and within triangle budget',async()=>{const {THREE}=await import('../character-3d/geometry.mjs'),{attachFace}=await import('../character-3d/rig.mjs');for(const id of IDS){const r=await build(id);assert.equal(row(id).asset,`assets/characters/companions/${id}.png`);assert.equal(SPEC.specKeyFor({kind:'companion',id}),null);r.root.updateMatrixWorld(true);const box=new THREE.Box3().setFromObject(r.root,true);assert.ok(id==='watcher'?box.min.y>.005:box.min.y>=-.005&&box.min.y<.005,`${id} resting ground contact ${box.min.y}`);let tris=0;for(const p of r.parts){assert.ok([...p.mesh.geometry.attributes.position.array].every(Number.isFinite));tris+=(p.mesh.geometry.index?.count||p.mesh.geometry.attributes.position.count)/3;closed(p.mesh.geometry,`${id}/${p.bone}`);}r.faces=[attachFace(r,r.faceSpec,'C')];for(const mesh of [...r.faces[0].eyes,r.faces[0].decal])tris+=(mesh.geometry.index?.count||mesh.geometry.attributes.position.count)/3;assert.ok(tris<18000,`${id} tris with canonical face=${tris}`);assert.equal(r.bones.body.parent,r.root);if(r.bones.head)assert.equal(r.bones.head.parent,r.bones.body);}});
for(const id of IDS)test(`${id}: one canonical face and one owner keep eyes and mouth clear of props in all 32 states`,async()=>{const {THREE}=await import('../character-3d/geometry.mjs'),{attachFace}=await import('../character-3d/rig.mjs'),{instantiate}=await import('../character-3d/runtime.mjs'),{animate,setEmotion}=await import('../character-3d/animate.mjs');{const r=await build(id);r.faces=[attachFace(r,r.faceSpec,'C')];let states=0;for(const emotion of SPEC.CANONICAL_EMOTIONS)for(const moving of [false,true])for(const animLv of [0,2]){const a=instantiate({rig:r,key:id},7),other=instantiate({rig:r,key:id},9),otherRest=other.bones.body.position.clone(),otherRotation=other.bones.body.rotation.clone();assert.notEqual(a.bones.body,other.bones.body);assert.notEqual(a.anim,other.anim);setEmotion(a,emotion);states++;assert.equal(a.holder.children.length,1);assert.equal(a.root.parent,a.holder);assert.equal(a.faces.length,1);assert.equal(a.faces[0].eyes.length,id==='watcher'?1:2,'source canonical eye count');assert.notEqual(a.faces[0].eyes[0],other.faces[0].eyes[0],'actor-owned canonical eye mesh');let stateTris=0;a.root.traverse(o=>{if(o.isMesh&&o.material.name==='c3d:opaque'||o===a.faces[0].decal)stateTris+=(o.geometry.index?.count||o.geometry.attributes.position.count)/3;});assert.ok(stateTris<18000,`${id}/${emotion}: triangle budget including actual expression ${stateTris}`);for(let frame=0;frame<24;frame++){animate(a,{dt:.05,moving,animLv});if(frame%6!==0&&frame!==23)continue;a.root.updateMatrixWorld(true);for(const b of Object.values(a.bones))assert.ok([...b.matrixWorld.elements].every(Number.isFinite));assert.equal(a.faces[0].emotion,emotion);const obstacles=[];a.root.traverse(o=>{if(o.isMesh&&o.name.endsWith(':opaque'))obstacles.push(o);});for(const az of [-.62,0,.62]){const toward=new THREE.Vector3(Math.sin(az),.175,Math.cos(az)).transformDirection(a.root.matrixWorld),ray=new THREE.Raycaster(),clear=p=>{ray.set(p.clone().addScaledVector(toward,2),toward.clone().negate());const hit=ray.intersectObjects(obstacles)[0];assert.ok(!hit||hit.distance>=1.994,`${id}/${emotion}/${moving}/${animLv}: source volume covers canonical feature (${hit?.object.name}, distance=${hit?.distance}, sample=${p.toArray()}, localSample=${p.clone().applyMatrix4(a.bones[r.faceSpec.bone].matrixWorld.clone().invert()).toArray()}, localHit=${hit?.point.clone().applyMatrix4(a.bones[r.faceSpec.bone].matrixWorld.clone().invert()).toArray()})`);};assertEyesClear(THREE,a.faces[0].eyes,obstacles,toward,`${id}/${emotion}/${moving}/${animLv}/frame${frame}`);const f=r.faceSpec.layout;for(let px=64-f.mouthW-4;px<=64+f.mouthW+4;px+=4)for(let py=f.mouthY-3;py<=f.mouthY+f.mouthW*1.5+4;py+=3)clear(decalPoint(THREE,a.faces[0].decal,px,py));}}assert.deepEqual(other.bones.body.position.toArray(),otherRest.toArray(),'animating first actor cannot move sibling');assert.deepEqual(other.bones.body.rotation.toArray(),otherRotation.toArray(),'animating first actor cannot rotate sibling');assert.equal(other.anim.emotion,'normal');assert.equal(other.faces[0].emotion,'normal','sibling canonical expression unchanged');assert.ok(Object.keys(a.bones).some(n=>a.bones[n].position.distanceTo(other.bones[n].position)>0||a.bones[n].scale.distanceTo(other.bones[n].scale)>0||a.bones[n].rotation.toArray().some((v,i)=>v!==other.bones[n].rotation.toArray()[i]))||animLv===0,'owned rig motion');}assert.equal(states,32);}});

function part(r,name){const p=r.parts.find(p=>p.bone===name);assert.ok(p,`physical ${name} exists`);p.mesh.geometry.computeBoundingBox();return p.mesh;}
function colorCount(g,fn){const c=g.attributes.color;let n=0;for(let i=0;i<c.count;i++)if(fn(c.getX(i),c.getY(i),c.getZ(i),g.attributes.position,i))n++;return n;}
test('sekizou has tall rectangular stone head block nose heavy brow forward hands and a grounded pedestal',async()=>{
 const r=await build('sekizou'),{THREE}=await import('../character-3d/geometry.mjs');r.root.updateMatrixWorld(true);
 const h=part(r,'body').geometry.boundingBox;assert.ok(h.max.y-h.min.y>1.4*(h.max.x-h.min.x),'tall head');assert.ok(part(r,'nose').geometry.boundingBox.max.y-part(r,'nose').geometry.boundingBox.min.y>.25,'long block nose');
 for(const n of ['browL','browR'])assert.ok(part(r,n).geometry.boundingBox.max.x-part(r,n).geometry.boundingBox.min.x>.14,'deep brow');
 for(const n of ['handL','handR'])assert.ok(new THREE.Box3().setFromObject(part(r,n)).max.z>.28,'forward stone hands');
 const p=new THREE.Box3().setFromObject(part(r,'pedestal'));assert.ok(p.min.y>=-.005&&p.min.y<.005,'flat pedestal rests on ground');assert.ok(p.max.x-p.min.x>.5&&p.max.y-p.min.y<.12,'wide low pedestal');
 assert.ok(colorCount(part(r,'body').geometry,(x,y,z)=>Math.abs(x-y)<.08&&Math.abs(y-z)<.1)>100,'gray stone body');
});
// Interior probes use actual indexed triangles, rather than enclosing boxes or ideal ellipsoids.
function enclosedBy(THREE,mesh,point){
 const ray=new THREE.Raycaster(point,new THREE.Vector3(.327,.631,.703).normalize()),hits=ray.intersectObject(mesh),distances=[];
 for(const hit of hits)if(!distances.length||Math.abs(hit.distance-distances.at(-1))>1e-5)distances.push(hit.distance);
 return distances.length%2===1&&distances[0]>.004;
}
function volumeOverlap(THREE,a,b){
 const inside=(source,target)=>{const p=source.geometry.attributes.position;for(let i=0;i<p.count;i++){const point=new THREE.Vector3().fromBufferAttribute(p,i).applyMatrix4(source.matrixWorld);if(enclosedBy(THREE,target,point))return true;}return false;};
 return inside(a,b)||inside(b,a);
}
test('sekizou actual volumes overlap across pedestal torso head lip and both hands',async()=>{
 const r=await build('sekizou'),{THREE}=await import('../character-3d/geometry.mjs');r.root.updateMatrixWorld(true);
 const pairs=[['pedestal','stoneTorso'],['stoneTorso','body'],['body','stoneLip'],['stoneTorso','handL'],['stoneTorso','handR']];
 const actual=Object.fromEntries(pairs.map(([a,b])=>[a+'/'+b,volumeOverlap(THREE,part(r,a),part(r,b))]));assert.deepEqual(actual,Object.fromEntries(pairs.map(([a,b])=>[a+'/'+b,true])),'all five actual closed volume connections');
 for(const name of ['pedestal','stoneTorso','stoneLip','handL','handR'])assert.ok(r.bones[name].parent===r.bones.body,'physical connection inherits exact statue owner');
});
test('unicorn has slender white quadruped source pose gold horn swept lavender mane curled tail and dark hooves',async()=>{
 const r=await build('unicorn');assert.equal(r.archetype,'quadruped');const b=part(r,'body').geometry.boundingBox;assert.ok(b.max.z-b.min.z>1.9*(b.max.x-b.min.x),'slender horse body');
 const horn=part(r,'horn').geometry.boundingBox;assert.ok(horn.max.y-horn.min.y>.25,'long pointed horn');assert.ok(horn.max.z-horn.min.z>.06,'horn volume');assert.ok(r.bones.horn.parent===r.bones.head,'horn inherits exact head owner');
 assert.ok(colorCount(part(r,'horn').geometry,(x,y,z)=>x>.45&&y>.25&&z<.25)>60,'gold horn');
 for(const n of ['maneHead','maneNeck','hairTail'])assert.ok(colorCount(part(r,n).geometry,(x,y,z)=>z>y&&z>x)>100,'lavender source hair');
 const t=part(r,'hairTail').geometry.boundingBox;assert.ok(t.max.y-t.min.y>.35&&t.max.z-t.min.z>.28,'curled long rear tail');assert.ok(r.bones.hairTail.parent===r.bones.tail,'curl inherits exact animated tail owner');
 assert.ok(r.meta.poseProfile.pawLift==='legFL','raised source foreleg');for(const n of ['legFL','legFR','legBL','legBR'])assert.ok(colorCount(part(r,n).geometry,(x,y,z,p,i)=>x<.25&&y<.25&&p.getY(i)<-.3)>30,'dark hoof');
});
test('many_tail_fox sits upright with huge pointed cream ears white chest dark paws and six closed cream-tipped fan tails',async()=>{
 const r=await build('many_tail_fox');assert.equal(r.archetype,'soft_toy');const ears=part(r,'foxEars').geometry.boundingBox;assert.ok(ears.max.y>.51&&ears.min.x<-.35&&ears.max.x>.35,'large paired pointed ears');
 assert.ok(colorCount(part(r,'foxEars').geometry,(x,y,z)=>x>.6&&y>.45&&z>.25)>50,'cream ear interiors');
 assert.ok(colorCount(part(r,'body').geometry,(x,y,z,p,i)=>x>.6&&y>.45&&p.getZ(i)>.15)>100,'white source chest');
 for(const n of ['armL','armR','footL','footR'])assert.ok(colorCount(part(r,n).geometry,(x,y,z)=>x<.15&&y<.1&&z<.1)>50,'dark lower paws');
 const tails=r.parts.filter(p=>p.bone.startsWith('fanTail'));assert.equal(tails.length,6,'six visually distinct source tails');
 for(const p of tails){assert.equal(r.bones[p.bone].parent,r.bones.body,'tail fan remains body-owned');assert.ok(colorCount(p.mesh.geometry,(x,y,z)=>x>.7&&y>.5&&z>.25)>50,'cream closed tail tip');closed(p.mesh.geometry,p.bone);}
 r.root.updateMatrixWorld(true);const {THREE}=await import('../character-3d/geometry.mjs'),box=new THREE.Box3();for(const p of tails)box.union(new THREE.Box3().setFromObject(p.mesh));assert.ok(box.max.x-box.min.x>1.1&&box.max.y-box.min.y>.75,'large fan surrounds seated fox');
});
test('watcher is a closed dark vertical wisp with one central pale cyan canonical eye and no extra actor',async()=>{
 const r=await build('watcher'),{attachFace}=await import('../character-3d/rig.mjs');assert.equal(r.archetype,'cosmic');const b=part(r,'body').geometry.boundingBox;assert.ok(b.max.y-b.min.y>3*(b.max.x-b.min.x),'vertical source wisp');
 assert.ok(colorCount(part(r,'body').geometry,(x,y,z)=>x<.12&&y<.12&&z>x)>500,'dark navy purple wisp');
 const f=attachFace(r,r.faceSpec,'C');assert.equal(f.eyes.length,1,'exactly one actual projected eye');assert.ok(Math.abs(f.eyes[0].position.x)<.02,'central source eye');assert.ok(colorCount(f.eyes[0].geometry,(x,y,z)=>y>.4&&z>.5)>50,'pale cyan canonical eye');assert.equal(f.eyes[0].parent,r.bones.body);
});
test('optional unusual morphology preserves 53 frozen affected factory comparisons and eight plush defaults in this runtime',async()=>{
 const fs=require('node:fs'),crypto=require('node:crypto'),path=require('node:path');
 for(const [file,digest]of [["tests/fixtures/character-3d-cosmic-before-unusual.mjs", "440a71a0d8eb2ad2b683d0623fbf9ec8a7594c8fdcf9e3c90eb796446d88bc69"], ["tests/fixtures/character-3d-rigid-object-before-unusual.mjs", "8602b0778f1e082858fb122e3b1f45c76c1766b1b14a28320fe68307ed29f352"], ["tests/fixtures/character-3d-quadruped-before-unusual.mjs", "5a3a6d6b9f99ad0ec4267d8247a55fc22ab871a10a1eb863deee219340a9a354"], ["tests/fixtures/character-3d-nonplayer-before-unusual.cjs", "8087edf945591d53d9dcfe5740f132e0d6086e6da377b5610a44ecb1db782340"]])assert.equal(crypto.createHash('sha256').update(fs.readFileSync(path.join(__dirname,'..',file))).digest('hex'),digest,'frozen original source integrity '+file);
 const old=require('./fixtures/character-3d-nonplayer-before-unusual.cjs')();assert.equal(Object.keys(old).length,22,'frozen input inventory');
 const {BUILDERS}=await import('../character-3d/archetypes.mjs'),{sameRigDefaults}=require('./helpers/character-3d-soft-toy-baseline.cjs');
 const originals={rigid_object:(await import('./fixtures/character-3d-rigid-object-before-unusual.mjs')).rigidObject,quadruped:(await import('./fixtures/character-3d-quadruped-before-unusual.mjs')).quadruped,cosmic:(await import('./fixtures/character-3d-cosmic-before-unusual.mjs')).cosmic};
 const all=[...Object.entries(old),...Object.entries(SPEC.PILOT).flatMap(([species,row])=>Object.entries(row.stages||{}).map(([stage,spec])=>[species+':'+stage,{spec}]))];
 for(const [species,row]of Object.entries(SPEC.ROLLOUT))for(const [stage,spec]of Object.entries(row.stages||{}))all.push(['rollout:'+species+':'+stage,{spec}]);
 const myth=require('../character-3d/mythic-spec.js')(SPEC.PILOT);for(const [species,row]of Object.entries(myth))for(const [stage,spec]of Object.entries(row.stages||{}))all.push([species+':'+stage,{spec}]);
 let count=0;for(const [key,{spec}]of all){const original=originals[spec.archetype];if(!original)continue;sameRigDefaults(BUILDERS[spec.archetype](spec,key),original(spec,key),key);count++;}assert.equal(count,53,'53 genuine frozen factory comparisons; no builder-to-itself fallback');
 await require('./helpers/character-3d-soft-toy-baseline.cjs').assertSoftToyDefaults(BUILDERS.soft_toy,myth.plush.stages);
});

test('closed-expression watcher eye stays nonempty and clear at its single owned source core',async()=>{
 const {THREE}=await import('../character-3d/geometry.mjs'),{attachFace}=await import('../character-3d/rig.mjs'),{instantiate}=await import('../character-3d/runtime.mjs'),{animate,setEmotion}=await import('../character-3d/animate.mjs');const r=await build('watcher');r.faces=[attachFace(r,r.faceSpec,'C')];const shapes=new Set();
 for(const emotion of ['positive','sleeping','strained','sick']){const a=instantiate({rig:r,key:'watcher-closed'},7);setEmotion(a,emotion);animate(a,{dt:.05,moving:false,animLv:0});a.root.updateMatrixWorld(true);assert.equal(a.faces[0].eyes.length,1);shapes.add(SPEC.expressionParams(emotion).eye.shape);const obstacles=[];a.root.traverse(o=>{if(o.isMesh&&o.name.endsWith(':opaque'))obstacles.push(o);});for(const az of [-.62,0,.62])assertEyesClear(THREE,a.faces[0].eyes,obstacles,new THREE.Vector3(Math.sin(az),.175,Math.cos(az)).transformDirection(a.root.matrixWorld),'watcher closed-expression/'+emotion+'/frame0');}
 assert.deepEqual([...shapes].sort(),['flat','happy','squeeze']);
});
