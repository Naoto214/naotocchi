// Experimental placement policies. Production engine is read-only.
import {wall,at,cornerBlocked,splitCandidates as officialCandidates} from '../naopoyo-v2/engine.mjs';
export const compass=[[0,-1],[1,-1],[1,0],[1,1],[0,1],[-1,1],[-1,0],[-1,-1]];
export const headingNames=['上','右上','右','右下','下','左下','左','左上'];
export const offsets=[4,-2,2,-3,3,-1,1,0];
export function directions(dx,dy){const f=compass.findIndex(p=>p[0]===dx&&p[1]===dy);return f<0?[]:offsets.map(o=>compass[(f+o+8)%8]);}
const key=(x,y)=>`${x},${y}`;
export function blockedReason(s,x,y){
 if(wall(s,x,y))return x<0||y<0||x>=s.w||y>=s.h?'盤面外':'岩';
 if(at(s.actors,x,y))return '仲間';if(at(s.gates,x,y))return 'ゲート';if(at(s.exits,x,y))return '出口';if(at(s.spikes,x,y))return 'トゲ';return null;
}
function legal(s,from,to,actor,policy){return !blockedReason(s,...to)&&!cornerBlocked(s,...from,to[0]-from[0],to[1]-from[1],actor?{...actor,level:1}:null)&&!(actor&&policy.canEnter&&!policy.canEnter(s,actor,...to));}
// Clockwise perimeter, starting at north. Heading +45° shifts two ring cells.
const ring2=[[0,-2],[1,-2],[2,-2],[2,-1],[2,0],[2,1],[2,2],[1,2],[0,2],[-1,2],[-2,2],[-2,1],[-2,0],[-2,-1],[-2,-2],[-1,-2]];
export function fixedOffsets(dx,dy,mode='C'){
 const dirs=directions(dx,dy);if(!dirs.length)return [];
 if(mode==='B')return dirs.flatMap(([x,y])=>[[x,y],[2*x,2*y]]);
 const f=compass.findIndex(p=>p[0]===dx&&p[1]===dy),start=((f+4)%8)*2;
 return [...dirs,...ring2.map((_,i)=>ring2[(start+i)%16])];
}
export function candidateDetails(s,x,y,dx,dy,actor=null,policy={},mode='A'){
 if(!['A','B','C'].includes(mode))throw new RangeError('Unknown split priority');
 const dirs=directions(dx,dy);if(!dirs.length)return [];
 const origin=[x,y],out=[],seen=new Set([key(x,y)]);
 if(mode==='B'){
  let fixedRank=0;for(const [vx,vy]of dirs){const mid=[x+vx,y+vy],far=[x+2*vx,y+2*vy];fixedRank+=2;if(!legal(s,origin,mid,actor,policy))continue;
   out.push({x:mid[0],y:mid[1],distance:1,path:[origin,mid],fixedRank:fixedRank-1});
   if(legal(s,mid,far,actor,policy))out.push({x:far[0],y:far[1],distance:2,path:[origin,mid,far],fixedRank});
  }
 }else{
  const queue=[{x,y,distance:0,path:[origin]}];
  for(let i=0;i<queue.length;i++){const p=queue[i];if(p.distance===2)continue;for(const [vx,vy]of dirs){const nx=p.x+vx,ny=p.y+vy,k=key(nx,ny);if(seen.has(k)||!legal(s,[p.x,p.y],[nx,ny],actor,policy))continue;seen.add(k);const q={x:nx,y:ny,distance:p.distance+1,path:[...p.path,[nx,ny]]};out.push(q);queue.push(q);}}
  if(mode==='C'){const fixed=new Map(fixedOffsets(dx,dy).map(([vx,vy],i)=>[key(x+vx,y+vy),i+1]));for(const p of out)p.fixedRank=fixed.get(key(p.x,p.y));out.sort((a,b)=>a.fixedRank-b.fixedRank);}
 }
 return out.map((p,i)=>({...p,order:i+1,ring:Math.max(Math.abs(p.x-x),Math.abs(p.y-y))}));
}
export function experimentCandidates(s,x,y,dx,dy,actor=null,policy={}){
 const mode=s.splitPriority||'A';
 // A calls the actual shipped implementation, not our explanatory trace.
 if(mode==='A')return officialCandidates(s,x,y,dx,dy,actor,policy);
 return candidateDetails(s,x,y,dx,dy,actor,policy,mode).map(({x,y,distance})=>({x,y,distance}));
}
