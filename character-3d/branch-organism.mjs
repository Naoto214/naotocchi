// Rounded, rooted organic branches. Shared rig/material/expression contract;
// explicit paths come from the original, never generated from species names.
import {ellipsoid,sweep,xform,solid,paint,mix,outlineLoft,blob} from './geometry.mjs';
import {Rig} from './rig.mjs';
export function branchOrganism(sp,key){
 if(sp.colony)return branchColony(sp,key);
 const rig=new Rig(key,'branch_organism',sp.locomotion||'plantSway'),c=sp.colors,b=sp.body;
 const core=paint(xform(sp.trap?blob((x,y,z)=>[x*b.width,y*b.height,b.depth*(1.6*(x*x+y*y)-.6)+(z<0?z*b.depth*.4:0)],24,16):b.taper?blob((x,y,z)=>{const q=1-y*y*b.taper;return [x*b.width*q,y*b.height,z*b.depth*q];},20,14):ellipsoid(b.width,b.height,b.depth,20,14),{pos:[0,b.y,0]}),(x,y,z,nx,ny,nz)=>sp.trap&&nz<0?c.branch:mix(c.body,c.light,Math.max(0,nz)*.22+Math.max(0,ny)*.12));
 const parts=[core.clone()];
 if(sp.trap){
  const t=sp.trap,rim=[];
  for(let i=0;i<=32;i++){const a=i*Math.PI*2/32;rim.push([Math.cos(a)*b.width,b.y+Math.sin(a)*b.height,b.depth]);}
  parts.push(solid(sweep(rim,()=>t.rim,7,{steps:48}),c.branch));
  for(let i=0;i<t.teeth;i++){
   const a=i*Math.PI*2/t.teeth,x=Math.cos(a),y=Math.sin(a),len=t.length*(.88+.12*Math.cos(i*2.4));
   parts.push(solid(sweep([[x*b.width,b.y+y*b.height,b.depth],[x*(b.width+len*.55),b.y+y*(b.height+len*.55),b.depth+.015],[x*(b.width+len),b.y+y*(b.height+len),b.depth-.005]],q=>t.rim*.60*(1-q*.92),4,{steps:3}),c.tip));
  }
 }

 for(const s of sp.stemSegments||[])parts.push(paint(xform(ellipsoid(s.width,s.height,s.depth,16,10),{pos:[0,s.y,0]}),(x,y,z,nx,ny,nz)=>mix(c.body,c.light,Math.max(0,nz)*.30+Math.max(0,ny)*.12)));
 for(const p of sp.branches){
  parts.push(paint(sweep(p.path,t=>p.r*(1-t*(p.taper??.35)),p.sides||8,{steps:p.steps||10}),(x,y,z,nx,ny,nz)=>mix(c.branch,c.tip,Math.max(0,ny)*.25+Math.max(0,nz)*.12)));
  const last=p.path[p.path.length-1],r=p.r*(1-(p.taper??.35));
  // sweep already has a rounded cap. Only larger source polyp bulbs
  // need an additional volume; equal-radius spheres caused coplanar rings.
  if(p.bulb>1)parts.push(solid(xform(ellipsoid(r*p.bulb,r*p.bulb,r*p.bulb,8,6),{pos:last}),c.tip));
 }
 if(sp.petals)for(let i=0;i<sp.petals.count;i++){
  const a=i/sp.petals.count*Math.PI*2;
  parts.push(paint(xform(ellipsoid(sp.petals.width,sp.petals.length,sp.petals.depth,8,6),{pos:[Math.sin(a)*b.width*.97,b.y+Math.cos(a)*b.height*.97,0],rot:[0,0,-a]}),(x,y,z,nx,ny,nz)=>mix(c.branch,c.tip,Math.max(0,nz)*.65)));
 }
 // Flower canopy shares the branch's single owner and bounded merged mesh.
 for(const f of sp.blossoms||[]){
  const place=g=>xform(g,{pos:f.at,rot:f.tilt||[0,0,0]});
  for(let i=0;i<5;i++){const a=i/5*Math.PI*2+f.rotation;
   parts.push(solid(place(xform(ellipsoid(f.r*.48,f.r*.66,f.r*.25,8,6),{pos:[Math.sin(a)*f.r*.48,Math.cos(a)*f.r*.48,0],rot:[0,0,-a]})),f.petal));}
  parts.push(solid(place(xform(ellipsoid(f.r*.23,f.r*.23,f.r*.28,8,6),{pos:[0,0,f.r*.12]})),f.center));
 }
 for(const leaf of sp.foliage||[]){
  const w=leaf.width,h=leaf.length,d=leaf.depth||.018,place=g=>xform(g,{pos:leaf.at,rot:leaf.tilt||[0,0,0]});
  const blade=paint(outlineLoft([[0,0],[-w*.7,h*.25],[-w,h*.55],[0,h],[w,h*.55],[w*.7,h*.25]],d,20,3),(x,y,z,nx,ny,nz)=>mix(leaf.color,leaf.light,Math.max(0,nz)*.28));
  parts.push(place(blade),solid(place(sweep([[0,0,d],[0,h*.5,d*1.1],[0,h,.003]],()=>.007,5,{steps:4})),leaf.vein));
 }
 const stones=sp.stones.map((s,i)=>solid(xform(ellipsoid(s[3],s[4],s[3]*.8,10,6),{pos:s.slice(0,3),rot:[0,i*.7,i%2?.2:-.15]}),c.stones[i%c.stones.length]));
 rig.add('body','root',[0,0,0],parts);
 // Reuse the plant gait's bounded sway, with a single common base and no
 // independently drifting tips or extra gameplay actors.
 rig.add('leavesA','root',[0,0,0],stones);
 rig.add('leavesB','root',[0,0,0],null);
 rig.meta={idlePose:sp.locomotion==='blobFloat'?'hover':'stand',hover:sp.locomotion==='blobFloat'?.10:0};
 rig.faceSpec={bone:'body',target:core,center:[0,b.y,b.depth*.96],fwd:[0,0,1],half:b.width*.73,eyeSize:.25,normalEye:sp.normalEye,
  layout:{eyeX:24,eyeY:56,mouthY:82,browY:36,cheekX:38,cheekY:72,mouthW:8},style:{blush:c.blush}};
 return rig;
}

// Each face owns one bone, but all members share the parent's actor/animation.
function branchColony(sp,key){
 const rig=new Rig(key,'branch_organism','plantSway');
 const substrate=sp.stones.map((s,i)=>solid(xform(ellipsoid(s[3],s[4],s[3]*.85,8,6),{pos:s.slice(0,3)}),sp.stoneColors[i%sp.stoneColors.length]));
 if(sp.mound){const m=sp.mound;
  substrate.push(solid(xform(ellipsoid(m.r,m.h*.53,m.r*.48,20,12),{pos:[0,.10+m.h*.42,-.10]}),m.colors[0]));
  for(let row=0;row<5;row++)for(let col=0;col<9;col++){
   const a=(col/8-.5)*Math.PI*1.3,h=row/4,r=m.r*Math.sqrt(1-h*h*.84),y=.11+h*m.h;
   substrate.push(solid(xform(ellipsoid(.065,.075,.065,8,6),{pos:[Math.sin(a)*r,y,-.12+Math.cos(a)*r*.40]}),m.colors[(row*7+col)%m.colors.length]));
  }
 }
 rig.add('body','root',[0,0,0],substrate);
 rig.add('leavesA','body',[0,0,0],null);rig.add('leavesB','body',[0,0,0],null);
 const faces=[];
 for(const [i,u]of sp.colony.entries()){
  const sub=branchOrganism(u.spec,key+':unit'+i),name='unit'+i;
  const parts=sub.parts.map(p=>p.mesh.geometry.clone()),b=u.spec.body;
  // Raised crowns must grow out of the common substrate, not float above it.
  // Keep the stem in its member's bone so sway cannot open a new gap.
  if(!sp.suspended&&u.at[1]+(b.y-b.height)*u.scale>.10){
   const ground=(.045-u.at[1])/u.scale;
   parts.push(solid(sweep([[0,ground,0],[0,(ground+b.y)*.5,0],[0,b.y-b.height*.5,0]],t=>b.width*(.36+t*.16),8,{steps:8}),u.spec.colors.branch));
  }
  const bone=rig.add(name,'body',u.at,parts);
  bone.scale.setScalar(u.scale);bone.userData.rest.s.copy(bone.scale);
  if(u.face!==false)faces.push({...sub.faceSpec,bone:name});
 }
 rig.faceSpec=faces;rig.meta={idlePose:'stand',hover:0};return rig;
}
