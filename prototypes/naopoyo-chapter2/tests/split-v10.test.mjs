import test from 'node:test';import assert from 'node:assert/strict';
import * as E from '../../naopoyo-v2/engine.mjs';
import {actor,board,cycleWell,overflowBoard,multipleSpikes} from './v10-fixtures.mjs';
const splitBoard=()=>board({actors:[actor('a',3,5,6)],walls:[[3,6]],spikes:[{x:3,y:5,power:1}]});
test('V10 parent and child merge normally in the same operation; V9 remains versioned',()=>{
 for(const [rule,count] of [['recombine-once-v1',1],[undefined,2]]){const s=E.createState({...splitBoard(),splitRules:rule});const r=E.externalSplit(s,'a',1,0,1);assert.ok(r.ok);assert.equal(s.actors.length,count);assert.equal(E.mass(s),6);if(rule)assert.equal(s.actors[0].level,6);}
});
test('V10 same spike succeeds once, then resets for the next adjacent move',()=>{
 const s=E.createState(cycleWell());for(const dx of [1,-1,1]){const r=E.move(s,'active',dx,0);assert.ok(r.ok);assert.equal(r.events.filter(e=>e.type==='split').length,dx===1&&s.moves===1?1:0);}
 // A fresh entry on the next input can split at the same tile again.
 const t=E.createState(board({gravity:false,actors:[actor('a',2,3,6)],spikes:[{x:3,y:3,power:1}]}));
 for(const dx of [1,-1,1]){const r=E.move(t,'a',dx,0);assert.ok(r.ok);if(dx===1)assert.equal(r.split,1);}
});
test('V10 finite chain includes spent spike set in cycle signature',()=>{
 const st=board({w:5,h:5,actors:[actor('body',1,0,2),actor('active',3,4)],walls:[...[0,2].flatMap(x=>[0,1,2,3,4].map(y=>[x,y]))],spikes:[{x:1,y:1,power:1},{x:1,y:4,power:1}]});
 const s=E.createState(st),r=E.move(s,'active',1,0);assert.ok(r.ok);assert.equal(r.events.filter(e=>e.type==='split').length,2);assert.ok(s.actors.some(a=>a.x===1&&a.y===4&&a.level===2));assert.equal(E.mass(s),3);
});
test('V10 level-one no-op does not spend spike before following larger body',()=>{
 const s=E.createState(board({actors:[actor('active',0,6),actor('one',3,3),actor('three',3,1,3)],spikes:[{x:3,y:4,power:1}]})),r=E.move(s,'active',1,0);assert.ok(r.ok);assert.ok(r.events.some(e=>e.type==='split'&&e.id==='three'));
});
test('V10 overflow/multiple spikes preserve species totals and determinism',()=>{
 for(const st of [overflowBoard(),multipleSpikes()]){const s=E.createState(st),t=E.clone(s),before=E.totals(s);const r=E.move(s,'a',0,1),r2=E.move(t,'a',0,1);assert.ok(r.ok);assert.deepEqual(s,t);assert.deepEqual(r,r2);assert.deepEqual(E.totals(s),before);const cells=r.events.filter(e=>e.type==='split').map(e=>`${e.x},${e.y}`);assert.equal(new Set(cells).size,cells.length);assert.ok(E.validState(st,s));}
});
test('V10 save validation rejects V9 and mismatching rule identity',()=>{const st=splitBoard(),s=E.createState(st);delete s.splitRules;assert.equal(E.validState(st,s),false);});

test('V10 exhausted placement space leaves spike available within the shared settling context',()=>{
 // An exit immediately above the spike leaves no legal empty birth cell.
 const st=board({w:3,h:4,actors:[actor('body',1,1,2)],walls:[[0,0],[0,1],[0,2],[0,3],[2,0],[2,1],[2,2],[2,3],[1,3]],exits:[{x:1,y:1,exact:8}],spikes:[{x:1,y:2,power:1}]});
 const s=E.createState(st),ctx={activeId:null,policy:{},fired:new Set(),families:new Map(),family:0,events:[]};
 E.settle(s,ctx);assert.equal(s.actors[0].level,2);assert.equal(ctx.events.filter(e=>e.type==='split').length,0);
 // Simulate a subsequent event opening the previous cell without a new context.
 // If the failed contact spent the spike, this later legal split would disappear.
 s.exits=[];s.actors[0].y=1;E.settle(s,ctx);
 assert.equal(ctx.events.filter(e=>e.type==='split').length,1);assert.equal(s.actors.length,1);assert.equal(s.actors[0].level,2);assert.equal(E.mass(s),2);
});
