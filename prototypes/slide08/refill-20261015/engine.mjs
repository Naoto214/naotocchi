// Experimental wrapper: original engine and certificates remain unchanged.
import * as base from '../engine.mjs';
export const EDITION='slide-refill-v1';
export const PROFILES=Object.freeze({E:{mode:'none'},A:{mode:'random'},B:{mode:'edge'},
 ...Object.fromEntries([8,12,16].flatMap(threshold=>[threshold,threshold+4].map(target=>[`C${threshold}-${target}`,{mode:'density',threshold,target}]))),
 D0:{mode:'egg',reserve:0},D1:{mode:'egg',reserve:1}});
export const GAUGES=['current','cost4','half','slide-only','slide-bonus','cooldown'];
export function create(seed,profile='E',gauge='current'){
 if(!PROFILES[profile]||!GAUGES.includes(gauge))throw Error('Unknown comparison setting');
 return {...base.create(seed,{size:6,count:30,kinds:3,single:gauge==='cost4'?4:2,bulk:gauge==='cost4'?12:6}),lab:{edition:EDITION,profile,gauge,cursor:0,queue:[0,0,0,0],cooldown:0}};
}
export function validate(s){
 base.validate(s);const m=s.lab;
 if(!m||m.edition!==EDITION||!PROFILES[m.profile]||!GAUGES.includes(m.gauge)||!Number.isSafeInteger(m.cursor)||m.cursor<0||!Number.isInteger(m.cooldown)||m.cooldown<0||m.cooldown>3||!Array.isArray(m.queue)||m.queue.length!==4||m.queue.some(v=>!Number.isSafeInteger(v)||v<0))throw Error('Invalid refill state');
 return true;
}
export const key=s=>base.key(s)+'|'+JSON.stringify(s.lab);
// Counter-based stream, independent from initialization and search traversal.
// Same seed + ordinal => same stage/kind/position quantile for both players.
export function nextSupply(s,offset=0){
 const random=base.rng((s.seed ^ 0xa4c1972b ^ Math.imul(s.lab.cursor+offset+1,0x9e3779b1))>>>0);
 return {stage:random()<0.9?1:2,kind:Math.floor(random()*s.config.kinds),position:random()};
}
export function step(s,a){
 if(a?.type==='bulk'&&s.lab.cooldown)return {valid:false,state:s,waves:[],spawns:[]};
 const r=base.step(s,a);if(!r.valid)return {...r,spawns:[]};
 const t=r.state,m=t.lab={...s.lab,queue:[...s.lab.queue]},p=PROFILES[m.profile];
 const cost=a.type==='single'?s.config.single:a.type==='bulk'?s.config.bulk:0;
 let gain=r.waves.flatMap(w=>w.events).reduce((v,e)=>v+(e.death?0:e.to-e.from),0);
 if(m.gauge==='half')gain=Math.floor(gain/2);
 if(m.gauge==='slide-only'&&a.type!=='slide')gain=0;
 if(m.gauge==='slide-bonus')gain=a.type==='slide'?gain+(gain>0?1:0):0;
 t.gauge=Math.min(s.config.cap,s.gauge-cost+gain);
 if(m.gauge==='cooldown')m.cooldown=a.type==='bulk'?3:a.type==='slide'?Math.max(0,m.cooldown-1):m.cooldown;
 if(p.mode==='egg'){
  // Only newly earned eggs enter the automatic queue; initial inventory stays manual.
  for(let rank=0;rank<4;rank++){
   const prior=s.eggs[rank]-(a.type==='egg'&&a.rank===rank?1:0);
   const earned=t.eggs[rank]-prior;
   const keep=Math.min(earned,Math.max(0,p.reserve-prior));
   m.queue[rank]+=earned-keep;t.eggs[rank]-=earned-keep;
  }
 }
 const spawns=[];
 if(a.type==='slide'&&!t.won){
  let spaces=t.board.flatMap((v,i)=>v?[]:[i]);
  const count=t.board.length-spaces.length;
  let amount=p.mode==='random'||p.mode==='edge'?1:p.mode==='density'&&count<=p.threshold?p.target-count:p.mode==='egg'?Math.min(2,m.queue.reduce((v,n)=>v+n,0)):0;
  if(p.mode==='edge')spaces=base.lines(s.config.size,a.dir).map(line=>line.at(-1)).filter(i=>!t.board[i]);
  amount=Math.min(amount,spaces.length);
  for(let j=0;j<amount;j++){
   const item=nextSupply(t),rank=p.mode==='egg'?m.queue.findIndex(n=>n>0):null;
   const pick=Math.floor(item.position*spaces.length),index=spaces.splice(pick,1)[0];
   const stage=rank===null?item.stage:rank+1;
   t.board[index]=item.kind*8+stage;
   if(rank!==null)m.queue[rank]--;
   spawns.push({ordinal:m.cursor,index,kind:item.kind,stage,rank});m.cursor++;
  }
 }
 // No resolution after replenishment. Its joins resolve only on a later player action.
 return {...r,spawns};
}
export function* candidates(s){for(const a of base.candidates(s))if(!(a.type==='bulk'&&s.lab.cooldown))yield a;}
export const adapter={step,key,validate,candidates};
export {stage,kind,landing} from '../engine.mjs';
