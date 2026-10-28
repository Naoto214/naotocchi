import fs from 'node:fs';
import {createGame,dispatch,cpuAction,rank} from '../../prototypes/life-sugoroku/engine.mjs';
import {EVENTS,ITEMS} from '../../prototypes/life-sugoroku/data.mjs';
const count=Number(process.argv[2]||100),out=process.argv[3],rounds=Number(process.argv[4]||15),miniEvery=Number(process.argv[5]||2),rewind=process.argv[6]!=='off';
const data=[],events=Object.fromEntries(EVENTS.map(e=>[e.id,0])),purchases={},uses={},routes={};let tied=0,comeback=0,rewindDelta=[],clockUsers=0;
for(let seed=1;seed<=count;seed++){
 let s=createGame({seed,rounds,miniEvery,rewind,players:Array.from({length:4},(_,id)=>({human:false,character:{id:'dog',label:'いぬ'},difficulty:(seed+id)%4<2?'normal':'easy'}))}),steps=0,late;
 while(s.phase!=='done'){
  if(s.round===rounds-2&&s.active===0&&s.phase==='turn')late=rank(s).filter(p=>p.rank===1).map(p=>p.id);
  const policy=process.argv[6]==='mixed'?{...s,rewind:(seed+s.active)%2===0}:s;s=dispatch(s,cpuAction(policy));if(++steps>4000)throw Error('stuck '+seed);
  for(const p of s.players)if(p.stage<1||p.stage>8||p.sodachi<0||p.sodachi>100||p.money<0||p.items.length>3)throw Error('bounds '+seed);
 }
 const ranks=rank(s);tied+=ranks.some((p,i)=>i&&p.rank===ranks[i-1].rank)?1:0;comeback+=ranks.some(p=>p.rank===1&&!late?.includes(p.id))?1:0;
 for(const p of ranks){
  const mini=p.history.filter(h=>h.type==='mini').reduce((n,h)=>n+h.delta.sodachi,0);
  data.push({clockPolicy:process.argv[6]==='mixed'?(seed+p.id)%2===0:rewind,seed,seat:p.id,difficulty:p.difficulty,sodachi:p.sodachi,money:p.money,stage:p.stage,rank:p.rank,mini});
  for(const h of p.history){if(h.type==='event')events[h.eventId]++;if(h.type==='rewind')rewindDelta.push(p.sodachi-h.sodachi);}
  if(p.uses.clock)clockUsers++;
  for(const [k,v]of Object.entries(p.purchases))purchases[k]=(purchases[k]||0)+v;
  for(const [k,v]of Object.entries(p.uses))uses[k]=(uses[k]||0)+v;
  for(const r of p.routes){const k=r.region+'/'+r.branch;routes[k]??={visits:0,winners:0};routes[k].visits++;routes[k].winners+=p.rank===1?1:0;}
 }
}
const mean=a=>a.reduce((n,v)=>n+v,0)/Math.max(1,a.length),dist=a=>{a.sort((x,y)=>x-y);return{mean:mean(a),min:a[0],p10:a[Math.floor(a.length*.1)],median:a[Math.floor(a.length*.5)],p90:a[Math.floor(a.length*.9)],max:a.at(-1)}};
const report={count,rounds,miniEvery,rewind,seedRange:[1,count],sodachi:dist(data.map(p=>p.sodachi)),money:dist(data.map(p=>p.money)),capRate:data.filter(p=>p.sodachi===100).length/data.length,stage8Rate:data.filter(p=>p.stage===8).length/data.length,stageDistribution:Object.fromEntries(Array.from({length:8},(_,i)=>[i+1,data.filter(p=>p.stage===i+1).length])),tieMatchRate:tied/count,lateComebackRate:comeback/count,clockUserRate:clockUsers/data.length,postRewindSodachiChange:dist(rewindDelta),purchases,uses,routes,events,seatWinRate:[0,1,2,3].map(id=>data.filter(p=>p.seat===id&&p.rank===1).length/count),clockPolicyWinRate:Object.fromEntries([true,false].map(policy=>[policy,data.filter(p=>p.clockPolicy===policy&&p.rank===1).length/Math.max(1,data.filter(p=>p.clockPolicy===policy).length)])),difficultyWinRate:Object.fromEntries(['easy','normal'].map(d=>[d,data.filter(p=>p.difficulty===d&&p.rank===1).length/data.filter(p=>p.difficulty===d).length])),miniScoreContribution:dist(data.map(p=>p.mini)),noMiniWinnerChangeRate:Array.from({length:count},(_,i)=>{const a=data.filter(p=>p.seed===i+1),max=Math.max(...a.map(p=>p.sodachi-p.mini));return a.some(p=>p.rank===1&&p.sodachi-p.mini<max)?1:0}).reduce((a,b)=>a+b,0)/count};
if(out)fs.writeFileSync(out,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
