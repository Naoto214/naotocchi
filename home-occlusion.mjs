import * as THREE from './vendor/three-0.170.0/three.module.min.js';
// Clip geometry against the screen-aligned illustration plane. This preserves
// actual trunks/branches/building silhouettes instead of hiding whole actors.
export function projectHomeOcclusion(camera,width,height,instances,point){
 const foot=new THREE.Vector3(point.x,point.y,-point.z).applyMatrix4(camera.matrixWorldInverse),out=[];
 for(const {geometry,matrix}of instances){
  const pos=geometry.attributes.position,idx=geometry.index,verts=[];
  for(let i=0;i<pos.count;i++)verts.push(new THREE.Vector3().fromBufferAttribute(pos,i).applyMatrix4(matrix).applyMatrix4(camera.matrixWorldInverse));
  const n=idx?idx.count:pos.count;
  for(let i=0;i<n;i+=3){let poly=[0,1,2].map(k=>verts[idx?idx.getX(i+k):i+k]);
   const clipped=[];for(let j=0;j<poly.length;j++){const a=poly[j],b=poly[(j+1)%poly.length],ai=a.z>foot.z+2,bi=b.z>foot.z+2;if(ai)clipped.push(a);if(ai!==bi)clipped.push(a.clone().lerp(b,(foot.z+2-a.z)/(b.z-a.z)));}poly=clipped;
   if(poly.length<3||poly.some(v=>v.z>=-camera.near))continue;
   const pts=poly.map(v=>{const p=v.clone().applyMatrix4(camera.projectionMatrix);return [(p.x+1)*width/2,(1-p.y)*height/2];});
   if(pts.every(p=>p[0]<0)||pts.every(p=>p[0]>width)||pts.every(p=>p[1]<0)||pts.every(p=>p[1]>height))continue;out.push(pts);
  }
 }return out;
}
