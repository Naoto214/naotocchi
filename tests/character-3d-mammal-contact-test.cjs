const test=require('node:test'),assert=require('node:assert/strict');
const SPEC=require('../character-3d/spec.js'),IDS=['rabbit_friend','tanuki','squirrel','hamster','otter','monkey','hedgehog'];
const shells=new WeakMap();
// Split merged closed shells before parity testing: overlapping constituents are a union,
// so a second internal surface must not cancel containment of the first.
function components(THREE,g){
 if(shells.has(g))return shells.get(g);
 const p=g.attributes.position,idx=g.index,parent=Array.from({length:p.count},(_,i)=>i),weld=new Map();
 const find=i=>parent[i]===i?i:(parent[i]=find(parent[i]));
 const join=(a,b)=>{parent[find(a)]=find(b);};
 for(let i=0;i<p.count;i++){const key=[p.getX(i),p.getY(i),p.getZ(i)].map(n=>Math.round(n*1e6)).join(',');if(weld.has(key))join(i,weld.get(key));else weld.set(key,i);}
 for(let i=0;i<idx.count;i+=3){join(idx.getX(i),idx.getX(i+1));join(idx.getX(i),idx.getX(i+2));}
 const groups=new Map();for(let i=0;i<idx.count;i+=3){const key=find(idx.getX(i));if(!groups.has(key))groups.set(key,[]);groups.get(key).push(idx.getX(i),idx.getX(i+1),idx.getX(i+2));}
 const result=[...groups.values()].sort((a,b)=>Math.min(...a)-Math.min(...b)).map(indices=>{const geo=new THREE.BufferGeometry();geo.setAttribute('position',p);geo.setIndex(indices);geo.computeBoundingBox();return new THREE.Mesh(geo,new THREE.MeshBasicMaterial({side:THREE.DoubleSide}));});shells.set(g,result);return result;
}
function interior(THREE,point,mesh){
 if(!mesh.geometry.boundingBox.containsPoint(point))return false;
 const direction=new THREE.Vector3(.327,.631,.703).normalize();
 for(const sign of [1,-1]){const ray=new THREE.Raycaster(point,direction.clone().multiplyScalar(sign)),dist=[];for(const hit of ray.intersectObject(mesh))if(!dist.length||Math.abs(hit.distance-dist.at(-1))>1e-5)dist.push(hit.distance);if(dist.length%2!==1||dist[0]<=.002)return false;}
 return true;
}
function overlapCount(THREE,a,b,sourceComponent,targetComponent){
 const source=sourceComponent==null?components(THREE,a.geometry):[components(THREE,a.geometry)[sourceComponent]],target=targetComponent==null?components(THREE,b.geometry):[components(THREE,b.geometry)[targetComponent]],map=b.matrixWorld.clone().invert().multiply(a.matrixWorld),seen=new Set();let count=0;
 for(const shell of source){assert.ok(shell,'actual source closed shell exists');for(const index of new Set(shell.geometry.index.array)){const point=new THREE.Vector3().fromBufferAttribute(shell.geometry.attributes.position,index).applyMatrix4(map),key=point.toArray().map(n=>Math.round(n*1e6)).join(',');if(seen.has(key))continue;seen.add(key);if(target.some(m=>interior(THREE,point,m))&&++count>=3)return count;}}
 return count;
}
function joined(THREE,a,b,ac,bc){return overlapCount(THREE,a,b,ac,bc)>=3||overlapCount(THREE,b,a,bc,ac)>=3;}
function mesh(a,name){return a.root.getObjectByName(name+':opaque');}
function bridge(THREE,a,name,limb,label){const core=mesh(a,'body'),end=mesh(a,limb),connector=mesh(a,name);if(connector){assert.equal(a.bones[name].parent,a.bones[limb],`${label}: connector follows limb owner`);assert.ok(joined(THREE,connector,core),`${label}: actual connector/torso interior contact`);assert.ok(joined(THREE,connector,end),`${label}: actual connector/limb interior contact`);}else assert.ok(joined(THREE,end,core),`${label}: actual limb/torso interior contact`);}
for(const id of IDS)test(`${id}: actual mammal contacts survive all 32 states`,async()=>{
 const {THREE}=await import('../character-3d/geometry.mjs'),{BUILDERS}=await import('../character-3d/archetypes.mjs'),{attachFace}=await import('../character-3d/rig.mjs'),{instantiate}=await import('../character-3d/runtime.mjs'),{animate,setEmotion}=await import('../character-3d/animate.mjs'),r=BUILDERS.soft_toy(require('../character-3d/nonplayer-spec.js')()['companion:'+id].spec,id);r.faces=[attachFace(r,r.faceSpec,'C')];let states=0;
 for(const emotion of SPEC.CANONICAL_EMOTIONS)for(const moving of [false,true])for(const animLv of [0,2]){const a=instantiate({rig:r,key:id},7);setEmotion(a,emotion);states++;let tris=0;a.root.traverse(o=>{if(o.isMesh)tris+=(o.geometry.index?.count||o.geometry.attributes.position.count)/3;});assert.ok(tris<18000,`${id}/${emotion}: actual expression triangle budget ${tris}`);
 for(let frame=0;frame<24;frame++){animate(a,{dt:.05,moving,animLv});if(frame%6&&frame!==23)continue;a.root.updateMatrixWorld(true);const label=`${id}/${emotion}/${moving}/${animLv}/frame${frame}`;
 for(const side of id==='monkey'?['R']:['L','R'])bridge(THREE,a,'shoulder'+side,'arm'+side,label+'/'+side);
 if(['monkey','hedgehog'].includes(id))for(const side of ['L','R'])bridge(THREE,a,'hindLeg'+side,'foot'+side,label+'/'+side);
 if(id==='tanuki'){const leaf=mesh(a,'heldLeaf');assert.ok(joined(THREE,leaf,mesh(a,'armL')),label+': actual leaf/forepaw interior contact');for(const lobe of [0,1])assert.ok(joined(THREE,leaf,leaf,lobe,2),label+': actual leaf lobe/stem interior contact '+lobe);}
 if(id==='squirrel')assert.ok(joined(THREE,mesh(a,'heldAcorn'),mesh(a,'armL')),label+': preserved acorn/forepaw interior contact');
 if(id==='otter')for(const side of ['L','R']){const grip=mesh(a,'grip'+side),arm=mesh(a,'arm'+side),stone=mesh(a,'heldStone');if(grip){assert.equal(a.bones['grip'+side].parent,a.bones['arm'+side]);assert.ok(joined(THREE,grip,arm),label+': actual grip/forepaw interior contact '+side);assert.ok(joined(THREE,grip,stone),label+': actual grip/stone interior contact '+side);}else assert.ok(joined(THREE,arm,stone),label+': actual forepaw/stone interior contact '+side);}
 }}assert.equal(states,32);
});
