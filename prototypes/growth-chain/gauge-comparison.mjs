// Laboratory comparison: reuse common engine, economy metrics and policy.
import {start,metrics} from './optimization.mjs';
import {chooseEggPolicy} from './egg-policy.mjs';
import {applyAction,stateData,stateHash} from './session.mjs';
export function burden(actions) {
 const logical={drop:0,egg:0,transform:0,bulk:0};
 let screenDiscrete=0,screenHold=0,downSteps=0,toolInputs=0,streak=0,maxTransformStreak=0;
 for(const a of actions){
  logical[a.type]++;
  streak=a.type==='transform'?streak+1:0;maxTransformStreak=Math.max(maxTransformStreak,streak);
  if(a.type==='drop'){
   let prev=null;
   for(const op of a.path){
    if(op==='down'){downSteps++;prev=null;continue;}
    screenDiscrete++;
    if(!(['left','right'].includes(op)&&prev===op))screenHold++;
    prev=op;
   }
  }else{screenDiscrete+=4;screenHold+=4;toolInputs+=4;}
 }
 return {logical,screenDiscrete,screenHold,downSteps,toolInputs,maxTransformStreak};
}
export function contributions(initial,actions){
 let s=structuredClone(initial);const out={winTrigger:null};
 for(const type of ['drop','egg','transform','bulk'])out[type]={actions:0,growth:0,eggs:0,created08:0,deathGroups:0,chainActions:0,secondaryGroups:0,maxChain:0};
 for(const a of actions){s=applyAction(s,a,false);const c=out[a.type];c.actions++;c.growth+=s.last.gauge;c.eggs+=s.last.eggs.reduce((a,b)=>a+b,0);c.created08+=s.last.created08;c.maxChain=Math.max(c.maxChain,s.last.waves.length);if(s.last.waves.length>=2)c.chainActions++;
  s.last.waves.forEach((w,i)=>{if(i>0)c.secondaryGroups+=w.events.length;for(const e of w.events)if(e.death){c.deathGroups++;out.winTrigger??=a.type;}});
 }
 return out;
}
export function runTrial(condition,seed,limits={drops:600,actions:4000}){
 let s=start(condition,seed),initial=stateData(s),actions=[],streak=0,capHits=0;
 while(!s.over&&s.drops<limits.drops&&actions.length<limits.actions){
  if(streak===64)capHits++;
  const a=chooseEggPolicy(s,'active',{...condition.options,allowItems:streak<64});
  if(!a)throw Error('No action');s=applyAction(s,a,false);actions.push(a);streak=a.type==='drop'?0:streak+1;if(s.last.deaths)break;
 }
 return {condition,seed,initial,actions,hash:stateHash(s),metrics:metrics(initial,actions),capHits};
}
export function selectPolicy(rows){
 return [...rows].sort((a,b)=>b.wins-a.wins||a.transforms-b.transforms||a.screenInputs-b.screenInputs||a.id.localeCompare(b.id))[0].id;
}
