// Optional quadruped morphology: folded haunches, long forearms, eye-bearing
// lobes and a tapering membrane tail. Same rig/gait/emotion owner as quadruped.
import {THREE,blob,ellipsoid,sweep,paint,solid,mix,smooth,xform,merge} from './geometry.mjs';
import {Rig} from './rig.mjs';

function digits(at,side,r,color){
 return [-1,0,1].map(n=>solid(sweep([at,[at[0]+side*(.055+n*.025),at[1]-.005,at[2]+.045],[at[0]+side*(.08+n*.045),at[1]-.008,at[2]+.10-n*.018]],t=>r*(1-.55*t),5,{steps:4}),color));
}
function foldedLimb(profile,side,color){
 const path=profile.path.map(([x,y,z])=>[x*side,y,z]),r=profile.r;
 const limb=solid(sweep(path,t=>r*(t<.35?1.45-t:.95-(t-.35)*.7),9,{steps:14}),color);
 return merge([limb,...digits(path.at(-1),side,r*.25,color)]);
}
function membraneTail(T,c){
 const length=T.len,positions=[],indices=[],nu=18,nv=6;
 for(let i=0;i<=nu;i++){const t=i/nu,fin=Math.sin(Math.PI*t)**.75*T.height;
 for(let j=0;j<=nv;j++){const v=j/nv*2-1;positions.push(Math.sin(t*2)*.055, t*t*T.lift+v*fin, -t*length);}}
 for(let i=0;i<nu;i++)for(let j=0;j<nv;j++){const k=i*(nv+1)+j;indices.push(k,k+nv+1,k+1,k+1,k+nv+1,k+nv+2);}
 const fin=new THREE.BufferGeometry();fin.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));fin.setIndex(indices);fin.computeVertexNormals();paint(fin,(x,y,z)=>mix(c.fin,c.belly,smooth(.25,.8,Math.abs(y-z*z/(length*length)*T.lift)/T.height)));
 const core=solid(sweep([[0,0,.05],[.025,.05,-length*.35],[.04,T.lift*.5,-length*.7],[.05,T.lift,-length]],t=>T.r*(1-t)+.003,8,{steps:12}),c.base);
 return merge([core,fin]);
}
export function crouchedQuadruped(sp,key){
 const c=sp.colors,B=sp.body,H=sp.head,rig=new Rig(key,'quadruped','quadWalk');
 const body=paint(ellipsoid(B.width,B.height,B.depth,18,14),(x,y,z,nx,ny,nz)=>mix(c.base,c.belly,smooth(.05,.6,nz)*smooth(.2,-.2,y)));
 rig.add('body','root',[0,B.y,0],[body]);
 const skull=paint(ellipsoid(H.width,H.height,H.depth,22,16),(x,y,z,nx,ny,nz)=>mix(c.base,c.belly,smooth(.15,.7,nz)*smooth(.02,-H.height*.7,y)));
 const headParts=[skull];
 if(H.lobes)for(const side of [-1,1]){const E=H.lobes;headParts.push(paint(xform(ellipsoid(E.r,E.r*1.08,E.r*.92,14,10),{pos:[side*E.x,E.y,E.z]}),(x,y,z,nx,ny,nz)=>mix(c.base,c.eyeRing,smooth(.45,.80,nz))));}
 const head=merge(headParts);rig.add('head','body',H.at,[head.clone()]);
 for(const side of [-1,1]){
  const suffix=side<0?'L':'R';
  // Empty fore anchors retain the established gait contract in hind-only stages.
  for(const [name,profile]of [['legF',sp.fore],['legB',sp.hind]])rig.add(name+suffix,'body',profile?[side*profile.at[0],profile.at[1],profile.at[2]]:[0,0,0],profile?[foldedLimb(profile,side,c.base)]:null);
 }
 if(sp.tail?.len)rig.add('tail','body',[0,0,-B.depth*.65],[membraneTail(sp.tail,c)]);
 rig.meta={idlePose:'stand',hover:0,bodyY:B.y,bodyR:B.height,bodyLen:B.depth*2,legTop:B.y,poseProfile:sp.poseProfile||null};
 const half=H.width*.92;
 rig.faceSpec={bone:'head',target:head,center:[0,H.lobes?.y*.35||0,H.depth],fwd:[0,0,1],half,eyeSize:H.lobes?.r?H.lobes.r/half*.68:.27,
  layout:{eyeX:H.lobes?H.lobes.x/half*64:29,eyeY:H.lobes?64-H.lobes.y*.65/half*64:53,mouthY:89,browY:20,cheekX:42,cheekY:74,mouthW:15},normalEye:sp.normalEye||null,style:{blush:'#e99587'}};
 return rig;
}
