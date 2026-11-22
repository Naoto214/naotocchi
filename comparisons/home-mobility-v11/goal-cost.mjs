// Run on quarantined snapshots, separating target generation from the unchanged path planner.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import {restoreEpisode,sx,sy} from '../home-mobility-v10/episode-scene.mjs';
const require=createRequire(import.meta.url);
const {patchGoals}=require('./goals.cjs');
const source=fs.readFileSync(path.join(process.env.MOBILITY_GAME,'home-production-model-mobility-v10-reference.js'),'utf8');
const data=JSON.parse(fs.readFileSync(new URL('../home-mobility-v10/dog-episode.json',import.meta.url)));
const patched=patchGoals(source).replace('bindMobility,sync,select,selected:',
  'chooseWanderGoal,bindMobility,sync,select,selected:');
const d=(p,q)=>Math.hypot((p.x-q.x)*sx,(p.y-q.y)*sy);
const round=n=>Math.round(n*1e5)/1e5;
function distribution(values){
  const v=[...values].sort((a,b)=>a-b);
  const q=n=>round(v[Math.min(v.length-1,Math.ceil(v.length*n)-1)]);
  return {n:v.length,medianMs:q(.5),p95Ms:q(.95),p99Ms:q(.99),maxMs:round(v.at(-1))};
}
const rejected=data.requests.filter(q=>!q.accepted);
const ownership=new Map(data.choices.map(([clock,key,choice])=>[clock,choice]));
const activity={},places={},projected=new Map();
let last='',changed=0,repeat=0,heldOff=0,infeasible=0,occupied=0;
const timings=[],cpuTimings=[];
for(const r of rejected){
  const t=restoreEpisode(r,patched);
  t.model.probe.setMissHistory(r.key,0,3);
  if(!r.early)last=ownership.get(r.clock);
  const terrain=t.scene.navigation.valid(t.goal), ref=t.model.bounds(t.a);
  const edge=Math.abs(t.goal.x-ref.left)<1e-6?'left':Math.abs(t.goal.x-ref.right)<1e-6?'right':'interior';
  const type=r.early?'retry':'initial';
  const cause=terrain?'occupied':'offTerrain';
  const name=[last,type,cause].join('/');
  activity[name]=(activity[name]||0)+1;
  const edgeRecorded=[edge,type,cause].join('/');
  places[edgeRecorded]=(places[edgeRecorded]||0)+1;
  if(r.early)repeat++;
  if(!terrain)heldOff++;
  if(terrain){
    assert.ok(r.nativeRefusal.goal.length>0);
    occupied++;
  }
  projected.set(r.goal.join(','),true);
  if(!(r.directions.reachable['8']||[]).length)infeasible++;
  t.model.chooseWanderGoal(t.a,t.goal);
  const cpu=process.cpuUsage();
  const begin=performance.now(),q=t.model.chooseWanderGoal(t.a,t.goal);
  timings.push(performance.now()-begin);
  const used=process.cpuUsage(cpu);cpuTimings.push((used.user+used.system)/1000);
  if(q!==t.goal)changed++;
}
function replay(actor,raw,version){
  const t=restoreEpisode(rejected[0],version==='V10'?source:patched);
  const a=t.model.probe.actors().find(b=>b.key===actor);
  t.model.probe.setMissHistory(a.key,0,3);
  a.manualUntil=0;
  const from={x:a.x,y:a.y},begin=performance.now();
  const issued=version==='V10'?raw:t.model.chooseWanderGoal(a,raw);
  const selected=performance.now();
  const ok=t.model.move(a.key,issued,'ambient'),planned=performance.now();
  const endpoint=a.route.at(-1)||a.target||null;
  let travel=0;
  for(let i=0;i<800&&a.target;i++){
    const before={x:a.x,y:a.y};t.model.step(1/30,{autonomy:false});
    travel+=d(before,a);
  }
  return {issued,accepted:ok,routeEndpoint:endpoint,end:{x:a.x,y:a.y},
    endpointReached:!!endpoint&&d(a,endpoint)<.8,nativeTravel:round(travel),net:round(d(from,a)),
    rawProgress:round(d(from,raw)-d(a,raw)),originalDistance:round(d(from,raw)),
    selectedDistance:round(d(from,issued)),selectMs:selected-begin,planMs:planned-selected};
}
const branches=[];
for(const [key,raw] of [['companion:punyu',{x:80.01451114931962,y:293.9443044968065}],['companion:chameleon',{x:79.88090708455347,y:294.1916778029314}],['companion:squirrel',{x:139.4698568706175,y:294.9967675963284}],['pet:dog',{x:rejected[0].goal[0],y:rejected[0].goal[1]}]]){
  for(const version of ['V10','V11']){
    const results=[];
    for(let i=0;i<7;i++)results.push(replay(key,raw,version));
    const {planMs,selectMs,...movement}=results[0];
    branches.push({key,version,raw,...movement,
      selector:distribution(results.slice(1).map(x=>x.selectMs)),
      nativePlanner:distribution(results.slice(1).map(x=>x.planMs))});
  }
}
assert.equal(rejected.length,77);assert.equal(infeasible,77);assert.equal(changed,0);assert.equal(occupied,11);
console.log(JSON.stringify({method:'78 saved owner snapshots. 77 prior denials classified with restored native visibility and bounds. One warm-up per foot; isolated target selector timing in Node. Four matched full-planner alternatives on the recorded household at first refusal, steering selected overlapping/invalid example points into native planner and physical stepper. Non-dog raw points are diagnostic inputs, not historical commands to these companions.',
  source:data.source.archiveSHA256,nativeSHA256:createHash('sha256').update(patched).digest('hex'),
  sourceSHA256:createHash('sha256').update(source).digest('hex'),rejected:rejected.length,
  distinctRequestedPoints:projected.size,repeat,offTerrain:heldOff,occupied,
  noSolo8Headings:infeasible,changedOriginals:changed,activity,places,
  refusalSelectorWall:distribution(timings),refusalSelectorProcessCPU:distribution(cpuTimings),matchedPlannerAndPhysicalArrivals:branches},null,2));
