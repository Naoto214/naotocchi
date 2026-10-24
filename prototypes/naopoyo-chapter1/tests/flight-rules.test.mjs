import test from 'node:test';
import assert from 'node:assert/strict';
import * as lab from '../ability-lab.mjs';
import {createState, mass, clone, at} from '../../naopoyo-v2/engine.mjs';
const actor=(id,x,y,level)=>({id,x,y,level,species:'dog'});
const board=(actors,extra={})=>createState({...lab.labStage(),walls:Array.from({length:8},(_,x)=>[x,7]),gates:[],exits:[],spikes:[],actors,...extra});

for(const [family,start] of Object.entries({butterfly:6,cicada:6,beetle:5,stagbeetle:5}))test(`${family} official threshold and lab gate agree`,()=>{
 for(let n=1;n<=8;n++)assert.equal(lab.capability(family,n)==='fly',n>=start);
 const s=createState(lab.labStage(family));assert.equal(s.gates[0].exact,start);
 assert.ok(lab.step(s,'a',1,0).ok);assert.equal(s.actors.find(a=>a.id==='a').level,start);
});
for(let dx=-1;dx<=1;dx++)for(let dy=-1;dy<=1;dy++)if(dx||dy)test(`spike entry ${dx},${dy}: body stays, children settle immediately, deterministic mass`,()=>{
 const s=board([actor('a',3-dx,3-dy,6)],{spikes:[{x:3,y:3,power:3}]}),copy=clone(s),total=mass(s);
 const r=lab.step(s,'a',dx,dy);assert.ok(r.ok);assert.equal(r.id,'a');
 assert.deepEqual(s.actors.find(a=>a.id==='a'),actor('a',3,3,3));
 assert.equal(s.actors.length,4);assert.equal(mass(s),total);
 for(const a of s.actors.filter(a=>a.id!=='a'))assert.ok(a.y===6||at(s.actors,a.x,a.y+1),JSON.stringify(a));
 lab.step(copy,'a',dx,dy);assert.deepEqual(copy,s);
});
test('empty spike does not support the cell above: grounded actor falls into it and splits',()=>{
 const s=board([actor('a',2,2,3)],{spikes:[{x:3,y:3,power:1}]});
 assert.ok(lab.step(s,'a',1,0).ok);assert.deepEqual(s.actors.find(a=>a.id==='a'),actor('a',3,3,2));
});
test('remaining on a spike never fires again; leave and reenter fires anew',()=>{
 const s=board([actor('a',2,3,8),actor('other',0,6,1)],{spikes:[{x:3,y:3,power:1}]});
 lab.step(s,'a',1,0);assert.equal(s.actors.find(a=>a.id==='a').level,7);
 lab.step(s,'other',1,0);assert.equal(s.actors.find(a=>a.id==='a').level,7);
 lab.step(s,'a',1,0);lab.step(s,'a',-1,0);assert.equal(s.actors.find(a=>a.id==='a').level,6);
});
test('flight still respects species terrain and closed gates, without mutating on refusal',()=>{
 for(const extra of [{water:[[3,3]]},{gates:[{x:3,y:3,exact:7}]},{walls:[[3,3]]}]){
  const s=board([actor('a',2,3,6)],extra),before=clone(s);
  assert.equal(lab.step(s,'a',1,0).ok,false);assert.deepEqual(s,before);
 }
});
test('overflow child loses flight and falls immediately while held body keeps its ID',()=>{
 const s=board([actor('a',2,2,6),actor('b',3,2,3)]),total=mass(s);
 assert.ok(lab.step(s,'a',1,0).ok);
 assert.deepEqual(s.actors.find(a=>a.id==='a'),actor('a',3,2,8));
 assert.deepEqual(s.actors.find(a=>a.id==='b'),actor('b',2,6,1));assert.equal(mass(s),total);
});
test('independent light split loses flight in unsupported air and settles in same event',()=>{
 assert.equal(typeof lab.splitInLab,'function');
 const s=board([actor('a',3,2,6)]),total=mass(s);
 const r=lab.splitInLab(s,'a',3);assert.ok(r.ok);assert.equal(r.id,'a');
 const body=s.actors.find(a=>a.id==='a');assert.ok(body.y>2);assert.ok(body.y===6||at(s.actors,body.x,body.y+1));assert.equal(mass(s),total);
});
test('gravity merge gaining flight on a spike still splits using ordinary terrain candidates',()=>{
 const s=board([actor('a',2,1,2),actor('b',3,3,5)],{spikes:[{x:3,y:3,power:1}]});
 const total=mass(s);assert.ok(lab.step(s,'a',1,0).ok);
 assert.equal(s.actors.find(a=>a.id==='a').level,6);
 assert.equal(s.actors.length,2);assert.equal(mass(s),total);
});
