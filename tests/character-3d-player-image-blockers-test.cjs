const test=require('node:test'),assert=require('node:assert/strict'),SPEC=require('../character-3d/spec.js');
const {joined}=require('./helpers/character-3d-volume-contact.cjs');
function decalPoint(T,mesh,px,py){const g=mesh.geometry,p=g.attributes.position,uv=g.attributes.uv,ix=g.index,u=px/128,v=1-py/128;
 for(let i=0;i<ix.count;i+=3){const a=ix.getX(i),b=ix.getX(i+1),c=ix.getX(i+2),ax=uv.getX(a),ay=uv.getY(a),bx=uv.getX(b),by=uv.getY(b),cx=uv.getX(c),cy=uv.getY(c),d=(by-cy)*(ax-cx)+(cx-bx)*(ay-cy),wa=((by-cy)*(u-cx)+(cx-bx)*(v-cy))/d,wb=((cy-ay)*(u-cx)+(ax-cx)*(v-cy))/d,wc=1-wa-wb;
 if(Math.min(wa,wb,wc)>=-1e-6)return new T.Vector3().fromBufferAttribute(p,a).multiplyScalar(wa).addScaledVector(new T.Vector3().fromBufferAttribute(p,b),wb).addScaledVector(new T.Vector3().fromBufferAttribute(p,c),wc).applyMatrix4(mesh.matrixWorld);}throw Error('canonical feature outside decal');}
async function modules(){return {...await import('../character-3d/geometry.mjs'),...await import('../character-3d/archetypes.mjs'),...await import('../character-3d/rig.mjs'),...await import('../character-3d/runtime.mjs'),...await import('../character-3d/animate.mjs')};}
async function checkMushroom(stage){const {THREE:T,fungus,attachFace,instantiate,setEmotion,animate}=await modules(),sp=structuredClone(require('../character-3d/topology-spec.js')(SPEC.PILOT).mushroom.stages[stage]);
 const r=fungus(sp,'mushroom:'+stage);r.faces=(Array.isArray(r.faceSpec)?r.faceSpec:[r.faceSpec]).map(f=>attachFace(r,f,'C'));
 let states=0;
for(const em of SPEC.CANONICAL_EMOTIONS)for(const moving of [false,true])for(const animLv of [0,2]){const a=instantiate({rig:r,key:r.key});setEmotion(a,em);states++;
 for(let frame=1;frame<=30;frame++){animate(a,{dt:1/30,moving,animLv});
 if(![6,15,30].includes(frame))continue;a.root.updateMatrixWorld(true);
 const cap=a.root.getObjectByName('cap:opaque'),body=a.root.getObjectByName('body:opaque'),label=`mushroom${stage}/${em}/${moving}/${animLv}/frame${frame}`;
 assert.ok(joined(T,cap,body),label+': cap/stem actual volume contact');
 const face=a.faces[0],points=[];
for(const eye of face.eyes){const g=eye.geometry,p=g.attributes.position,n=g.attributes.normal;g.computeBoundingBox();
 const hi=g.boundingBox.max.z,lo=g.boundingBox.min.z;
 for(let i=0;i<p.count;i++)if(p.getZ(i)>hi-(hi-lo)*.3&&n.getZ(i)>.25)points.push(new T.Vector3().fromBufferAttribute(p,i).applyMatrix4(eye.matrixWorld));}
// Atlas footprint includes sick forehead lines (browY-22..-6), brows and mouth.
const L=(Array.isArray(r.faceSpec)?r.faceSpec[0]:r.faceSpec).layout;
if(SPEC.expressionParams(em).marks.includes('gloom'))for(const x of [-14,-5,4,13])for(const y of [L.browY-22,L.browY-14,L.browY-6])points.push(decalPoint(T,face.decal,64+x,y));
if(SPEC.expressionParams(em).brow.show)for(const s of [-1,1])for(const x of [-10,0,9])for(const y of [-7,0,7])points.push(decalPoint(T,face.decal,64+s*L.eyeX+x,L.browY+y));
for(const x of [-L.mouthW-2,0,L.mouthW+2])for(const y of [L.mouthY-5,L.mouthY,L.mouthY+L.mouthW*1.5+2])points.push(decalPoint(T,face.decal,64+x,y));
for(const az of [-.62,0,.62]){const dir=new T.Vector3(Math.sin(az),.175,Math.cos(az)).normalize(),ray=new T.Raycaster();
 for(const p of points){ray.set(p.clone().addScaledVector(dir,2),dir.clone().negate());
 const hit=ray.intersectObject(cap)[0];
 assert.ok(!hit||hit.distance>=1.998,label+': cap covers canonical feature at '+p.toArray()+' distance '+hit?.distance);}}
let tris=0;a.root.traverse(o=>{if(o.isMesh)tris+=(o.geometry.index?.count||o.geometry.attributes.position.count)/3;});
 assert.ok(tris<18000,label+': actual expression budget');}}assert.equal(states,32);}
for(const n of [5,6,7])test('mushroom '+n+': assembled cap clears complete canonical face in32states',()=>checkMushroom(n));
function inside(T,point,mesh){const dir=new T.Vector3(.327,.631,.703).normalize();
 for(const s of [1,-1]){const hits=new T.Raycaster(point,dir.clone().multiplyScalar(s)).intersectObject(mesh),d=[];
 for(const h of hits)if(!d.length||Math.abs(h.distance-d.at(-1))>1e-5)d.push(h.distance);
 if(d.length%2!==1||d[0]<.004)return false;}return true;}
async function checkFish(stage){const {THREE:T,fish,attachFace,instantiate,setEmotion,animate}=await modules(),sp=structuredClone(require('../character-3d/fish-spec.js')(SPEC.PILOT).clownfish.stages[stage]);
 const r=fish(sp,'clownfish:'+stage),fs=Array.isArray(r.faceSpec)?r.faceSpec:[r.faceSpec];r.faces=fs.map(f=>attachFace(r,f,'C'));
 const owners=['',...(r.meta.swimSubrigs||[]).map(s=>s.prefix)],volumes=fs.map(f=>new T.Mesh(f.target,new T.MeshBasicMaterial({side:T.DoubleSide})));
 let states=0;
for(const em of SPEC.CANONICAL_EMOTIONS)for(const moving of [false,true])for(const animLv of [0,2]){const a=instantiate({rig:r,key:r.key});setEmotion(a,em);states++;
 for(let frame=1;frame<=30;frame++){animate(a,{dt:1/30,moving,animLv});
 if(![6,15,30].includes(frame))continue;a.root.updateMatrixWorld(true);
 for(const [owner,prefix]of owners.entries()){const bodyVolume=volumes[owner];bodyVolume.matrixWorld.copy(a.bones[prefix+'body'].matrixWorld);
 for(const side of ['L','R']){const fin=a.root.getObjectByName(prefix+'fin'+side+':opaque'),p=new T.Vector3().applyMatrix4(fin.matrixWorld);
 assert.ok(inside(T,p,bodyVolume),`clownfish${stage}/${em}/${moving}/${animLv}/frame${frame}: pectoral ${side} root embedded in actual body triangles`);
 const g=fin.geometry,ix=g.index,pos=g.attributes.position;
 let touching=0;
 for(let k=0;k<ix.count;k+=3){const ids=[ix.getX(k),ix.getX(k+1),ix.getX(k+2)],vs=ids.map(i=>new T.Vector3().fromBufferAttribute(pos,i));
 const center=vs.findIndex(v=>v.length()<1e-6);
 if(center<0)continue;
 const q=vs[center].clone().multiplyScalar(.9).addScaledVector(vs[(center+1)%3],.05).addScaledVector(vs[(center+2)%3],.05).applyMatrix4(fin.matrixWorld);
 if(inside(T,q,bodyVolume))touching++;}assert.ok(touching>=3,`clownfish${stage}/${em}: at least three actual pectoral ${side} root triangles overlap body volume`);}}}}assert.equal(states,32);}
for(const n of [2,3,5,6,7])test('clownfish '+n+': both produced pectoral roots stay embedded in32states',()=>checkFish(n));
test('fish optional root inset preserves frozen Pilot and spread-fin default geometry',async()=>{const {fish}=await modules(),{fish:before}=await import('./fixtures/character-3d-fish-before-image-blockers.mjs'),{sameRigDefaults}=require('./helpers/character-3d-soft-toy-baseline.cjs'),inputs=require('./fixtures/character-3d-fish-image-blocker-default-inputs.json');
 for(const [key,sp]of Object.entries(inputs))sameRigDefaults(fish(sp,key),before(sp,key),'frozen fish '+key);});
