// Celestial appendages extend the shared human owner and canonical face.
import {THREE,lathe,sweep,xform,solid,ellipsoid,paint,mix} from './geometry.mjs';
import {Rig} from './rig.mjs';
import {plumeGeometry} from './plumed-bird.mjs';
export function celestialHumanoid(sp,key,buildHuman){
 if(sp.celestial.orb)return celestialOrb(sp,key);
 const r=buildHuman(sp,key),s=sp.celestial,c=s.colors;r.archetype='celestial_humanoid';
 r.bones.body.position.y+=s.lift;r.bones.body.userData.rest.p.copy(r.bones.body.position);
 if(s.hideLegs){for(const p of r.parts.filter(p=>/^leg[LR]$/.test(p.bone))){p.mesh.removeFromParent();p.mesh.geometry.dispose();}r.parts=r.parts.filter(p=>!/^leg[LR]$/.test(p.bone));}
 const robe=lathe(s.robe.profile,24),p=robe.attributes.position;
 for(let i=0;i<p.count;i++){const a=Math.atan2(p.getX(i),p.getZ(i)),f=1+.06*Math.cos(a*7);p.setXYZ(i,p.getX(i)*f,p.getY(i)+.015*Math.sin(a*3),p.getZ(i)*f*.82);}robe.computeVertexNormals();const parts=[solid(robe,c.cloth)];
 if(s.trim){const [radius,y]=s.robe.hem,ring=[];for(let i=0;i<=32;i++){const a=i/32*Math.PI*2,f=1+.06*Math.cos(a*7);ring.push([Math.sin(a)*radius*f,y+.015*Math.sin(a*3),Math.cos(a)*radius*f*.82]);}parts.push(solid(sweep(ring,()=>.009,5,{steps:48}),c.gold),solid(sweep([[-sp.body.r*.68,sp.body.h*.92,.085],[0,sp.body.h*.58,sp.body.r*.82],[sp.body.r*.68,sp.body.h*.92,.085]],()=>.014,6,{steps:14}),c.gold));}
 r.add('robe','body',[0,0,0],parts);
 const hc=sp.head.r*.92;r.add('halos','head',[0,hc+sp.head.r+.14,0],s.halos.map(q=>solid(xform(new THREE.TorusGeometry(q.radius,.012,6,40),{pos:q.at,rot:[Math.PI/2+q.tilt,0,0]}),c.gold)));
 const wingNames=[];for(let i=0;i<s.wings.length;i++)for(const side of [-1,1]){const w=s.wings[i],name=`celestialWing${i}${side<0?'L':'R'}`,feathers=w.feathers.map(q=>plumeGeometry({...q,path:q.path.map(([x,y,z])=>[side*x,y,z]),color:c.feather,light:c.light}));r.add(name,'body',[side*w.at[0],w.at[1],w.at[2]],feathers,'opaque',[0,side*w.angle,0]);wingNames.push(name);}
 if(s.ribbons.length)r.add('ribbons','body',[0,0,0],s.ribbons.flatMap(q=>[plumeGeometry({...q,color:c.cloth,light:c.light}),solid(sweep(q.path,()=>.010,5,{steps:18}),c.gold)]));
 for(const side of [-1,1]){const arm=r.bones[side<0?'armL':'armR'];arm.rotation.z=side*s.armAngle;arm.rotation.x=s.armForward;arm.userData.rest.r.copy(arm.rotation);}
 if(s.staff){const q=s.staff,grip=[.045,-sp.arms.len-sp.arms.r*.7,.02],shaft=solid(sweep([[0,-q.below,0],[0,q.above,0]],()=>.016,8,{steps:12}),c.gold),orb=solid(xform(ellipsoid(q.r,q.r,q.r,16,12),{pos:[0,q.above,0]}),q.color),rim=solid(xform(new THREE.TorusGeometry(q.r*1.22,.013,6,28),{pos:[0,q.above,0]}),c.gold);r.add('staff','armR',grip,[shaft,orb,rim],'opaque',[-s.armForward,0,-s.armAngle-.55]);}
 r.meta.celestialWings=wingNames;return r;
}

// Orb birth/rebirth stages share the celestial palette and feather geometry, without adult limbs.
function celestialOrb(sp,key){
 const s=sp.celestial,o=s.orb,c=s.colors,r=new Rig(key,'celestial_humanoid','blobFloat');
 const core=paint(ellipsoid(...o.size,24,18),(x,y,z,nx,ny,nz)=>mix(c.feather,c.light,Math.max(0,nz)*.65+Math.max(0,ny)*.25));r.add('body','root',[0,o.y,0],[core.clone()]);
 if(o.curl)r.add('curl','body',[0,0,0],[solid(sweep(o.curl,t=>.013*(1-t*.65),7,{steps:18}),c.gold)]);
 if(s.halos.length)r.add('halos','body',[0,o.haloHeight,0],s.halos.map(q=>solid(xform(new THREE.TorusGeometry(q.radius,.012,6,36),{pos:q.at,rot:[Math.PI/2+q.tilt,0,0]}),c.gold)));
 const names=[];for(const [i,w]of s.wings.entries())for(const side of [-1,1]){const name=`celestialWing${i}${side<0?'L':'R'}`;r.add(name,'body',[side*w.at[0],w.at[1],w.at[2]],w.feathers.map(q=>plumeGeometry({...q,path:q.path.map(p=>[p[0]*side,p[1],p[2]]),color:c.feather,light:c.light})));names.push(name);}
 if(o.rays){const rays=[];for(let i=0;i<8;i++){const a=i*Math.PI/4,rad=i%2?.43:.55,path=[[Math.cos(a)*.22,Math.sin(a)*.22,-.12],[Math.cos(a)*.34,Math.sin(a)*.34,-.13],[Math.cos(a)*rad,Math.sin(a)*rad,-.14]];rays.push(solid(sweep(path,t=>.040*(1-t)+.002,8,{steps:14}),c.gold));}r.add('radiance','body',[0,0,0],rays);}
 r.meta={idlePose:'hover',hover:.08,celestialWings:names};r.faceSpec={bone:'body',target:core,center:[0,.01,o.size[2]*.96],fwd:[0,0,1],half:o.size[0]*.76,eyeSize:.27,normalEye:sp.normalEye,layout:{eyeX:26,eyeY:53,mouthY:85,browY:31,cheekX:40,cheekY:74,mouthW:8},style:{blush:'#f5b1bb'}};return r;
}
