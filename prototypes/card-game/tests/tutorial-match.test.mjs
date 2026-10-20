import test from 'node:test';
import assert from 'node:assert/strict';
import {TutorialSession,LESSONS} from '../tutorial.mjs';
import {actor,legalActions,validate} from '../engine.mjs';

test('all nine lessons contain human game commands; CPU alone operates seat B',()=>{
 const cpuKinds=new Set();let cpuCount=0;
 for(let lesson=0;lesson<LESSONS.length;lesson++){
  const t=new TutorialSession(lesson);let userCount=0,guard=0;
  while(!t.done&&guard++<80){
   validate(t.state);assert.equal(t.projection.players.B.hand,undefined);
   const a=t.expectedAction;
   assert.ok(a,'each step must be an actual game operation');
   assert.ok(legalActions(t.state).some(x=>x.id===a.id));
   const before=JSON.stringify(t.state),rev=t.state.revision,epoch=t.epoch;
   if(t.isCpu){
    assert.equal(actor(t.state),'B');assert.equal(t.perform(a.id,rev,epoch),false,'human cannot submit CPU action');
    assert.equal(JSON.stringify(t.state),before);assert.equal(t.advanceCpu(rev,epoch),true);cpuKinds.add(a.kind);cpuCount++;
   }else{assert.equal(actor(t.state),'A');assert.equal(t.perform('wrong',rev,epoch),false);assert.equal(JSON.stringify(t.state),before);assert.equal(t.perform(a.id,rev,epoch),true);userCount++;}
   assert.equal(t.perform(a.id,rev,epoch),false,'old step ticket cannot act again');validate(t.state);
  }
  assert.ok(t.done);assert.ok(userCount>0,'lesson '+lesson+' has human commands');
 }
 assert.ok(cpuCount>=5);assert.ok(cpuKinds.has('place'));assert.ok(cpuKinds.has('play'));assert.ok(cpuKinds.has('pass'));
});
test('resume reconstructs mixed CPU and human steps deterministically',()=>{
 for(const lesson of [0,7,8]){
  const t=new TutorialSession(lesson);
  while(!t.done){const a=t.expectedAction;if(t.isCpu)t.advanceCpu(t.state.revision,t.epoch);else t.perform(a.id,t.state.revision,t.epoch);const copy=new TutorialSession(lesson,t.step);assert.deepEqual(copy.state,t.state);assert.equal(copy.done,t.done);}
 }
});
