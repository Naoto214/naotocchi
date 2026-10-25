import {matchesCondition} from '../naopoyo-rescue/conditions.mjs';
export const clone=v=>structuredClone(v);
export const createState=stage=>({...clone(stage),rescued:0,rescuedBySpecies:{},nextId:1,moves:0});
export const mass=s=>s.rescued+s.actors.reduce((n,a)=>n+a.level,0);
export const complete=s=>s.actors.length===0;
export const at=(list,x,y)=>list.find(a=>a.x===x&&a.y===y);
export const wall=(s,x,y)=>x<0||y<0||x>=s.w||y>=s.h||s.walls.some(p=>p[0]===x&&p[1]===y);
// Gate open is presentation only; every resulting occupant must still qualify.
export const gateAllows=(s,a,x,y)=>{const g=at(s.gates,x,y);return !g||matchesCondition(a,g)};
// Explicit opt-in: published boards retain their original contact semantics.
export const contactRules=s=>s.movementRules==='contact-v1';
export const magicRockRules=s=>s.terrainRules==='magic-rock-v1';
export const terrainBlocks=(s,a,x,y)=>wall(s,x,y)||!gateAllows(s,a,x,y);
export const cornerBlocked=(s,x,y,dx,dy,a=null)=>contactRules(s)&&dx!==0&&dy!==0&&(magicRockRules(s)&&a?terrainBlocks(s,a,x+dx,y)&&terrainBlocks(s,a,x,y+dy):wall(s,x+dx,y)&&wall(s,x,y+dy));
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
   if(seen.has(key)||cornerBlocked(s,p.x,p.y,vx,vy,actor?{...actor,level:1}:null)||!ordinaryEmpty(s,nx,ny)||(actor&&policy.canEnter&&!policy.canEnter(s,actor,nx,ny)))continue;
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
 const key=`${spike.x},${spike.y}`;
 // New physics dispatches on actual entry, not once per tile per cascade.
 if(!supportedGravity(s)){if(ctx.fired.has(key))return;ctx.fired.add(key);}
 const positions=splitCandidates(s,a.x,a.y,dx,dy,a,ctx.policy),k=Math.min(a.level-1,spike.power,positions.length);
 result.split=k;result.splitBlocked=k===0?(a.level===1?'minimum':'space'):null;
 if(!k)return;
 a.level-=k;const family=++ctx.family;ctx.families.set(a.id,family);
 for(const p of positions.slice(0,k)){
  const child={id:nextId(s),species:a.species,level:1,x:p.x,y:p.y};
  s.actors.push(child);ctx.families.set(child.id,family);result.children.push(clone(child));
 }
 ctx.events.push({type:'split',id:a.id,x:a.x,y:a.y,count:k,...(supportedGravity(s)?{children:clone(result.children)}:{})});
}
function arrival(s,a,dx,dy,ctx,result,entered=true){
 const gate=at(s.gates,a.x,a.y),exit=at(s.exits,a.x,a.y),spike=at(s.spikes,a.x,a.y);
 if(gate){gate.open=true;if(magicRockRules(s)&&entered)ctx.events.push({type:'phase',id:a.id,x:a.x,y:a.y,level:a.level});}
 if(exit&&matchesCondition(a,exit)){
  s.rescued+=a.level;s.rescuedBySpecies[a.species]=(s.rescuedBySpecies[a.species]||0)+a.level;
  s.actors=s.actors.filter(v=>v!==a);ctx.families.delete(a.id);result.rescued+=a.level;
  ctx.events.push({type:'rescue',id:a.id,x:a.x,y:a.y,level:a.level});
 }else if(spike&&entered){
  const local={split:0,children:[]};split(s,a,spike,dx,dy,ctx,local);
  result.split+=local.split;result.children.push(...local.children);result.splitBlocked=local.splitBlocked;
 }
}
function exchange(s,a,b,dx,dy,ctx){
 // All checks see the same pre-exchange board; no partial mutations on refusal.
 for(const [v,vx,vy] of [[a,dx,dy],[b,-dx,-dy]]){
  if(wall(s,v.x+vx,v.y+vy))return {ok:false,reason:'wall'};
  if(cornerBlocked(s,v.x,v.y,vx,vy,v))return {ok:false,reason:'corner'};
  if(!canAscend(s,v,vx,vy))return {ok:false,reason:'foothold'};
  if(!gateAllows(s,v,v.x+vx,v.y+vy))return {ok:false,reason:'gate'};
  if(ctx.policy?.canEnter&&!ctx.policy.canEnter(s,v,v.x+vx,v.y+vy))return {ok:false,reason:'terrain'};
 }
 const fromA={x:a.x,y:a.y},fromB={x:b.x,y:b.y};
 Object.assign(a,fromB);Object.assign(b,fromA);ctx.families.delete(a.id);ctx.families.delete(b.id);
 const result={ok:true,id:ctx.activeId||a.id,swapped:b.id,merged:0,overflow:0,split:0,children:[],rescued:0,falls:[]};
 ctx.events.push({type:'swap',id:a.id,otherId:b.id,from:fromA,to:fromB});
 arrival(s,a,dx,dy,ctx,result);arrival(s,b,-dx,-dy,ctx,result);
 return result;
}
function enter(s,a,dx,dy,ctx,fall=false){
 const x=a.x+dx,y=a.y+dy,reject=reason=>({ok:false,reason});
 if(wall(s,x,y))return reject('wall');
 if(cornerBlocked(s,a.x,a.y,dx,dy,a))return reject('corner');
 if(ctx.policy?.canEnter&&!ctx.policy.canEnter(s,a,x,y))return reject('terrain');
 const target=at(s.actors,x,y),gate=at(s.gates,x,y),exit=at(s.exits,x,y),spike=at(s.spikes,x,y);
 if(target){
  if(contactRules(s)&&!fall&&(target.species!==a.species||a.level===8&&target.level===8))return exchange(s,a,target,dx,dy,ctx);
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
 if(exit&&!contactRules(s)&&!matchesCondition({...a,level},exit))return reject('exit');
 const result={ok:true,id:ctx.activeId||a.id,merged:target?.level||0,overflow:Math.max(0,combined-8),split:0,children:[],rescued:0,falls:[]};
 const from={x:a.x,y:a.y};let body=a;let overflowActor=null;
 if(target){
  body=target.id===ctx.activeId?target:a;
  const remainder=body===a?target:a;
  ctx.families.delete(a.id);ctx.families.delete(target.id);
  const absorbed=combined<=8?[clone(remainder)]:[];
  if(combined>8){Object.assign(remainder,from,{level:combined-8});overflowActor=remainder}
  else s.actors=s.actors.filter(v=>v!==remainder);
  ctx.events.push({type:'merge',id:body.id,x,y,level,overflow:result.overflow,fall,...(supportedGravity(s)?{absorbed}:{})});
 }
 const entered=body===a;
 Object.assign(body,{x,y,level});
 if(contactRules(s)){
  arrival(s,body,dx,dy,ctx,result,entered);
  if(overflowActor)arrival(s,overflowActor,-dx,-dy,ctx,result,entered);
 }else{
 if(gate)gate.open=true;
 if(exit){
  s.rescued+=body.level;s.rescuedBySpecies[body.species]=(s.rescuedBySpecies[body.species]||0)+body.level;
  s.actors=s.actors.filter(v=>v!==body);ctx.families.delete(body.id);result.rescued=body.level;
  ctx.events.push({type:'rescue',id:body.id,x,y,level:body.level});
 }else if(spike&&(!supportedGravity(s)||entered))split(s,body,spike,dx,dy,ctx,result);
 if(supportedGravity(s)&&overflowActor&&entered){const originSpike=at(s.spikes,from.x,from.y);if(originSpike)split(s,overflowActor,originSpike,-dx,-dy,ctx,{split:0,children:[]});}
 }
 if(fall)ctx.events.push({type:'fall',id:body.id,from:from.y,to:y,x});
 return result;
}
export function settle(s,ctx=context()){
 if(!s.gravity)return [];
 const start=ctx.events.length;
 // Legacy ledges remain versioned. New spikes never stop gravity.
 // Repeated physical state (including temporary family groups) is a cycle,
 // not a stable board. Never return a partially settled board.
 let changed=true;const seen=new Set();
 while(changed){
  if(supportedGravity(s)){
   const sorted=[...s.actors].sort((a,b)=>a.y-b.y||a.x-b.x),groups=new Map();
   const signature=JSON.stringify(sorted.map(a=>{const f=ctx.families.get(a.id);if(f!==undefined&&!groups.has(f))groups.set(f,groups.size+1);return [a.x,a.y,a.level,a.species,f===undefined?0:groups.get(f)]}));
   if(seen.has(signature))throw new Error('gravity-cycle');seen.add(signature);
  }
  changed=false;
  for(const snapshot of [...s.actors].sort((a,b)=>b.y-a.y||a.x-b.x||(a.id<b.id?-1:a.id>b.id?1:0))){
   const a=s.actors.find(v=>v.id===snapshot.id);if(!a||(!supportedGravity(s)&&at(s.spikes,a.x,a.y)))continue;
   // Fall eligibility is separate from terrain and split-child placement.
   // The default v2 policy has no capability-dependent gravity.
   if(ctx.policy?.canFall&&!ctx.policy.canFall(s,a))continue;
   if(enter(s,a,0,1,ctx,true).ok)changed=true;
  }
 }
 return ctx.events.slice(start);
}
// Versioned physics: omitted rule preserves published v2 boards.
export const supportedGravity=s=>s.gravityRules==='supported-v1';
export function supportsAt(s,x,y,a,excludeId=null){
 return terrainBlocks(s,a,x,y)||s.actors.some(v=>v.x===x&&v.y===y&&v.id!==excludeId)||(supportedGravity(s)&&!contactRules(s)&&s.exits.some(e=>e.x===x&&e.y===y&&!matchesCondition(a,e)));
}
export function canAscend(s,a,dx,dy){
 if(!s.gravity||dy>=0)return true;
 if(!supportedGravity(s))return !!(at(s.spikes,a.x,a.y)||supportsAt(s,a.x,a.y+1,a))&&!!(supportsAt(s,a.x-1,a.y,a)||supportsAt(s,a.x+1,a.y,a));
 // Grounded departure + real support below the destination. The moving actor
 // cannot support itself. Passability/contact remain enter()'s responsibility.
 return supportsAt(s,a.x,a.y+1,a,a.id)&&supportsAt(s,a.x+dx,a.y+dy+1,a,a.id);
}
export function move(s,id,dx,dy,policy={}){
 const a=s.actors.find(a=>a.id===id),reject=reason=>({ok:false,reason});
 if(!a||!Number.isInteger(dx)||!Number.isInteger(dy)||Math.max(Math.abs(dx),Math.abs(dy))!==1)return reject('step');
 if(!canAscend(s,a,dx,dy))return reject('foothold');
 return resolvedStep(s,a,dx,dy,policy,id,true);
}
const rollbackSnapshot=s=>supportedGravity(s)||contactRules(s)?{actors:s.actors.map(a=>({...a})),gates:s.gates.map(g=>({...g})),rescuedBySpecies:{...s.rescuedBySpecies},rescued:s.rescued,nextId:s.nextId,moves:s.moves}:null;
function resolvedStep(s,a,dx,dy,policy,activeId,countMove){
 const before=rollbackSnapshot(s),ctx=context(activeId,policy);
 try{const result=enter(s,a,dx,dy,ctx);if(!result.ok)return result;
  if(countMove)s.moves++;result.falls=settle(s,ctx);result.events=ctx.events;return result;
 }catch(error){if(before&&error.message==='gravity-cycle'){Object.assign(s,before);return {ok:false,reason:'gravity-cycle'}}throw error;}
}
export function totals(s){const result={...s.rescuedBySpecies};for(const a of s.actors)result[a.species]=(result[a.species]||0)+a.level;return result}
export function validState(stage,s){
 try{
  if(!s||s.id!==stage.id||s.w!==stage.w||s.h!==stage.h||s.occupiedSpikeMode!==stage.occupiedSpikeMode||s.gravityRules!==stage.gravityRules||s.movementRules!==stage.movementRules||s.terrainRules!==stage.terrainRules)return false;
  for(const key of ['rescued','moves'])if(!Number.isSafeInteger(s[key])||s[key]<0)return false;
  if(!Number.isSafeInteger(s.nextId)||s.nextId<1)return false;
  for(const key of ['walls','spikes','exits','gravity'])if(JSON.stringify(s[key])!==JSON.stringify(stage[key]))return false;
  if(s.gates.length!==stage.gates.length||s.gates.some((g,i)=>(g.open!==undefined&&typeof g.open!=='boolean')||JSON.stringify({...g,open:false})!==JSON.stringify({...stage.gates[i],open:false})))return false;
  const ids=new Set(),cells=new Set();
  for(const a of s.actors){const key=`${a.x},${a.y}`;
   const exit=at(s.exits,a.x,a.y);
   if(typeof a.id!=='string'||!a.id||ids.has(a.id)||cells.has(key)||!['dog','fish','penguin','frog'].includes(a.species)||!Number.isInteger(a.level)||a.level<1||a.level>8||!Number.isInteger(a.x)||!Number.isInteger(a.y)||wall(s,a.x,a.y)||(exit&&(!contactRules(s)||matchesCondition(a,exit)))||s.gates.some(g=>g.x===a.x&&g.y===a.y&&(!g.open||!gateAllows(s,a,a.x,a.y))))return false;
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
 return resolvedStep(s,a,dx,dy,policy,activeId,false);
}
export function externalSplit(s,id,power,dx=1,dy=0,policy={},activeId=id){
 const a=s.actors.find(a=>a.id===id);if(!a||!Number.isInteger(power)||power<1)return {ok:false,reason:'split'};
 const remaining=a.level-Math.min(a.level-1,power,splitCandidates(s,a.x,a.y,dx,dy,a,policy).length);
 if(!gateAllows(s,{...a,level:remaining},a.x,a.y))return {ok:false,reason:'gate',children:[]};
 const before=rollbackSnapshot(s),ctx=context(activeId,policy),result={ok:true,id,split:0,children:[]};
 try{split(s,a,{x:a.x,y:a.y,power},dx,dy,ctx,result);result.falls=settle(s,ctx);result.events=ctx.events;return result;}
 catch(error){if(before&&error.message==='gravity-cycle'){Object.assign(s,before);return {ok:false,reason:'gravity-cycle',children:[]}}throw error;}
}
