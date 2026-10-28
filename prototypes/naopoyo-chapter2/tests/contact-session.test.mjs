import test from 'node:test';import assert from 'node:assert/strict';
import {ForestSession,visualActors} from '../session.mjs';import {ForestProgress,KEY} from '../progress.mjs';
import {stages} from '../stages.mjs';
const a=(id,x,y,level=8,species='dog')=>({id,x,y,level,species});
const board=(actors,extra={})=>({id:'contact-session',w:8,h:8,gravity:false,gravityRules:'supported-v1',movementRules:'contact-v1',walls:[],gates:[],spikes:[],exits:[],water:[],guests:[],events:[],actors,...extra});
test('all chapter2 stages select contact rules; published chapter1 does not',async()=>{for(const s of stages)assert.equal(s.movementRules,'contact-v1');const {stages:first}=await import('../../naopoyo-chapter1/stages.mjs');for(const s of first)assert.equal(s.movementRules,undefined);});
test('swap draws two separated arcs for 180ms while logical board is immediate',()=>{
 const q=new ForestSession(board([a('a',2,3),a('b',3,3)]));q.begin('a',{x:2.5,y:3.5});assert.ok(q.travel({x:3.5,y:3.5})[0].ok);
 assert.equal(q.state.actors.find(a=>a.id==='a').x,3);assert.equal(q.motion[0].duration,180);q.animate(90);
 const p=visualActors(q),pa=p.find(a=>a.id==='a'),pb=p.find(a=>a.id==='b');assert.equal(pa.x,2.5);assert.equal(pb.x,2.5);assert.ok(Math.abs(pa.y-pb.y)>.2);assert.equal(q.active.id,'a');
 const state=structuredClone(q.state);q.animate(1,true);assert.equal(q.motion.length,0);assert.deepEqual(q.state,state);assert.equal(visualActors(q).find(a=>a.id==='a').x,3);
});
test('diagonal arcs separate and finish on exact logical feet',()=>{const q=new ForestSession(board([a('a',2,3),a('b',3,2)]));q.begin('a',{x:2.5,y:3.5});q.travel({x:3.5,y:2.5});q.animate(90);const p=visualActors(q);assert.ok(Math.hypot(p[0].x-p[1].x,p[0].y-p[1].y)>.2);q.animate(90);assert.equal(q.motion.length,0);assert.deepEqual(visualActors(q).map(a=>[a.x,a.y]),q.state.actors.map(a=>[a.x,a.y]));});
test('fast/slow multi-swap gesture has one Undo and survives save/restore',()=>{
 const b=board([a('a',1,3),a('b',2,3),a('c',3,3)]),run=n=>{const q=new ForestSession(b),before=structuredClone(q.state);q.begin('a',{x:1.5,y:3.5});for(let i=1;i<=n;i++)q.travel({x:1.5+3*i/n,y:3.5});q.end();assert.equal(q.state.actors.find(a=>a.id==='a').x,4);assert.equal(q.history.length,1);const r=new ForestSession(b,q.serialize());assert.ok(r.restored);assert.deepEqual(r.state,q.state);assert.ok(r.undo());assert.deepEqual(r.state,before);q.retry();assert.deepEqual(q.state,before);return r;};assert.deepEqual(run(1).state,run(60).state);
});
test('exchange followed by fall keeps held ID and next drag uses new logical position',()=>{
 const b=board([a('a',2,7),a('b',3,6)],{gravity:true,walls:[[3,7]]}),r=new ForestSession(b);
 r.begin('a',{x:2.5,y:7.5});assert.ok(r.travel({x:3.5,y:6.5})[0].ok);assert.deepEqual(r.active.logical,{x:3,y:6});assert.equal(r.active.id,'a');assert.ok(r.travel({x:4.5,y:6.5})[0].ok);assert.deepEqual(r.active.logical,{x:4,y:7});assert.ok(r.travel({x:5.5,y:6.5})[0].ok);assert.deepEqual(r.active.logical,{x:5,y:7});
});
test('supported-v1 progress migrates read-only with no old board/Undo',()=>{for(const qa of [false,true]){
 const oldKey='naopoyo.komorebi.supported.20261024.v1'+(qa?'.qa':''),id=stages[5].id,old=JSON.stringify({version:1,cleared:[id],unlocked:[id],current:id,hints:{[id]:2},read:[id],boards:{[id]:{old:true}}}),m=new Map([[oldKey,old],[oldKey+'.board.'+id,'old-undo']]),storage={getItem:k=>m.get(k)||null,setItem:(k,v)=>m.set(k,v)},p=new ForestProgress(storage,{qa});
 assert.notEqual(p.actualKey,oldKey);assert.ok(p.data.cleared.includes(id));assert.equal(p.data.hints[id],2);assert.equal(p.data.boards[id],undefined);p.clear(id);assert.equal(m.get(oldKey),old);assert.equal(m.get(oldKey+'.board.'+id),'old-undo');assert.ok(p.allowed(stages[6].id));
 }assert.equal(KEY,'naopoyo.komorebi.recombine-once.20261028.v1');});
test('mismatched exit occupant restores and Undo returns to origin',()=>{const b=board([a('a',2,3,1)],{exits:[{x:3,y:3,exact:3}]}),q=new ForestSession(b);q.begin('a',{x:2.5,y:3.5});q.travel({x:3.5,y:3.5});q.end();const r=new ForestSession(b,q.serialize());assert.ok(r.restored);assert.equal(r.state.rescued,0);assert.equal(r.state.actors[0].x,3);assert.ok(r.undo());assert.equal(r.state.actors[0].x,2);});
