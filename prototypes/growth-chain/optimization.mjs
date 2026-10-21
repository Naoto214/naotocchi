// Laboratory only: same engine; no UI imports or changed standard defaults.
import {standardRules} from './rules.mjs';
import {createSession,applyAction,placements,stateData,stateHash,spawnPose} from './session.mjs';
import {toolTransaction} from './live-tools.mjs';
import {createBag,draw} from './random.mjs';
import {publicView,itemActions,evaluate} from './policy.mjs';
import {chooseEggPolicy} from './egg-policy.mjs';
import {economyMetrics} from './egg-economy.mjs';
export function start(c,seed){
 const r=standardRules({kinds:c.kinds??5,width:c.width??6,gaugeUnit:c.gauge??8,bag:c.bag??'fourEach'});
 const s=createSession(seed,r,{eggs:c.eggs??[0,0,0,0]});
 // createSession's roster uses five selected species. Laboratory population
 // experiments deliberately draw all kinds and keep the common bag algorithm.
 if(r.kinds>5){s.bag=createBag(seed,r);s.queue=Array.from({length:4},()=>[draw(s.bag),draw(s.bag)]);}
 return s;
}
export const profiles=['ordinary','chain','cluster','reach','death','active','reserve','transform','bulk','lookahead'];
function value(s,p){
 if(s.over)return -1e8;
 let v=evaluate({...s,last:undefined}),high=[];
 const mult=p==='reach'?2:p==='cluster'?1.2:1;
 for(let y=2;y<s.board.length;y++)for(let x=0;x<s.rules.width;x++){
  const c=s.board[y][x];if(!c)continue;
  v+=mult*[0,0,0,1,4,10,25,65,105][c.s];
  if(c.s>=5)high.push({...c,x,y});
 }
 if(!['ordinary','chain','reach'].includes(p))for(let i=0;i<high.length;i++)for(let j=i+1;j<high.length;j++){
  const a=high[i],b=high[j],d=Math.abs(a.x-b.x)+Math.abs(a.y-b.y);
  if(a.s===b.s)v+=(a.s===8?400:120)/(1+d)*(a.k===b.k?1:.8);
  if(Math.abs(a.s-b.s)===1)v+=30/(1+d);
 }
 return v+s.gauge*.7+s.eggs.reduce((n,x,i)=>n+x*(i+2),0);
}
function rows(s,p,allowItems){
 const base=value(s,p),out=[];
 for(const a of [...placements(s),...(allowItems&&!['ordinary','chain'].includes(p)?itemActions(s):[])]){
  if(p==='bulk'&&a.type==='transform')continue;
  if(p==='transform'&&a.type==='bulk')continue;
  let z;try{z=a.type==='drop'?applyAction(s,a,false):toolTransaction(s,spawnPose(s.rules),a).state;}catch{continue;}const win=z.last.deaths>0;
  const bonus=win?1e7:z.last.waves.length*(p==='chain'?60:12)+z.last.created08*(p==='reach'?160:25);
  const v=value(z,p)+bonus;
  if(a.type!=='drop'&&!win&&(z.over||v<=base+3))continue;
  if(a.type==='egg'&&p==='reserve'&&s.eggs[a.rank]===1&&!win&&!z.last.created08&&z.last.waves.length<2)continue;
  out.push({a,z,v,bonus,win});
 }
 return out.sort((a,b)=>b.v-a.v);
}
export function choose(input,p,{allowItems=true,next=true}={}){
 if(p==='legacy')return chooseEggPolicy(input,'active',{allowItems});
 if(!profiles.includes(p))throw Error('Unknown profile');
 const s={...publicView(input),bag:createBag(0,input.rules)};
 const r=rows(s,p,allowItems);if(!r.length)return null;
 if(r[0].win||p!=='lookahead')return r[0].a;
 const beam=r.slice(0,3);
 for(const q of beam){
  if(q.z.over)continue;
  // NEXT-off never simulates an unknown pair: only follow-up tools are allowed
  // after a drop. NEXT-on consumes at most the first advertised NEXT pair.
  const follow=rows(q.z,p,allowItems).filter(x=>next||q.a.type!=='drop'||x.a.type!=='drop');
  if(follow.length)q.v=.25*q.v+.75*(q.bonus+follow[0].v);
 }
 return beam.sort((a,b)=>b.v-a.v)[0].a;
}
export function metrics(initial,actions){
 let s=structuredClone(initial),firstDeath=null,first08=null,firstTwo=null,created=0,max08=0,highArea=0,transClear=0,bulkClear=0;
 const initial08=s.board.flat().filter(c=>c?.s===8).length;
 let living=initial08;max08=living;if(living)first08=0;if(living>=2)firstTwo=0;
 for(let i=0;i<actions.length;i++){
  const before=s.board.flat().filter(Boolean).length;
  s=applyAction(s,actions[i],false);
  for(const w of s.last.waves){
   // Simultaneous events are a single wave. Count living 08 before removals,
   // so two 08 that die immediately cannot disappear from the denominator.
   const born=w.events.filter(e=>!e.death&&e.to===8).length;
   created+=born;living+=born;max08=Math.max(max08,living);
   if(living&&first08===null)first08=i+1;if(living>=2&&firstTwo===null)firstTwo=i+1;
   for(const e of w.events)if(e.death){living-=e.consumed.length;if(firstDeath===null)firstDeath=i+1;}
  }
  const clear=before-s.board.flat().filter(Boolean).length;
  if(actions[i].type==='transform')transClear+=clear;if(actions[i].type==='bulk')bulkClear+=clear;
  highArea+=s.board.flat().filter(c=>c?.s>=6).length;
 }
 const e=economyMetrics(initial,actions);
 return {...e,status:firstDeath!==null?'win':s.over?'gameover':'censored',initial08,first08Action:first08,two08:firstTwo!==null,firstTwoAction:firstTwo,max08,created,firstDeathAction:firstDeath,highArea,transClear,bulkClear,score:s.score,hash:stateHash(s),inputSteps:actions.reduce((n,a)=>n+(a.type==='drop'?a.path.length:a.type==='egg'?3:2),0)};
}
export function trial(c,seed,limit={drops:600,actions:4000}){
 let s=start(c,seed),initial=stateData(s),actions=[],streak=0,capHits=0;
 while(!s.over&&s.drops<limit.drops&&actions.length<limit.actions){
  if(streak===64)capHits++;
  const a=choose(s,c.policy,{allowItems:streak<64,next:c.next!==false});if(!a)throw Error('No action');
  s=applyAction(s,a,false);actions.push(a);streak=a.type==='drop'?0:streak+1;
  if(s.last.deaths)break;
 }
 return {condition:c,seed,initial,actions,hash:stateHash(s),metrics:metrics(initial,actions),capHits};
}
