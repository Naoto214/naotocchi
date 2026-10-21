import test from 'node:test';
import assert from 'node:assert/strict';
import * as render from '../render.mjs';
import * as fixtures from '../fixtures.mjs';
import {stageThemes} from '../themes.mjs';
import {createState,move} from '../engine.mjs';
import {stages} from '../stages.mjs';

test('all twelve stages belong to the three requested areas',()=>{
 assert.deepEqual(stages.map(s=>stageThemes[s.id]),Array(4).fill('prison').concat(Array(4).fill('cavern'),Array(4).fill('castle')));
});
test('gate reacts to the active actor in all eight directions and uses actual passage conditions',()=>{
 assert.equal(typeof render.gateVisual,'function');
 for(const species of ['dog','fish','frog','penguin'])for(const level of [1,2,3,8])for(const [dx,dy]of [[-1,-1],[0,-1],[1,-1],[-1,0],[1,0],[-1,1],[0,1],[1,1]]){
 const g={x:3,y:3,species:'dog',min:2},a={id:'a',x:3+dx,y:3+dy,species,level};
 const s=createState({id:'test',w:8,h:6,walls:[],exits:[],spikes:[],gates:[g],actors:[a]});
 const before=JSON.stringify(s),v=render.gateVisual(s,g,'a');
 const passed=move(s,'a',-dx,-dy);
 assert.equal(v.open,passed);
 const restored=JSON.parse(before);render.gateVisual(restored,g,'a');assert.equal(JSON.stringify(restored),before);
 }
});
test('active actor wins over nearby bystanders; leaving or fast actor switching clears stale reactions',()=>{
 assert.equal(typeof render.gateVisual,'function');
 const g={x:3,y:2,min:2},s={actors:[{id:'yes',x:2,y:2,level:2},{id:'no',x:2,y:3,level:1}]};
 assert.equal(render.gateVisual(s,g,'no').open,false);
 assert.equal(render.gateVisual(s,g,'yes').open,true);
 assert.equal(render.gateVisual(s,g,null).open,false);
 s.actors[0].x=7;assert.equal(render.gateVisual(s,g,'yes').open,false);
 s.actors[0].x=3;assert.equal(render.gateVisual(s,g,null).open,true);
});
test('measured condition group is centered and glyph ink aligns with cropped icon at 42px',()=>{
 assert.equal(typeof fixtures.conditionLayout,'function');
 for(const species of ['dog','fish','penguin','frog'])for(const condition of [{min:2},{max:3},{exact:1},{}]){
 const c={measureText:()=>({width:.38*42,actualBoundingBoxAscent:.19*42,actualBoundingBoxDescent:.03*42})};
 const v=fixtures.conditionLayout(c,{species,...condition});
 assert.ok(Math.abs((v.left+v.right)/2-.5)<1e-8);
 assert.ok(v.left>=.025&&v.right<=.975);
 assert.ok(Math.abs(v.baseline-(.19-.03)/2-v.cy)*42<.1);
 assert.ok(Math.abs(v.icon.y+v.icon.h/2-v.cy)*42<.1);
 }
});
test('split child already inside a gate can leave: door stays open and gate permits departure',()=>{
 for(const index of [6,9]){
 const s=createState(stages[index]);for(let i=0;i<3;i++)assert.equal(move(s,'a',1,0),true);
 const g=s.gates[0],child=s.actors.find(a=>a.x===g.x&&a.y===g.y);
 assert.equal(child.level,1);
 for(const selected of [null,child.id]){const v=render.gateVisual(s,g,selected);assert.equal(v.open,true);}
 assert.equal(move(s,'a',1,0),true);assert.equal(move(s,child.id,1,0),true,'existing occupant can depart');
 }
});
test('occupied doorway stays open for its occupant while rejecting a different approaching actor',()=>{
 const g={x:3,y:2,min:2},s={actors:[{id:'inside',x:3,y:2,level:1},{id:'outside',x:2,y:2,level:1}]};
 assert.deepEqual(render.gateVisual(s,g,'outside'),{open:true,subjectId:'outside'});
 s.actors.shift();assert.equal(render.gateVisual(s,g,'outside').open,false);
});
