// Opaque blue body, soft limbs or owned gold rays; one canonical floating face.
import {blob,ellipsoid,sweep,xform,paint,solid,mix} from './geometry.mjs';
import {Rig} from './rig.mjs';
import {plumeGeometry} from './plumed-bird.mjs';
export function mysteryBlob(sp,key){
 const r=new Rig(key,'mystery_blob','blobFloat'),b=sp.body,c=sp.colors;
 const shade=(x,y,z,nx,ny,nz)=>{const edge=Math.pow(1-Math.abs(nz),3)*.95,base=mix(c.core,c.rim,edge);const spot=Math.exp(-((x+.15)**2/.008+(y-.23)**2/.005+(z-.20)**2/.025));return mix(base,c.highlight,spot*.92);};
 const core=paint(blob((x,y,z)=>[x*b.width*(1-b.taper*y),y*b.height,z*b.depth],28,20),shade);
 r.add('body','root',[0,b.y,0],[core.clone()]);
 for(const[i,q]of sp.limbs.entries())r.add('limb'+i,'body',q.at,[paint(xform(ellipsoid(...q.size,18,12),{rot:q.rotation}),shade)]);
 for(const[i,q]of sp.markers.entries())r.add('marker'+i,'body',[0,0,0],[solid(sweep(q.path,()=>q.r,8,{steps:10}),c.gold)]);
 for(const[i,q]of (sp.antennae||[]).entries())r.add('antenna'+i,'body',[0,0,0],[solid(sweep(q.path,()=>.019,8,{steps:16}),c.rim),paint(xform(ellipsoid(q.r,q.r,q.r,18,12),{pos:q.path.at(-1)}),shade)]);
 if(sp.wings)for(const side of [-1,1]){const w=sp.wings;r.add(side<0?'mysteryWingL':'mysteryWingR','body',[side*w.at[0],w.at[1],w.at[2]],w.feathers.map(q=>plumeGeometry({...q,path:q.path.map(([x,y,z])=>[side*x,y,z]),color:'#98b8f5',light:'#e5f7ff'})));}
 if(sp.curl)r.add('curl','body',[0,0,0],[paint(sweep(sp.curl,t=>.032*(1-t*.7),8,{steps:20}),shade)]);
 r.meta={idlePose:'hover',hover:.08};
 // Reuse the existing owned feather-wing animation channel.
 if(sp.wings)r.meta.celestialWings=['mysteryWingL','mysteryWingR'];r.faceSpec={bone:'body',target:core,center:[0,-.01,b.depth*.96],fwd:[0,0,1],half:b.width*.76,eyeSize:.32,eyeProfile:{ink:'#ffffff'},layout:{eyeX:27,eyeY:53,mouthY:86,browY:31,cheekX:41,cheekY:75,mouthW:8},style:{ink:c.face,mouth:c.face,tongue:c.face,blush:c.blush}};return r;
}
