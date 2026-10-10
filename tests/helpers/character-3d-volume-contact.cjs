const assert=require('node:assert/strict');
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

module.exports={joined,components};
