import {matchesCondition} from '../naopoyo-rescue/conditions.mjs';
export const clone=v=>structuredClone(v);
export const createState=stage=>({...clone(stage),rescued:0,rescuedBySpecies:{},nextId:1,moves:0});
export const mass=s=>s.rescued+s.actors.reduce((n,a)=>n+a.level,0);
export const complete=s=>s.actors.length===0;
export const at=(list,x,y)=>list.find(a=>a.x===x&&a.y===y);
export const wall=(s,x,y)=>x<0||y<0||x>=s.w||y>=s.h||s.walls.some(p=>p[0]===x&&p[1]===y);
// Gate open is presentation only; every resulting occupant must still qualify.
export const gateAllows=(s,a,x,y)=>{const g=at(s.gates,x,y);return !g||matchesCondition(a,g)};
const special=(s,x,y)=>at(s.gates,x,y)||at(s.exits,x,y)||at(s.spikes,x,y);
const ordinaryEmpty=(s,x,y)=>!wall(s,x,y)&&!special(s,x,y)&&!at(s.actors,x,y);
const compass=[[0,-1],[1,-1],[1,0],[1,1],[0,1],[-1,1],[-1,0],[-1,-1]];
export function splitCandidates(s,x,y,dx,dy,actor=null,policy={}){
 const f=compass.findIndex(p=>p[0]===dx&&p[1]===dy);if(f<0)return [];
 const directions=[4,-2,2,-3,3,-1,1,0].map(offset=>compass[(f+offset+8)%8]);
 const queue=[{x,y,distance:0}],seen=new Set([`${x},${y}`]),out=[];
 for(let i=0;i<queue.length;i++){
  const p=queue[i];if(p.distance===2)continue;
  for(const [vx,vy] of directions){const nx=p.x+vx,ny=p.y+vy,key=`${nx},${ny}`;
   if(seen.has(key)||!ordinaryEmpty(s,nx,ny)||(actor&&policy.canEnter&&!policy.canEnter(s,actor,nx,ny)))continue;
   seen.add(key);const candidate={x:nx,y:ny,distance:p.distance+1};out.push(candidate);queue.push(candidate);
  }
 }
 return out;
}
// Transient event state never enters a save or Undo snapshot.
const context=(activeId,policy={})=>({activeId,policy,fired:new Set(),families:new Map(),family:0,events:[]});
function nextId(s){
 let id;do{id=`child${s.nextId}`;s.nextId=s.nextId===Number.MAX_SAFE_INTEGER?1:s.nextId+1}while(s.actors.some(a=>a.id===id));return id;
}
function split(s,a,spike,dx,dy,ctx,result){
 const key=`${spike.x},${spike.y}`;if(ctx.fired.has(key))return;
 ctx.fired.add(key);
 const positions=splitCandidates(s,a.x,a.y,dx,dy,a,ctx.policy),k=Math.min(a.level-1,spike.power,positions.length);
 result.split=k;result.splitBlocked=k===0?(a.level===1?'minimum':'space'):null;
 if(!k)return;
 a.level-=k;const family=++ctx.family;ctx.families.set(a.id,family);
 for(const p of positions.slice(0,k)){
  const child={id:nextId(s),species:a.species,level:1,x:p.x,y:p.y};
  s.actors.push(child);ctx.families.set(child.id,family);result.children.push(clone(child));
 }
 ctx.events.push({type:'split',id:a.id,x:a.x,y:a.y,count:k});
}
function enter(s,a,dx,dy,ctx,fall=false){
 const x=a.x+dx,y=a.y+dy,reject=reason=>({ok:false,reason});
 if(wall(s,x,y))return reject('wall');
 if(ctx.policy?.canEnter&&!ctx.policy.canEnter(s,a,x,y))return reject('terrain');
 const target=at(s.actors,x,y),gate=at(s.gates,x,y),exit=at(s.exits,x,y),spike=at(s.spikes,x,y);
 if(target){
  if(target.species!==a.species)return reject('species');
  if(a.level===8&&target.level===8)return reject('saturated');
  // A lower 8 already contains the maximal amount: no physical change, no ID swap.
  if(fall&&target.level===8)return reject('saturated');
  if(fall&&ctx.families.has(a.id)&&ctx.families.get(a.id)===ctx.families.get(target.id))return reject('split-family');
 }
 if(!gateAllows(s,a,x,y))return reject('gate');
 const combined=a.level+(target?.level||0),level=Math.min(8,combined);
 if(!gateAllows(s,{...a,level},x,y))return reject('gate');
 // Overflow places the remainder on the origin: validate before either actor changes.
 if(combined>8){
  const remainder={...a,level:combined-8};
  if(!gateAllows(s,remainder,a.x,a.y))return reject('gate');
  if(ctx.policy?.canEnter&&!ctx.policy.canEnter(s,remainder,a.x,a.y))return reject('terrain');
 }
 if(exit&&!matchesCondition({...a,level},exit))return reject('exit');
 const result={ok:true,id:ctx.activeId||a.id,merged:target?.level||0,overflow:Math.max(0,combined-8),split:0,children:[],rescued:0,falls:[]};
 const from={x:a.x,y:a.y};let body=a;
 if(target){
  body=target.id===ctx.activeId?target:a;
  const remainder=body===a?target:a;
  ctx.families.delete(a.id);ctx.families.delete(target.id);
  if(combined>8){Object.assign(remainder,from,{level:combined-8})}
  else s.actors=s.actors.filter(v=>v!==remainder);
  ctx.events.push({type:'merge',id:body.id,x,y,level,overflow:result.overflow,fall});
 }
 Object.assign(body,{x,y,level});
 if(gate)gate.open=true;
 if(exit){
  s.rescued+=body.level;s.rescuedBySpecies[body.species]=(s.rescuedBySpecies[body.species]||0)+body.level;
  s.actors=s.actors.filter(v=>v!==body);ctx.families.delete(body.id);result.rescued=body.level;
  ctx.events.push({type:'rescue',id:body.id,x,y,level:body.level});
 }else if(spike)split(s,body,spike,dx,dy,ctx,result);
 if(fall)ctx.events.push({type:'fall',id:body.id,from:from.y,to:y,x});
 return result;
}
export function settle(s,ctx=context()){
 if(!s.gravity)return [];
 const start=ctx.events.length;
 // A spike is a traversable ledge: entering it can split, its occupant stays on it.
 // Each spike fires at most once per cascade. Between firings, weighted height
 // strictly increases (or mass exits); a saturated contact never executes.
 let changed=true;
 while(changed){
  changed=false;
  for(const snapshot of [...s.actors].sort((a,b)=>b.y-a.y||a.x-b.x||(a.id<b.id?-1:a.id>b.id?1:0))){
   const a=s.actors.find(v=>v.id===snapshot.id);if(!a||at(s.spikes,a.x,a.y))continue;
   // Fall eligibility is separate from terrain and split-child placement.
   // The default v2 policy has no capability-dependent gravity.
   if(ctx.policy?.canFall&&!ctx.policy.canFall(s,a))continue;
   if(enter(s,a,0,1,ctx,true).ok)changed=true;
  }
 }
 return ctx.events.slice(start);
}
const support=(s,x,y,a)=>wall(s,x,y)||!!at(s.actors,x,y)||s.gates.some(g=>g.x===x&&g.y===y&&!matchesCondition(a,g));
export function move(s,id,dx,dy,policy={}){
 const a=s.actors.find(a=>a.id===id),reject=reason=>({ok:false,reason});
 if(!a||!Number.isInteger(dx)||!Number.isInteger(dy)||Math.max(Math.abs(dx),Math.abs(dy))!==1)return reject('step');
 if(s.gravity&&dy<0&&(!(at(s.spikes,a.x,a.y)||support(s,a.x,a.y+1,a))||!(support(s,a.x-1,a.y,a)||support(s,a.x+1,a.y,a))))return reject('foothold');
 const ctx=context(id,policy),result=enter(s,a,dx,dy,ctx);
 if(!result.ok)return result;
 s.moves++;result.falls=settle(s,ctx);result.events=ctx.events;return result;
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
   if(typeof a.id!=='string'||!a.id||ids.has(a.id)||cells.has(key)||!['dog','fish','penguin','frog'].includes(a.species)||!Number.isInteger(a.level)||a.level<1||a.level>8||!Number.isInteger(a.x)||!Number.isInteger(a.y)||wall(s,a.x,a.y)||at(s.exits,a.x,a.y)||s.gates.some(g=>g.x===a.x&&g.y===a.y&&(!g.open||!gateAllows(s,a,a.x,a.y))))return false;
   ids.add(a.id);cells.add(key);
  }
  if(!s.rescuedBySpecies||Object.entries(s.rescuedBySpecies).some(([k,v])=>!['dog','fish','penguin','frog'].includes(k)||!Number.isSafeInteger(v)||v<0))return false;
  if(Object.values(s.rescuedBySpecies).reduce((a,b)=>a+b,0)!==s.rescued)return false;
  const actual=totals(s),expected=totals(createState(stage));
  return [...new Set([...Object.keys(actual),...Object.keys(expected)])].every(k=>(actual[k]||0)===(expected[k]||0));
 }catch{return false}
}

// Optional external-event entry points. Default move/settle semantics remain v2.
export function externalMove(s,id,dx,dy,policy={},activeId=id){
 const a=s.actors.find(a=>a.id===id);if(!a||!Number.isInteger(dx)||!Number.isInteger(dy)||Math.max(Math.abs(dx),Math.abs(dy))!==1)return {ok:false,reason:'step'};
 const ctx=context(activeId,policy),result=enter(s,a,dx,dy,ctx);
 if(result.ok){result.falls=settle(s,ctx);result.events=ctx.events}return result;
}
export function externalSplit(s,id,power,dx=1,dy=0,policy={},activeId=id){
 const a=s.actors.find(a=>a.id===id);if(!a||!Number.isInteger(power)||power<1)return {ok:false,reason:'split'};
 const remaining=a.level-Math.min(a.level-1,power,splitCandidates(s,a.x,a.y,dx,dy,a,policy).length);
 if(!gateAllows(s,{...a,level:remaining},a.x,a.y))return {ok:false,reason:'gate',children:[]};
 const ctx=context(activeId,policy),result={ok:true,id,split:0,children:[]};
 split(s,a,{x:a.x,y:a.y,power},dx,dy,ctx,result);result.falls=settle(s,ctx);result.events=ctx.events;return result;
}
