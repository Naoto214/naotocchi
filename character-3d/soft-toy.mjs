// Seated stuffed animal with sewn surface patches and an owned solid prop.
import {THREE,ellipsoid,sweep,xform,paint,solid,mix,merge} from './geometry.mjs';
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
 const volume=(size,at,color)=>paint(xform(ellipsoid(...size,20,14),{pos:at}),(x,y,z,nx,ny,nz)=>mix(color,c.light,Math.max(0,nz)*.14+Math.max(0,ny)*.18));
 const body=[volume(b.size,[0,0,0],c.body),...(sp.seams||[]).filter(q=>q.bone==='body').flatMap(q=>seamParts(q,b.size)),...sp.patches.filter(q=>q.bone==='body').flatMap(q=>patchParts(q,b.size,sp.stitches))];r.add('body','root',[0,b.y,0],body);
 const head=volume(h.size,[0,0,0],c.body),muzzle=volume([.125,.09,.075],[0,-.10,h.size[2]*.94],c.muzzle),target=merge([head.clone(),muzzle.clone()]),parts=[head,muzzle,solid(xform(ellipsoid(.027,.022,.018,10,6),{pos:[0,-.079,h.size[2]*.94+.074]}),c.nose)];
 for(const e of sp.ears)parts.push(volume([e.r,e.r,e.r*.62],e.at,c.body),volume([e.r*.56,e.r*.60,e.r*.24],[e.at[0],e.at[1],e.at[2]+e.r*.53],c.inner));
 parts.push(...(sp.seams||[]).filter(q=>q.bone==='head').flatMap(q=>seamParts(q,h.size)),...sp.patches.filter(q=>q.bone==='head').flatMap(q=>patchParts(q,h.size,sp.stitches)));r.add('head','body',h.at,parts,'opaque',[0,0,h.roll]);
 for(const side of [-1,1]){const a=sp.armSides?.[side<0?'left':'right']||sp.arms;const limb=[volume(a.size,[0,0,0],c.body)];for(const q of sp.patches.filter(q=>q.bone===(side<0?'armL':'armR')))limb.push(...patchParts(q,a.size,sp.stitches));if(sp.stuffing)for(const x of [-.035,0,.035])limb.push(volume([.045,.055,.04],[x,-a.size[1],a.size[2]*.25],c.muzzle));r.add(side<0?'armL':'armR','body',[side*a.at[0],a.at[1],a.at[2]],limb,'opaque',[0,0,side*a.roll]);
  r.add(side<0?'footL':'footR','body',[side*sp.feet.at[0],sp.feet.at[1],sp.feet.at[2]],[volume(sp.feet.size,[0,0,0],c.body),volume([sp.feet.size[0]*.64,sp.feet.size[1]*.68,.025],[0,.015,sp.feet.size[2]*.93],c.pad),...sp.patches.filter(q=>q.bone===(side<0?'footL':'footR')).flatMap(q=>patchParts(q,sp.feet.size,sp.stitches))]);
 }
 if(sp.bow){const q=sp.bow,parts=[volume([.042,.04,.032],[0,0,.014],q.color)];for(const side of [-1,1]){parts.push(solid(xform(ellipsoid(.085,.055,.035,12,8),{pos:[side*.085,0,0],rot:[0,0,side*.28]}),q.color));parts.push(solid(xform(ellipsoid(.03,.07,.019,10,6),{pos:[side*.054,-.061,-.005],rot:[0,0,side*.5]}),q.color));}r.add('bow','body',q.at,parts);}
 if(sp.scarf){const q=sp.scarf,parts=[];const path=[];for(let i=0;i<=32;i++){const a=i/32*Math.PI*2;path.push([Math.cos(a)*.275,.29,Math.sin(a)*.205]);}parts.push(solid(sweep(path,()=>.046,8,{steps:32}),q.color));for(const side of [-1,1])parts.push(solid(sweep([[side*.25,.29,-.08],[side*.32,.10,-.11],[side*.40,-.13,-.05]],()=>.074,8,{steps:12}),q.color));r.add('scarf','body',[0,0,0],parts);}
 if(sp.heart){const sh=new THREE.Shape();sh.moveTo(0,-.18);sh.bezierCurveTo(-.05,-.13,-.21,-.04,-.19,.075);sh.bezierCurveTo(-.17,.18,-.055,.18,0,.095);sh.bezierCurveTo(.055,.18,.17,.18,.19,.075);sh.bezierCurveTo(.21,-.04,.05,-.13,0,-.18);const g=new THREE.ExtrudeGeometry(sh,{depth:.085,bevelEnabled:true,bevelThickness:.018,bevelSize:.013,bevelSegments:2,steps:1,curveSegments:12});g.translate(0,0,-.04);r.add('heart','body',sp.heart.at,[solid(g,sp.heart.color)]);}
 r.meta={idlePose:'stand',hover:0};r.faceSpec={bone:'head',target,center:[0,.005,h.size[2]*.95],fwd:[0,0,1],half:h.size[0]*.73,eyeSize:.27,normalEye:sp.normalEye,layout:{eyeX:28,eyeY:51,mouthY:103,browY:30,cheekX:43,cheekY:77,mouthW:8},style:{blush:c.blush}};return r;
}
