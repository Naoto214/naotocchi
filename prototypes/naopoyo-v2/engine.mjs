import {matchesCondition} from '../naopoyo-rescue/conditions.mjs';
export const clone=v=>structuredClone(v);
export const createState=stage=>({...clone(stage),rescued:0,rescuedBySpecies:{},nextId:1,moves:0});
export const mass=s=>s.rescued+s.actors.reduce((n,a)=>n+a.level,0);
export const complete=s=>s.actors.length===0;
export const at=(list,x,y)=>list.find(a=>a.x===x&&a.y===y);
export const wall=(s,x,y)=>x<0||y<0||x>=s.w||y>=s.h||s.walls.some(p=>p[0]===x&&p[1]===y);
const special=(s,x,y)=>at(s.gates,x,y)||at(s.exits,x,y)||at(s.spikes,x,y);
const ordinaryEmpty=(s,x,y)=>!wall(s,x,y)&&!special(s,x,y)&&!at(s.actors,x,y);
const compass=[[0,-1],[1,-1],[1,0],[1,1],[0,1],[-1,1],[-1,0],[-1,-1]];
export function splitCandidates(s,x,y,dx,dy){
 const f=compass.findIndex(p=>p[0]===dx&&p[1]===dy);if(f<0)return [];
 const directions=[4,-2,2,-3,3,-1,1,0].map(offset=>compass[(f+offset+8)%8]);
 const queue=[{x,y,distance:0}],seen=new Set([`${x},${y}`]),out=[];
 for(let i=0;i<queue.length;i++){
  const p=queue[i];if(p.distance===2)continue;
  for(const [vx,vy] of directions){const nx=p.x+vx,ny=p.y+vy,key=`${nx},${ny}`;
   if(seen.has(key)||!ordinaryEmpty(s,nx,ny))continue;
   seen.add(key);const candidate={x:nx,y:ny,distance:p.distance+1};out.push(candidate);queue.push(candidate);
  }
 }
 return out;
}
export function settle(s){
 const falls=[];if(!s.gravity)return falls;
 // Each pass strictly increases total y; no entry effects are run by falling.
 let changed=true;
 while(changed){changed=false;
  for(const a of [...s.actors].sort((a,b)=>b.y-a.y||a.x-b.x||a.id.localeCompare(b.id))){
   const from=a.y;while(ordinaryEmpty(s,a.x,a.y+1))a.y++;
   if(a.y!==from){falls.push({id:a.id,from,to:a.y});changed=true}
  }
 }
 return falls;
}
const support=(s,x,y)=>wall(s,x,y)||!!at(s.actors,x,y)||!!special(s,x,y);
export function move(s,id,dx,dy){
 const a=s.actors.find(a=>a.id===id);
 const reject=reason=>({ok:false,reason});
 if(!a||!Number.isInteger(dx)||!Number.isInteger(dy)||Math.max(Math.abs(dx),Math.abs(dy))!==1)return reject('step');
 const x=a.x+dx,y=a.y+dy;if(wall(s,x,y))return reject('wall');
 if(s.gravity&&dy<0&&(!support(s,a.x,a.y+1)||!(support(s,a.x-1,a.y)||support(s,a.x+1,a.y))))return reject('foothold');
 const target=at(s.actors,x,y),gate=at(s.gates,x,y),exit=at(s.exits,x,y),spike=at(s.spikes,x,y);
 if(target&&(target.species!==a.species||target.level+a.level>8))return reject(target.species!==a.species?'species':'overflow');
 if(target&&spike&&s.occupiedSpikeMode==='block')return reject('occupied-spike');
 if(gate&&!matchesCondition(a,gate))return reject('gate');
 const combined=a.level+(target?.level||0);
 if(exit&&!matchesCondition({...a,level:combined},exit))return reject('exit');
 const result={ok:true,id,merged:target?.level||0,split:0,children:[],rescued:0,falls:[]};
 if(target)s.actors=s.actors.filter(v=>v.id!==target.id);
 a.x=x;a.y=y;a.level=combined;
 if(gate)gate.open=true;
 if(exit){s.rescued+=a.level;s.rescuedBySpecies[a.species]=(s.rescuedBySpecies[a.species]||0)+a.level;s.actors=s.actors.filter(v=>v.id!==id);result.rescued=a.level}
 else if(spike){
  const positions=splitCandidates(s,x,y,dx,dy),k=Math.min(a.level-1,spike.power,positions.length);
  a.level-=k;result.split=k;result.splitBlocked=k===0?(combined===1?'minimum':'space'):null;
  for(const p of positions.slice(0,k)){
   // Wrap at the integer boundary: a valid but extreme restored counter must never stall.
   let childId;do{childId=`child${s.nextId}`;s.nextId=s.nextId===Number.MAX_SAFE_INTEGER?1:s.nextId+1}while(s.actors.some(v=>v.id===childId));
   const child={id:childId,species:a.species,level:1,x:p.x,y:p.y};s.actors.push(child);result.children.push(clone(child));
  }
 }
 s.moves++;result.falls=settle(s);return result;
}
export function totals(s){const result={...s.rescuedBySpecies};for(const a of s.actors)result[a.species]=(result[a.species]||0)+a.level;return result}
export function validState(stage,s){
 try{
  if(!s||s.id!==stage.id||s.w!==stage.w||s.h!==stage.h||s.occupiedSpikeMode!==stage.occupiedSpikeMode)return false;
  for(const key of ['rescued','moves'])if(!Number.isSafeInteger(s[key])||s[key]<0)return false;
  if(!Number.isSafeInteger(s.nextId)||s.nextId<1)return false;
  for(const key of ['walls','spikes','exits','gravity'])if(JSON.stringify(s[key])!==JSON.stringify(stage[key]))return false;
  if(s.gates.length!==stage.gates.length||s.gates.some((g,i)=>(g.open!==undefined&&typeof g.open!=='boolean')||JSON.stringify({...g,open:false})!==JSON.stringify({...stage.gates[i],open:false})))return false;
  const ids=new Set(),cells=new Set();
  for(const a of s.actors){const key=`${a.x},${a.y}`;
   if(typeof a.id!=='string'||!a.id||ids.has(a.id)||cells.has(key)||!['dog','fish','penguin','frog'].includes(a.species)||!Number.isInteger(a.level)||a.level<1||a.level>8||!Number.isInteger(a.x)||!Number.isInteger(a.y)||wall(s,a.x,a.y)||at(s.exits,a.x,a.y)||s.gates.some(g=>g.x===a.x&&g.y===a.y&&!g.open))return false;
   ids.add(a.id);cells.add(key);
  }
  if(!s.rescuedBySpecies||Object.entries(s.rescuedBySpecies).some(([k,v])=>!['dog','fish','penguin','frog'].includes(k)||!Number.isSafeInteger(v)||v<0))return false;
  if(Object.values(s.rescuedBySpecies).reduce((a,b)=>a+b,0)!==s.rescued)return false;
  const actual=totals(s),expected=totals(createState(stage));
  return [...new Set([...Object.keys(actual),...Object.keys(expected)])].every(k=>(actual[k]||0)===(expected[k]||0));
 }catch{return false}
}
