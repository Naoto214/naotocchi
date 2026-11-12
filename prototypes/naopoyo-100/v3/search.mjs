// Offline verification only. Every successor is produced by the unchanged gameMove.
import {createGameState,cloneGameState,gameMove,isComplete,stateKey} from '../engine.mjs';
const dirs=[[1,0],[0,1],[-1,0],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]];
const path=n=>{const out=[];for(;n.action;n=n.parent)out.push(n.action);return out.reverse()};
export function search(board,{forbid=()=>false,limit=12000,maxDepth=90}={}){
 const state=createGameState(board),queue=[{state,depth:0}],seen=new Set([stateKey(state)]);let expanded=0,truncated=false;
 for(let cursor=0;cursor<queue.length;cursor++){
  const n=queue[cursor];if(isComplete(n.state))return {status:'shortest',solution:path(n),expanded,discovered:seen.size,limit,maxDepth};
  if(expanded>=limit)return {status:'limit',expanded,discovered:seen.size,limit,maxDepth};
  if(n.depth>=maxDepth){truncated=true;continue}expanded++;
  for(const a of n.state.actors)for(const[dx,dy]of dirs){const next=cloneGameState(n.state),action={x:a.x,y:a.y,dx,dy},result=gameMove(next,a.id,dx,dy);if(!result.ok||forbid(n.state,next,result.events,action))continue;
   const key=stateKey(next);if(seen.has(key))continue;seen.add(key);const child={state:next,depth:n.depth+1,parent:n,action};if(isComplete(next))return{status:'shortest',solution:path(child),expanded,discovered:seen.size,limit,maxDepth};queue.push(child);
  }n.state=null;
 }
 return{status:truncated?'limit':'exhausted',expanded,discovered:seen.size,limit,maxDepth};
}
export function mainRequirement(stage){
 const id=stage.mainGimmick,b=stage.board;
 if(stage.id==='32')return null; // Deliberately avoid the current: an effect-ban is not a necessity test.
 if(stage.id==='33'){const g=b.gates[0];return{label:'通路の屋根への進入・救出を禁止',forbid:(_s,n,e,a)=>(a.x+a.dx===g.x&&a.y+a.dy===g.y-1)||n.actors.some(a=>a.x===g.x&&a.y===g.y-1)}}
 if(['20','35','36'].includes(stage.id)){const ts=b.tiles.filter(t=>t.catalogId===id);return{label:id+'のマス進入を禁止',forbid:(_s,n,_e,a)=>ts.some(t=>(t.x===a.x+a.dx&&t.y===a.y+a.dy)||n.actors.some(v=>v.x===t.x&&v.y===t.y))}}
 if(id==='fixture.exit')return null;
 if(id==='fixture.spike')return {label:'分裂を禁止',forbid:(_s,_n,e)=>e.some(v=>v.type==='split')};
 if(id==='fixture.gate')return {label:'条件通路の通過を禁止',forbid:(_s,_n,e)=>e.some(v=>v.type==='phase')};
 if(id==='object.crate')return {label:'箱押しを禁止',forbid:(_s,_n,e)=>e.some(v=>v.type==='push')};
 if(id==='fixture.crumble')return {label:'床の崩壊を禁止',forbid:(_s,_n,e)=>e.some(v=>v.type==='crumble')};
 if(id==='sign.gravity')return {label:'落下と上向き移動を禁止',forbid:(_s,_n,e,a)=>a.dy<0||e.some(v=>v.type==='fall')};
 if(['fixture.plate.hold','fixture.plate.weight','fixture.latch','fixture.toggle','fixture.sequence'].includes(id)){
  const ts=b.tiles.filter(t=>t.catalogId===id),keys=ts.map(t=>t.params.groupId||t.params.id);
  return{label:id+'の作動を禁止',forbid:(s,n)=>keys.some(k=>!s.flags[k]&&n.flags[k])};
 }
 if(['terrain.water','terrain.tunnel','fixture.oneway','fixture.phase'].includes(id)){
  const ts=b.tiles.filter(t=>t.catalogId===id),hit=(x,y)=>ts.some(t=>t.x===x&&t.y===y);
  return{label:id+'の新規マス進入を禁止',forbid:(s,n,e,a)=>hit(a.x+a.dx,a.y+a.dy)||n.actors.some(v=>hit(v.x,v.y)&&!s.actors.some(before=>before.id===v.id&&before.x===v.x&&before.y===v.y))||e.some(v=>hit(v.x,v.y)||v.to&&typeof v.to==='object'&&hit(v.to.x,v.to.y))};
 }
 return{label:id+'の効果を禁止',forbid:(_s,_n,e)=>e.some(v=>v.catalogId===id)};
}
