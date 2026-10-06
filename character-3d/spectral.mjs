// Closed tapered spirit volume; arms, halo and flames share one floating owner.
import {THREE,blob,ellipsoid,sweep,xform,paint,solid,mix} from './geometry.mjs';
import {Rig} from './rig.mjs';
export function spectral(sp,key){
 const r=new Rig(key,'spectral','blobFloat'),b=sp.body,c=sp.colors;
 const core=paint(blob((x,y,z)=>{const t=(y+1)/2,q=.45+.55*t;return [x*b.width*q-b.curl*Math.pow(1-t,2),b.base+t*b.height,z*b.depth*q];},28,20),(x,y,z,nx,ny,nz)=>mix(c.shadow,c.body,Math.max(0,nz)*.55+Math.max(0,ny)*.3+.1));
 r.add('body','root',[0,0,0],[core.clone()]);
 for(const side of [-1,1]){const a=sp.arms,parts=[solid(sweep(a.path.map(([x,y,z])=>[side*x,y,z]),t=>a.r*(1-t*.16),9,{steps:15}),c.body),solid(xform(ellipsoid(...a.handSize,12,8),{pos:a.path.at(-1).map((v,i)=>i===0?side*v:v)}),c.body)];r.add(side<0?'armL':'armR','body',[side*a.at[0],a.at[1],a.at[2]],parts);}
 if(sp.halo)r.add('halo','body',sp.halo.at,[solid(xform(new THREE.TorusGeometry(sp.halo.radius,.017,7,40),{rot:[Math.PI/2+.10,0,0]}),sp.halo.color)]);
 for(const [i,f]of sp.flames.entries()){
  const volume=(scale,color)=>paint(blob((x,y,z)=>{const t=(y+1)/2,q=1-t*.50;return [x*f.r*q*scale+f.bend*t*t,y*f.h*scale,z*f.r*.72*q*scale];},16,12),(x,y,z,nx,ny,nz)=>mix(color,'#d9ffff',Math.max(0,nz)*.48+Math.max(0,ny)*.10));
  r.add('flame'+i,'body',f.at,[volume(1,'#386add'),xform(volume(.52,'#4fd5ff'),{pos:[0,-f.h*.16,f.r*.42]})]);
 }
 r.meta={idlePose:'hover',hover:.10};r.faceSpec={bone:'body',target:core,center:[-.015,sp.faceY,b.depth*.85],fwd:[0,0,1],half:b.width*.63,eyeSize:.27,normalEye:sp.normalEye,layout:{eyeX:26,eyeY:53,mouthY:83,browY:32,cheekX:39,cheekY:73,mouthW:8},style:{blush:c.blush}};return r;
}
