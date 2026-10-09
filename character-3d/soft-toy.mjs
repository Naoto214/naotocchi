// Seated stuffed animal with sewn surface patches and an owned solid prop.
import {THREE,ellipsoid,sweep,xform,paint,solid,mix,merge,clamp} from './geometry.mjs';
import {Rig} from './rig.mjs';
function patchParts(q,size,stitched){
 const n=new THREE.Vector3(...q.direction).normalize(),u=new THREE.Vector3().crossVectors(new THREE.Vector3(0,1,0),n).normalize(),v=new THREE.Vector3().crossVectors(n,u).normalize();
 const at=(x,y,lift)=>n.clone().addScaledVector(u,x*q.width).addScaledVector(v,y*q.height).normalize().multiply(new THREE.Vector3(...size)).multiplyScalar(lift),pos=[],idx=[],segments=24,rings=4;
 for(let j=0;j<=rings;j++)for(let i=0;i<=segments;i++){const a=i/segments*Math.PI*2,t=j/rings,p=at(Math.cos(a)*t,Math.sin(a)*t,1.025);pos.push(...p.toArray());if(j<rings&&i<segments){const k=j*(segments+1)+i,b=k+segments+1;idx.push(k,b,k+1,k+1,b,b+1);}}
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setIndex(idx);g.computeVertexNormals();const result=[solid(g,q.color)];
 if(stitched)for(let i=0;i<12;i++){const a=i/12*Math.PI*2,pts=[.86,1.10].map(t=>at(Math.cos(a)*t,Math.sin(a)*t,1.04).toArray());result.push(solid(sweep(pts,()=>.0045,5,{steps:3}),q.thread));}return result;
}
// Sewn center lines follow the existing ellipsoid surface rather than float in front.
function seamParts(q,size){
 const surface=(x,y)=>[x,y,Math.sqrt(Math.max(.01,1-(x/size[0])**2-(y/size[1])**2))*size[2]*1.025];
 const line=[];for(let i=0;i<=20;i++)line.push(surface(q.x||0,q.from+(q.to-q.from)*i/20));
 const parts=[solid(sweep(line,()=>.006,5,{steps:20}),q.color)];
 for(let i=0;i<q.stitches;i++){const y=q.from+(q.to-q.from)*(i+.5)/q.stitches;parts.push(solid(sweep([surface((q.x||0)-.018,y-.007),surface((q.x||0)+.018,y+.007)],()=>.005,5,{steps:3}),q.color));}
 return parts;
}
export function softToy(sp,key){
 const r=new Rig(key,'soft_toy','waddle'),c=sp.colors,b=sp.body,h=sp.head;
 // Natural markings are painted on the closed skull/body; no second face mesh.
 const volume=(size,at,color,rotation=[0,0,0],markings=null,segments=null)=>paint(xform(ellipsoid(...size,segments?.[0]||(markings?40:20),segments?.[1]||(markings?28:14)),{pos:at,rot:rotation}),(x,y,z,nx,ny,nz)=>{
  for(const q of markings||[]){const dx=x-q.at[0],dy=y-q.at[1],a=q.angle||0,u=dx*Math.cos(a)+dy*Math.sin(a),v=-dx*Math.sin(a)+dy*Math.cos(a);if((q.side==='back'?nz<-.18:nz>.18)&&(u/q.size[0])**2+(v/q.size[1])**2<1)return q.color;}
  return mix(color,c.light,Math.max(0,nz)*.14+Math.max(0,ny)*.18);
 });
 const body=[volume(b.size,[0,0,0],b.color||c.body,[0,0,0],b.markings),...(sp.seams||[]).filter(q=>q.bone==='body').flatMap(q=>seamParts(q,b.size)),...sp.patches.filter(q=>q.bone==='body').flatMap(q=>patchParts(q,b.size,sp.stitches))];r.add('body','root',[0,b.y,0],body,'opaque',b.rotation||[0,0,0]);
 const m=sp.muzzle||{},mAt=m.at||[0,-.10,h.size[2]*.94],mSize=m.size||[.125,.09,.075];
 const head=volume(h.size,[0,0,0],h.color||c.body,[0,0,0],h.markings),muzzle=m.enabled===false?null:volume(mSize,mAt,c.muzzle),cheeks=(sp.cheeks||[]).map(q=>volume(q.size,q.at,q.color||c.muzzle)),target=merge([head.clone(),muzzle?.clone(),...cheeks.map(g=>g.clone())]),parts=[head,muzzle,...cheeks,m.enabled===false?null:solid(xform(ellipsoid(...(m.noseSize||[.027,.022,.018]),10,6),{pos:m.noseAt||(sp.muzzle?[mAt[0],mAt[1]+.021,mAt[2]+mSize[2]-.001]:[0,-.079,h.size[2]*.94+.074])}),c.nose)];
 for(const e of sp.ears){
  if(e.size){const rot=e.rotation||[0,0,0],offset=new THREE.Vector3(0,0,e.size[2]*.75).applyEuler(new THREE.Euler(...rot));parts.push(volume(e.size,e.at,e.color||c.body,rot),volume([e.size[0]*.56,e.size[1]*.76,e.size[2]*.30],new THREE.Vector3(...e.at).add(offset).toArray(),e.inner||c.inner,rot));}
  else parts.push(volume([e.r,e.r,e.r*.62],e.at,c.body),volume([e.r*.56,e.r*.60,e.r*.24],[e.at[0],e.at[1],e.at[2]+e.r*.53],c.inner));
 }
 parts.push(...(sp.seams||[]).filter(q=>q.bone==='head').flatMap(q=>seamParts(q,h.size)),...sp.patches.filter(q=>q.bone==='head').flatMap(q=>patchParts(q,h.size,sp.stitches)));r.add('head','body',h.at,parts,'opaque',[0,0,h.roll]);
 for(const side of [-1,1]){const a=sp.armSides?.[side<0?'left':'right']||sp.arms;const limb=a.enabled===false?[]:[volume(a.size,[0,0,0],a.color||c.body)];for(const q of sp.patches.filter(q=>q.bone===(side<0?'armL':'armR')))limb.push(...patchParts(q,a.size,sp.stitches));if(sp.stuffing)for(const x of [-.035,0,.035])limb.push(volume([.045,.055,.04],[x,-a.size[1],a.size[2]*.25],c.muzzle));r.add(side<0?'armL':'armR','body',[side*a.at[0],a.at[1],a.at[2]],limb,'opaque',[0,0,side*a.roll]);
  r.add(side<0?'footL':'footR','body',[side*sp.feet.at[0],sp.feet.at[1],sp.feet.at[2]],sp.feet.enabled===false?null:[volume(sp.feet.size,[0,0,0],sp.feet.color||c.body),volume([sp.feet.size[0]*.64,sp.feet.size[1]*.68,.025],[0,.015,sp.feet.size[2]*.93],c.pad),...sp.patches.filter(q=>q.bone===(side<0?'footL':'footR')).flatMap(q=>patchParts(q,sp.feet.size,sp.stitches))]);
 }
 // Optional closed appendages/props inherit an existing owner bone and its motion.
 for(const q of [...(sp.tail?[{...sp.tail,name:'tail',bone:'body'}]:[]),...(sp.details||[])]){
  const parts=(q.volumes||[]).map(v=>volume(v.size,v.at,v.color||q.color,v.rotation||[0,0,0],null,v.segments));
  for(const p of q.paths||[]){const g=sweep(p.path,t=>p.radius*(1-(p.taper||0)*t),p.radial||10,{steps:p.steps||24,flat:p.flat||1});
   if(p.tip){const start=new THREE.Vector3(...p.path[0]),axis=new THREE.Vector3(...p.path.at(-1)).sub(start),lengthSq=axis.lengthSq();parts.push(paint(g,(x,y,z)=>mix(p.color||q.color,p.tip,clamp((new THREE.Vector3(x,y,z).sub(start).dot(axis)/lengthSq-.60)/.30,0,1))));}
   else parts.push(solid(g,p.color||q.color));
  }
  r.add(q.name,q.bone||'body',q.at||[0,0,0],parts,'opaque',q.rotation||[0,0,0]);
 }
 if(sp.bow){const q=sp.bow,parts=[volume([.042,.04,.032],[0,0,.014],q.color)];for(const side of [-1,1]){parts.push(solid(xform(ellipsoid(.085,.055,.035,12,8),{pos:[side*.085,0,0],rot:[0,0,side*.28]}),q.color));parts.push(solid(xform(ellipsoid(.03,.07,.019,10,6),{pos:[side*.054,-.061,-.005],rot:[0,0,side*.5]}),q.color));}r.add('bow','body',q.at,parts);}
 if(sp.scarf){const q=sp.scarf,parts=[];const path=[];for(let i=0;i<=32;i++){const a=i/32*Math.PI*2;path.push([Math.cos(a)*.275,.29,Math.sin(a)*.205]);}parts.push(solid(sweep(path,()=>.046,8,{steps:32}),q.color));for(const side of [-1,1])parts.push(solid(sweep([[side*.25,.29,-.08],[side*.32,.10,-.11],[side*.40,-.13,-.05]],()=>.074,8,{steps:12}),q.color));r.add('scarf','body',[0,0,0],parts);}
 if(sp.heart){const sh=new THREE.Shape();sh.moveTo(0,-.18);sh.bezierCurveTo(-.05,-.13,-.21,-.04,-.19,.075);sh.bezierCurveTo(-.17,.18,-.055,.18,0,.095);sh.bezierCurveTo(.055,.18,.17,.18,.19,.075);sh.bezierCurveTo(.21,-.04,.05,-.13,0,-.18);const g=new THREE.ExtrudeGeometry(sh,{depth:.085,bevelEnabled:true,bevelThickness:.018,bevelSize:.013,bevelSegments:2,steps:1,curveSegments:12});g.translate(0,0,-.04);r.add('heart','body',sp.heart.at,[solid(g,sp.heart.color)]);}
 r.meta={idlePose:'stand',hover:0};r.faceSpec={bone:'head',target,center:[0,.005,h.size[2]*.95],fwd:[0,0,1],half:h.size[0]*.73,eyeSize:.27,normalEye:sp.normalEye,layout:{eyeX:28,eyeY:51,mouthY:103,browY:30,cheekX:43,cheekY:77,mouthW:8},style:{blush:c.blush}};if(sp.face){r.faceSpec={...r.faceSpec,...sp.face,layout:{...r.faceSpec.layout,...sp.face.layout}};}
 // Optional eye-bearing appendages share the head projection and canonical face.
 if(sp.face?.targetDetails){const extra=sp.face.targetDetails.map(name=>{const bone=r.bones[name],part=r.parts.find(p=>p.bone===name);if(!part||bone.parent!==r.bones.head)throw new Error('face target detail must belong to head: '+name);return xform(part.mesh.geometry.clone(),{pos:bone.position.toArray(),rot:[bone.rotation.x,bone.rotation.y,bone.rotation.z]});});r.faceSpec.target=merge([target,...extra]);}
 return r;
}
