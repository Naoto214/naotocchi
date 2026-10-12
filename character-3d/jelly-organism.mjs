// Transparent bell and rooted trailing appendages using the existing rig.
import {THREE,lathe,ellipsoid,sweep,xform,solid,paint,mix} from './geometry.mjs';
import {Rig} from './rig.mjs';
export function jellyOrganism(sp,key){
 const rig=new Rig(key,'jellyfish','blobFloat'),b=sp.bell,c=sp.colors;
 const bell=paint(lathe(b.profile,32),(x,y,z,nx,ny,nz)=>mix(c.bell,c.rim,Math.max(0,1-y/b.height)*.50));
 rig.add('body','root',[0,b.y,0],[bell.clone()],'translucent:'+b.alpha);
 // A softly tinted inner volume makes the face readable through the bell;
 // it is geometry, not a billboard or a separate actor.
 const core=paint(xform(ellipsoid(b.radius*.63,b.height*.53,b.radius*.60,20,12),{pos:[0,b.height*.38,0]}),(x,y,z,nx,ny,nz)=>mix(c.core,c.light,Math.max(0,nz)*.45));
 rig.mesh('body',[core]);
 const groups=[[],[],[],[]];
 for(const [i,t]of sp.tentacles.entries())groups[i%4].push(paint(sweep(t.path,v=>t.r*(1-v*.65),6,{steps:14}),(x,y,z,nx,ny,nz)=>mix(c.arm,c.armLight,Math.max(0,nz)*.65)));
 for(let i=0;i<4;i++)rig.add('tentacle'+i,'body',[0,0,0],groups[i]);
 const bubbles=sp.bubbles.map(p=>solid(xform(ellipsoid(p[3],p[3],p[3],8,6),{pos:p.slice(0,3)}),c.light));
 if(bubbles.length)rig.add('bubbles','body',[0,0,0],bubbles,'translucent:.5');
 rig.meta={hover:.10,idlePose:'hover',tentacleGroups:4};
 // Put the face on the solid inner volume, clear of the translucent rim.
 // A radius-only face size drops the adult's mouth below its shallow bell.
 rig.faceSpec={bone:'body',target:core,center:[0,b.height*.38,b.radius*.60],fwd:[0,0,1],half:Math.min(b.radius*.53,b.height*.65),eyeSize:.24,normalEye:sp.normalEye,
  layout:{eyeX:24,eyeY:56,mouthY:82,browY:36,cheekX:38,cheekY:72,mouthW:8},style:{blush:'#eb9bcc'}};
 return rig;
}
