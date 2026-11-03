import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {stages} from '../stages.mjs';import {ExampleReplay} from '../example-replay.mjs';import {ForestSession} from '../session.mjs';import {complete,totals,validState} from '../../naopoyo-v2/engine.mjs';
import {solutionIdentity} from '../example-position.mjs';
const events=new Set();
for(const stage of stages)test(`V12 ${stage.number}: old/new complete, normal input, mass, exact Undo/reload, answer identity`,()=>{
 const old=JSON.parse(fs.readFileSync(new URL(`../../../docs/naopoyo-v12-quality/original/${stage.number}.json`,import.meta.url))),data=JSON.parse(fs.readFileSync(new URL(`../examples/${stage.number}.json`,import.meta.url)));
 new ExampleReplay(stage,old.path);const replay=new ExampleReplay(stage,data.path);assert.ok(data.path.length<=old.path.length);if(stage.number===20)assert.ok(data.path.length<156);
 assert.equal(data.shortestProven,false);assert.equal(solutionIdentity(data.path),solutionIdentity(JSON.parse(JSON.stringify(data.path))));
 let q=new ForestSession(stage);const initial=totals(q.state);
 for(const [i,step] of data.path.entries()){
  const before=q.snapshot(),a=q.state.actors.find(a=>a.x===step.at[0]&&a.y===step.at[1]);assert.equal(a.level,step.level);
  assert.ok(q.begin(a.id,{x:a.x+.5,y:a.y+.5}));const r=q.travel({x:a.x+.5+step.d[0],y:a.y+.5+step.d[1]})[0];q.end();assert.ok(r.ok);assert.equal(q.state.moves,before.state.moves+1);assert.equal(q.state.moves,i+1);r.events.forEach(e=>{events.add(e.type);if(e.overflow)events.add('overflow')});assert.ok(validState(stage,q.state));assert.deepEqual(totals(q.state),initial);replay.next();assert.deepEqual(q.state,replay.session.state);
  const after=q.serialize();q=new ForestSession(stage,after);assert.ok(q.restored);const history=q.history.length;assert.ok(q.undo());assert.deepEqual(q.snapshot(),before);assert.equal(q.paused,false);assert.equal(q.history.length,history-1);assert.equal(q.motion.length,0);q=new ForestSession(stage,after);
 }
 assert.ok(complete(q.state));assert.equal(q.state.moves,data.path.length);const savedClear=new ForestSession(stage,q.serialize());assert.equal(savedClear.state.moves,data.path.length);assert.ok(complete(savedClear.state));while(q.history.length){assert.ok(q.undo());assert.equal(q.paused,false)}assert.equal(q.undo(),false);
});
test('legacy contact-v1 explicit 8+8 swap restores via Undo after reload',()=>{const stage={...stages[0],movementRules:'contact-v1',gravity:false,walls:[],gates:[],spikes:[],exits:[],actors:[{id:'a',species:'dog',level:8,x:2,y:3},{id:'b',species:'dog',level:8,x:3,y:3}]};let q=new ForestSession(stage);const before=q.snapshot();q.begin('a',{x:2.5,y:3.5});const r=q.travel({x:3.5,y:3.5})[0];q.end();assert.ok(r.events.some(e=>e.type==='swap'));assert.equal(q.state.moves,1);events.add('swap');q=new ForestSession(stage,q.serialize());assert.ok(q.restored);assert.ok(q.undo());assert.deepEqual(q.snapshot(),before);assert.equal(q.paused,false);});
test('witnesses exercise split/merge/overflow/swap/rescue/fall Undo',()=>{for(const type of ['split','merge','overflow','swap','rescue','fall'])assert.ok(events.has(type),type);});
