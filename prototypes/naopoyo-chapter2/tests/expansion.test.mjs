import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {stages} from '../stages.mjs';import {ForestSession} from '../session.mjs';
import {ForestProgress,KEY,QA_KEY} from '../progress.mjs';
import {createState,settle,mass,complete,validState} from '../../naopoyo-v2/engine.mjs';
const newStages=stages.filter(s=>s.number>=14);
test('all seven persistent stages exist exactly once with three hints',()=>{assert.deepEqual(newStages.map(s=>s.number),[14,15,16,17,18,19,20]);assert.equal(new Set(stages.map(s=>s.id)).size,10);for(const s of newStages){assert.equal(s.w,8);assert.equal(s.h,8);assert.equal(s.gravity,true);assert.equal(s.hints.length,3);assert.ok(s.discovery);}});
test('13→20 unlocks survive reload/retry and QA never changes normal records',()=>{
 const m=new Map(),storage={getItem:k=>m.get(k)||null,setItem:(k,v)=>m.set(k,v)};const p=new ForestProgress(storage,{qa:true});assert.equal(p.ids.length,10);assert.ok(p.ids.every(id=>p.allowed(id)));
 const normal=new ForestProgress(storage);for(const id of normal.ids){assert.ok(normal.allowed(id));normal.clear(id);}const saved=m.get(KEY);p.clear(stages.at(-1).id);assert.equal(m.get(KEY),saved);assert.notEqual(KEY,QA_KEY);const restored=new ForestProgress(storage);assert.ok(restored.allowed(stages.at(-1).id));restored.select(stages[0].id);assert.ok(restored.allowed(stages.at(-1).id));
});
for(const n of [14,15,16,17,18,19,20])test(`${n} real session pointer steps, save/undo/retry and all-rescued witness`,()=>{
 const s=newStages.find(s=>s.number===n);assert.ok(s,`stage ${n} exists`);const witnesses=JSON.parse(fs.readFileSync(new URL('../../../docs/naopoyo-chapter2-20261024/expansion-solutions.json',import.meta.url)));const witness=witnesses.stages.find(w=>w.id===s.id);assert.ok(witness?.path.length);
 let q=new ForestSession(s);const initial=structuredClone(q.state),total=mass(q.state);assert.deepEqual(q.state,createState(s));
 for(const [i,p]of witness.path.entries()){
  const a=q.state.actors.find(a=>a.x===p.at[0]&&a.y===p.at[1]);assert.ok(a);const before=structuredClone(q.state);
  assert.ok(q.begin(a.id,{x:a.x+.5,y:a.y+.5}));const r=q.travel({x:a.x+.5+p.d[0],y:a.y+.5+p.d[1]});assert.ok(r.some(r=>r.ok),`step ${i}`);q.end();assert.equal(mass(q.state),total);assert.ok(validState(s,q.state));
  const saved=q.serialize(),restore=new ForestSession(s,saved);assert.ok(restore.restored);assert.deepEqual(restore.state,q.state);assert.ok(restore.undo());assert.deepEqual(restore.state,before);q=new ForestSession(s,saved);
 }
 assert.ok(complete(q.state));q.retry();assert.deepEqual(q.state,initial);assert.equal(q.history.length,0);
});
test('20 held drag survives fall, overflow and gate entry; one Undo restores entire gesture',()=>{
 const stage=stages.find(s=>s.number===20),q=new ForestSession(stage),before=structuredClone(q.state);q.begin('a',{x:.5,y:7.5});
 for(const point of [{x:1.5,y:6.5},{x:2.5,y:6.5},{x:3.5,y:6.5}])assert.ok(q.travel(point).some(r=>r.ok));
 assert.equal(q.active.id,'a');assert.deepEqual(q.active.logical,{x:3,y:7});assert.ok(q.motion.some(m=>m.events.some(e=>e.type==='fall')));assert.ok(q.motion.some(m=>m.events.some(e=>e.type==='merge'&&e.overflow)));
 q.end();assert.equal(q.history.length,1);assert.ok(q.undo());assert.deepEqual(q.state,before);
});
test('20 selected candidate factory preserves the audited geometry',async()=>{
 const {generateLedgeCandidates}=await import('../design/final-candidates.mjs'),c=generateLedgeCandidates().find(s=>s.id==='ledge-lift-3-4'),s=stages.find(s=>s.number===20);
 for(const k of ['walls','gates','exits','spikes','actors'])assert.deepEqual(c[k],s[k]);
});
