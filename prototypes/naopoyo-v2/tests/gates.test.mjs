import test from 'node:test';
import assert from 'node:assert/strict';
import {createState,move,externalMove,externalSplit,settle,validState,mass} from '../engine.mjs';
const a=(id,x,y,level)=>({id,x,y,level,species:'dog'});
const board=(actors,extra={})=>({id:'gate-test',w:8,h:8,walls:[],spikes:[],exits:[],gates:[],gravity:false,actors,...extra});
for(const [name,act] of [['manual',move],['external',externalMove]])for(const [dx,dy] of [[1,0],[1,1],[0,1]])test(`${name} overflow cannot put 4 on source exact-8 gate ${dx},${dy}`,()=>{
 const st=board([a('a',2,2,8),a('b',2+dx,2+dy,4)],{gates:[{x:2,y:2,exact:8,open:true}]});
 const s=createState(st),before=structuredClone(s);assert.equal(act(s,'a',dx,dy).ok,false);assert.deepEqual(s,before);
});
test('gravity overflow cannot put remainder on source gate',()=>{const s=createState(board([a('a',2,6,8),a('b',2,7,4)],{gravity:true,gates:[{x:2,y:6,exact:8,open:true}]}));const before=structuredClone(s);settle(s);assert.deepEqual(s,before)});
test('iPhone sequence: enter 8 gate then exchange with 4 rejected; ordinary exit allowed',()=>{
 const s=createState(board([a('a',1,7,8),a('b',3,7,4)],{gravity:true,gates:[{x:2,y:7,exact:8}]}));
 assert.ok(move(s,'a',1,0).ok);const before=structuredClone(s);assert.equal(move(s,'a',1,0).ok,false);assert.deepEqual(s,before);assert.ok(move(s,'a',-1,0).ok);
});
test('merge cannot leave incompatible combined body on destination gate',()=>{const s=createState(board([a('a',1,1,4),a('b',2,1,4)],{gates:[{x:2,y:1,exact:4,open:true}]}));const before=structuredClone(s);assert.equal(move(s,'a',1,0).ok,false);assert.deepEqual(s,before)});
test('restoring incompatible gate occupant rejected even if gate open',()=>{const st=board([a('a',1,7,8),a('b',3,7,4)],{gates:[{x:2,y:7,exact:8}]});const s=createState(st);s.gates[0].open=true;s.actors[1].x=2;assert.equal(validState(st,s),false)});
test('external split cannot change a gate occupant to a forbidden level',()=>{const s=createState(board([a('a',2,2,8)],{gates:[{x:2,y:2,exact:8,open:true}]}));const before=structuredClone(s);assert.equal(externalSplit(s,'a',2).ok,false);assert.deepEqual(s,before)});
test('open flag never grants incompatible direct entry; diagonal destination-only stays legal',()=>{
 const s=createState(board([a('a',1,1,4)],{walls:[[2,1],[1,2]],gates:[{x:2,y:2,exact:8,open:true}]}));assert.equal(move(s,'a',1,1).ok,false);s.gates=[];assert.ok(move(s,'a',1,1).ok);
});
test('legal overflow away from gates and compatible min-gate merge preserved',()=>{
 const st=board([a('a',1,1,8),a('b',2,1,4)],{gates:[{x:2,y:1,min:4,open:true}]});const s=createState(st);assert.ok(move(s,'a',1,0).ok);assert.equal(mass(s),12);assert.ok(validState(st,s));
});
