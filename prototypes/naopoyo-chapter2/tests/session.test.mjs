import test from 'node:test';
import assert from 'node:assert/strict';
import {ForestSession} from '../session.mjs';
import {createState,settle,mass} from '../../naopoyo-v2/engine.mjs';
const stage={id:'test',w:8,h:8,gravity:true,walls:[[3,7]],gates:[],spikes:[],exits:[],water:[],guests:[],events:[],actors:[{id:'a',species:'dog',level:1,x:3,y:1}]};
test('initial gravity runs before touch, retry and restore remain stable',()=>{
 const q=new ForestSession(stage);assert.equal(q.state.actors[0].y,6);assert.equal(q.state.moves,0);
 const before=structuredClone(q.state);q.begin('a',{x:3.5,y:6.5});assert.deepEqual(q.state,before);q.end();
 q.retry();assert.deepEqual(q.state,before);const restored=new ForestSession(stage,q.serialize());assert.equal(restored.restored,true);assert.deepEqual(restored.state,before);
});
test('falling drag keeps its active ID, Undo restores start and motion clears',()=>{
 const q=new ForestSession({...stage,actors:[{id:'a',species:'dog',level:1,x:3,y:6}]});
 q.begin('a',{x:3.5,y:6.5});q.travel({x:4.5,y:6.5});assert.equal(q.state.actors[0].y,7);assert.equal(q.active.id,'a');assert.ok(q.motion.length);
 const restored=new ForestSession(q.stage,q.serialize());assert.equal(restored.history.length,1);assert.ok(restored.undo());assert.equal(restored.state.actors[0].y,6);
 q.end();q.undo();assert.equal(q.state.actors[0].y,6);assert.equal(q.motion.length,0);q.retry();assert.equal(q.history.length,0);
});
test('fast and slow drag commit identical gravity states',()=>{
 const run=n=>{const q=new ForestSession({...stage,actors:[{id:'a',species:'dog',level:1,x:3,y:6}]});q.begin('a',{x:3.5,y:6.5});for(let i=1;i<=n;i++)q.travel({x:3.5+3*i/n,y:6.5});q.end();return q;};
 const fast=run(1),slow=run(60);assert.deepEqual(fast.state,slow.state);assert.equal(mass(fast.state),1);assert.deepEqual(fast.history,slow.history);
});
test('overflow remainder moves back smoothly instead of overlapping the 8',async()=>{
 const {visualActors}=await import('../session.mjs');
 const q=new ForestSession({...stage,walls:[],actors:[{id:'a',species:'dog',level:2,x:1,y:7},{id:'b',species:'dog',level:8,x:2,y:7}]});
 q.begin('a',{x:1.5,y:7.5});q.travel({x:2.5,y:7.5});q.animate(100);
 const remainder=visualActors(q).find(a=>a.id==='b');assert.ok(remainder.x<1.2);assert.ok(remainder.x>1);
});
