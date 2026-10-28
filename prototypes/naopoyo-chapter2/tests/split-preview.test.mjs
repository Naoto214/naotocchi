import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {ForestSession} from '../session.mjs';import {stages} from '../stages.mjs';
import {createState,move,settle,complete} from '../../naopoyo-v2/engine.mjs';
const api=await import('../split-preview.mjs').catch(()=>({}));
const fixture=()=>({...stages[0],id:'komorebi-preview-fixture',walls:[[2,5]],gates:[],exits:[],spikes:[{x:3,y:4,power:3}],actors:[{id:'a',x:2,y:4,level:6,species:'dog'}]});
const simulate=(...args)=>{assert.equal(typeof api.simulateSplit,'function');return api.simulateSplit(...args)};
test('one-step prediction shows settled body and children without mutating its source',()=>{
 const s=createState(fixture()),before=structuredClone(s),p=simulate(s,'a',1,0);
 assert.deepEqual(s,before);assert.ok(p);assert.equal(p.births.length,3);
 assert.deepEqual(p.state.actors.map(a=>[a.id,a.x,a.y,a.level]),[['a',3,7,5],['child1',2,4,1]]);
 const real=structuredClone(s);assert.ok(move(real,'a',1,0).ok);assert.deepEqual(p.state,real);
 assert.ok(p.actors.some(a=>a.id==='a'&&a.y===7&&a.level===5));
});
test('illegal moves, non-splitting moves and level-one spike passage have no preview',()=>{
 const s=createState(fixture());assert.equal(simulate(s,'a',0,-1),null);assert.equal(simulate(s,'a',-1,0),null);
 s.actors[0].level=1;assert.equal(simulate(s,'a',1,0),null);
 assert.equal(simulate(s,'missing',1,0),null);
});
test('slow approach previews BEFORE committing and cancel removes all transient state',()=>{
 const q=new ForestSession(fixture()),saved=q.serialize();q.begin('a',{x:2.5,y:4.5});
 q.travel({x:2.82,y:4.5});assert.ok(q.preview);assert.equal(q.state.moves,0);assert.equal(q.serialize(),saved);assert.equal(q.history.length,0);
 const predicted=structuredClone(q.preview.state);q.travel({x:3.1,y:4.5});assert.deepEqual(q.state,predicted);assert.equal(q.preview,null);q.end();assert.equal(q.preview,null);
 assert.ok(q.undo());q.paused=false;q.begin('a',{x:2.5,y:4.5});q.travel({x:2.82,y:4.5});assert.ok(q.preview);q.travel({x:2.5,y:4.5});assert.equal(q.preview,null);
 q.travel({x:2.82,y:4.5});q.end();assert.equal(q.preview,null);assert.equal(q.state.moves,0);
});
test('retry, restore, actor switch and invalid pointer clear predictions',()=>{
 const q=new ForestSession(fixture());q.begin('a',{x:2.5,y:4.5});q.travel({x:2.82,y:4.5});assert.ok(q.preview);
 const saved=q.serialize(),r=new ForestSession(fixture(),saved);assert.ok(r.restored);assert.equal(r.preview,null);
 q.retry();assert.equal(q.preview,null);q.begin('a',{x:2.5,y:4.5});q.travel({x:2.82,y:4.5});q.travel({x:NaN,y:0});assert.equal(q.preview,null);
 q.end();q.begin('a',{x:2.5,y:4.5});assert.equal(q.preview,null);
});
test('fast continuous drag remains identical with preview calculations enabled',()=>{
 const run=steps=>{const q=new ForestSession(fixture());q.begin('a',{x:2.5,y:4.5});for(let n=1;n<=steps;n++)q.travel({x:2.5+3*n/steps,y:4.5});q.end();return q};
 const fast=run(1),slow=run(120);assert.deepEqual(fast.state,slow.state);assert.deepEqual(fast.history,slow.history);assert.equal(fast.preview,null);assert.equal(slow.preview,null);
});
test('relative drag after gravity previews from the logical actor, not the pointer row',()=>{
 const b=fixture();b.spikes.push({x:4,y:7,power:1});const q=new ForestSession(b);q.begin('a',{x:2.5,y:4.5});q.travel({x:3.5,y:4.5});q.animate(1000);
 q.travel({x:3.82,y:4.5});assert.ok(q.preview);const p=structuredClone(q.preview.state);q.travel({x:4.1,y:4.5});assert.deepEqual(q.state,p);
});
test('all shipped witness split/merge/overflow/rescue/gate outcomes use exact engine results',()=>{
 const data=JSON.parse(fs.readFileSync(new URL('../../../docs/naopoyo-v10-20261028/solutions.json',import.meta.url)));let split=0,merge=0,overflow=0,rescue=0;
 for(const stage of stages){const s=createState(stage);settle(s);
  for(const step of data.stages.find(v=>v.number===stage.number).path){const a=s.actors.find(a=>a.x===step.at[0]&&a.y===step.at[1]),saved=JSON.stringify(s),p=simulate(s,a.id,...step.d);assert.equal(JSON.stringify(s),saved);const r=move(s,a.id,...step.d);assert.ok(r.ok);
   if(r.events.some(e=>e.type==='split')){assert.ok(p);assert.deepEqual(p.state,s);assert.deepEqual(p.events,r.events);split++;merge+=r.events.filter(e=>e.type==='merge').length;overflow+=r.events.filter(e=>e.type==='merge'&&e.overflow).length;rescue+=r.events.filter(e=>e.type==='rescue').length;}else assert.equal(p,null);
  }assert.ok(complete(s));
 }assert.ok(split>20&&merge>0&&overflow>0&&rescue>0);
});

test('approach follows the existing chamfered pointer entry, including oblique approaches',async()=>{
 const {enteredCells}=await import('../../naopoyo-v2/input.mjs');assert.equal(typeof api.previewDirection,'function');
 for(const [x,y] of [[.32,0],[0,.32],[-.32,0],[0,-.32],[.32,.32],[-.32,.32],[.32,-.32],[-.32,-.32],[.32,.2],[.2,.32]]){
  const cursor={x:2,y:4},p={x:2.5+x,y:4.5+y},scale=1.5/Math.max(Math.abs(x),Math.abs(y)),end={x:2.5+x*scale,y:4.5+y*scale};
  const next=enteredCells(p,end).find(([a,b])=>a!==2||b!==4);assert.deepEqual(api.previewDirection(cursor,p),[next[0]-2,next[1]-4]);
 }
});
