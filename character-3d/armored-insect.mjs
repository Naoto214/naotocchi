// Shared articulated shell body: physical elytra, six attached limbs, and
// original-specific head appendages. No extra actors or gameplay state.
import {ellipsoid,sweep,xform,solid,paint,mix} from './geometry.mjs';
import {Rig} from './rig.mjs';
export function armoredInsect(sp,key){
 const r=new Rig(key,'armored_insect','insectWalk'),b=sp.body,c=sp.colors,s=sp.shell,h=sp.head,t=sp.thorax;
 const volume=(size,pos,color)=>paint(xform(ellipsoid(...size,20,12),{pos}),(x,y,z,nx,ny,nz)=>mix(color,c.light,Math.max(0,ny)*.16+Math.max(0,nz)*.07));
 r.add('body','root',[0,b.y,0],[volume([b.width,b.height,b.length],[0,0,-.12],c.body),volume([t.width,t.height,t.length],[0,.02,t.z],c.thorax)]);
 // Two convex covers leave a narrow, dark longitudinal seam over the abdomen.
 for(const side of [-1,1])r.add(side<0?'shellL':'shellR','body',[side*(s.width+.006),s.y,s.z],[volume([s.width,s.height,s.length],[0,0,0],c.shell)],'opaque',[s.pitch||0,0,side*(s.open||0)]);
 const head=volume([h.width,h.height,h.depth],[0,0,0],c.head),headParts=[head.clone()];
 for(const side of [-1,1]){
  const end=[side*(h.width+.09),.12,.13];
  headParts.push(solid(sweep([[side*h.width*.7,.04,.09],[side*(h.width+.025),.10,.09],end],v=>.018*(1-v*.3),6,{steps:6}),c.limb),solid(xform(ellipsoid(.024,.025,.033,8,6),{pos:end}),c.tip));
 }
 if(sp.horn){const q=sp.horn;headParts.push(solid(sweep(q.path,v=>q.r*(1-v*.62),8,{steps:14}),c.head));for(const path of q.forks)headParts.push(solid(sweep(path,v=>q.r*.55*(1-v*.75),7,{steps:8}),c.tip));}
 for(const q of sp.mandibles){headParts.push(solid(sweep(q.path,v=>q.r*(1-v*.68),8,{steps:12}),c.head));headParts.push(solid(sweep(q.teeth,v=>q.r*.65*(1-v*.8),6,{steps:4}),c.tip));}
 r.add('head','body',h.at,headParts);
 for(const [i,l]of sp.legs.entries())r.add('leg'+i,'body',l.at,[solid(sweep(l.path,v=>l.r*(1-v*.6),7,{steps:12}),c.limb),solid(xform(ellipsoid(l.r*1.25,l.r*1.25,l.r*1.25,8,6),{pos:l.path[1]}),c.tip)]);
 r.meta={idlePose:'stand',hover:0,horns:sp.horn?1:0,mandibles:sp.mandibles.length};
 r.faceSpec={bone:'head',target:head,center:[0,0,h.depth*.96],fwd:[0,0,1],half:h.width*.72,eyeSize:.25,normalEye:sp.normalEye,
  layout:{eyeX:27,eyeY:52,mouthY:82,browY:32,cheekX:40,cheekY:72,mouthW:8},style:{blush:'#b96648'}};
 return r;
}
