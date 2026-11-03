import test from 'node:test';import assert from 'node:assert/strict';
import {createState,move,settle,mass,validState} from '../../naopoyo-v2/engine.mjs';
const actor=(id,x,y,level=1,species='dog')=>({id,x,y,level,species});
const board=(actors,extra={})=>({id:'gravity-rules',w:8,h:8,gravity:true,gravityRules:'supported-v1',walls:[],gates:[],spikes:[],exits:[],actors,...extra});
for(let n=1;n<=8;n++){
 test(`stage ${n}: unsupported upper spike is not a foothold`,()=>{
  const s=createState(board([actor('a',2,7,n)],{walls:[[1,7]],spikes:[{x:2,y:6,power:3}]})),before=structuredClone(s);
  assert.deepEqual(move(s,'a',0,-1),{ok:false,reason:'foothold'});assert.deepEqual(s,before);
 });
 test(`stage ${n}: rock diagonal step and destination-only corner crossing`,()=>{
  const s=createState(board([actor('a',2,7,n)],{walls:[[3,7]]}));assert.ok(move(s,'a',1,-1).ok);assert.equal(s.actors[0].y,6);
 });
 test(`stage ${n}: unrelated side rock cannot grant diagonal air ascent`,()=>{
  const s=createState(board([actor('a',2,7,n)],{walls:[[1,7]]}));assert.equal(move(s,'a',1,-1).reason,'foothold');
 });
 test(`stage ${n}: airborne departure cannot ascend even onto a ledge`,()=>{
  const s=createState(board([actor('a',2,5,n)],{walls:[[3,5]]}));assert.equal(move(s,'a',1,-1).reason,'foothold');
 });
}
test('spike occupant and fragments fall during same event',()=>{
 const s=createState(board([actor('a',2,4,6)],{walls:[[2,5]],spikes:[{x:3,y:4,power:3}]}));const r=move(s,'a',1,0);
 assert.ok(r.ok);assert.equal(r.split,3);assert.equal(mass(s),6);assert.ok(s.actors.every(a=>a.y!==4||a.x===2));assert.ok(r.events.some(e=>e.type==='fall'&&e.id==='a'));
});
test('initial unsupported spike occupant falls without triggering a new entry',()=>{
 const s=createState(board([actor('a',3,3,4)],{spikes:[{x:3,y:3,power:3}]}));settle(s);assert.equal(s.actors[0].y,7);assert.equal(s.actors[0].level,4);
});
test('8 on 1..7 is legal ascent followed by automatic merge/overflow; 8 on 8 stays',()=>{
 for(let n=1;n<=8;n++){
  const s=createState(board([actor('a',2,7,8),actor('b',3,7,n)])),r=move(s,'a',1,-1);
  assert.ok(r.ok);assert.equal(mass(s),8+n);assert.equal(s.actors.find(a=>a.id==='a').y,n===8?6:7);
  assert.equal(r.events.some(e=>e.type==='merge'&&e.overflow===n),n!==8);
 }
});
test('rule version cannot be injected or omitted in saved state',()=>{
 const b=board([actor('a',2,7)]),s=createState(b);assert.ok(validState(b,s));delete s.gravityRules;assert.equal(validState(b,s),false);
});
for(const power of [1,2,3])for(const [dx,dy]of [[0,-1],[1,-1],[1,0],[1,1],[0,1],[-1,1],[-1,0],[-1,-1]])test(`power ${power}: all-direction entry (${dx},${dy}) uses v2 calculation`,()=>{
 const b=board([actor('a',3-dx,3-dy,6)],{gravity:false,spikes:[{x:3,y:3,power}]});const s=createState(b),r=move(s,'a',dx,dy);assert.ok(r.ok);assert.equal(r.split,power);assert.equal(mass(s),6);assert.equal(s.actors.find(a=>a.id==='a').level,6-power);assert.ok(validState(b,s));
});
test('supported spike fires once while stationary, again after leaving and reentering',()=>{
 const s=createState(board([actor('a',2,7,8)],{spikes:[{x:3,y:7,power:1}]}));
 assert.equal(move(s,'a',1,0).split,1);const after=structuredClone(s);settle(s);assert.deepEqual(s,after);
 assert.ok(move(s,'a',1,0).ok);assert.equal(move(s,'a',-1,0).split,1);assert.equal(mass(s),8);
});
test('level 1 and blocked/partial split can pass legally',()=>{
 for(const n of [1,6]){const s=createState(board([actor('a',2,7,n)],{spikes:[{x:3,y:7,power:3}]}));const r=move(s,'a',1,0);assert.ok(r.ok);assert.equal(r.split,n===1?0:3);assert.equal(mass(s),n);}
 const walls=[];for(let y=0;y<8;y++)for(let x=0;x<8;x++)if(![[3,3],[3,4],[3,5]].some(p=>p[0]===x&&p[1]===y))walls.push([x,y]);
 const s=createState(board([actor('a',3,4,8)],{gravity:false,walls,spikes:[{x:3,y:3,power:3}]}));assert.equal(move(s,'a',0,-1).split,2);assert.equal(mass(s),8);
});
test('separate actors entering the same spike in one cascade each split',()=>{
 const s=createState(board([actor('a',3,4,4),actor('b',3,2,4,'fish')],{spikes:[{x:3,y:5,power:1}]}));const events=settle(s);assert.equal(events.filter(e=>e.type==='split').length,2);assert.equal(mass(s),8);
});
test('a closed exit physically blocks falling and provides the same ascent support',()=>{
 const s=createState(board([actor('a',2,6,5)],{walls:[[2,7]],exits:[{x:3,y:6,exact:3}]}));
 const r=move(s,'a',1,-1);assert.ok(r.ok);assert.deepEqual([s.actors[0].x,s.actors[0].y],[3,5]);
 const allowed=createState(board([actor('a',2,6,3)],{walls:[[2,7]],exits:[{x:3,y:6,exact:3}]}));assert.equal(move(allowed,'a',1,-1).reason,'foothold');
});
test('overflow remaining on its original spike is not a new entry',async()=>{
 const {externalMove}=await import('../../naopoyo-v2/engine.mjs');
 const s=createState(board([actor('a',2,7,8),actor('b',3,7,4)],{spikes:[{x:2,y:7,power:3}]}));
 const r=externalMove(s,'a',1,0,{},'b');assert.ok(r.ok);assert.equal(s.actors.find(a=>a.id==='a').level,4);assert.equal(r.events.filter(e=>e.type==='split').length,0);assert.equal(mass(s),12);
});
test('external split rolls back a detected gravity cycle atomically (guard fault injection)',async()=>{
 const {externalSplit}=await import('../../naopoyo-v2/engine.mjs');const s=createState(board([actor('a',3,3,6)])),before=structuredClone(s);
 const r=externalSplit(s,'a',3,1,0,{canFall(){throw Error('gravity-cycle')}});assert.deepEqual(r,{ok:false,reason:'gravity-cycle',children:[]});assert.deepEqual(s,before);
});
