// Closed orbital tubes or individually authored curved flares around one face.
import {THREE,ellipsoid,sweep,xform,paint,solid,mix} from '../../character-3d/geometry.mjs';
import {Rig} from '../../character-3d/rig.mjs';
export function cosmic(sp,key){
 const r=new Rig(key,'cosmic','blobFloat'),c=sp.colors;
 const core=paint(xform(ellipsoid(...sp.core.size,24,18),{pos:sp.core.at}),(x,y,z,nx,ny,nz)=>mix(c.core,c.light,Math.max(0,nz)*.55+Math.max(0,ny)*.18)),parts=[core.clone()];
 for(const o of sp.orbits){const path=[];for(let i=0;i<=64;i++){const t=i/64,a=o.start+t*o.turns*Math.PI*2,rad=o.inner+(o.outer-o.inner)*t;path.push([Math.cos(a)*rad,Math.sin(a)*rad,0]);}parts.push(paint(xform(sweep(path,t=>o.width*(.78+.22*Math.sin(t*Math.PI)),8,{steps:96}),{rot:sp.orbitTilt}),(x,y,z,nx,ny,nz)=>mix(o.color,o.light,Math.max(0,nz)*.35+Math.max(0,ny)*.2)));}
 for(const f of sp.flares){const g=sweep(f.path,t=>f.r*Math.pow(1-t,1.25)+.002,10,{steps:24});parts.push(paint(g,(x,y,z,nx,ny,nz)=>mix(c.rim,c.fire,Math.max(0,nz)*.78+Math.max(0,ny)*.12)));const inner=f.path.map(([x,y,z])=>[x,y,z+f.r*.61]);parts.push(solid(sweep(inner,t=>f.r*.43*Math.pow(1-t,1.4)+.001,7,{steps:24}),c.light));}
 for(const q of sp.sparks)parts.push(solid(xform(new THREE.OctahedronGeometry(q.r),{pos:q.at,scale:[1,1.25,1]}),q.color));
 r.add('body','root',[0,sp.y,0],parts);r.meta={idlePose:'hover',hover:.08};r.faceSpec={bone:'body',target:core,center:[sp.core.at[0],sp.core.at[1]+.02,sp.core.at[2]+sp.core.size[2]*.96],fwd:[0,0,1],half:sp.core.size[0]*.80,eyeSize:.26,normalEye:sp.normalEye,layout:{eyeX:25,eyeY:53,mouthY:85,browY:31,cheekX:40,cheekY:73,mouthW:8},style:{blush:c.blush}};return r;
}
