import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import test from 'node:test';
import fs from 'node:fs';
import path from 'node:path';
const require=createRequire(import.meta.url);
const {patchGoals}=require('./goals.cjs');
const native=fs.readFileSync(path.join(process.env.MOBILITY_GAME,'home-production-model-mobility-v10.js'),'utf8');
const patched=patchGoals(native);
const exported=new Function(patched);
test('only free wandering uses the goal sampler; a held intention and a finger target do not',()=>{
  assert.doesNotThrow(()=>exported());
  const start='    function move(key,', end='    function idle(a){';
  const manual=s=>s.slice(s.indexOf(start),s.indexOf(end));
  assert.equal(manual(native),manual(patched).split('    function chooseWanderGoal')[0]);
  assert.equal(patched.split('p=chooseWanderGoal(a,p);').length,2);
});

const folder=new URL('../home-mobility-v10/', import.meta.url);
const {restoreEpisode,sx,sy}=await import('../home-mobility-v10/episode-scene.mjs');
const episode=JSON.parse(fs.readFileSync(new URL('dog-episode.json',folder)));
const exposed=patched.replace('bindMobility,sync,select,selected:',
  'chooseWanderGoal,bindMobility,sync,select,selected:');

test('a real crowded forest pose yields a long, forward, walkable replacement',()=>{
  const scene=restoreEpisode(episode.requests[0],exposed);
  const resident=scene.model.probe.actors().find(a=>a.key==='companion:punyu');
  const raw={x:80.01451114931962,y:293.9443044968065};
  const distance=(a,b)=>Math.hypot((a.x-b.x)*sx,(a.y-b.y)*sy);
  assert.equal(scene.model.chooseWanderGoal(resident, raw),raw,'unserved history absent at 390px');
  scene.model.probe.setMissHistory(resident.key,0,3);
  const chosen=scene.model.chooseWanderGoal(resident,raw), origin={...resident};
  assert.ok(distance(origin,chosen)>=16);
  assert.ok(distance(origin,raw)-distance(chosen,raw)>.75);
  assert.ok(scene.model.probe.yieldLeg(resident,origin,chosen,new Map()));
  assert.equal(scene.model.chooseWanderGoal(resident,chosen),chosen,'a valid intended point is retained');
  resident.manualUntil=0;
  assert.ok(scene.model.move(resident.key,chosen,'ambient'));
  for(let n=0;n<240 && resident.target;n++)scene.model.step(1/30,{autonomy:false});
  assert.ok(distance(resident,chosen)<.8,'actual native arrival');
  assert.ok(distance(origin,resident)>34);
});
test('a walk draw does not invent an exit in any of the 77 historical dog refusals',()=>{
  for(const request of episode.requests.filter(q=>!q.accepted)){
    const trial=restoreEpisode(request,exposed);
    trial.model.probe.setMissHistory(trial.a.key,0,3);
    assert.equal(trial.model.chooseWanderGoal(trial.a,trial.goal),trial.goal,'request '+request.index);
  }
});
test('private readout distinguishes requested points, routed endpoints and walking',async()=>{
  const {runInNewContext}=await import('node:vm');
  const script=fs.readFileSync(new URL('goal-observer.js',import.meta.url),'utf8');
  function open(query){
    const window={};
    runInNewContext(script,{location:{search:query},window,URLSearchParams});
    return window.HomeGoalDiagnostics;
  }
  assert.equal(open(''),undefined);
  const view=open('?goalLog=1');
  const a={key:'one',x:1,y:1,source:'ambient'},chosen={x:21,y:5},raw={x:30,y:15};
  view.proposal(a,raw,chosen,{x:1,y:1},42);
  view.result({key:a.key,type:'ambient',goal:chosen},false,a,42);
  assert.equal(view.read(a.key).status,'declined');
  a.target={x:20,y:5};
  const accepted={key:a.key,type:'ambient',goal:chosen};
  view.result(accepted,true,a,45);
  assert.equal(view.read(a.key).status,'planned');
  assert.equal(view.read(a.key).endpoint.x,20);
  view.hop(a,{x:1,y:5});a.y=5;
  view.hop(a,{x:20,y:5});a.x=20;view.arrival(a,46);
  const row=view.read(a.key);
  assert.equal(row.status,'arrived');
  assert.equal(row.actualDistance,23);assert.equal(row.goalError,1);
  assert.equal(row.raw.x,30);assert.equal(row.chosen.x,21);
  view.proposal(a,raw,chosen,{x:1,y:1},50);view.result(accepted,true,a,50);
  a.target=null;view.state(a,51);assert.equal(view.read(a.key).status,'interrupted');
});
