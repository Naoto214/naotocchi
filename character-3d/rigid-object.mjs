// Closed rigid body and explicit physical details under one canonical owner.
import {THREE,paint,solid,xform,mix,merge,ellipsoid,sweep,lathe,blob} from './geometry.mjs';
import {Rig} from './rig.mjs';
export function rigidObject(sp,key){
 const r=new Rig(key,'rigid_object','waddle'),b=sp.body,c=sp.colors;
 const core=paint(b.cornerPower?blob((x,y,z)=>[Math.sign(x)*Math.abs(x)**b.cornerPower*b.width*.5,Math.sign(y)*Math.abs(y)**b.cornerPower*b.height*.5,Math.sign(z)*Math.abs(z)**b.cornerPower*b.depth*.5],28,20):b.rounded?lathe([[0,-b.depth*.5],[b.width*.42,-b.depth*.5],[b.width*.50,-b.depth*.30],[b.width*.50,b.depth*.30],[b.width*.46,b.depth*.5],[0,b.depth*.5]],40).rotateX(Math.PI/2).scale(1,b.height/b.width,1):new THREE.BoxGeometry(b.width,b.height,b.depth),(x,y,z,nx,ny,nz)=>mix(c.body,c.light,Math.max(0,ny)*.5+Math.max(0,nz)*.12));
 r.add('body','root',[0,b.y??b.height*.5+.035,0],[core.clone()]);
 for(const d of sp.details){const parts=[...(d.boxes||[]).map(q=>solid(xform(new THREE.BoxGeometry(...q.size),{pos:q.at,rot:q.rotation||[0,0,0]}),d.color)),...(d.volumes||[]).map(q=>solid(xform(ellipsoid(...q.size,16,12),{pos:q.at,rot:q.rotation||[0,0,0]}),d.color)),...(d.paths||[]).map(q=>solid(sweep(q.path,t=>q.radius*(1-(q.taper||0)*t),7,{steps:q.steps||12}),d.color))];r.add(d.name,'body',d.at,parts);}
 const faceDetail=sp.face?.targetDetail&&r.parts.find(p=>p.bone===sp.face.targetDetail);let target=faceDetail?xform(faceDetail.mesh.geometry.clone(),{pos:r.bones[sp.face.targetDetail].position.toArray()}):core;
 if(sp.sourceFace?.targetDetails){const extra=sp.sourceFace.targetDetails.map(name=>{const p=r.parts.find(p=>p.bone===name);if(!p)throw Error('missing rigid face target detail '+name);return xform(p.mesh.geometry.clone(),{pos:r.bones[name].position.toArray()});});target=merge([core,...extra]);}
 r.meta={idlePose:'stand',hover:0};r.faceSpec={bone:'body',target,center:sp.face?.center||[0,-b.height*.16,b.depth*.5],fwd:[0,0,1],half:sp.face?.half??b.width*.25,eyeSize:.20,layout:{eyeX:29,eyeY:55,mouthY:83,browY:34,cheekX:40,cheekY:74,mouthW:7},style:{blush:c.blush}};if(sp.sourceFace)r.faceSpec={...r.faceSpec,...sp.sourceFace,layout:{...r.faceSpec.layout,...sp.sourceFace.layout}};return r;
}
