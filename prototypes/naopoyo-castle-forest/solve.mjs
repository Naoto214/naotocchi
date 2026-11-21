import {createCastleState,castleMove} from './runtime.mjs';
import {stages} from './stages.mjs';
import {writeFileSync} from 'node:fs';
export const key=s=>JSON.stringify([s.actors.map(a=>[a.x,a.y,a.level]).sort(),Object.keys(s.flags).filter(k=>s.flags[k]).sort(),s.sequenceIndex,[...s.pressed].sort(),s.collapsed]);
export function solve(board,{limit=150000,disable=null}={}){
 const initial=createCastleState(board);if(disable){initial.mechanisms.plates=(initial.mechanisms.plates||[]).filter(p=>p.id!==disable);if(disable==='sequence')delete initial.mechanisms.sequence;if(disable==='owlHelp')delete initial.mechanisms.owl;if(disable==='bearHelp')delete initial.mechanisms.bear;}
 const queue=[{s:initial,parent:-1,step:null}],seen=new Set([key(initial)]);
 for(let n=0;n<queue.length;n++){
  const {s}=queue[n];if(!s.actors.length){const path=[];for(let k=n;queue[k].parent>=0;k=queue[k].parent)path.unshift(queue[k].step);return {path,states:seen.size,complete:true};}
  for(const a of s.actors)for(const [dx,dy]of [[1,0],[-1,0],[0,-1],[0,1],[1,-1],[1,1],[-1,1],[-1,-1]]){
   const next=structuredClone(s);const r=castleMove(next,a.id,dx,dy);if(!r.ok)continue;const k=key(next);if(seen.has(k))continue;seen.add(k);queue.push({s:next,parent:n,step:[a.id,dx,dy]});if(seen.size>=limit)return {path:null,states:seen.size,complete:false};
  }
 }
 return {path:null,states:seen.size,complete:true};
}
if(process.argv[1]===new URL(import.meta.url).pathname){const results=[];for(const s of stages){const r=solve(s.board);console.log(s.id,s.title,JSON.stringify(r));results.push(r);}if(results.every(r=>r.path))writeFileSync(new URL('./solutions.mjs',import.meta.url),'export const solutions='+JSON.stringify(results.map(r=>r.path))+';\n');}
