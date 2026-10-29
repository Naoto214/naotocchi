import test from 'node:test';
import assert from 'node:assert/strict';
import {ForestSession,visualActors} from '../session.mjs';
import {stages} from '../stages.mjs';
const api=await import('../gate-effects.mjs').catch(()=>({}));
const fixture=(level=8)=>({...stages[0],gravity:false,actors:[{id:'a',species:'dog',x:1,y:4,level}],walls:[],gates:[{x:2,y:4,exact:8},{x:3,y:4,exact:8}],exits:[],spikes:[]});
function effects(){assert.equal(typeof api.GateEffects,'function','presentation-only gate effects available');return new api.GateEffects();}
function sample(f,q,now,reduced=false){return f.sample(q,visualActors(q),now,reduced);}
const pulse=(v,x)=>v.find(g=>g.x===x)?.pulse||0;
test('matching passage starts one short pulse, then expires even with actor stationary',()=>{
 const q=new ForestSession(fixture()),f=effects();sample(f,q,0);q.begin('a',{x:1.5,y:4.5});q.travel({x:2.5,y:4.5});q.animate(70);sample(f,q,0);assert.ok(pulse(sample(f,q,100),2)>0);q.animate(1000);assert.equal(pulse(sample(f,q,240),2),0);assert.equal(pulse(sample(f,q,500),2),0);
});
test('mismatch, support and a restored occupant never flash',()=>{
 const q=new ForestSession(fixture(3)),f=effects();sample(f,q,0);q.begin('a',{x:1.5,y:4.5});assert.equal(q.travel({x:2.5,y:4.5})[0].ok,false);assert.equal(pulse(sample(f,q,80),2),0);
 const s=fixture();s.actors[0].x=2;const r=new ForestSession(s);assert.equal(pulse(sample(f,r,100),2),0);assert.equal(sample(f,r,100)[0].occupied,true);
});
test('continuous travel pulses both entered gates without locking logical moves or serialization',()=>{
 const q=new ForestSession(fixture()),f=effects();sample(f,q,0);q.begin('a',{x:1.5,y:4.5});assert.ok(q.travel({x:3.5,y:4.5}).every(r=>r.ok));assert.equal(q.state.actors[0].x,3);const saved=q.serialize();q.animate(70);sample(f,q,0);q.animate(110);sample(f,q,80);assert.ok(pulse(sample(f,q,120),2)>0);assert.ok(pulse(sample(f,q,120),3)>0);assert.equal(q.serialize(),saved);
});
test('reduced motion, Undo and Retry clear outstanding effects, resuming never replays old events',()=>{
 const q=new ForestSession(fixture()),f=effects();sample(f,q,0);q.begin('a',{x:1.5,y:4.5});q.travel({x:2.5,y:4.5});q.end();q.animate(70);sample(f,q,0);assert.ok(pulse(sample(f,q,60),2)>0);assert.equal(pulse(sample(f,q,70,true),2),0);assert.equal(pulse(sample(f,q,80),2),0);
 q.undo();assert.equal(pulse(sample(f,q,90),2),0);q.retry();assert.equal(pulse(sample(f,q,100),2),0);
});
test('gate overlap follows interpolated actors, not the already committed final board',()=>{
 const q=new ForestSession(fixture()),f=effects();sample(f,q,0);q.begin('a',{x:1.5,y:4.5});q.travel({x:3.5,y:4.5});assert.equal(sample(f,q,0).find(g=>g.x===3).occupied,false);q.animate(70);assert.equal(sample(f,q,70).find(g=>g.x===2).occupied,true);
});

test('legacy gravity passage waits until the visible fall reaches the gate',()=>{
 const b={...fixture(),terrainRules:'magic-rock-v1',gravity:true,walls:[[1,3]],gates:[{x:2,y:4,exact:8}],actors:[{id:'a',species:'dog',x:1,y:2,level:8}]};
 const q=new ForestSession(b),f=effects();sample(f,q,0);q.begin('a',{x:1.5,y:2.5});assert.ok(q.travel({x:2.5,y:2.5})[0].ok);
 assert.ok(q.motion[0].events.some(e=>e.type==='phase'));assert.equal(pulse(sample(f,q,20),2),0);q.animate(200);sample(f,q,200);assert.ok(pulse(sample(f,q,230),2)>0);
});
test('legal position exchange emits a pulse; compressed queued passages are not lost',()=>{
 const b=fixture();b.actors.push({id:'b',species:'cat',x:2,y:4,level:8});
 const q=new ForestSession(b),f=effects();sample(f,q,0);q.begin('a',{x:1.5,y:4.5});assert.ok(q.travel({x:2.5,y:4.5})[0].swapped);q.animate(120);sample(f,q,120);assert.ok(pulse(sample(f,q,150),2)>0);
 const r=new ForestSession(fixture()),h=effects();sample(h,r,0);r.begin('a',{x:1.5,y:4.5});r.travel({x:3.5,y:4.5});sample(h,r,0);r.animate(1000);sample(h,r,1000);assert.ok(pulse(sample(h,r,1050),2)>0);assert.ok(pulse(sample(h,r,1050),3)>0);
});
test('roof landing emits no passage pulse while lateral entry still does',()=>{
 const b={...fixture(),gravity:true,walls:[[1,3]],gates:[{x:2,y:4,exact:8}],actors:[{id:'a',species:'dog',x:1,y:2,level:8}]};
 const q=new ForestSession(b),f=effects();sample(f,q,0);q.begin('a',{x:1.5,y:2.5});assert.ok(q.travel({x:2.5,y:2.5})[0].ok);
 assert.equal(q.state.actors[0].y,3);assert.ok(!q.motion[0].events.some(e=>e.type==='phase'));
 q.animate(200);assert.equal(pulse(sample(f,q,230),2),0);
});
