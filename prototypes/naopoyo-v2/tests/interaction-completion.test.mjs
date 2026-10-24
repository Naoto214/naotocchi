import test from 'node:test';import assert from 'node:assert/strict';
import * as renderer from '../render.mjs';
import {Session} from '../session.mjs';import {KEY,pack,restore} from '../store.mjs';import {clone} from '../engine.mjs';
import {fitSprite,spriteSpec} from '../../naopoyo-rescue/sprites.mjs';
const a=(id,x,y,level=1,species='dog')=>({id,x,y,level,species});
const st=(actors,extra={})=>({id:'gesture',w:7,h:7,walls:[],spikes:[],gates:[],exits:[],gravity:false,actors,...extra});
const p=(x,y)=>({x:x+.5,y:y+.5});
test('enlarged digit after split does not cover the dog1 immediately above',()=>{
 for(const width of [375,390,430]){
  const size=width-24,cell=size/7;
  const child=fitSprite(spriteSpec('dog',1).crop,renderer.actorLayout(4,2,cell,false,size,size).box);
  const label=renderer.actorLayout(4,3,cell,true,size,size).label;
  assert.ok(label.y-label.size*.6>=child.y+child.h+1);
 }
});
test('top-row active numeral stays wholly above sprite including outline',()=>{
 assert.equal(typeof renderer.actorLayout,'function');
 for(const width of [375,390,430])for(const x of [0,3,6])for(const y of [0,3,6])for(const active of [false,true]){
  const size=width-24,cell=size/7,{box,label}=renderer.actorLayout(x,y,cell,active,size,size);
  assert.ok(label.y+label.size*.6+1<=box.y,'face stays below label');
  assert.ok(box.x>=0&&box.x+box.w<=size&&box.y+box.h<=size);
  assert.ok(label.x-label.size*.6>=0&&label.x+label.size*.6<=size&&label.y-label.size*.6>=0);
 }
});
test('final prototype never reads/writes prior v2 storage namespace',()=>{assert.equal(KEY,'naopoyo-v2-gravity-20261023');const s=new Session(st([a('a',0,0)]));assert.equal(JSON.parse(pack(s,[])).version,3)});
test('one gesture 1→3→6→7→split 5→reabsorb 6 and exact Undo',()=>{
 const s=new Session(st([a('a',0,3),a('b',1,3,2),a('c',2,3,3),a('d',3,3)],{spikes:[{x:4,y:3,power:2}]})),before=clone(s.state);
 s.begin('a',p(0,3));const levels=[];for(const x of [1,2,3,4,3]){s.travel(p(x,3));levels.push(s.state.actors.find(a=>a.id==='a').level);assert.equal(s.active.id,'a')}
 assert.deepEqual(levels,[3,6,7,5,6]);s.end();assert.equal(s.history.length,1);s.undo();assert.deepEqual(s.state,before);
});
test('overflow and gravity lower-active absorption keep pointer live, full save/Undo',()=>{
 const stage=st([a('a',1,6,4),a('b',2,6,5),a('c',3,2,1)],{gravity:true}),s=new Session(stage),before=clone(s.state);
 s.begin('a',p(1,6));s.travel(p(2,6));assert.equal(s.state.actors.find(a=>a.id==='a').level,8);s.travel(p(3,6));assert.equal(s.active.id,'a');
 const restored=restore(pack(s,[]),[stage]);assert.deepEqual(restored.state,s.state);const back=new Session(stage,restored);back.undo();assert.deepEqual(back.state,before);
});
test('split-protected stack is unchanged by end, save and load, then next legal step resumes gravity',()=>{
 const stage=st([a('a',2,5,3),a('b',6,6,1,'fish')],{gravity:true,spikes:[{x:3,y:5,power:2}]}),s=new Session(stage);
 s.begin('a',p(2,5));s.travel(p(3,5));const settled=clone(s.state);s.end();const loaded=new Session(stage,restore(pack(s,[]),[stage]));assert.deepEqual(loaded.state,settled);
 loaded.begin('b',p(6,6));loaded.travel(p(5,6));assert.notDeepEqual(loaded.state.actors.filter(a=>a.species==='dog'),settled.actors.filter(a=>a.species==='dog'));
});
