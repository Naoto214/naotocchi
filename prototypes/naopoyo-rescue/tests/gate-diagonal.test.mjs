import test from 'node:test';
import assert from 'node:assert/strict';
import {stages} from '../stages.mjs';
import {createState,move,release,mass,validState} from '../engine.mjs';
import {movePointer} from '../input.mjs';
import {pack,restore} from '../store.mjs';
const drag=(s,id,from,to,n)=>{for(let i=0;i<n;i++)movePointer(s,id,{x:from.x+(to.x-from.x)*i/n,y:from.y+(to.y-from.y)*i/n},{x:from.x+(to.x-from.x)*(i+1)/n,y:from.y+(to.y-from.y)*(i+1)/n});};
const dogAtGate=stage=>{const s=createState(stage);assert.ok(move(s,'a',1,0));assert.ok(move(s,'a',1,0));return s;};
for(const index of [6,9])test(`stage ${index+1}: actual dog2 gate exit and return, pointer offsets and sampling`,()=>{
 for(const dy of index===6?[-1,1]:[-1])for(const offset of [-.08,0,.08]){
 let fast;
 for(const n of [1,2,17,100]){
  const s=dogAtGate(stages[index]),before=structuredClone(s);
  const from={x:3.5,y:2.5},to={x:4.5,y:2.5+dy+offset};
  drag(s,'a',from,to,n);
  assert.deepEqual(s.actors.find(a=>a.id==='a'),{id:'a',species:'dog',level:2,x:4,y:2+dy});
  assert.equal(s.actors.length,index===6?1:2);assert.equal(mass(s),index===6?2:3);
  assert.ok(release(s));const p=restore(pack(index,s,[before],[]));assert.deepEqual(p.state,s);assert.deepEqual(p.history.pop(),before);
  drag(s,'a',to,from,n);assert.deepEqual(s.actors,before.actors);assert.ok(validState(stages[index],s));
  if(fast)assert.deepEqual(s,fast);else fast=s;
 }
 }
});
test('stage07: actual spike entry splits and a now-ineligible child cannot re-enter gate',()=>{
 const s=dogAtGate(stages[6]);drag(s,'a',{x:3.5,y:2.5},{x:4.5,y:2.5},17);
 assert.deepEqual(s.actors.map(a=>[a.x,a.y,a.level]),[[4,2,1],[3,2,1]]);
 assert.ok(move(s,'child1',1,-1));assert.equal(move(s,'child1',-1,1),false);assert.equal(mass(s),2);
});
test('stage12: frog1 can leave and return diagonally on the spike side; frog2 still denied',()=>{
 for(const dy of [-1,1])for(const n of [1,100]){
 const s=createState(stages[11]);assert.ok(move(s,'r',1,0));assert.ok(move(s,'r',1,0));
 const from={x:3.5,y:2.5},to={x:2.5,y:2.5+dy};
 drag(s,'r',from,to,n);assert.deepEqual([s.actors[0].x,s.actors[0].y],[2,2+dy]);
 drag(s,'r',to,from,n);assert.deepEqual([s.actors[0].x,s.actors[0].y],[3,2]);assert.equal(mass(s),2);
 const denied=createState(stages[11]);denied.actors[0].x=2;denied.actors[0].y=2+dy;
 assert.equal(move(denied,'r',1,-dy),false);
 }
});

import fs from 'node:fs';
import {stages as previous} from '../previous-stages.mjs';
import {drawGravity} from '../themes.mjs';
test('pre-clearance v1 saves and Undo remain byte-equivalent, including occupants of new wall cells',()=>{
 for(const i of [6,9,11]){
 const old={...stages[i],walls:previous[i].walls.filter(([x,y])=>i!==9||x!==3||y!==4)};
 const s=createState(old),before=structuredClone(s);s.actors[0].x=i===11?4:2;s.actors[0].y=1;
 const raw=pack(i,s,[before],['01']),p=restore(raw);assert.ok(p);assert.equal(pack(p.index,p.state,p.history,p.cleared),raw);
 assert.ok(restore(pack(i,createState(stages[i]),[],['01'])));
 }
});
test('stage09 arrow ink envelope is clear of fixed obstacles and remains anchored as actors move',()=>{
 const calls=[],c={save(){},restore(){},fillText(...args){calls.push({args,font:this.font})}};
 const s=createState(stages[8]);drawGravity(c,s);const first=calls[0], [,x,y]=first.args;
 const size=Number(first.font.match(/[\d.]+/)[0]);
 for(const [fx,fy] of [...s.walls,...s.spikes,...s.exits.map(a=>[a.x,a.y]),...s.gates.map(a=>[a.x,a.y])]){
 assert.ok(x+.5<=fx||x-.5>=fx+1||y+size/2<=fy||y-size/2>=fy+1,`arrow overlaps ${fx},${fy}`);
 }
 s.actors[0].x=6;s.actors[0].y=3;drawGravity(c,s);assert.deepEqual(calls[1],first);
});
