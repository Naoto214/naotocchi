import test from 'node:test';import assert from 'node:assert/strict';
import {stages} from '../stages.mjs';import {stages as oldStages} from '../archive/v6/stages.mjs';
import {createState,move} from '../engine.mjs';import {directions} from './reachability.mjs';
const key=s=>JSON.stringify(s.actors.map(a=>[a.species,a.level,a.x,a.y]).sort());
for(const [i,stage] of stages.entries()){
 test(`V8 ${stage.id}: remove distant filler rock`,()=>assert.ok(stage.board.walls.length<=35,`${stage.board.walls.length} walls`));
 if(i===0||i===4){test(`V8 ${stage.id}: introductory move/merge room has no rocks`,()=>assert.equal(stage.board.walls.length,0));continue;}
 test(`V8 ${stage.id}: every reachable move equals V6`,()=>{
  const queue=[[createState(oldStages[i].board),createState(stage.board)]],seen=new Set([key(queue[0][0])]);
  for(let n=0;n<queue.length;n++)for(const a of queue[n][0].actors)for(const [dx,dy]of directions){
   const [old,next]=queue[n].map(s=>structuredClone(s)),r1=move(old,a.id,dx,dy),r2=move(next,a.id,dx,dy);
   assert.deepEqual(r2,r1);assert.deepEqual(next.actors,old.actors);assert.equal(next.rescued,old.rescued);
   const k=key(old);if(r1.ok&&!seen.has(k)){seen.add(k);queue.push([old,next]);assert.ok(queue.length<30000);}
  }
 });
}
