// MOBILITY_GAME=/path/to/released/game node compare-dog-policies.mjs > evidence/dog-policies.json
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {restoreEpisode, sx, sy} from './episode-scene.mjs';

const snapshot=JSON.parse(fs.readFileSync(new URL('./dog-episode.json',import.meta.url)));
const requests=snapshot.requests;
const firstClock=requests[0].clock;
const lastOwn=snapshot.motions.filter(m=>m.source==='ambient'&&!m.escape&&m.startClock<firstClock).at(-1);
const lastWalk=snapshot.motions.filter(m=>m.startClock<firstClock).at(-1);
const distance=(p,q)=>Math.hypot((p.x-q.x)*sx,(p.y-q.y)*sy);
const point=a=>({x:a.x,y:a.y});
const initialGoal={x:requests[0].goal[0],y:requests[0].goal[1]};
const round=n=>Math.round(n*1e6)/1e6;
const same=(a,b)=>distance(a,b)<1e-7;
const record=(r,result)=>({request:r.index,clock:round(r.clock),...result});

function restore(r){
  const t=restoreEpisode(r);
  // Accepted snapshots are post-command. We are about to issue that command.
  t.a.manualUntil=r.peers.find(p=>p[0]===r.key)[7];
  t.a.lastOwnWalk=lastOwn.startClock;t.a.lastWalk=lastWalk.startClock;
  t.startClock=r.clock;
  return t;
}

function run(t,goal,rawGoal,waypoints){
  const {a,model}=t;
  const start=point(a);
  let travel=0,firstStep=null;
  if(waypoints){
    // Diagnostic proposal only. Check each entire segment with the released
    // geometry, then hand the untouched native stepper the candidate route.
    if(!waypoints.every((q,i)=>model.probe.yieldLeg(a,i?waypoints[i-1]:a,q,new Map())))return null;
    a.target=waypoints[0];a.route=waypoints.slice(1);a.intentRoute=true;
    a.ambientEscape=false;a.source='ambient';a.activity='walk';
    a.lastWalk=model.probe.inspect().clock;
    if(distance(start,waypoints.at(-1))>=8-1e-7)a.lastOwnWalk=a.lastWalk;
  }else if(!model.move(a.key,goal,'ambient'))return null;
  const expected=point(waypoints?.at(-1)??a.route.at(-1)??a.target);
  const isEscape=!!a.ambientEscape;
  for(let i=0;i<400&&a.target;i++){
    const before=point(a);
    model.step(1/30,{autonomy:false});
    const step=distance(before,a);
    if(step>1e-7&&firstStep===null)firstStep=i/30;
    travel+=step;
  }
  if(firstStep===null)return null;
  assert.ok(!a.target,'400 integration steps were insufficient');
  // A regular (non-intent) walk considers a final gap below .5 model units
  // arrived. A contact veto may also occur after a real partial step.
  const arrived=same(a,expected)||!a.intentRoute&&!isEscape&&Math.hypot(a.x-expected.x,a.y-expected.y)<.5;
  const net=distance(start,a);
  return {firstStep:round(firstStep),endedAfter:round(model.probe.inspect().clock-t.startClock),arrived,travel:round(travel),net:round(net),
    gain:round(distance(start,rawGoal)-distance(a,rawGoal)),
    issuedGain:round(distance(start,goal)-distance(a,goal)),escape:isEscape,
    end:[round(a.x),round(a.y)]};
}

// Scan independently of goal angle so the same saved foot always has the same
// candidate set. Permit a brief side step, then require a net goal gain of .75px.
// Rank meaningful endpoints ahead of shorter ones, then gain and path length.
function waypoint(t){
  const {a,goal,model}=t,origin=point(a),safety=model.probe.yieldLeg,at=new Map();
  const startError=distance(origin,goal);
  let best=null;
  function consider(path){
    const end=path.at(-1),net=distance(origin,end),gain=startError-distance(end,goal);
    if(net<3-1e-7||gain<.75)return;
    const length=path.reduce((total,q,i)=>total+distance(i?path[i-1]:origin,q),0);
    if(length>24+1e-7||length>net*1.5+1e-7)return;
    const normal=net>=8-1e-7;
    if(!best||normal&&!best.normal||normal===best.normal&&
      (gain>best.gain+1e-7||Math.abs(gain-best.gain)<1e-7&&length<best.length))best={normal,gain,length,path};
  }
  function toward(p,r,i,n){
    const angle=2*Math.PI*i/n;
    return {x:p.x+r*Math.cos(angle)/sx,y:p.y+r*Math.sin(angle)/sy};
  }
  for(const r of [3,4,6,8,12,16,24])for(let i=0;i<48;i++){
    const q=toward(origin,r,i,48);
    if(!safety(a,origin,q,at))continue;
    consider([q]);
    if(r>8||distance(q,goal)>startError+3)continue;
    for(const d of [3,4,6,8,12,16])for(let j=0;j<24;j++){
      const z=toward(q,d,j,24);
      if(safety(a,q,z,at))consider([q,z]);
    }
  }
  return best?.path;
}

function nextDraw(seed,t){
  // Same x/y walk sampler and minimum horizontal offset as V9 idle(). A fresh
  // deterministic diagnostic stream per retry; the live mid-episode RNG is absent.
  const random=()=>{seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;return (seed>>>0)/4294967296;};
  const b=t.model.bounds(t.a),p={x:b.left+random()*(b.right-b.left),y:b.top+random()*(b.bottom-b.top)};
  if(Math.abs(p.x-t.a.x)<35)p.x=t.a.x<t.scene.width/2?b.right:b.left;
  return p;
}

const policies=new Map();
function append(name,r,result,extra={}){
  if(!policies.has(name))policies.set(name,[]);
  policies.get(name).push(record(r,{...extra,result}));
}

const redrawSeeds=[214,937,2026];
let original;
for(const r of requests){
  const current=restore(r),goal=current.goal;
  if(!r.early)original=goal;else assert.ok(same(goal,original));
  const direct=run(current,goal,goal);
  assert.equal(!!direct,r.accepted,`Direct replay differs from recorded request #${r.index}`);
  if(r.accepted)assert.ok(Math.abs(direct.travel-snapshot.summary.recoveryArrival.cssDistance)<1e-5);
  if(!r.early)append('keepAtNaturalDecisions',r,direct);
  append('keepAndRetryChangedPeers',r,direct);
  const trial=restore(r),candidate=waypoint(trial);
  let via=candidate?run(trial,goal,goal,candidate):null;
  if(via?.arrived){
    // The intermediate foot never replaces the raw intention. Try that exact
    // intention once from the arrival and measure any subsequent native steps.
    const start={x:r.from[0],y:r.from[1]};
    const onward=run(trial,goal,goal);
    if(onward){
      via={...via,endedAfter:onward.endedAfter,arrived:onward.arrived,
        travel:round(via.travel+onward.travel),net:round(distance(start,trial.a)),
        gain:round(distance(start,goal)-distance(trial.a,goal)),
        issuedGain:round(distance(start,goal)-distance(trial.a,goal)),
        escape:via.escape||onward.escape,end:onward.end,onward};
    }else via.onward=null;
  }
  const useVia=via&&(!direct||via.net>=8&&direct.net<8&&via.gain>=direct.gain||
    via.net>=direct.net&&via.gain>direct.gain+.75);
  append('checkedWaypointOnHeldGoal',r,useVia?via:direct,useVia?{waypoints:candidate.map(q=>[round(q.x),round(q.y)])}:{});
  for(const seed of redrawSeeds){
    // One replacement only after the original goal has been declined once and
    // failed again on a registered nearby change. At other times keep it.
    let result=direct,replacement=null;
    if(!direct&&r.early){
      const t=restore(r);
      replacement=nextDraw(seed^Math.imul(r.index+1,0x9e3779b1),t);
      result=run(t,replacement,goal);
    }
    append('oneRedrawAfterChangedPeerRetry'+seed,r,result,replacement?{replacement:[round(replacement.x),round(replacement.y)]}:{});
  }
  const fixed=restore(r);
  append('permanentFirstGoalSensitivity',r,run(fixed,initialGoal,initialGoal));
}

function summarize(rows){
  const starts=rows.filter(r=>r.result),normal=starts.filter(r=>r.result.net>=8-1e-6&&!r.result.escape&&r.result.arrived);
  function first(list){
    if(!list.length)return null;
    return {request:list[0].request,elapsed:round(list[0].clock-firstClock+list[0].result.firstStep)};
  }
  const redraws=rows.filter(r=>r.replacement);
  const hash=redraws.length?createHash('sha256').update(JSON.stringify(redraws.map(r=>[r.request,r.replacement]))).digest('hex'):null;
  return {snapshots:rows.length,redraws:redraws.length,replacementStarts:redraws.filter(r=>r.result).length,roundedRedrawStreamSHA256:hash,
    starts:starts.length,ownNormalAtLeast8:normal.length,
    rawGoalProgress:starts.filter(r=>r.result.gain>0).length,
    rawGoalLoss:starts.filter(r=>r.result.gain<0).length,
    firstStep:first(starts),firstNormalStep:first(normal),
    firstNormalArrival:normal.length?round(normal[0].clock-firstClock+normal[0].result.endedAfter):null,
    sumTravelAcrossIndependentPoses:round(starts.reduce((n,r)=>n+r.result.travel,0)),
    sumRawGoalGainAcrossIndependentPoses:round(starts.reduce((n,r)=>n+r.result.gain,0)),
    sumIssuedGoalGainAcrossIndependentPoses:round(starts.reduce((n,r)=>n+r.result.issuedGain,0)),
    successes:starts};
}
const results=Object.fromEntries([...policies].map(([key,rows])=>[key,summarize(rows)]));
console.log(JSON.stringify({
  source:snapshot.source.archiveSHA256,arm:snapshot.source.arm,seed:snapshot.source.seed,
  rawStart:firstClock,lastPoseElapsed:round(requests.at(-1).clock-firstClock),
  note:'Independent frozen-peer probes at recorded request times. Fresh poses after earlier success are counterfactual; their summed CSS travel/gain are not a continuous rollout. FirstStep uses the browser convention of recording the clock at the beginning of the first positive integration step. Temporary waypoints keep the original goal and retry it once after arrival. Only owner motion is evaluated; no helpers in these four policies. No event after last recorded pose is extrapolated. Redraw preserves elective decisions and uses one fresh V9 walk draw per eligible retry. All starts physically stepped.',
  results},null,2));
