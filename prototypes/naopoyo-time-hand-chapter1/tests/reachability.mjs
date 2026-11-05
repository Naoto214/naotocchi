// Test-only model exploration. Uses the real unchanged engine, all eight inputs.
import {createState,move,complete,cornerBlocked} from '../engine.mjs';
import {timeHandTrace} from '../priorities.mjs';
export const directions=[[1,0],[0,1],[0,-1],[-1,0],[1,1],[1,-1],[-1,1],[-1,-1]];
const copy=s=>({...s,actors:s.actors.map(a=>({...a})),gates:s.gates.map(g=>({...g})),rescuedBySpecies:{...s.rescuedBySpecies}});
// IDs are interchangeable: rules and victory depend only on species/level/position.
const key=s=>JSON.stringify(s.actors.map(a=>[a.species,a.level,a.x,a.y]).sort());
export function transition(s,id,dx,dy){
 const t=copy(s),flags=new Set(),a=s.actors.find(a=>a.id===id),samples=[];
 const r=move(t,id,dx,dy,{observeSplit:e=>samples.push(e)});
 if(!r.ok)return {state:t,result:r,flags};
 flags.add('move');
 if(dx&&dy)flags.add('diagonal');
 if(a&&dy<0&&s.gravity&&s.actors.some(b=>b.id!==id&&((b.x===a.x&&b.y===a.y+1)||(b.x===a.x+dx&&b.y===a.y+dy+1))))flags.add('support');
 for(const e of r.events){flags.add(e.type);if(e.type==='merge'&&e.fall)flags.add('fallMerge');}
 for(const e of samples){
  const before=copy(e.state);before.actors=before.actors.filter(a=>!e.children.some(b=>b.id===a.id));
  const p=before.actors.find(a=>a.id===e.parentId);p.level+=e.children.length;
  const trace=timeHandTrace(before,p.x,p.y,...e.direction,p).candidates.slice(0,e.children.length);
  if(e.children[0]?.x===p.x-e.direction[0]&&e.children[0]?.y===p.y-e.direction[1])flags.add('rear');
  if(e.children.length>=2&&trace.every(c=>c.direction[0]===-e.direction[0]&&c.direction[1]===-e.direction[1]))flags.add('line');
  if(trace.some(c=>c.turns>0))flags.add('turn');
  if(e.direction[0]&&e.direction[1])flags.add('diagonalSplit');
 }
 return {state:t,result:r,flags};
}
export function search(board,{forbid=null,maxStates=150000}={}){
 const start=createState(board),queue=[{s:start,parent:-1,action:null}],seen=new Set([key(start)]);
 for(let head=0;head<queue.length;head++){
  const {s}=queue[head];
  for(const a of s.actors)for(const [dx,dy]of directions){
   const {state:t,result:r,flags}=transition(s,a.id,dx,dy);
   if(!r.ok||forbid&&flags.has(forbid))continue;
   const k=key(t);if(seen.has(k))continue;seen.add(k);
   const entry={s:t,parent:head,action:[a.id,dx,dy]};queue.push(entry);
   if(complete(t)){const path=[];let n=queue.length-1;while(queue[n].parent>=0){path.push(queue[n].action);n=queue[n].parent;}return {solved:true,path:path.reverse(),states:seen.size,exhausted:false};}
   if(seen.size>maxStates)throw Error(`search cap ${maxStates} exceeded; no proof for ${board.id}/${forbid}`);
  }
 }
 return {solved:false,path:null,states:seen.size,exhausted:true};
}
export const requirements=[['move'],['rear'],['line'],['turn'],['merge'],['fall'],['support'],['diagonalSplit'],['split','fallMerge'],['split','turn','merge','fall']];
