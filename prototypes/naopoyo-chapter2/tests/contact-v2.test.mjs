import test from 'node:test';import assert from 'node:assert/strict';
import {createState,move,mass,settle,validState} from '../../naopoyo-v2/engine.mjs';
import {ForestSession,visualActors} from '../session.mjs';
const actor=(id,x,y,level,species='dog')=>({id,x,y,level,species});
const board=(actors,extra={})=>({id:'komorebi-contact-v2',w:8,h:8,gravity:false,gravityRules:'supported-v1',movementRules:'contact-v2',terrainRules:'magic-gate-v2',splitRules:'recombine-once-v1',walls:[],gates:[],spikes:[],exits:[],water:[],events:[],guests:[],actors,...extra});
const dirs=[[0,-1],[1,-1],[1,0],[1,1],[0,1],[-1,1],[-1,0],[-1,-1]];
for(const [dx,dy] of dirs)for(let a=1;a<=8;a++)for(let b=1;b<=8;b++)test(`same ${a}+${b} direction ${dx},${dy}`,()=>{
 const stage=board([actor('held',3,3,a),actor('other',3+dx,3+dy,b)]),s=createState(stage),r=move(s,'held',dx,dy);
 assert.ok(r.ok);assert.equal(r.swapped,undefined);assert.equal(r.events[0].type,'merge');assert.equal(r.overflow,Math.max(0,a+b-8));
 assert.deepEqual(s.actors.find(x=>x.id==='held'),actor('held',3+dx,3+dy,Math.min(8,a+b)));
 if(a+b>8)assert.deepEqual(s.actors.find(x=>x.id==='other'),actor('other',3,3,a+b-8));else assert.equal(s.actors.length,1);
 assert.equal(mass(s),a+b);assert.ok(validState(stage,s));
});
for(const [dx,dy] of dirs)test(`mixed swaps ${dx},${dy}`,()=>{const s=createState(board([actor('a',3,3,8),actor('b',3+dx,3+dy,4,'fish')])),r=move(s,'a',dx,dy);assert.ok(r.ok);assert.equal(r.events[0].type,'swap');assert.equal(r.swapped,'b');assert.equal(mass(s),12);});
test('new rule rejects old saves and retains stable saturated gravity support',()=>{
 const b=board([actor('a',3,6,8),actor('b',3,7,8)],{gravity:true}),s=createState(b),before=structuredClone(s);assert.deepEqual(settle(s),[]);assert.deepEqual(s,before);assert.equal(validState({...b,movementRules:'contact-v1'},s),false);
});
test('same8 downward manual contact is a merge, never an illegal reverse ascent',()=>{const b=board([actor('a',3,6,8),actor('b',3,7,8)],{gravity:true}),s=createState(b),r=move(s,'a',0,1);assert.ok(r.ok);assert.equal(r.events[0].type,'merge');assert.equal(mass(s),16);});
test('new rule preserves double corner, gate roof, both mixed destinations',()=>{
 for(const extra of [{walls:[[4,3],[3,2]]},{gates:[{x:4,y:2,exact:4}]}]){const s=createState(board([actor('a',3,3,8),actor('b',4,2,8)],extra)),old=structuredClone(s);assert.equal(move(s,'a',1,-1).ok,false);assert.deepEqual(s,old);}
 const s=createState(board([actor('a',3,3,8),actor('b',4,3,4,'fish')],{gates:[{x:3,y:3,exact:8,open:true}]}));assert.equal(move(s,'a',1,0).reason,'gate');
});
test('same8 gesture ID, save restoration, Undo, retry, reduced motion',()=>{const b=board([actor('a',3,3,8),actor('b',4,3,8)]),q=new ForestSession(b),old=structuredClone(q.state);q.begin('a',{x:3.5,y:3.5});q.travel({x:4.5,y:3.5});assert.equal(q.active.id,'a');assert.equal(q.lastResults[0].events[0].type,'merge');q.end();const z=new ForestSession(b,q.serialize());assert.ok(z.restored);assert.deepEqual(z.state,q.state);q.animate(0,true);assert.equal(q.motion.length,0);z.undo();assert.deepEqual(z.state,old);z.reset();assert.deepEqual(z.state,old);});
