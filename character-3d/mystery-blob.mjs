// Opaque blue body, soft limbs or owned gold rays; one canonical floating face.
import {blob,ellipsoid,sweep,xform,paint,solid,mix} from './geometry.mjs';
import {Rig} from './rig.mjs';
export function mysteryBlob(sp,key){
 const r=new Rig(key,'mystery_blob','blobFloat'),b=sp.body,c=sp.colors;
 const shade=(x,y,z,nx,ny,nz)=>{const edge=Math.pow(1-Math.abs(nz),3)*.95,base=mix(c.core,c.rim,edge);const spot=Math.exp(-((x+.15)**2/.008+(y-.23)**2/.005+(z-.20)**2/.025));return mix(base,c.highlight,spot*.92);};
 const core=paint(blob((x,y,z)=>[x*b.width*(1-b.taper*y),y*b.height,z*b.depth],28,20),shade);
 r.add('body','root',[0,b.y,0],[core.clone()]);
 for(const[i,q]of sp.limbs.entries())r.add('limb'+i,'body',q.at,[paint(xform(ellipsoid(...q.size,18,12),{rot:q.rotation}),shade)]);
 for(const[i,q]of sp.markers.entries())r.add('marker'+i,'body',[0,0,0],[solid(sweep(q.path,()=>q.r,8,{steps:10}),c.gold)]);
 r.meta={idlePose:'hover',hover:.08};r.faceSpec={bone:'body',target:core,center:[0,-.01,b.depth*.96],fwd:[0,0,1],half:b.width*.76,eyeSize:.32,eyeProfile:{ink:'#ffffff'},layout:{eyeX:27,eyeY:53,mouthY:86,browY:31,cheekX:41,cheekY:75,mouthW:8},style:{ink:c.face,mouth:c.face,tongue:c.face,blush:c.blush}};return r;
}
