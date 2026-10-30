import test from 'node:test';import assert from 'node:assert/strict';
import {createState,move,settle,mass,validState,splitCandidates,externalMove} from '../../naopoyo-v2/engine.mjs';
const actor=(id,x,y,level=8,species='dog')=>({id,x,y,level,species});
const board=(actors,extra={})=>({id:'contact',w:8,h:8,gravity:false,gravityRules:'supported-v1',movementRules:'contact-v1',walls:[],gates:[],spikes:[],exits:[],actors,...extra});
const pos=a=>[a.x,a.y];
for(const [dx,dy] of [[0,-1],[1,-1],[1,0],[1,1],[0,1],[-1,1],[-1,0],[-1,-1]])for(const mixed of [false,true]){
 test(`8-way exchange ${dx},${dy}, mixed=${mixed}`,()=>{
  const b=board([actor('a',3,3,mixed?2:8),actor('b',3+dx,3+dy,mixed?3:8,mixed?'fish':'dog')]),s=createState(b);
  const r=move(s,'a',dx,dy);assert.equal(r.ok,true);assert.deepEqual(pos(s.actors.find(a=>a.id==='a')),[3+dx,3+dy]);assert.deepEqual(pos(s.actors.find(a=>a.id==='b')),[3,3]);assert.equal(r.swapped,'b');assert.equal(s.moves,1);assert.equal(mass(s),mixed?5:16);assert.ok(validState(b,s));assert.equal(r.events.filter(e=>e.type==='swap').length,1);
 });
}
test('merge and overflow take priority over exchange',()=>{for(const n of [1,4,7]){const s=createState(board([actor('a',2,3,8),actor('b',3,3,n)])),r=move(s,'a',1,0);assert.ok(r.ok);assert.equal(r.overflow,n);assert.equal(r.swapped,undefined);assert.equal(s.actors.find(a=>a.id==='a').level,8);assert.equal(mass(s),8+n);}});
test('blocked merge does not fall back to exchange',()=>{const s=createState(board([actor('a',2,3,4),actor('b',3,3,4)],{gates:[{x:3,y:3,exact:4,open:true}]})),before=structuredClone(s);assert.equal(move(s,'a',1,0).reason,'gate');assert.deepEqual(s,before);});
test('both exchange destinations check gates even when already open',()=>{for(const reverse of [false,true]){const actors=[actor('a',2,3,8),actor('b',3,3,4,'fish')],s=createState(board(actors,{gates:[{x:reverse?2:3,y:3,exact:reverse?8:4,open:true}]})),before=structuredClone(s);assert.equal(move(s,'a',1,0).reason,'gate');assert.deepEqual(s,before);}});
test('reverse species terrain rejection leaves both actors unchanged',()=>{const s=createState(board([actor('a',2,3),actor('b',3,3,3,'fish')])),before=structuredClone(s);assert.equal(move(s,'a',1,0,{canEnter:(_s,a,x)=>a.species!=='fish'||x!==2}).reason,'terrain');assert.deepEqual(s,before);});
test('diagonal gate exchange checks the displaced actor',()=>{const s=createState(board([actor('a',2,3,8),actor('b',3,2,4,'fish')],{gates:[{x:2,y:3,exact:8,open:true}]})),before=structuredClone(s);assert.equal(move(s,'a',1,-1).reason,'gate');assert.deepEqual(s,before);});
test('two rock sides block diagonal empty entry and exchange; one side permits',()=>{for(const target of [false,true])for(const both of [false,true]){const actors=[actor('a',2,3),...(target?[actor('b',3,2)]:[])],s=createState(board(actors,{walls:both?[[3,3],[2,2]]:[[3,3]]})),before=structuredClone(s),r=move(s,'a',1,-1);assert.equal(r.ok,!both);if(both){assert.equal(r.reason,'corner');assert.deepEqual(s,before);}}});
test('actors and adjacent closed gates do not become corner walls',()=>{for(const gates of [false,true]){const s=createState(board([actor('a',2,3),...(gates?[]:[actor('c',3,3),actor('d',2,2)])],{gates:gates?[{x:3,y:3,exact:1},{x:2,y:2,exact:1}]:[]}));assert.ok(move(s,'a',1,-1).ok);}});
test('split placement cannot tunnel through a double-rock corner',()=>{const s=createState(board([actor('a',2,2)],{walls:[[1,2],[2,1],[3,2],[2,3]]}));assert.deepEqual(splitCandidates(s,2,2,1,0,s.actors[0]),[]);});
test('gravity exchange validates ascent for displaced actor and cannot exchange vertically',()=>{
 const s=createState(board([actor('a',2,5),actor('b',3,6,1,'fish')],{gravity:true,walls:[[3,7]]})),before=structuredClone(s);
 assert.equal(move(s,'a',1,1).reason,'foothold');assert.deepEqual(s,before);
 for(const dy of [-1,1]){const v=createState(board([actor('a',2,dy<0?7:6),actor('b',2,dy<0?6:7)],{gravity:true})),old=structuredClone(v);assert.equal(move(v,'a',0,dy).reason,'foothold');assert.deepEqual(v,old);}
});
test('legal supported diagonal exchange stabilizes both actors immediately',()=>{
 const s=createState(board([actor('a',2,7),actor('b',3,6)],{gravity:true,walls:[[3,7]]})),r=move(s,'a',1,-1);assert.ok(r.ok);assert.equal(r.swapped,'b');assert.deepEqual(pos(s.actors.find(a=>a.id==='a')),[3,6]);assert.deepEqual(pos(s.actors.find(a=>a.id==='b')),[2,7]);
});
test('exchange then unsupported partner falls in same operation',()=>{
 const s=createState(board([actor('a',2,5),actor('b',3,5,1,'fish')],{gravity:true,walls:[[3,6]]})),r=move(s,'a',1,0);assert.ok(r.ok);assert.deepEqual(pos(s.actors.find(a=>a.id==='b')),[2,7]);assert.ok(r.events.some(e=>e.type==='fall'&&e.id==='b'));
});
test('gravity never exchanges nonmerging actors',()=>{const s=createState(board([actor('a',2,6),actor('b',2,7)],{gravity:true})),before=structuredClone(s);assert.deepEqual(settle(s),[]);assert.deepEqual(s,before);});
for(const level of [1,3,5,8])test(`exact-3 exit is traversable for level ${level}`,()=>{
 const b=board([actor('a',2,3,level)],{exits:[{x:3,y:3,exact:3}]}),s=createState(b),r=move(s,'a',1,0);assert.ok(r.ok);assert.equal(s.rescued,level===3?3:0);assert.equal(s.actors.length,level===3?0:1);assert.ok(validState(b,s));if(level!==3)assert.ok(move(s,'a',1,0).ok);
});
test('exit offers no support and mismatched actor falls through it',()=>{
 const s=createState(board([actor('a',2,6,5)],{gravity:true,walls:[[2,7]],exits:[{x:3,y:6,exact:3}]}));assert.equal(move(s,'a',1,-1).reason,'foothold');assert.ok(move(s,'a',1,0).ok);assert.deepEqual(pos(s.actors[0]),[3,7]);assert.equal(s.rescued,0);
 const upper=createState(board([actor('a',3,4,5)],{gravity:true,exits:[{x:3,y:6,exact:3}]}));settle(upper);assert.deepEqual(pos(upper.actors[0]),[3,7]);
});
test('gravity rescue occurs at matching exit before further falling',()=>{const s=createState(board([actor('a',3,3,3)],{gravity:true,exits:[{x:3,y:5,exact:3}]}));settle(s);assert.equal(s.rescued,3);assert.equal(s.actors.length,0);});
test('exchange rescues matching arrival while preserving mismatched partner',()=>{
 const b=board([actor('a',2,3,3),actor('b',3,3,2,'fish')],{exits:[{x:3,y:3,exact:3}]}),s=createState(b),r=move(s,'a',1,0);assert.ok(r.ok);assert.equal(s.rescued,3);assert.deepEqual(pos(s.actors[0]),[2,3]);assert.ok(validState(b,s));
});
test('displaced actor also gets rescued on reverse exit entry',()=>{const s=createState(board([actor('a',2,3,2),actor('b',3,3,3,'fish')],{exits:[{x:2,y:3,exact:3}]})),r=move(s,'a',1,0);assert.ok(r.ok);assert.equal(s.rescued,3);assert.equal(s.actors[0].id,'a');});
test('merge result and overflow remainder independently satisfy exits',()=>{const s=createState(board([actor('a',2,3,6),actor('b',3,3,6)],{exits:[{x:2,y:3,exact:4},{x:3,y:3,exact:8}]})),r=move(s,'a',1,0);assert.ok(r.ok);assert.equal(s.rescued,12);assert.equal(s.actors.length,0);assert.equal(r.events.filter(e=>e.type==='rescue').length,2);});
test('exchange dispatches actual spike entry for both participants',()=>{for(const reverse of [false,true]){const s=createState(board([actor('a',2,3,8),actor('b',3,3,8)],{spikes:[{x:reverse?2:3,y:3,power:2}]})),r=move(s,'a',1,0);assert.ok(r.ok);assert.ok(r.events.some(e=>e.type==='split'&&e.id===(reverse?'b':'a')));assert.equal(mass(s),16);const before=structuredClone(s);settle(s);assert.deepEqual(s,before);}});
test('exchange plus split and gravity is deterministic and conserves mass',()=>{const b=board([actor('a',2,5),actor('b',3,5,4,'fish')],{gravity:true,walls:[[2,6],[3,6]],spikes:[{x:2,y:5,power:2},{x:3,y:5,power:2}]}),s=createState(b),t=createState(b);const r=move(s,'a',1,0);assert.ok(r.ok);assert.equal(r.swapped,'b');assert.ok(r.events.some(e=>e.type==='split'));assert.ok(r.events.some(e=>e.type==='fall'));assert.deepEqual(r,move(t,'a',1,0));assert.deepEqual(s,t);assert.equal(mass(s),12);assert.ok(validState(b,s));});
test('movement version is checked on restore and invalid gate occupant rejected',()=>{const b=board([actor('a',2,3)]),s=createState(b);delete s.movementRules;assert.equal(validState(b,s),false);const g=board([actor('a',2,3,4)],{gates:[{x:2,y:3,exact:8,open:true}]});assert.equal(validState(g,createState(g)),false);});
test('injected cycle error after exchange rolls back positions and move count',()=>{const s=createState(board([actor('a',2,7),actor('b',3,7)],{gravity:true})),before=structuredClone(s);assert.equal(move(s,'a',1,0,{canFall(){throw Error('gravity-cycle')}}).reason,'gravity-cycle');assert.deepEqual(s,before);});
test('overflow4 cannot return to an 8-only gate',()=>{const s=createState(board([actor('a',2,3,8),actor('b',3,3,4)],{gates:[{x:2,y:3,exact:8,open:true}]})),before=structuredClone(s);assert.equal(move(s,'a',1,0).reason,'gate');assert.deepEqual(s,before);});
test('external contact also validates reverse ascent',()=>{const s=createState(board([actor('a',2,6),actor('b',2,7)],{gravity:true}));assert.equal(externalMove(s,'a',0,1).reason,'foothold');});
test('omitted movement version keeps old saturation, corner and exit behavior',()=>{
 const b=board([actor('a',2,3),actor('b',3,3)]);delete b.movementRules;assert.equal(move(createState(b),'a',1,0).reason,'saturated');
 const c={...b,actors:[actor('a',2,3)],walls:[[3,3],[2,2]]};assert.ok(move(createState(c),'a',1,-1).ok);
 assert.equal(move(createState({...b,actors:[actor('a',2,3)],exits:[{x:3,y:3,exact:3}]}),'a',1,0).reason,'exit');
});
test('two spike exchange reports each child once and aggregates split count',()=>{const s=createState(board([actor('a',2,3),actor('b',3,3)],{spikes:[{x:2,y:3,power:2},{x:3,y:3,power:2}]})),r=move(s,'a',1,0);assert.ok(r.ok);const births=r.events.flatMap(e=>e.children||[]);assert.equal(new Set(births.map(a=>a.id)).size,births.length);assert.equal(r.split,4);assert.equal(r.children.length,4);});
for(const terrain of ['gate','exit','spike'])test(`rollback restores ${terrain} effect before later gravity failure`,()=>{
 const extra={gravity:true,walls:[[3,6]],...(terrain==='gate'?{gates:[{x:2,y:6,exact:4}]}:terrain==='exit'?{exits:[{x:2,y:6,exact:4}]}:{spikes:[{x:2,y:6,power:2}]})};
 const s=createState(board([actor('a',2,5),actor('b',3,5,4,'fish')],extra)),before=structuredClone(s);let calls=0;
 const r=move(s,'a',1,0,{canFall(){if(++calls===2)throw Error('gravity-cycle');return true}});assert.equal(r.reason,'gravity-cycle');assert.equal(calls,2);assert.deepEqual(s,before);
});
