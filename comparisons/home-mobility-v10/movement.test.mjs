import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createRequire} from 'node:module';
import {restoreEpisode,source,sx,sy} from './episode-scene.mjs';

const require=createRequire(import.meta.url);
const read=name=>JSON.parse(fs.readFileSync(new URL(name,import.meta.url)));
const episode=read('dog-episode.json'),window=read('helper-window-742.json');
const native=process.env.UNMODIFIED_V9==='1'?source:require('./movement.cjs').patchMovement(source);
const dist=(a,b)=>Math.hypot((a.x-b.x)*sx,(a.y-b.y)*sy);
const original=episode.requests.find(r=>r.index===window.originalRequest);
const previouslyRetried=episode.requests.find(r=>r.index===window.firstRetry);
const raw={...window.pose,key:original.key,goal:original.goal};

function restoreWaiting(options={}){
  const t=restoreEpisode(raw,native),before=restoreEpisode(previouslyRetried,native);
  const feet=options.unchanged?t.model.probe.nearbyFeet(t.a):before.model.probe.nearbyFeet(before.a);
  const entry={point:t.goal,feet,expires:original.clock+12,attempted:true,retried:true};
  t.a.lastOwnWalk=116.812;t.a.nextAt=window.nextDecisionClock;
  t.model.probe.inspect().waiting.set(t.a.key,entry);
  t.model.probe.setMissHistory(t.a.key,raw.clock-(options.age??(raw.clock-episode.requests[0].clock)),options.choices??3);
  return {...t,entry};
}
function audit(t,dt,flags={}){
  const previous=t.model.snapshot();t.model.step(dt,flags);
  const current=t.model.probe.actors();
  for(const [i,end] of current.entries()){
    const start=previous[i];if(start.x===end.x&&start.y===end.y)continue;
    const box=t.model.bounds(end);assert.ok(end.x>=box.left&&end.x<=box.right&&end.y>=box.top&&end.y<=box.bottom);
    assert.ok(Math.hypot(start.x-end.x,start.y-end.y)<=42*dt+1e-7);
    assert.ok(t.scene.navigation.segmentSafe(start,end,t.scene.planVisibility(end)));
    for(let j=0;j<current.length;j++){
      if(i===j)continue;
      const peer=j<i?current[j]:previous[j];
      assert.ok(t.model.probe.contactSegmentSafe(start,end,peer,(end.w+peer.w)*.5+10,(end.h+peer.h)*.38+10));
    }
  }
}
test('a second physical opening lets the original dog request advance using at most two sequential helpers',()=>{
  const t=restoreWaiting(),start={...t.a},helpers=[];
  for(let n=0;n<24;n++){
    audit(t,1/30);
    const moving=t.model.probe.actors().filter(b=>b.target&&b.yieldFor===t.a.key);
    assert.ok(moving.length<=1);
    for(const b of moving)if(!helpers.includes(b.key))helpers.push(b.key);
  }
  assert.deepEqual(helpers,['companion:sekizou','partner:forest_bear']);
  assert.equal(t.entry.reopened,true);assert.ok(dist(start,t.a)>=8-1e-6);
  assert.ok(dist(start,t.goal)-dist(t.a,t.goal)>.75);assert.equal(t.a.ambientEscape,false);
});
for(const control of ['unchanged','less than four minutes','only two ordinary refusals','held','manual selection','pause','expired']){
  test('the second retry stays inactive for '+control,()=>{
    const t=restoreWaiting({unchanged:control==='unchanged',age:control==='less than four minutes'?238:undefined,choices:control==='only two ordinary refusals'?2:3});
    if(control==='manual selection')t.model.select(t.a.key);
    if(control==='expired')t.entry.expires=raw.clock;
    const start=t.model.snapshot().map(a=>[a.x,a.y]);
    for(let n=0;n<30;n++)audit(t,1/30,control==='held'?{heldActor:t.a.key}:control==='pause'?{blocked:true}:{});
    assert.deepEqual(t.model.snapshot().map(a=>[a.x,a.y]),start);assert.ok(!t.entry.reopened);
  });
}
test('the ordinary 117.412s request retains its native V9 endpoint',()=>{
  const t=restoreEpisode(read('closing-request.json'),native);t.a.manualUntil=0;
  assert.ok(t.model.move(t.a.key,t.goal,'ambient'));
  for(let i=0;i<100&&t.a.target;i++)audit(t,.05);
  assert.ok(dist(t.a,{x:183.59351071308626,y:294.61208272461613})<1e-6);
});
