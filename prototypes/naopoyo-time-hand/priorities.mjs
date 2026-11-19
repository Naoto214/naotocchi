// D is isolated; A/B/C dispatch remains the exact PR492 implementation.
import {cornerBlocked} from '../naopoyo-v2/engine.mjs';
import {candidateDetails as abcDetails,experimentCandidates as abcCandidates,blockedReason,compass} from '../naopoyo-split-priority/priorities.mjs';
export {compass,headingNames,blockedReason} from '../naopoyo-split-priority/priorities.mjs';
export const clockwise=([x,y])=>[-y,x]; // Screen coordinates: north -> east.
export function timeHandTrace(s,x,y,dx,dy,actor=null,policy={},options=s.timeHand||{}){
 const candidates=[],attempts=[],path=[[x,y]],visited=new Set(),traversed=new Set();
 if(!compass.some(v=>v[0]===dx&&v[1]===dy))return {candidates,attempts,path,stop:'direction'};
 const maxSteps=[2,3,7].includes(options.maxSteps)?options.maxSteps:7;
 const reset=options.resetHeading===true,pass=options.passGenerated===true;
 const virtual={...s,actors:[...s.actors]},origin=`${x},${y}`,back=[-dx,-dy];let direction=back,from=[x,y],steps=0,stop='limit';
 // Repeated position/heading/generated-count proves a traversal cycle. Hard bound
 // additionally limits the nonrecommended pass-through comparison.
 for(let guard=0;guard<256&&candidates.length<7&&steps<maxSteps;guard++){
  if(reset)direction=back;
  const signature=[...from,...direction,candidates.length].join(',');
  if(traversed.has(signature)){stop='cycle';break;}traversed.add(signature);
  let accepted=false;
  for(let turns=0;turns<4;turns++){
   const [vx,vy]=direction,to=[from[0]+vx,from[1]+vy],key=to.join(','),generated=visited.has(key);
   let reason=key===origin?'本体':generated&&!pass?'生成済みの1':blockedReason(virtual,...to);
   if(generated&&pass)reason=null;
   if(!reason&&cornerBlocked(virtual,...from,vx,vy,actor?{...actor,level:1}:null))reason='角抜け';
   if(!reason&&actor&&policy.canEnter&&!policy.canEnter(virtual,actor,...to))reason='進入条件';
   attempts.push({from:[...from],to,direction:[...direction],turns,reason,pass:generated&&pass});
   if(reason){direction=clockwise(direction);continue;}
   accepted=true;steps++;path.push(to);
   if(!generated){
    const order=candidates.length+1;
    candidates.push({x:to[0],y:to[1],from:[...from],direction:[...direction],turns,order,distance:steps,ring:Math.max(Math.abs(to[0]-x),Math.abs(to[1]-y)),path:path.map(v=>[...v])});
    visited.add(key);virtual.actors.push({id:`time-hand-${order}`,species:actor?.species||'dog',level:1,x:to[0],y:to[1]});
   }
   from=to;break;
  }
  if(!accepted){stop='blocked';break;}
 }
 return {candidates,attempts,path,stop,steps,maxSteps,options:{resetHeading:reset,passGenerated:pass,maxSteps}};
}
export function candidateDetails(s,x,y,dx,dy,actor=null,policy={},mode='A'){
 return mode==='D'?timeHandTrace(s,x,y,dx,dy,actor,policy).candidates:abcDetails(s,x,y,dx,dy,actor,policy,mode);
}
export function experimentCandidates(s,x,y,dx,dy,actor=null,policy={}){
 return s.splitPriority==='D'?candidateDetails(s,x,y,dx,dy,actor,policy,'D').map(({x,y,distance})=>({x,y,distance})):abcCandidates(s,x,y,dx,dy,actor,policy);
}
