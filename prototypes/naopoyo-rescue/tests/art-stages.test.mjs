import test from 'node:test';
import assert from 'node:assert/strict';
import {createState,move,validState} from '../engine.mjs';
import {stages} from '../stages.mjs';
import {pack,restore} from '../store.mjs';

for (const species of ['penguin','frog']) test(species+' survives save validation and movement',()=>{
 const stage={...stages[0],actors:[{id:'a',x:1,y:2,species,level:8}]};
 const s=createState(stage);assert.ok(validState(stage,s));
 assert.ok(move(s,'a',1,0));assert.ok(validState(stage,s));
});
test('all four official species have a playable stage',()=>{
 for(const species of ['dog','fish','penguin','frog'])assert.ok(stages.some(s=>s.actors.some(a=>a.species===species)));
});
test('old gate-stage progress and undo are preserved with old terrain',()=>{
 for(const index of [6,9]){
  const old={...stages[index],walls:index===6?[]:[[3,3],[4,3],[5,3]]};
  const s=createState(old),before=structuredClone(s);move(s,'a',0,-1);
  const restored=restore(pack(index,s,[before],['01','07']));
  assert.ok(restored);assert.deepEqual(restored.state,s);assert.deepEqual(restored.history,[before]);
  assert.deepEqual(restored.cleared,['01','07']);
 }
});
test('unknown changed terrain is not accepted as legacy',()=>{
 const s=createState(stages[6]);s.walls=[[0,0]];
 assert.equal(restore(pack(6,s,[],[])),null);
});
