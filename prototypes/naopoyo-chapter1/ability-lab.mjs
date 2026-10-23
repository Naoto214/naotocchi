// Independent comparison only. Chapter runtime never imports this adapter.
// Numeric species remains dog; family selects official art and capability.
import {clone,move,externalMove,externalSplit,settle,at} from '../naopoyo-v2/engine.mjs';
export const FLIGHT_START=Object.freeze({butterfly:6,cicada:6,beetle:5,stagbeetle:5});
export function capability(family,level){
 const start=FLIGHT_START[family]||(family==='antlion'?6:null);
 if(start&&level>=start)return 'fly';
 if((['butterfly','antlion'].includes(family)&&[4,5].includes(level))||(['beetle','stagbeetle'].includes(family)&&level===4))return 'pupa';
 return 'ground';
}
export function labStage(family='butterfly',pupa='free'){
 const threshold=FLIGHT_START[family]||6;
 return {id:'ability-lab',family,pupa,w:8,h:8,gravity:true,actors:[{id:'a',x:1,y:6,level:threshold-1,species:'dog'},{id:'b',x:2,y:6,level:1,species:'dog'}],walls:[...Array.from({length:8},(_,x)=>[x,7]),...Array.from({length:7},(_,y)=>[5,y]).filter(p=>p[1]!==2)],gates:[{x:5,y:2,exact:threshold}],spikes:[{x:4,y:3,power:3}],exits:[{x:7,y:2,exact:threshold}],water:[],guests:[],events:[]};
}
const terrain={canEnter:(s,a,x,y)=>
 !s.guests?.some(g=>g.x===x&&g.y===y)&&
 (!(s.water||[]).some(p=>p[0]===x&&p[1]===y)||(s.aquatic||['fish']).includes(a.species))};
function event(s,id,action){
 const gravity=s.gravity;let r;
 s.gravity=false;try{r=action()}finally{s.gravity=gravity}
 if(!r.ok)return r;
 const body=s.actors.find(a=>a.id===id),spike=body&&at(s.spikes,body.x,body.y),families=new Map();
 if(r.children.length){families.set(id,1);for(const child of r.children)families.set(child.id,1)}
 const ctx={activeId:id,policy:{...terrain,canFall:(_s,a)=>capability(s.family,a.level)!=='fly'},fired:new Set(spike?[spike.x+','+spike.y]:[]),families,family:1,events:r.events||[]};
 r.falls=settle(s,ctx);r.events=ctx.events;s.moves++;return r;
}
export function step(s,id,dx,dy){
 const a=s.actors.find(a=>a.id===id);if(!a)return {ok:false,reason:'actor'};
 const cap=capability(s.family,a.level);
 if(cap==='pupa'&&s.pupa==='horizontal'&&dy!==0)return {ok:false,reason:'pupa-horizontal'};
 if(cap!=='fly'){
  const check=move(clone(s),id,dx,dy,{canEnter:()=>false});
  if(check.reason==='foothold'||check.reason==='step')return check;
 }
 return event(s,id,()=>externalMove(s,id,dx,dy,terrain));
}
// Future light effects: reproduce unsupported flight loss without enabling it
// in Chapter 1 or adding a flight activation button.
export function splitInLab(s,id,power,dx=1,dy=0){
 return event(s,id,()=>externalSplit(s,id,power,dx,dy,terrain));
}
