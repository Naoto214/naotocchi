import fs from 'node:fs';
import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {restoreEpisode,source,sx,sy} from './episode-scene.mjs';
// MOBILITY_GAME=/path/to/released/game node compare-helper-window.mjs [candidate-transformer.cjs [--require-history-controls]]
const require=createRequire(import.meta.url);
const read=name=>JSON.parse(fs.readFileSync(new URL(name,import.meta.url)));
const h=read('./helper-window-742.json'),episode=read('./dog-episode.json');
const old=episode.requests.find(r=>r.index===h.firstRetry);
const dog=episode.requests.find(r=>r.index===h.originalRequest);
const early=h.lastOpeningMove,fixed=h.pose,gate=h.careGate.clock,dt=1/30;
const preFrames=h.frameIntervals.openingToCompetingRetry,gateFrames=h.frameIntervals.competingRetryToGate;
assert.deepEqual(old.goal,dog.goal);assert.equal(h.motionsInWindow.length,0);
const digest=s=>createHash('sha256').update(s).digest('hex');
const pt=v=>({x:v[0],y:v[1]}),pos=a=>({x:a.x,y:a.y}),dist=(a,b)=>Math.hypot((a.x-b.x)*sx,(a.y-b.y)*sy),rd=x=>Math.round(x*100000)/100000,g=pt(dog.goal);
function qa(s){
 return s.replace('bindMobility,sync,select,selected:',`win:{feet:nearbyFeet,queue:(k,w)=>waiting.set(k,w),slot:t=>nextRecovery=t},bindMobility,sync,select,selected:`).replace('      stepRelief(flags);','      if(actors[0].onQA)actors[0].onQA();stepRelief(flags);');
}
function getFeet(r){const t=restoreEpisode(r,qa(source));return t.model.win.feet(t.a);}
const footprint=getFeet(old),hedgeFoot=getFeet(h.previousHedgehog);
const queue=(r,f,used)=>({point:pt(r.goal),feet:f,expires:r.clock+12,retried:used,attempted:true});
// Isolate the final candidate's bounded same-goal retry in this diagnostic.
// Every helper leg, native scheduling and collision/terrain veto uses released V9.
function replaceOnce(s,before,after){
  assert.equal(s.split(before).length,2);return s.replace(before,after);
}
const opening=`function openedGoalwardRay(a,goal,oldFeet,now) {
  const nav=scene.navigation,s=nav.intentScale,box=bounds(a,scene);
  const distance=p=>Math.hypot((p.x-goal.x)*s.x,(p.y-goal.y)*s.y);
  const start=distance(a);if(start<8)return false;
  const shapes=new Map(actors.map(b=>[b.key,[(a.w+b.w)*.5+10,(a.h+b.h)*.38+10]]));
  let ink=null;
  for(let i=0;i<48;i++){
    const angle=i*Math.PI/24,q={x:a.x+8*Math.cos(angle)/s.x,y:a.y+8*Math.sin(angle)/s.y};
    if(q.x<box.left||q.x>box.right||q.y<box.top||q.y>box.bottom||start-distance(q)<.75)continue;
    function blocks(b){const z=shapes.get(b.key);return z&&!contactSegmentSafe(a,q,b,z[0],z[1]);}
    const after=now.filter(blocks);
    if(after.length>2||after.some(b=>!b.available)||oldFeet.filter(blocks).length<=after.length)continue;
    ink??=scene.planVisibility?.(a)||(p=>visible(a,p));
    if(nav.segmentSafe(a,q,ink))return true;
  }
  return false;
}
`;
function guardedOnly(source){
 let s=source;
 s=replaceOnce(s,'function clearRelief() {',opening+'function clearRelief() {');
 s=replaceOnce(s,'    if(w.retried||flags.heldActor===key||!differentFeet(w.feet,nearbyFeet(a),scene.navigation.intentScale,clock-a.lastWalk>=70))continue;',`    if(flags.heldActor===key)continue;
    const feet=nearbyFeet(a),scale=scene.navigation.intentScale;
    if(w.retried){
      if(w.reopened||clock-(a.lastOwnWalk??a.lastWalk)<70||!differentFeet(w.examined||w.feet,feet,scale,false))continue;
      if(!openedGoalwardRay(a,w.point,w.feet,feet)){w.examined=feet;continue;}
    }else if(!differentFeet(w.feet,feet,scale,clock-a.lastWalk>=70))continue;`);
 s=replaceOnce(s,'    w.retried=true;w.attempted=false;w.feet=nearbyFeet(a);earlyKey=key;',`    if(w.retried)w.reopened=true;
    w.retried=true;w.attempted=false;w.feet=feet;earlyKey=key;`);
 return s;
}

const arms=[['V9',source],['guardedRetryOnly',guardedOnly(source)]];
if(process.argv[2])arms.push(['suppliedCandidate',require(path.resolve(process.argv[2])).patchMovement(source)]);
const results=[];
const controls=['recentMisses','twoMisses','expired','held'];
const sampled=['bothWaiting','hedgehogFirst','hedgehogAtRecordedTime','unchangedControl'];
const missHistoryStart=episode.summary.firstRefusalClock;
const separateRejections=episode.requests.filter(row=>!row.early&&!row.accepted&&row.clock<=fixed.clock).length;
assert.ok(separateRejections>=3&&fixed.clock-missHistoryStart>70);
for(const [arm,s] of arms)for(const scn of [...sampled,...(arm==='suppliedCandidate'?controls:[])])for(const i of [6,7,8,9,10,11,12,13,'at742']){
 if((scn==='unchangedControl'||controls.includes(scn))&&i!=='at742')continue;
 const e=i!=='at742',row=e?early:fixed,start=row.clock,service=e?start+(fixed.clock-early.clock)*i/preFrames:start;
 const t=restoreEpisode({...row,key:dog.key,goal:dog.goal},qa(s)),a=t.a,m=t.model,cast=m.probe.actors(),origin=pos(a),win=m.win;
 // Since its last own step this dog really had at least three separate ordinary
 // refusals, starting at 174.9097. The model saturates its counter at three.
 m.probe.setMissHistory(a.key,scn==='recentMisses'?start-10:missHistoryStart,scn==='twoMisses'?2:3);
 for(const b of cast)Object.assign(b,h.recordedAgesAndNextChoices[b.key]);const b=cast.find(b=>b.key===early.key);
 if(e){const q=early.peers.find(v=>v[0]===b.key);Object.assign(b,{manualUntil:q[7],target:pt(early.target),route:early.route.map(pt),source:early.source,intentRoute:early.intentRoute,ambientEscape:early.escape,activity:'walk'});}
 const w=queue(dog,scn==='unchangedControl'?win.feet(a):footprint,true);
 if(scn==='expired')w.expires=start-.001;
 win.queue(a.key,w);
 if(scn==='bothWaiting'||scn==='unchangedControl'||controls.includes(scn))win.queue(fixed.key,queue(h.previousHedgehog,hedgeFoot,false));
 win.slot(service-1e-7);
 const initialDt=e?(fixed.clock-early.clock)/preFrames:(gate-start)/gateFrames;
 m.probe.setClock(start-initialDt);let tFirst,t8,tEnd,tRetry,active,steps={},goals={},ends={},hedge=false;
 const pre=e?preFrames:0,frames=pre+gateFrames+1;let last=start-initialDt;
 for(let n=0;n<frames;n++){
   const now=n<pre?early.clock+(fixed.clock-early.clock)*n/preFrames:fixed.clock+(gate-fixed.clock)*(n-pre)/gateFrames;
   if((scn==='hedgehogFirst'||scn==='hedgehogAtRecordedTime')&&!hedge&&now>=(scn==='hedgehogFirst'?service:fixed.clock)-1e-5){hedge=true;a.onQA=()=>{delete a.onQA;m.move(fixed.key,pt(fixed.goal),'ambient');};}
   const before=cast.map(pos);m.step(now-last,scn==='held'?{heldActor:a.key}:{});last=now;
   const at=rd(now-fixed.clock);
   if(w.reopened&&tRetry===undefined)tRetry=at;
   for(let j=0;j<cast.length;j++){
     const it=cast[j];if(it.target)goals[it.key]=pos(it.route?.at(-1)||it.target);
     if(dist(before[j],it)>1e-7&&steps[it.key]===undefined)steps[it.key]=at;
     if(steps[it.key]!==undefined&&!it.target&&!Object.hasOwn(ends,it.key))ends[it.key]=at;
   }
   const net=dist(origin,a);if(tFirst===undefined&&net>1e-7)tFirst=at;
   if(t8===undefined&&net>=8-1e-7)t8=at;if(tEnd===undefined&&net>0&&!a.target)tEnd=at;
 }
 const atGate={net:rd(dist(origin,a)),gain:rd(dist(origin,g)-dist(a,g)),tFirst,t8,tEnd,tRetry,steps,ends,dogTarget:!!a.target};
 m.step(dt,{blocked:true});
 assert.ok(!a.target&&Math.abs(m.probe.inspect().clock-gate)<1e-6);
 const result={arm,scenario:scn,serviceFrame:i,serviceRelativeTo742:rd(service-fixed.clock),
   ...atGate,cancelled:!a.target};
 if(arm==='V9'||scn==='unchangedControl'||scn==='hedgehogFirst')assert.equal(result.net,0);
 const requiresNoRetry=scn==='expired'||scn==='held'||process.argv.includes('--require-history-controls')&&['recentMisses','twoMisses'].includes(scn);
 if(requiresNoRetry){
   assert.equal(result.net,0);
   assert.equal(result.tRetry,undefined);
   assert.equal(Object.keys(result.steps).length,0,'A rejected recovery must not enlist an idle helper');
 }
 if(arm==='suppliedCandidate'&&process.argv.includes('--require-history-controls')&&scn==='bothWaiting'&&i==='at742'){
   assert.equal(result.net,8);
   assert.ok(result.t8<gate-fixed.clock);
 }
 if(arm==='guardedRetryOnly'&&scn==='bothWaiting'&&i==='at742'){
   assert.equal(result.net,8);assert.ok(result.t8<gate-fixed.clock);
 }
 results.push(result);
}

console.log(JSON.stringify({archive:h.archiveSHA256,originalRequest:h.originalRequest,firstRetry:h.firstRetry,
 openingMotion:early.index,pose:h.atRequest,openingClock:early.clock,poseClock:fixed.clock,gateClock:gate,
 condition:h.careGate.reasons,clockConvention:'All time fields inside runs are seconds relative to #742, with the true gate at +0.7666. Integrate native motion until the archived stopped clock, then execute the native blocked tick. tFirst is first physical owner motion, t8 is first 8 CSS px and tEnd is native arrival bookkeeping.',
 limits:'The archive lacks the global service phase, hidden helper generator and individual frame durations. Interpolate 13 and 23 native ticks between the three recorded clocks. The earlier sweep varies a possible scheduling slot; it does not assert that the live scheduler fired on that earlier frame. Hedgehog-first admits the competing request before dog service; hedgehogAtRecordedTime injects it only at its observed time. The control saves the current feet as its prior signature.',
 ...(process.argv[2]?{restoredHistory:{since:missHistoryStart,actualSeparateRejections:separateRejections,storedCappedCount:3},
   controls:'recentMisses seeds a 10s history, twoMisses seeds only two separate ordinary refusals, expired closes the original pending request before the slot, held retains the actual foot under manual control throughout. Negative controls intentionally vary one field.'}:{}),
 nativeHashes:Object.fromEntries(arms.map(([key,s])=>[key,digest(s)])),runs:results},null,2));
