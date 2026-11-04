import test from 'node:test';
import assert from 'node:assert/strict';
import * as tiles from '../../prototypes/life-sugoroku/tiles-v4.mjs';
import * as E from '../../prototypes/life-sugoroku/engine-v4.mjs';

test('branch labels use geographical direction, never connection array order',()=>{
 assert.equal(typeof tiles.branchChoices,'function');
 for(const [id,expected] of [[1,[[6,'left'],[2,'right']]],[13,[[14,'left'],[18,'right']]],[25,[[26,'left'],[30,'right']]],[37,[[42,'up-right'],[38,'down-right']]]]){
  const choices=tiles.branchChoices(id);
  assert.deepEqual(choices.map(c=>[c.to,c.direction]),expected);
  for(const c of choices){assert.ok(c.label.includes(tiles.BOARD[c.to].label));}
 }
});
test('all eight branches retain selected edges across save, step and CPU skip',()=>{
 for(const fork of E.BOARD.filter(n=>n.next.length>1))for(const to of fork.next){
  let s=E.createGame({seed:7,rounds:15,players:['dog','cat','frog','penguin'].map(id=>({character:{id,label:id},human:false,difficulty:'normal'}))});
  Object.assign(s.players[0],{pos:fork.id,walkPath:[fork.id]});
  s.phase='branch';s.pending={staged:true,path:[fork.id],remaining:4,dice:[4]};
  const command={type:'branch',to,revision:s.revision};
  s=E.dispatch(E.restore(E.serialize(s)),command);
  assert.equal(s.players[0].pos,to);
  assert.deepEqual(s.pending.path,[fork.id,to]);
  assert.throws(()=>E.dispatch(s,command));
  let regular=E.restore(E.serialize(s));
  while(regular.phase==='moving')regular=E.dispatch(regular,E.cpuAction(regular));
  const skipped=E.dispatch(E.restore(E.serialize(s)),{type:'skip-cpu',revision:s.revision});
  assert.deepEqual(skipped.lastMove,regular.lastMove);
  assert.deepEqual(regular.lastMove.path,[fork.id,to,to+1,to+2,to+3]);
 }
});
