import test from 'node:test';
import assert from 'node:assert/strict';
import {createState,move,settle,mass,totals,clone,validState} from '../engine.mjs';
const a=(id,x,y,level=1,species='dog')=>({id,x,y,level,species});
const stage=(actors,extra={})=>({id:'completion',w:7,h:7,walls:[],gates:[],exits:[],spikes:[],gravity:false,actors,...extra});
for(let n=1;n<=8;n++)for(let m=1;m<=8;m++)test(`v2 all sums ${n}+${m}`,()=>{
 const st=stage([a('active',2,3,n),a('target',3,3,m)]),s=createState(st),before=clone(s),r=move(s,'active',1,0);
 if(n===8&&m===8){assert.equal(r.ok,false);assert.deepEqual(s,before);return}
 assert.equal(r.ok,true);assert.equal(mass(s),n+m);assert.ok(validState(st,s));
 const active=s.actors.find(a=>a.id==='active');assert.deepEqual([active.x,active.y,active.level],[3,3,Math.min(8,n+m)]);
 assert.equal(s.actors.length,n+m>8?2:1);if(n+m>8){const child=s.actors.find(a=>a.id!=='active');assert.deepEqual([child.x,child.y,child.level],[2,3,n+m-8])}
});
test('gravity 4+5 puts 8 below and 1 above, then stops without ID oscillation',()=>{
 const s=createState(stage([a('top',3,4,4),a('bottom',3,6,5)],{gravity:true}));settle(s);
 assert.deepEqual(s.actors.map(a=>[a.x,a.y,a.level]).sort(),[[3,5,1],[3,6,8]]);const before=clone(s);assert.deepEqual(settle(s),[]);assert.deepEqual(s,before);
});
test('gravity preserves selected lower actor ID',()=>{
 const s=createState(stage([a('active',2,6,3),a('fall',3,4,2)],{gravity:true}));assert.ok(move(s,'active',1,0).ok);
 assert.equal(s.actors.length,1);assert.deepEqual(s.actors[0],a('active',3,6,5));
});
test('split siblings stack on spike for current transaction, next independent gravity merges',()=>{
 const st=stage([a('active',2,5,3)],{gravity:true,spikes:[{x:3,y:5,power:2}]}),s=createState(st);
 const r=move(s,'active',1,0);assert.equal(r.split,2);assert.deepEqual(s.actors.find(a=>a.id==='active'),a('active',3,5,1));
 assert.ok(s.actors.some(a=>a.x===3&&a.y===4&&a.level===1));assert.equal(s.actors.length,3);
 const before=clone(s);settle(s);assert.notDeepEqual(s,before);assert.equal(mass(s),3);assert.ok(validState(st,s));
});
test('a foreign falling actor merges normally with split body',()=>{
 const s=createState(stage([a('active',2,5,2),a('other',3,2,2)],{gravity:true,spikes:[{x:3,y:5,power:1}]}));
 move(s,'active',1,0);assert.equal(s.actors.find(a=>a.id==='active').level,3);assert.equal(mass(s),4);
});
test('occupied spike overflow leaves surplus then splits once',()=>{
 const s=createState(stage([a('active',2,3,4),a('other',3,3,5)],{spikes:[{x:3,y:3,power:3}]}));const r=move(s,'active',1,0);
 assert.equal(r.split,3);assert.equal(s.actors.find(a=>a.id==='active').level,5);assert.equal(s.actors.find(a=>a.x===2&&a.y===3).level,1);assert.equal(mass(s),9);
});
test('gravity enters spikes, triggers once, no repeated split from stationary level changes',()=>{
 const s=createState(stage([a('fall',3,1,5),a('other',3,0,3)],{gravity:true,spikes:[{x:3,y:5,power:2}]}));const events=settle(s);
 assert.equal(events.filter(e=>e.type==='split'&&e.x===3&&e.y===5).length,1);assert.equal(mass(s),8);assert.ok(s.actors.some(a=>a.x===3&&a.y===5));
});
test('different species and 8+8 are stable supports',()=>{
 for(const bottom of [a('b',2,6,8),a('b',2,6,1,'fish')]){const s=createState(stage([a('a',2,3,8),bottom],{gravity:true}));settle(s);assert.equal(s.actors.find(a=>a.id==='a').y,5);assert.equal(s.actors.length,2);assert.deepEqual(settle(s),[])}
});
test('support departure and gravity exit preserve species mass',()=>{
 const st=stage([a('active',2,6,1,'fish'),a('top',2,4,2)],{gravity:true,exits:[{x:2,y:6,exact:2}]}),s=createState(st);
 move(s,'active',1,0);assert.equal(s.rescued,2);assert.deepEqual(totals(s),{dog:2,fish:1});assert.ok(validState(st,s));
});
test('historical spike foothold: another species climbs onto its occupant and remains after release',()=>{
 const st=stage([a('a',2,6,1,'frog'),a('b',3,6,3)],{gravity:true,spikes:[{x:3,y:6,power:2}]}),s=createState(st);
 assert.ok(move(s,'a',1,-1).ok);assert.deepEqual(s.actors.find(a=>a.id==='a'),a('a',3,5,1,'frog'));
 const before=clone(s);assert.deepEqual(settle(s),[]);assert.deepEqual(s,before);
});
test('seeded mixed cascades terminate, deterministic, preserve every species and occupancy',()=>{
 let seed=19523;const rnd=n=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed%n};
 for(let trial=0;trial<200;trial++){
  const actors=[];for(let i=0;i<10;i++)actors.push(a('a'+i,i%5,Math.floor(i/5),1+rnd(8),['dog','fish'][rnd(2)]));
  const st=stage(actors,{gravity:true,spikes:[{x:1,y:5,power:3},{x:3,y:4,power:2}],walls:[[0,6],[5,5]]}),s=createState(st),copy=clone(s),expected=totals(s);
  settle(s);settle(copy);assert.deepEqual(s,copy);assert.deepEqual(totals(s),expected);assert.ok(validState(st,s));
 }
});
