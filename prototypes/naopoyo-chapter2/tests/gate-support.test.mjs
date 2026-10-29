import test from 'node:test';
import assert from 'node:assert/strict';
import {createState,move,settle,supportsAt,validState,mass,externalSplit} from '../../naopoyo-v2/engine.mjs';
const actor=(id,x,y,level=8,species='dog')=>({id,x,y,level,species});
const board=(actors,extra={})=>({id:'roof',w:8,h:8,gravity:true,gravityRules:'supported-v1',movementRules:'contact-v1',terrainRules:'magic-gate-v2',walls:[],gates:[{x:3,y:7,exact:8}],spikes:[],exits:[],actors,...extra});
for(let level=1;level<=8;level++){
 test(`gate roof supports and permits grounded ascent for level ${level}`,()=>{
  const s=createState(board([actor('a',2,7,level)]));
  assert.equal(supportsAt(s,3,7,s.actors[0]),true);
  assert.equal(move(s,'a',1,-1).ok,true);
  assert.deepEqual([s.actors[0].x,s.actors[0].y],[3,6]);
  const settled=structuredClone(s);assert.deepEqual(settle(s),[]);assert.deepEqual(s,settled);
 });
 test(`gate landing is stable and lateral entry is qualified for level ${level}`,()=>{
  const s=createState(board([actor('a',3,3,level)]));settle(s);
  assert.deepEqual([s.actors[0].x,s.actors[0].y],[3,6]);
  assert.equal(move(s,'a',0,1).ok,false);assert.deepEqual(settle(s),[]);
  const b=board([actor('a',2,7,level)]),side=createState(b),before=structuredClone(side);
  const r=move(side,'a',1,0);assert.equal(r.ok,level===8);
  if(level===8){assert.ok(validState(b,side));assert.equal(side.actors[0].x,3);assert.ok(r.events.some(e=>e.type==='phase'));assert.equal(move(side,'a',1,0).ok,true);}
  else assert.deepEqual(side,before);
 });
 test(`roof does not allow airborne ascent or closed corner for level ${level}`,()=>{
  const air=createState(board([actor('a',2,5,level)],{gates:[{x:3,y:5,exact:8}]}));assert.equal(move(air,'a',1,-1).reason,'foothold');
  const s=createState(board([actor('a',2,7,level)],{walls:[[2,6]]})),before=structuredClone(s);
  assert.equal(move(s,'a',1,-1).ok,false);assert.deepEqual(s,before);
 });
}
test('stage19 right pocket: rock and roof stop diagonal, matching side passage remains legal',()=>{
 const b=board([actor('a',7,7)],{walls:[[2,6],[4,6],[7,6]],gates:[{x:2,y:7,exact:8},{x:6,y:7,exact:8}]}),s=createState(b),before=structuredClone(s);
 assert.equal(move(s,'a',0,-1).ok,false);assert.equal(move(s,'a',-1,-1).ok,false);assert.deepEqual(s,before);
 assert.equal(move(s,'a',-1,0).ok,true);assert.deepEqual([s.actors[0].x,s.actors[0].y],[6,7]);
 assert.equal(move(s,'a',0,-1).ok,false,'cannot rise through the solid upper face');
 assert.equal(move(s,'a',-1,0).ok,true);assert.equal(move(s,'a',1,-1).ok,true,'can go around the open left corner onto roof');
 assert.deepEqual([s.actors[0].x,s.actors[0].y],[6,6]);
});
test('gate interior can fall out below, but a falling actor above stops on roof',()=>{
 const b=board([actor('a',2,4)],{gravity:false,gates:[{x:3,y:4,exact:8}]}),s=createState(b);
 assert.ok(move(s,'a',1,0).ok);s.gravity=true;settle(s);assert.equal(s.actors[0].y,7);
});
test('reverse diagonal exchange cannot cut a closed roof-rock corner',()=>{
 const s=createState(board([actor('a',2,7),actor('b',3,6,8,'fish')],{walls:[[2,6]]})),before=structuredClone(s);
 assert.equal(move(s,'b',-1,1).ok,false);assert.deepEqual(s,before);
});
test('exchange and overflow preserve interior qualification transactionally',()=>{
 for(const level of [3,8]){const s=createState(board([actor('a',2,7,level,'fish'),actor('b',3,7)],{gates:[{x:3,y:7,exact:8,open:true}]})),before=structuredClone(s);assert.equal(move(s,'a',1,0).ok,level===8);if(level!==8)assert.deepEqual(s,before);}
 const s=createState(board([actor('a',3,7),actor('b',4,7,4)],{gates:[{x:3,y:7,exact:8,open:true}]})),before=structuredClone(s);
 assert.equal(move(s,'a',1,0).reason,'gate');assert.deepEqual(s,before);assert.equal(externalSplit(s,'a',2).reason,'gate');assert.deepEqual(s,before);assert.equal(mass(s),12);
});
test('roof version cannot restore old terrain snapshots',()=>{
 const b=board([actor('a',2,7)]),s=createState(b);s.terrainRules='magic-rock-v1';assert.equal(validState(b,s),false);
});
