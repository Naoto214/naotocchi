// Rounded, rooted organic branches. Shared rig/material/expression contract;
// explicit paths come from the original, never generated from species names.
import {ellipsoid,sweep,xform,solid,paint,mix} from './geometry.mjs';
import {Rig} from './rig.mjs';
export function branchOrganism(sp,key){
 const rig=new Rig(key,'branch_organism','plantSway'),c=sp.colors,b=sp.body;
 const core=paint(xform(ellipsoid(b.width,b.height,b.depth,20,14),{pos:[0,b.y,0]}),(x,y,z,nx,ny,nz)=>mix(c.body,c.light,Math.max(0,nz)*.22+Math.max(0,ny)*.12));
 const parts=[core.clone()];
 for(const p of sp.branches){
  parts.push(paint(sweep(p.path,t=>p.r*(1-t*(p.taper??.35)),8,{steps:10}),(x,y,z,nx,ny,nz)=>mix(c.branch,c.tip,Math.max(0,ny)*.25+Math.max(0,nz)*.12)));
  const last=p.path[p.path.length-1],r=p.r*(1-(p.taper??.35));
  parts.push(solid(xform(ellipsoid(r*(p.bulb||1),r*(p.bulb||1),r*(p.bulb||1),8,6),{pos:last}),c.tip));
 }
 const stones=sp.stones.map((s,i)=>solid(xform(ellipsoid(s[3],s[4],s[3]*.8,10,6),{pos:s.slice(0,3),rot:[0,i*.7,i%2?.2:-.15]}),c.stones[i%c.stones.length]));
 rig.add('body','root',[0,0,0],parts);
 // Reuse the plant gait's bounded sway, with a single common base and no
 // independently drifting tips or extra gameplay actors.
 rig.add('leavesA','root',[0,0,0],stones);
 rig.add('leavesB','root',[0,0,0],null);
 rig.meta={idlePose:'stand',hover:0};
 rig.faceSpec={bone:'body',target:core,center:[0,b.y,b.depth*.96],fwd:[0,0,1],half:b.width*.73,eyeSize:.25,normalEye:sp.normalEye,
  layout:{eyeX:24,eyeY:56,mouthY:82,browY:36,cheekX:38,cheekY:72,mouthW:8},style:{blush:c.blush}};
 return rig;
}
