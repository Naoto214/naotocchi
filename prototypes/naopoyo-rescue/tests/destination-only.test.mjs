import test from 'node:test';
import assert from 'node:assert/strict';
import {stages} from '../stages.mjs';
import {createState,move,mass,clone,validState} from '../engine.mjs';
import {movePointer} from '../input.mjs';
import {pack,restore} from '../store.mjs';

const actor={id:'a',x:3,y:3,level:2,species:'dog'};
const make=extra=>createState({id:'test',w:8,h:6,actors:[actor],walls:[],gates:[],spikes:[],exits:[],...extra});
const directions=[[-1,-1],[0,-1],[1,-1],[-1,0],[1,0],[-1,1],[0,1],[1,1]];
function drag(s,from,to,n){for(let i=0;i<n;i++)movePointer(s,'a',
 {x:from.x+(to.x-from.x)*i/n,y:from.y+(to.y-from.y)*i/n},
 {x:from.x+(to.x-from.x)*(i+1)/n,y:from.y+(to.y-from.y)*(i+1)/n});}

test('all diagonal orientations cross two rock corners in both directions, regardless of sampling',()=>{
 for(const [dx,dy] of directions.filter(([dx,dy])=>dx&&dy))for(const offset of [-.08,0,.08]){
 let expected;
 for(const n of [1,2,17,100]){
  const s=make({walls:[[3+dx,3],[3,3+dy]]});
  const from={x:3.5,y:3.5},to={x:3.5+dx,y:3.5+dy+offset};
  drag(s,from,to,n);assert.deepEqual([s.actors[0].x,s.actors[0].y],[3+dx,3+dy]);
  drag(s,to,from,n);assert.deepEqual(s.actors,[actor]);assert.equal(mass(s),2);
  if(expected)assert.deepEqual(s,expected);else expected=s;
 }
 }
});
test('blocked destinations reject atomically in all eight directions',()=>{
 for(const [dx,dy] of directions){const x=3+dx,y=3+dy;
 for(const extra of [{walls:[[x,y]]},{gates:[{x,y,species:'fish'}]},
 {actors:[actor,{...actor,id:'b',x,y,level:1}]},
 {actors:[actor,{...actor,id:'b',x,y,species:'fish'}]},
 {exits:[{x,y,exact:1}]}]){
 const s=make(extra),before=clone(s);assert.equal(move(s,'a',dx,dy),false);assert.deepEqual(s,before);
 }
 }
 for(const [x,y,dx,dy] of [[0,0,-1,-1],[0,5,-1,1],[7,0,1,-1],[7,5,1,1]]){
 const s=make({actors:[{...actor,x,y}]}),before=clone(s);assert.equal(move(s,'a',dx,dy),false);assert.deepEqual(s,before);
 }
});
test('gate ALL/species/exact/min/max conditions use destination only from all eight sides',()=>{
 for(const [dx,dy] of directions)for(const condition of [{},{species:'dog'},{exact:2},{min:2},{max:2}]){
 const s=make({actors:[{...actor,x:3-dx,y:3-dy}],gates:[{x:3,y:3,...condition}],
 walls:dx&&dy?[[3,3-dy],[3-dx,3]]:[]});
 assert.ok(move(s,'a',dx,dy));assert.equal(s.actors.length,1);assert.equal(mass(s),2);
 assert.ok(move(s,'a',-dx,-dy));assert.ok(move(s,'a',dx,dy));
 }
});
test('destination-only diagonals retain supported gravity ascent and landing',()=>{
 const s=make({gravity:true,walls:[[3,4],[4,3],[3,2]]});
 assert.ok(move(s,'a',1,-1));assert.deepEqual([s.actors[0].x,s.actors[0].y],[4,2]);
});

// Frozen PR #418 702721a geometry: do not derive these walls from live stages.
const oldWalls={6:[[3,0],[2,1],[2,3],[3,4],[3,5]],
 9:[[3,0],[2,1],[3,3],[3,5],[4,3],[5,3]],
 11:[[3,0],[4,1],[4,3],[3,4],[3,5]]};
for(const index of [6,9,11])test(`702721a save ${index+1}: terrain, actors, Undo and cleared records round-trip exactly`,()=>{
 const old={...stages[index],walls:oldWalls[index]},s=createState(old),before=clone(s);
 // This cell becomes a wall in the new layout. It must remain valid in old saves.
 s.actors[0].x=3;s.actors[0].y=1;assert.ok(validState(old,s));
 const raw=pack(index,s,[before],['01','07']),p=restore(raw);assert.ok(p);
 assert.equal(pack(p.index,p.state,p.history,p.cleared),raw);
 assert.ok(restore(pack(index,p.history[0],[],p.cleared)));
 assert.ok(move(p.state,p.state.actors[0].id,index===11?-1:1,0));
 assert.deepEqual(createState(stages[index]).walls,stages[index].walls);
});
