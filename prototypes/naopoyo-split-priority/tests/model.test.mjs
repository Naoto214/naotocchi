import test from 'node:test';
import assert from 'node:assert/strict';
import * as official from '../../naopoyo-v2/engine.mjs';
import * as engine from '../engine.mjs';
import {stages} from '../../naopoyo-chapter2/stages.mjs';
import fs from 'node:fs';
const model=await import('../model.mjs').catch(()=>({}));
test('model supplies resettable same-board experiment',()=>assert.equal(typeof model.simulate,'function'));
for(const stage of stages)test(`A official state and events equivalence stage ${stage.number}`,()=>{
 const path=JSON.parse(fs.readFileSync(new URL(`../../naopoyo-chapter2/examples/${stage.number}.json`,import.meta.url))).path;
 const a=official.createState(stage),b=engine.createState(stage);official.settle(a);engine.settle(b);assert.deepEqual(b,a);
 for(const step of path){const id=a.actors.find(a=>a.x===step.at[0]&&a.y===step.at[1]).id;assert.deepEqual(engine.move(b,id,...step.d),official.move(a,id,...step.d));assert.deepEqual(b,a);}assert.ok(official.complete(a));
});
for(const mode of ['A','B','C'])for(const gravity of [false,true])test(`${mode} ${gravity?'gravity':'flat'} 7 children, initial/spawn/final snapshots and mass`,()=>{
 assert.equal(typeof model.simulate,'function');const s=model.fixture('empty',{gravity,level:8});const initial=structuredClone(s),r=model.simulate(s,mode,4);assert.deepEqual(s,initial);assert.equal(r.initial.actors[0].level,8);assert.equal(r.spawns[0].children.length,7);assert.equal(r.spawn.actors.find(a=>a.id==='parent').level,1);assert.equal(engine.mass(r.final),engine.mass(initial));assert.ok(r.final.actors.every(a=>a.level>=1&&a.level<=8));if(gravity){const again=structuredClone(r.final);engine.settle(again);assert.deepEqual(again,r.final);}else assert.deepEqual(r.spawn,r.final);
});
test('fixtures contain all ten required scenarios and edit supports removal without persistent data',()=>{assert.equal(typeof model.fixture,'function');assert.equal(model.scenarios.length,10);const s=model.fixture('empty');model.edit(s,1,1,'wall');assert.ok(s.walls.some(p=>p[0]===1&&p[1]===1));model.edit(s,1,1,'erase');assert.ok(!s.walls.some(p=>p[0]===1&&p[1]===1));});
