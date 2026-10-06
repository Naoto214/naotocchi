// Upright horned reptile: explicit curved trunk, plate bands, limbs and wing ribs.
import {THREE,blob,ellipsoid,sweep,xform,solid,paint,mix,outlineLoft} from './geometry.mjs';
import {Rig} from './rig.mjs';
export function wingedReptile(sp,key){
 const r=new Rig(key,'winged_reptile','quadWalk'),c=sp.colors,b=sp.body;
 const volume=(size,at,color,rot=[0,0,0])=>paint(xform(ellipsoid(...size,18,12),{pos:at,rot}),(x,y,z,nx,ny,nz)=>mix(color,c.light,Math.max(0,ny)*.14+Math.max(0,nz)*.08));
 const trunk=paint(blob((x,y,z)=>{const q=1-.24*y;return [x*b.width*q,y*b.height,z*b.depth*q];},24,16),(x,y,z,nx,ny,nz)=>mix(c.body,c.light,Math.max(0,nz)*.16+Math.max(0,ny)*.1));
 const body=[trunk,solid(sweep(sp.neck.path,t=>sp.neck.r*(1-t*.22),12,{steps:16}),c.body)];
 const belly=sp.belly;body.push(volume([belly.width,belly.height,.055],belly.at,c.belly));
 for(let i=0;i<belly.plates;i++){const y=belly.at[1]-belly.height*.82+i*belly.height*1.64/(belly.plates-1),q=Math.sqrt(Math.max(.05,1-Math.pow((y-belly.at[1])/belly.height,2))),z=belly.at[2]+.05*q;
  body.push(solid(sweep([[-belly.width*q*.9,y+.015,z-.025],[0,y-.01,z],[belly.width*q*.9,y+.015,z-.025]],()=>.012,6,{steps:8}),c.plate));}
 for(const q of sp.spines)body.push(solid(xform(outlineLoft([[-q.w,0],[0,q.h],[q.w,0]],q.d,12,3),{pos:q.at,rot:[0,Math.PI/2,0]}),c.spine));
 r.add('body','root',[0,b.y,0],body);
 const h=sp.head,head=volume([h.width,h.height,h.depth],[0,0,0],c.body),parts=[head.clone(),volume(h.muzzle.size,h.muzzle.at,c.body),volume([h.muzzle.size[0]*.92,.035,h.muzzle.size[2]*.85],[0,h.muzzle.at[1]-.06,h.muzzle.at[2]+.018],c.belly)];
 for(const horn of sp.horns)parts.push(solid(sweep(horn.path,t=>horn.r*(1-t*.96),8,{steps:14}),c.horn));
 for(const side of [-1,1])parts.push(volume([.016,.010,.007],[side*.075,h.muzzle.at[1]+.034,h.muzzle.at[2]+h.muzzle.size[2]*.89],c.nostril));
 r.add('head','body',h.at,parts);
 for(const l of sp.limbs){const parts=[solid(sweep(l.path,t=>l.r*(1-t*.46),10,{steps:12}),c.body),volume(l.paw.size,l.paw.at,c.body)];
  for(const claw of l.claws)parts.push(solid(sweep(claw,t=>.022*(1-t*.94),6,{steps:5}),c.horn));
  r.add(l.bone,'body',l.at,parts);
 }
 r.add('tail','body',sp.tail.at,[solid(sweep(sp.tail.path,t=>sp.tail.r*Math.pow(1-t,.8)+.007,12,{steps:32}),c.body),...sp.tail.spines.map(q=>solid(xform(outlineLoft([[-q.w,0],[0,q.h],[q.w,0]],.016,10,3),{pos:q.at,rot:[0,Math.PI/2,0]}),c.spine))]);
 if(sp.wing)for(const side of [-1,1]){
  const w=sp.wing,curve=g=>{const p=g.attributes.position;for(let i=0;i<p.count;i++)p.setZ(i,p.getZ(i)+w.bow*Math.sin(Math.PI*p.getX(i)/w.span));g.computeVertexNormals();return g;};
  const parts=[solid(curve(outlineLoft(w.outline,.011,36,4)),c.wing)];
  for(const path of w.fingers)parts.push(solid(curve(sweep(path.map(([x,y])=>[x,y,.014]),t=>.025*(1-t*.6),7,{steps:12})),c.body));
  const g=r.add(side<0?'wingL':'wingR','body',[side*w.at[0],w.at[1],w.at[2]],parts,'opaque',[0,side*w.angle,0]);g.scale.x=side;g.userData.rest.s.copy(g.scale);
 }
 r.faceSpec={bone:'head',target:head,center:[0,.06,h.depth*.93],fwd:[0,0,1],half:h.width*.74,eyeSize:.26,normalEye:sp.normalEye,layout:{eyeX:27,eyeY:51,mouthY:84,browY:32,cheekX:39,cheekY:73,mouthW:8},style:{blush:'#e98245'}};
 r.meta={idlePose:'stand',hover:0,membraneWings:!!sp.wing};return r;
}
