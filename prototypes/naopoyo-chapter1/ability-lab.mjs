// Experimental adapter ONLY. No chapter module imports this. The v2 validator
// currently accepts four species, so a single-family lab uses dog as its internal
// numeric carrier; official family art and capability are resolved separately.
import {clone,move,externalMove,settle,at} from '../naopoyo-v2/engine.mjs';
export function capability(family,level){const start={butterfly:6,cicada:6,beetle:5,stagbeetle:5,antlion:6}[family];if(start&&level>=start)return 'fly';if((['butterfly','antlion'].includes(family)&&[4,5].includes(level))||(['beetle','stagbeetle'].includes(family)&&level===4))return 'pupa';return 'ground'}
export function labStage(family='butterfly',pupa='free'){const threshold=family==='beetle'?5:6;return {id:'ability-lab',family,pupa,w:8,h:8,gravity:true,actors:[{id:'a',x:1,y:6,level:threshold-1,species:'dog'},{id:'b',x:2,y:6,level:1,species:'dog'}],walls:[...Array.from({length:8},(_,x)=>[x,7]),...Array.from({length:7},(_,y)=>[5,y]).filter(p=>p[1]!==2)],gates:[{x:5,y:2,exact:threshold}],spikes:[{x:4,y:3,power:3}],exits:[{x:7,y:2,exact:threshold}],water:[],guests:[],events:[]}}
export function step(s,id,dx,dy){const a=s.actors.find(a=>a.id===id);if(!a)return {ok:false,reason:'actor'};const cap=capability(s.family,a.level);if(cap==='pupa'&&s.pupa==='horizontal'&&dy!==0)return {ok:false,reason:'pupa-horizontal'};
 // Ask the shared engine to adjudicate footholds before changing the gravity
 // phase. Terrain denial ensures this preflight cannot mutate the original.
 if(cap!=='fly'){const check=move(clone(s),id,dx,dy,{canEnter:()=>false});if(check.reason==='foothold'||check.reason==='step')return check;}
 const gravity=s.gravity;let r;s.gravity=false;try{r=externalMove(s,id,dx,dy)}finally{s.gravity=gravity}if(!r.ok)return r;
 // Preserve the shared cascade's transient split-family and once-per-spike
 // rules across the deliberately separate capability-aware settle phase.
 const body=s.actors.find(a=>a.id===id),spike=body&&at(s.spikes,body.x,body.y),families=new Map();
 if(r.children.length){families.set(id,1);for(const child of r.children)families.set(child.id,1)}
 const ctx={activeId:id,policy:{canEnter:(_s,a)=>capability(s.family,a.level)!=='fly'},fired:new Set(spike?[spike.x+','+spike.y]:[]),families,family:1,events:r.events||[]};
 r.falls=settle(s,ctx);r.events=ctx.events;s.moves++;return r;
}
