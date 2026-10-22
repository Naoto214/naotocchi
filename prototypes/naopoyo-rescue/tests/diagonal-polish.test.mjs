import test from 'node:test';
import assert from 'node:assert/strict';
import {stages} from '../stages.mjs';
import {createState,move,mass,validState,release,complete} from '../engine.mjs';
import {movePointer} from '../input.mjs';
import {pack,restore} from '../store.mjs';

function drag(s,id,from,to,steps=1){for(let i=0;i<steps;i++)movePointer(s,id,{x:from.x+(to.x-from.x)*i/steps,y:from.y+(to.y-from.y)*i/steps},{x:from.x+(to.x-from.x)*(i+1)/steps,y:from.y+(to.y-from.y)*(i+1)/steps});}
function beyondGate(){const s=createState(stages[6]);move(s,'a',1,0);move(s,'a',1,0);move(s,'a',1,0);move(s,'a',0,1);move(s,'child1',1,0);move(s,'child1',0,1);return s;}
test('stage07: slightly off-axis diagonal past spike does not enter or split on its corner',()=>{
 for(const steps of [1,2,10,100]){const s=beyondGate();assert.deepEqual(s.actors.map(a=>[a.x,a.y,a.level]),[[4,3,2]]);
 drag(s,'child1',{x:4.5,y:3.5},{x:5.5,y:2.4},steps);
 assert.deepEqual(s.actors.map(a=>[a.x,a.y,a.level]),[[5,2,2]]);assert.equal(mass(s),2);assert.ok(validState(stages[6],s));}
});
test('diagonal entry into spike splits at actual origin; save and undo retain both states',()=>{
 const s=beyondGate(),old=structuredClone(s);drag(s,'child1',{x:4.5,y:3.5},{x:5.5,y:2.4});
 drag(s,'child1',{x:5.5,y:2.4},{x:4.5,y:1.5}); // pass beside spike, still one actor
 assert.equal(s.actors.length,1);drag(s,'child1',{x:4.5,y:1.5},{x:4.5,y:2.5});
 assert.equal(s.actors.length,2);assert.ok(s.actors.every(a=>a.level===1));
 const p=restore(pack(6,s,[old],[]));assert.deepEqual(p.state,s);assert.deepEqual(p.history[0],old);
});
test('fast diagonal ignores side obstacles but cannot skip a blocked destination',()=>{
 for(const field of ['walls','gates']){const s=createState({...stages[0],walls:[],gates:[],exits:[],actors:[{id:'a',x:1,y:1,level:1,species:'dog'}],[field]:field==='walls'?[[2,1]]:[{x:2,y:1,min:2}]});
 drag(s,'a',{x:1.5,y:1.5},{x:5.5,y:5.5});assert.deepEqual([s.actors[0].x,s.actors[0].y],[5,5]);
 const blocked=createState({...s,actors:[{id:'a',x:1,y:1,level:1,species:'dog'}],[field]:field==='walls'?[[2,2]]:[{x:2,y:2,min:2}]});
 drag(blocked,'a',{x:1.5,y:1.5},{x:5.5,y:5.5});assert.deepEqual([blocked.actors[0].x,blocked.actors[0].y],[1,1]);}
});

import fs from 'node:fs';
import {drawGravity} from '../themes.mjs';
const solutions=JSON.parse(fs.readFileSync(new URL('../solutions.json',import.meta.url)));
for(const stage of stages)test(`pointer solution ${stage.id}, slow/fast, save and Undo`,()=>{
 for(const steps of [1,17]){let s=createState(stage),history=[];
 for(const d of solutions[stage.id]){const old=structuredClone(s);let a=s.actors.find(a=>a.id===d.id),from={x:a.x+.5,y:a.y+.5};
 for(const [x,y]of d.path){const to={x:x+.5,y:y+.5};drag(s,d.id,from,to,steps);from=to;}
 assert.ok(release(s));history.push(old);const p=restore(pack(Number(stage.id)-1,s,history,[]));assert.ok(p);assert.deepEqual(p.history.at(-1),old);s=p.state;}
 assert.ok(complete(s));assert.deepEqual(createState(stage),createState(stages[Number(stage.id)-1]));}
});
test('gravity arrow is drawn only in gravity stages without changing state',()=>{
 const calls=[],c={save(){},restore(){},fillText(...args){calls.push(args)}};
 for(const stage of stages){const s=createState(stage),before=JSON.stringify(s);calls.length=0;drawGravity(c,s);assert.equal(calls.length,s.gravity?1:0);if(s.gravity)assert.equal(calls[0][0],'↓');assert.equal(JSON.stringify(s),before);}
});
test('all eight spike entries split at origin and all eight departures preserve mass',()=>{
 for(let dx=-1;dx<=1;dx++)for(let dy=-1;dy<=1;dy++){if(!dx&&!dy)continue;
 const s=createState({id:'t',w:8,h:6,walls:[],gates:[],exits:[],spikes:[[3,3]],actors:[{id:'a',species:'dog',level:2,x:3-dx,y:3-dy}]});
 drag(s,'a',{x:3-dx+.5,y:3-dy+.5},{x:3.5,y:3.5},19);
 assert.deepEqual(s.actors.map(a=>[a.x,a.y,a.level]),[[3,3,1],[3-dx,3-dy,1]]);assert.equal(mass(s),2);
 }
});
test('diagonal matching gate permits entry, mismatching gate rejects it for slow/fast input',()=>{
 for(const steps of [1,20])for(const min of [1,2]){const s=createState({id:'t',w:8,h:6,walls:[],gates:[{x:2,y:2,min}],exits:[],spikes:[],actors:[{id:'a',species:'dog',level:1,x:1,y:1}]});
 drag(s,'a',{x:1.5,y:1.5},{x:2.5,y:2.5},steps);assert.equal(s.actors[0].x,min===1?2:1);}
});
test('edge drag remains in bounds and cannot skip an intermediate spike at speed',()=>{
 for(const steps of [1,100]){const s=createState({id:'t',w:8,h:6,walls:[],gates:[],exits:[],spikes:[[3,0]],actors:[{id:'a',species:'dog',level:2,x:0,y:0}]});drag(s,'a',{x:.5,y:.000001},{x:7.999999,y:.000001},steps);assert.equal(s.actors[0].x,7);assert.equal(s.actors.length,2);assert.equal(mass(s),2);}
});
