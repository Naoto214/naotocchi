import test from 'node:test';
import assert from 'node:assert/strict';
import * as A from './generated/A/engine.mjs';
import * as B from './generated/B/engine.mjs';
import * as C from './generated/C/engine.mjs';
import * as Once from './generated/B-once/engine.mjs';
import * as Original from './baseline/prototypes/naopoyo-v2/engine.mjs';
import {actor,board as fixture,cycleWell,overflowBoard,multipleSpikes} from './fixtures.mjs';
import fs from 'node:fs';
import {stages} from './baseline/prototypes/naopoyo-chapter2/stages.mjs';
const board=()=>({id:'fixture',w:7,h:7,actors:[{id:'a',x:3,y:5,level:6,species:'dog'}],walls:[[3,6]],gates:[],spikes:[{x:3,y:5,power:1}],exits:[],gravity:true,gravityRules:'supported-v1',movementRules:'contact-v1',terrainRules:'magic-gate-v2'});
test('A retains same-split upper child; B recombines it',()=>{for(const [E,n] of [[A,2],[B,1]]){const s=E.createState(board());const r=E.externalSplit(s,'a',1,0,1);assert.ok(r.ok);assert.equal(s.actors.length,n);assert.equal(E.mass(s),6);}});
test('C prioritizes left then right independently of entry',()=>{const s=C.createState(board());for(const d of [[0,1],[1,0],[0,-1],[-1,-1]])assert.deepEqual(C.splitCandidates(s,3,5,...d,s.actors[0]).slice(0,2).map(p=>[p.x,p.y]),[[2,5],[4,5]]);});
test('C postpones the direct-above cell even behind reachable distance-two side cells',()=>{const s=C.createState(board());const p=C.splitCandidates(s,3,5,0,1,s.actors[0]);assert.ok(p.findIndex(v=>v.x===1&&v.y===5)<p.findIndex(v=>v.x===3&&v.y===4));});
test('instrumented A equals the untouched V9 on stage20 reproduction',()=>{
 const {before,action}=JSON.parse(fs.readFileSync(new URL('./evidence/repro-source.json',import.meta.url)));const s=A.clone(before),t=A.clone(before),trace=[];
 const r=A.move(s,'b',...action.d,{trace:x=>trace.push(x)}),expected=Original.move(t,'b',...action.d);assert.deepEqual(s,t);assert.deepEqual(r,expected);
 assert.ok(trace.some(t=>t.kind==='reject'&&t.id==='child2'&&t.reason==='split-family'));assert.ok(s.actors.some(a=>a.level===1&&a.x===4&&a.y===5));
});
test('B reports and atomically rolls back a real recurrent split/merge',()=>{const s=B.createState(cycleWell()),before=B.clone(s),trace=[];assert.deepEqual(B.move(s,'active',1,0,{trace:t=>trace.push(t)}),{ok:false,reason:'gravity-cycle'});assert.deepEqual(s,before);assert.ok(trace.filter(t=>t.kind==='split-born').length>=2);});
test('one successful activation per spike terminates the same recurrence',()=>{const s=Once.createState(cycleWell()),r=Once.move(s,'active',1,0);assert.ok(r.ok);assert.equal(r.events.filter(e=>e.type==='split').length,1);assert.ok(s.actors.some(a=>a.x===1&&a.y===3&&a.level===3));});
test('C cannot avoid an upper child when the well has no side exit',()=>{const s=C.createState(cycleWell()),r=C.move(s,'active',1,0);assert.ok(r.ok);assert.ok(s.actors.some(a=>a.x===1&&a.y===2&&a.level===1));});
test('next engine move discards family protection and allows merging',()=>{const s=A.createState(board());A.externalSplit(s,'a',1,0,1);const child=s.actors.find(a=>a.id!=='a'),r=A.move(s,child.id,0,1);assert.ok(r.ok);assert.ok(r.events.some(e=>e.type==='merge'));});
for(const [mode,E] of Object.entries({A,B,C,Once})){
 test(`${mode}: rock and magic gate roofs support all 8 levels`,()=>{for(let level=1;level<=8;level++)for(const kind of ['rock','gate']){
  const st=fixture({actors:[actor('a',3,4,level)],...(kind==='rock'?{walls:[[3,5]]}:{gates:[{x:3,y:5,exact:8}]})});const s=E.createState(st);E.settle(s);assert.equal(s.actors[0].y,4);assert.ok(E.supportsAt(s,3,5,s.actors[0]));
 }});
 test(`${mode}: spikes and mismatching exits do not support`,()=>{for(const terrain of ['spikes','exits']){const s=E.createState(fixture({actors:[actor('a',3,3)], [terrain]:[{x:3,y:4,power:2,exact:8}]}));E.settle(s);assert.equal(s.actors[0].y,6);}});
 test(`${mode}: different species and lower level8 support, lower5 normally merges`,()=>{for(const [species,level,count] of [['fish',5,2],['dog',8,2],['dog',5,1]]){const s=E.createState(fixture({actors:[actor('a',3,5),actor('b',3,6,level,species)]}));E.settle(s);assert.equal(s.actors.length,count);}});
 test(`${mode}: diagonal corner and closed gate remain blocked; exchanges remain symmetric`,()=>{
  const s=E.createState(fixture({gravity:false,actors:[actor('a',2,2)],walls:[[3,2],[2,3]]}));assert.equal(E.move(s,'a',1,1).reason,'corner');
  const t=E.createState(fixture({gravity:false,actors:[actor('a',2,2)],gates:[{x:3,y:2,exact:8}]}));assert.equal(E.move(t,'a',1,0).reason,'gate');
  for(const [dx,dy] of [[0,-1],[1,-1],[1,0],[1,1],[0,1],[-1,1],[-1,0],[-1,-1]]){const u=E.createState(fixture({gravity:false,actors:[actor('a',3,3),actor('b',3+dx,3+dy,2,'fish')]}));assert.ok(E.move(u,'a',dx,dy).ok);assert.equal(u.actors.find(a=>a.id==='b').x,3);assert.equal(u.actors.find(a=>a.id==='b').y,3);}
 });
 test(`${mode}: special/occupied/wall cells are never births, inaccessible ring2 is excluded`,()=>{
  const s=E.createState(fixture({actors:[actor('a',3,3,8),actor('b',2,3)],walls:[[3,2]],gates:[{x:4,y:3,exact:1}],spikes:[{x:3,y:4,power:1}],exits:[{x:4,y:4,exact:1}]}));const p=E.splitCandidates(s,3,3,1,0,s.actors[0]);for(const [x,y] of [[2,3],[3,2],[4,3],[3,4],[4,4]])assert.ok(!p.some(v=>v.x===x&&v.y===y));
  const blocked=E.createState(fixture({actors:[actor('a',3,3,8)],walls:[[2,2],[3,2],[4,2],[2,3],[4,3],[2,4],[3,4],[4,4]]}));assert.deepEqual(E.splitCandidates(blocked,3,3,1,0,blocked.actors[0]),[]);
 });
 test(`${mode}: overflow and multiple spike cascades conserve mass`,()=>{for(const [st,id,d] of [[overflowBoard(),'a',[0,1]],[multipleSpikes(),'a',[0,1]]]){const s=E.createState(st),m=E.mass(s),r=E.move(s,id,...d);assert.equal(E.mass(s),m);assert.ok(r.ok);assert.ok(r.events.some(e=>e.type==='split'));}});
}
test('one activation guard does not consume a spike on a minimum-level no-op',()=>{
 // Same move: the lower 1 passes the spike first; the following 3 must still split.
 const s=Once.createState(fixture({actors:[actor('active',0,6),actor('one',3,3),actor('three',3,1,3)],spikes:[{x:3,y:4,power:1}]})),r=Once.move(s,'active',1,0);
 assert.ok(r.ok);assert.ok(r.events.some(e=>e.type==='split'&&e.id==='three'));
});
test('B-once distinguishes a repeated arrangement with a newly spent spike',()=>{
 const st=fixture({w:5,h:5,actors:[actor('body',1,0,2),actor('active',3,4)],walls:[...[0,2].flatMap(x=>[0,1,2,3,4].map(y=>[x,y]))],spikes:[{x:1,y:1,power:1},{x:1,y:4,power:1}]});
 const s=Once.createState(st),r=Once.move(s,'active',1,0);assert.equal(r.ok,true);assert.equal(r.events.filter(e=>e.type==='split').length,2);assert.ok(s.actors.some(a=>a.x===1&&a.y===4&&a.level===2));assert.equal(Once.mass(s),3);
});
