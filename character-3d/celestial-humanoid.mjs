// Celestial appendages extend the shared human owner and canonical face.
import {THREE,lathe,sweep,xform,solid} from './geometry.mjs';
import {plumeGeometry} from './plumed-bird.mjs';
export function celestialHumanoid(sp,key,buildHuman){
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
 r.meta.celestialWings=wingNames;return r;
}
