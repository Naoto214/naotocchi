// Shared articulated shell body: physical elytra, six attached limbs, and
// original-specific head appendages. No extra actors or gameplay state.
import {ellipsoid,sweep,xform,solid,paint,mix,outlineLoft,blob,openedShellParts,THREE,merge} from './geometry.mjs';
import {Rig} from './rig.mjs';
import {coiledShell} from './coiled-shell.mjs';
export function armoredInsect(sp,key){
 const r=new Rig(key,'armored_insect','insectWalk'),b=sp.body,c=sp.colors,s=sp.shell,h=sp.head,t=sp.thorax;
 const volume=(size,pos,color)=>paint(xform(ellipsoid(...size,20,12),{pos}),(x,y,z,nx,ny,nz)=>mix(color,c.light,Math.max(0,ny)*.16+Math.max(0,nz)*.07));
 const abdomen=b.taper?solid(blob((x,y,z)=>{const taper=1-b.taper*(1-z)*.5;return [x*b.width*taper,y*b.height*taper,z*b.length-.12];},24,16),c.body):volume([b.width,b.height,b.length],[0,0,-.12],c.body);
 if(sp.abdomenBands)paint(abdomen,(x,y,z)=>mix(c.body,sp.abdomenBands.color,Math.pow(Math.max(0,Math.cos((z+.12)/b.length*Math.PI*sp.abdomenBands.count)),10)*.75));
 r.add('body','root',[0,b.y,b.z||0],[abdomen,volume([t.width,t.height,t.length],[0,.02,t.z],c.thorax),...(sp.nymphPads||[]).map(p=>volume(p.size,p.at,c.shell))],'opaque',[b.pitch||0,0,0]);
 // Two convex covers leave a narrow, dark longitudinal seam over the abdomen.
 if(s)for(const side of [-1,1])r.add(side<0?'shellL':'shellR','body',[side*(s.width+.006),s.y,s.z],[volume([s.width,s.height,s.length],[0,0,0],c.shell)],'opaque',[s.pitch||0,0,side*(s.open||0)]);
 // Thin enclosed membrane and raised opaque veins share an attached wing bone.
 for(const [i,w]of (sp.wings||[]).entries()){
  let membrane=outlineLoft(w.outline,w.depth,32,4);
  if(w.damage){
   const shape=new THREE.Shape(w.outline.map(([x,y])=>new THREE.Vector2(x,y)));
   for(const h of w.damage.holes){const hole=new THREE.Path();hole.absellipse(h.x,h.y,h.rx,h.ry,0,Math.PI*2,true);shape.holes.push(hole);}
   membrane=new THREE.ExtrudeGeometry(shape,{depth:w.depth*2,steps:1,bevelEnabled:false,curveSegments:12});membrane.translate(0,0,-w.depth);
  }
  r.add('wing'+i,'body',w.at,[solid(membrane,w.color)],'translucent:'+w.alpha,w.rotation);
  r.add('veins'+i,'wing'+i,[0,0,0],w.veins.map(q=>solid(sweep(q.map(([x,y])=>[x,y,w.depth+.002]),()=>w.veinRadius,5,{steps:7}),w.veinColor)));
 }
 let head=volume([h.width,h.height,h.depth],[0,0,0],c.head);
 const stalkParts=[];
 for(const eye of sp.eyestalks||[])stalkParts.push(solid(sweep(eye.path,()=>eye.r,7,{steps:8}),c.head),volume(eye.tipSize,eye.path.at(-1),c.head));
 if(stalkParts.length)head=merge([head,...stalkParts]);
 const headParts=[head.clone()];
 if(!sp.antennae)for(const side of [-1,1]){
  const end=[side*(h.width+.09),.12,.13];
  headParts.push(solid(sweep([[side*h.width*.7,.04,.09],[side*(h.width+.025),.10,.09],end],v=>.018*(1-v*.3),6,{steps:6}),c.limb),solid(xform(ellipsoid(.024,.025,.033,8,6),{pos:end}),c.tip));
 }
 for(const a of sp.antennae||[])headParts.push(solid(sweep(a.path,v=>a.r*(1-v*.45),7,{steps:20}),c.limb));
 if(sp.horn){const q=sp.horn;headParts.push(solid(sweep(q.path,v=>q.r*(1-v*.62),8,{steps:14}),c.head));for(const path of q.forks)headParts.push(solid(sweep(path,v=>q.r*.55*(1-v*.75),7,{steps:8}),c.tip));}
 for(const q of sp.mandibles){headParts.push(solid(sweep(q.path,v=>q.r*(1-v*.68),8,{steps:12}),c.head));headParts.push(solid(sweep(q.teeth,v=>q.r*.65*(1-v*.8),6,{steps:4}),c.tip));}
 r.add('head','body',h.at,headParts,'opaque',[h.pitch||0,0,0]);
 for(const [i,l]of sp.legs.entries()){
  const limb=[solid(sweep(l.path,v=>l.r*(1-v*.6),7,{steps:12}),c.limb),solid(xform(ellipsoid(l.r*1.25,l.r*1.25,l.r*1.25,8,6),{pos:l.path[1]}),c.tip)];
  if(l.claw){const q=l.claw;limb.push(solid(xform(ellipsoid(...q.size,12,8),{pos:q.at,rot:q.rotation}),c.limb));for(const path of q.teeth)limb.push(solid(sweep(path,v=>q.r*(1-v*.85),6,{steps:5}),c.tip));}
  r.add('leg'+i,'body',l.at,limb);
 }
 if(sp.coiledShell)r.add('coiledShell','body',sp.coiledShell.at,[coiledShell(sp.coiledShell)]);
 if(sp.shellSprigs)r.add('shellSprigs','coiledShell',[0,0,0],sp.shellSprigs.flatMap(q=>[solid(sweep(q.path,()=>q.r,7,{steps:8}),'#65883a'),solid(xform(ellipsoid(...q.size,12,8),{pos:q.leaf,rot:[0,0,q.roll]}),'#6c9d42')]));
 if(sp.emptyShell)r.add('emptySpiral','root',sp.emptyShell.at,[coiledShell(sp.emptyShell)]);
 for(const [i,q]of(sp.claws||[]).entries()){
  const parts=[solid(sweep(q.arm,v=>q.r*(1-v*.15),7,{steps:8}),c.limb),volume(q.size,q.palm,c.head)];
  for(const finger of q.fingers)parts.push(solid(sweep(finger,v=>q.r*1.1*(1-v*.94),7,{steps:9}),c.head));
  r.add('claw'+i,'body',q.at,parts);
 }
 if(sp.pit){const q=sp.pit,g=new THREE.LatheGeometry(q.profile.map(([x,y])=>new THREE.Vector2(x,y)),48),p=g.attributes.position;for(let i=0;i<p.count;i++)p.setY(i,p.getY(i)*(1-(q.frontDrop||0)*Math.pow(Math.max(0,p.getZ(i)/.65),2)));g.computeVertexNormals();r.add('pit','root',[0,0,0],[paint(g,(x,y,z,nx,ny,nz)=>mix(q.dark,q.light,Math.max(0,ny)*.45+Math.max(0,y)*.6))]);}
 if(sp.soil){const q=sp.soil;r.add('ground','root',[0,0,0],[...q.clods.map((v,i)=>solid(xform(ellipsoid(v[3],v[4],v[5],10,7),{pos:v.slice(0,3),rot:[0,i*.7,0]}),q.colors[i%q.colors.length])),...q.tufts.map(path=>solid(sweep(path,v=>.013*(1-v*.9),5,{steps:5}),q.grass))]);}
 if(sp.exuvia){const e=sp.exuvia;r.add('emptyShell','root',e.at,[...openedShellParts(e),...e.legs.map(path=>solid(sweep(path,v=>e.legRadius*(1-v*.55),7,{steps:8}),e.colors.base))]);}
 r.meta={idlePose:'stand',hover:0,horns:sp.horn?1:0,mandibles:sp.mandibles.length};
 r.faceSpec={bone:'head',target:head,center:[0,0,h.depth*.96],fwd:[0,0,1],half:h.width*.72,eyeSize:.25,normalEye:sp.normalEye,
  layout:{eyeX:27,eyeY:52,mouthY:82,browY:32,cheekX:40,cheekY:72,mouthW:8},style:{blush:'#b96648'}};
 if(sp.faceProfile)r.faceSpec={...r.faceSpec,...sp.faceProfile};
 return r;
}
