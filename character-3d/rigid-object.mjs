// Closed rigid body and explicit physical details under one canonical owner.
import {THREE,paint,solid,xform,mix} from './geometry.mjs';
import {Rig} from './rig.mjs';
export function rigidObject(sp,key){
 const r=new Rig(key,'rigid_object','waddle'),b=sp.body,c=sp.colors;
 const core=paint(new THREE.BoxGeometry(b.width,b.height,b.depth),(x,y,z,nx,ny,nz)=>mix(c.body,c.light,Math.max(0,ny)*.5+Math.max(0,nz)*.12));
 r.add('body','root',[0,b.height*.5+.035,0],[core.clone()]);
 for(const d of sp.details)r.add(d.name,'body',d.at,d.boxes.map(q=>solid(xform(new THREE.BoxGeometry(...q.size),{pos:q.at,rot:q.rotation||[0,0,0]}),d.color)));
 r.meta={idlePose:'stand',hover:0};r.faceSpec={bone:'body',target:core,center:[0,-b.height*.16,b.depth*.5],fwd:[0,0,1],half:b.width*.25,eyeSize:.20,layout:{eyeX:29,eyeY:55,mouthY:83,browY:34,cheekX:40,cheekY:74,mouthW:7},style:{blush:c.blush}};return r;
}
