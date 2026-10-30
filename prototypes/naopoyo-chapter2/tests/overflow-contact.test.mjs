import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {actor,board,directions,screenshotBoard,mirror,trace,environment} from './overflow-contact-fixtures.mjs';
import {createState,move,clone,mass,validState,settle,complete} from '../../naopoyo-v2/engine.mjs';
import {ForestSession,visualActors} from '../session.mjs';
import {ExampleReplay} from '../example-replay.mjs';
import {stages} from '../stages.mjs';
import {render} from '../render.mjs';
const cells=s=>s.actors.map(({x,y,level,species})=>({x,y,level,species})).sort((a,b)=>a.y-b.y||a.x-b.x);
const view=s=>s.map(({id,x,y,level})=>({id,x,y,level})).sort((a,b)=>a.id.localeCompare(b.id));
function integrity(b,s){assert.ok(validState(b,s));assert.equal(mass(s),mass(createState(b)));assert.equal(new Set(s.actors.map(a=>a.id)).size,s.actors.length);}

for(const reflected of [false,true])test(`screenshot A/B same initial state, mirrored=${reflected}`,()=>{
 const b=reflected?mirror(screenshotBoard()):screenshotBoard(),sign=reflected?-1:1;
 const a=trace(b,'four',sign,0),c=trace(b,'eight',-sign,0);
 assert.deepEqual(a.before,c.before);
 for(const t of [a,c]){
  assert.ok(t.result.ok);assert.equal(t.result.overflow,4);assert.equal(t.result.swapped,undefined);
  assert.deepEqual(t.result.events.map(e=>e.type),['merge']);assert.deepEqual(t.result.falls,[]);
  assert.equal(t.after.moves,1);integrity(b,t.after);
  const held=t.after.actors.find(v=>v.id===t.selected.id),rest=t.after.actors.find(v=>v.id===t.target.id);
  assert.deepEqual([held.x,held.y,held.level],[t.target.x,t.target.y,8]);
  assert.deepEqual([rest.x,rest.y,rest.level],[t.selected.x,t.selected.y,4]);
 }
 assert.deepEqual(cells(a.after),cells(a.before),'4→8 leaves the number layout unchanged, not a rejection');
 assert.notDeepEqual(view(a.after.actors),view(a.before.actors),'IDs and levels really change');
 assert.notDeepEqual(cells(c.after),cells(c.before));
 assert.ok(move(c.after,'eight',sign,0).ok);
 assert.deepEqual(cells(c.after),cells(c.before),'8 can return through another merge/overflow');
});

for(const [dx,dy] of directions)for(const [a,b,species] of [[4,8,'dog'],[8,4,'dog'],[6,6,'dog'],[8,8,'dog'],[4,8,'fish']]){
 test(`contact ${a}→${b}/${species}, direction ${dx},${dy}`,()=>{
  const stage=board([actor('a',3,3,a),actor('b',3+dx,3+dy,b,species)]),s=createState(stage),r=move(s,'a',dx,dy);
  assert.ok(r.ok);integrity(stage,s);assert.equal(s.moves,1);
  assert.deepEqual([s.actors[0].x,s.actors[0].y],[3+dx,3+dy]);assert.deepEqual([s.actors[1].x,s.actors[1].y],[3,3]);
  if(species!=='dog'){assert.equal(r.swapped,'b');assert.deepEqual(r.events.map(e=>e.type),['swap']);assert.deepEqual(s.actors.map(a=>a.level),[a,b]);}
  else {assert.equal(r.swapped,undefined);assert.equal(r.overflow,a+b-8);assert.deepEqual(r.events.map(e=>e.type),['merge']);assert.deepEqual(s.actors.map(a=>a.level),[8,a+b-8]);}
 });
}
for(const name of ['floor','rock','gate','spike','exit','neighbor'])for(const id of ['four','eight'])for(const reflected of [false,true]){
 test(`${name}, ${id} selected, mirrored=${reflected}`,()=>{
  let b=environment(name);if(reflected)b=mirror(b);
  const r=trace(b,id,(id==='four'?1:-1)*(reflected?-1:1),0);
  assert.ok(r.result.ok);assert.equal(r.result.overflow,4);assert.equal(r.result.swapped,undefined);integrity(b,r.after);
  assert.deepEqual(r.result.events.map(e=>e.type),['merge']);
  assert.ok(r.after.actors.every(a=>a.y===r.before.actors.find(b=>b.id===a.id).y));
 });
}
for(const [dx,dy] of directions)for(const [a,b] of [[4,8],[8,4]])test(`gravity contact ${a}→${b}, ${dx},${dy}: mirror parity and stable result`,()=>{
 const stage=board([actor('a',3,4,a),actor('b',3+dx,4+dy,b)],{gravity:true});
 // Supports both starting positions without placing a wall in either actor.
 stage.walls=stage.actors.map(a=>[a.x,a.y+1]).filter(([x,y])=>!stage.actors.some(a=>a.x===x&&a.y===y));
 const l=trace(stage,'a',dx,dy),r=trace(mirror(stage),'a',-dx,dy);
 assert.equal(l.result.ok,r.result.ok);assert.equal(l.result.reason,r.result.reason);
 assert.deepEqual(cells(l.after),cells(mirror(r.after)));integrity(stage,l.after);
 if(l.result.ok){const stable=clone(l.after);assert.deepEqual(settle(stable),[]);assert.deepEqual(stable,l.after);}
 else assert.deepEqual(l.after,l.before);
});
test('overflow remainder falls independently from the destination eight',()=>{
 const stage=board([actor('four',3,4,4),actor('eight',4,4,8)],{gravity:true,walls:[[3,5]]}),s=createState(stage);
 // Exercise a manual step before stabilization, as supported by move().
 const r=move(s,'eight',-1,0);assert.ok(r.ok);assert.equal(r.overflow,4);
 assert.deepEqual(s.actors.map(a=>[a.id,a.level,a.x,a.y]),[['four',4,4,7],['eight',8,3,4]]);
 assert.equal(r.events.filter(e=>e.type==='fall').length,3);integrity(stage,s);
});
test('incoming actor must match an occupied gate before merge/overflow',()=>{
 for(const id of ['four','eight']){
  const stage=environment('floor');stage.gates=[{x:3,y:7,exact:4,open:true},{x:4,y:7,exact:8,open:true}];
  const s=createState(stage),before=clone(s),r=move(s,id,id==='four'?1:-1,0);
  assert.equal(r.ok,false);assert.equal(r.reason,'gate');assert.deepEqual(s,before);
 }
});
test('vertical starting arrangements differ because automatic gravity precedes input',()=>{
 const lower8=board([actor('four',3,6,4),actor('eight',3,7,8)],{gravity:true});
 const a=createState(lower8);assert.deepEqual(settle(a),[]);
 assert.equal(move(a,'eight',0,-1).reason,'foothold');
 const r=move(a,'four',0,1);assert.ok(r.ok);assert.equal(r.overflow,4);integrity(lower8,a);
 const lower4=board([actor('eight',3,6,8),actor('four',3,7,4)],{gravity:true});
 const b=createState(lower4),events=settle(b);assert.deepEqual(events.map(e=>e.type),['merge','fall']);
 assert.deepEqual(b.actors.map(a=>[a.id,a.level,a.y]),[['eight',8,7],['four',4,6]]);integrity(lower4,b);
});
for(const width of [320,375,390,430])for(const id of ['four','eight'])test(`actual renderer number/foot coordinates ${width}px, ${id}`,()=>{
 const q=new ForestSession(screenshotBoard()),a=q.state.actors.find(a=>a.id===id),dx=id==='four'?1:-1;
 q.begin(id,{x:a.x+.5,y:a.y+.5});q.travel({x:a.x+.5+dx,y:a.y+.5});q.end();q.animate(1000);
 const text=[],feet=[],noop=()=>{},gradient=()=>({addColorStop:noop});
 const c=new Proxy({fillText:(value,x,y)=>text.push({value,x,y}),ellipse:(x,y)=>feet.push({x,y}),createLinearGradient:gradient,createRadialGradient:gradient,measureText:()=>({width:1})},{get:(o,k)=>k in o?o[k]:noop});
 render({getBoundingClientRect:()=>({width}),getContext:()=>c},q,{dpr:1,reducedMotion:true});
 const cell=width/8;
 for(const a of q.state.actors){assert.ok(text.some(t=>t.value===a.level&&t.x===(a.x+.5)*cell&&t.y===(a.y+.18)*cell));assert.ok(feet.some(f=>f.x===(a.x+.5)*cell&&f.y===(a.y+.96)*cell));}
});
for(const id of ['four','eight'])test(`screenshot ${id}: animation endpoint, held ID, save/undo/retry`,()=>{
 const stage=stages[9],q=new ForestSession(stage),initial=clone(q.state);
 q.state=createState(screenshotBoard());const before=clone(q.state),selected=q.state.actors.find(a=>a.id===id),dx=id==='four'?1:-1;
 q.begin(id,{x:selected.x+.5,y:selected.y+.5});assert.ok(q.travel({x:selected.x+.5+dx,y:selected.y+.5})[0].ok);
 assert.equal(q.active.id,id);assert.equal(q.state.actors.find(a=>a.id===id).level,8);
 q.end();assert.equal(q.history.length,1);const after=clone(q.state);
 for(let i=0;i<10;i++){q.animate(10);assert.ok(visualActors(q).every(a=>Number.isFinite(a.x)&&Number.isFinite(a.y)));assert.deepEqual(q.state,after);}
 q.animate(1000);assert.deepEqual(view(visualActors(q)),view(q.state.actors));
 const restored=new ForestSession(stage,q.serialize());assert.ok(restored.restored);assert.deepEqual(restored.state,after);
 assert.ok(restored.undo());assert.deepEqual(restored.state,before);
 q.retry();assert.deepEqual(q.state,initial);assert.equal(q.history.length,0);
});
for(const stage of stages)test(`shipped example ${stage.number}: every move save/back/next, final rendering and normal-state isolation`,()=>{
 const example=JSON.parse(fs.readFileSync(new URL(`../examples/${stage.number}.json`,import.meta.url))),replay=new ExampleReplay(stage,example.path),normal=new ForestSession(stage),untouched=normal.serialize();
 if(stage.number===19)assert.equal(example.path.length,78);if(stage.number===20)assert.equal(example.path.length,97);
 for(let i=0;i<example.path.length;i++){
  const before=clone(replay.session.state);replay.next();const after=clone(replay.session.state);
  replay.session.animate(10000);assert.deepEqual(view(visualActors(replay.session)),view(after.actors));integrity(stage,after);
  replay.previous();assert.deepEqual(replay.session.state,before);replay.next();assert.deepEqual(replay.session.state,after);
  const saved=replay.session.serialize(),restored=new ForestSession(stage,saved);assert.ok(restored.restored);assert.deepEqual(restored.state,after);
 }
 assert.ok(complete(replay.session.state));assert.equal(replay.session.state.rescued,mass(normal.state));assert.equal(normal.serialize(),untouched);
});
