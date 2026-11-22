// Measure the same real second of the archived dog blockage using four retry policies.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {restoreEpisode,sx,sy} from '../home-mobility-v10/episode-scene.mjs';
const require=createRequire(import.meta.url);
const {replaceExact}=require('../home-finish-v5/native-hooks.cjs');
const {patchGoals}=require('./goals.cjs');
const prior=new URL('../home-mobility-v10/',import.meta.url);
const read=file=>JSON.parse(fs.readFileSync(new URL(file,prior)));
const episode=read('dog-episode.json'), window=read('helper-window-742.json');
const old=episode.requests.find(r=>r.index===window.firstRetry);
const original=episode.requests.find(r=>r.index===window.originalRequest);
const game=process.env.MOBILITY_GAME;
const native=arm=>fs.readFileSync(path.join(game,'home-production-model-mobility-'+arm+'.js'),'utf8');
const v9=native('v9-seats'), v10=native('v10-reference');
const forwardGuard='if(after.length>2||after.some(b=>!b.available)||oldFeet.filter(blocks).length<=after.length)continue;';
const solo=replaceExact(v10,forwardGuard,'if(after.length || !oldFeet.some(blocks))continue;');
const waypoint=replaceExact(v10,
 'if(!openedGoalwardRay(a,w.point,w.feet,feet)){w.examined=feet;continue;}',
 'if(!localIntentRoute(a,w.point,bounds(a,scene),scene.planVisibility(a))){w.examined=feet;continue;}');
const point=p=>({x:p[0],y:p[1]});
const distance=(p,q)=>Math.hypot((q.x-p.x)*sx,(q.y-p.y)*sy);
const sourceHash=s=>createHash('sha256').update(s).digest('hex');
const precision=x=>Math.round(x*1e6)/1e6;
function trace(source){
  const base=replaceExact(source,'bindMobility,sync,select,selected:',
    'qa:{queue:(key,w)=>waiting.set(key,w),due:t=>nextRecovery=t},bindMobility,sync,select,selected:');
  return replaceExact(replaceExact(base,'result=r.search.next();',
    'globalThis.goalPolicyCounters.slices++;result=r.search.next();'),
    'function executeMove(key,p,source,{pointerDrop},mobilityRequest){',
    'function executeMove(key,p,source,{pointerDrop},mobilityRequest){globalThis.goalPolicyCounters.plans++;');
}
const oldState=restoreEpisode(old,v10);
const priorFeet=oldState.model.probe.nearbyFeet(oldState.a);
function replay(source,control){
  const fixed=window.pose, gate=window.careGate.clock, start=fixed.clock;
  const trial=restoreEpisode({...fixed,key:original.key,goal:original.goal},source);
  const {a,model,goal}=trial,cast=model.probe.actors();
  for(const actor of cast)Object.assign(actor,window.recordedAgesAndNextChoices[actor.key]);
  model.probe.setMissHistory(a.key,episode.summary.firstRefusalClock,3);
  const entry={point:goal,feet:control==='unchanged'?model.probe.nearbyFeet(a):priorFeet,
    expires:original.clock+12,attempted:true,retried:true};
  model.qa.queue(a.key,entry);model.qa.due(start-1e-7);
  const frames=window.frameIntervals.competingRetryToGate;
  const dt=(gate-start)/frames, origin={x:a.x,y:a.y};
  model.probe.setClock(start-dt);
  let first=null,atEight=null,travel=0,last=start-dt,arrivedAt=null;
  const helpers=new Set();
  globalThis.goalPolicyCounters={plans:0,slices:0};
  const cpu=process.cpuUsage();
  for(let i=0;i<=frames;i++){
    const current=start+dt*i, before={x:a.x,y:a.y};
    if(i===0 && control==='competitor')model.move(fixed.key,point(fixed.goal),'ambient');
    model.step(current-last);last=current;
    const step=distance(before,a);travel+=step;
    if(step>1e-7 && first===null)first=current;
    if(distance(origin,a)>=8-1e-7 && atEight===null)atEight=current;
    if(first!==null && !a.target && arrivedAt===null)arrivedAt=current;
    for(const b of cast)if(b.target && b.yieldFor===a.key)helpers.add(b.key);
  }
  const usage=process.cpuUsage(cpu);
  model.step(1/30,{blocked:true});
  assert.equal(a.target,null);
  return {firstFoot:first,atEight,arrivedAt,ownerNet:precision(distance(origin,a)),
    travel:precision(travel),rawGoalGain:precision(distance(origin,goal)-distance(a,goal)),
    helpers:[...helpers],reopened:!!entry.reopened,...globalThis.goalPolicyCounters,
    cpuMs:(usage.user+usage.system)/1000};
}
const arms=new Map([['ordinaryV9',v9],['boundedV10',v10],['soloCorridor',solo],
 ['checkedWaypoint',waypoint],['v11Final',patchGoals(v10)]]);
const cases=[];
for(const [policy,body] of arms){
  const s=trace(body);
  for(const control of ['opening','competitor','unchanged']){
    const warm=replay(s,control),measures=[];
    for(let i=0;i<5;i++){
      const got=replay(s,control);
      assert.equal(got.ownerNet,warm.ownerNet);
      measures.push(got.cpuMs);
    }
    const {cpuMs,...result}=warm;
    measures.sort((a,b)=>a-b);
    cases.push({policy,control,...result,cpuMedianMs:measures[2],cpuMinMs:measures[0],cpuMaxMs:measures.at(-1),sourceSHA:sourceHash(body)});
  }
}
const row=(policy,control)=>cases.find(c=>c.policy===policy&&c.control===control);
assert.equal(row('ordinaryV9','opening').ownerNet,0);
assert.equal(row('boundedV10','opening').ownerNet,8);
assert.equal(row('v11Final','opening').ownerNet,8);
console.log(JSON.stringify({archive:window.archiveSHA256,clock:window.pose.clock,careGate:window.careGate.clock,
  dt:(window.careGate.clock-window.pose.clock)/window.frameIntervals.competingRetryToGate,
  restoredRefs:[window.originalRequest,window.firstRetry,window.atRequest],
  method:'Each cell restores actual recorded feet, outstanding goal and previous retry at request 742 and steps to the recorded care gate. First service order is varied; global service phase was not recorded. CPU time covers the entire native simulated window, excluding setup; 5 post-warm repeats; not a browser frame estimate.',
  cases},null,2));
