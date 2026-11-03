import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {stages} from '../stages.mjs';
import {ExampleReplay} from '../example-replay.mjs';
import {ForestSession} from '../session.mjs';
import {complete, totals} from '../../naopoyo-v2/engine.mjs';
const solutions=JSON.parse(fs.readFileSync(new URL('../../../docs/naopoyo-v10-20261028/solutions.json',import.meta.url))).stages;
for(const solution of solutions)test(`example ${solution.number}: legal, reversible, same normal input`,()=>{
 const stage=stages.find(s=>s.number===solution.number), replay=new ExampleReplay(stage,solution.path), normal=new ForestSession(stage), initial=JSON.stringify(normal.snapshot()), mass=totals(normal.state);
 for(const [i,step] of solution.path.entries()){
  const a=normal.state.actors.find(a=>a.x===step.at[0]&&a.y===step.at[1]);assert.ok(a);assert.equal(a.level,step.level);
  normal.begin(a.id,{x:a.x+.5,y:a.y+.5});const [result]=normal.travel({x:a.x+.5+step.d[0],y:a.y+.5+step.d[1]});normal.end();assert.ok(result.ok,`step ${i+1}`);
  replay.next();assert.deepEqual(replay.session.state,normal.state);assert.deepEqual(totals(replay.session.state),mass);
 }
 assert.ok(complete(replay.session.state));assert.equal(replay.index,solution.path.length);
 replay.previous();assert.equal(replay.index,solution.path.length-1);replay.next();assert.ok(complete(replay.session.state));replay.reset();assert.equal(JSON.stringify(replay.session.snapshot()),initial);
});
test('invalid witness is rejected without a partial replay',()=>{const solution=solutions[0];assert.throws(()=>new ExampleReplay(stages[0],[{...solution.path[0],level:99}]));});
