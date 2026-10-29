import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame,dispatch,restore,serialize,cpuAction} from '../../prototypes/life-sugoroku/engine.mjs';
const players=Array.from({length:4},(_,i)=>({character:{id:'c'+i,label:'人'+i},human:true}));
const send=(s,c)=>dispatch(s,{revision:s.revision,...c});
test('staged roll persists dice and moves exactly one edge per action, including branches',()=>{
 let s=createGame({seed:123,players}), original=s;
 s=send(s,{type:'roll-start'}); assert.equal(s.phase,'moving'); assert.equal(s.players[0].pos,0); const dice=[...s.pending.dice], total=dice.reduce((a,b)=>a+b,0); assert.equal(s.pending.remaining,total);
 assert.throws(()=>dispatch(s,{type:'step',revision:original.revision}));
 let steps=0;
 while(s.phase==='moving'||s.phase==='branch'){
  s=restore(serialize(s));assert.deepEqual(s.pending.dice,dice);
  const before=s.pending.remaining;
  s=send(s,s.phase==='branch'?{type:'branch',to:awaitBoard(s)}: {type:'step'});
  if(s.phase==='moving'||s.phase==='branch') assert.equal(s.pending.remaining,before-1);
  steps++;
 }
 assert.equal(steps,total);assert.equal(s.lastMove.path.length,total+1);
});
test('staged journey has same outcome and RNG as existing immediate journey',()=>{
 for(let seed=1;seed<=50;seed++){
  const initial=createGame({seed,players});let old=send(initial,{type:'roll'}), s=send(initial,{type:'roll-start'});
  while(s.phase==='moving'||s.phase==='branch'){
   if(s.phase==='branch') {assert.equal(old.phase,'branch');const target=awaitBoard(s);old=send(old,{type:'branch',to:target});s=send(s,{type:'branch',to:target});}
   else s=send(s,{type:'step'});
  }
  assert.equal(s.rng,old.rng);assert.equal(s.players[0].pos,old.players[0].pos);assert.equal(s.phase,old.phase);assert.deepEqual(s.pending,old.pending);
 }
});
import {BOARD} from '../../prototypes/life-sugoroku/data.mjs';
function awaitBoard(s){return BOARD[s.players[s.active].pos].next[0];}
test('double dice is committed once and a restored journey cannot replay an old command',()=>{
 let s=createGame({seed:99,players});s.players[0].items.push('double');s=send(s,{type:'item',id:'double'});s=send(s,{type:'roll-start'});assert.equal(s.pending.dice.length,2);const saved=serialize(s),stale={type:'step',revision:s.revision};s=send(s,stale);assert.throws(()=>dispatch(s,stale));const reloaded=restore(saved);assert.deepEqual(reloaded.pending.dice,JSON.parse(saved).pending.dice);assert.equal(reloaded.rng,JSON.parse(saved).rng);
});
test('staged CPU games finish deterministically with restore after every action',()=>{
 const play=(seed)=>{let s=createGame({seed,rounds:10,players:players.map(p=>({...p,human:false,difficulty:'normal'}))}),count=0;while(s.phase!=='done'&&count++<4000){s=restore(serialize(s));let cmd=s.phase==='moving'?{type:'step'}:cpuAction(s);if(cmd.type==='roll')cmd={type:'roll-start'};s=send(s,cmd);}assert.equal(s.phase,'done');assert.ok(s.players.every(p=>p.turns===10));return serialize(s);};
 for(let seed=1;seed<=100;seed++)assert.equal(play(seed),play(seed));
});
test('restored staged journey rejects phase and route inconsistencies',()=>{
 let s=send(createGame({seed:123,players}),{type:'roll-start'});
 assert.equal(BOARD[s.players[s.active].pos].next.length,1);
 const bad=structuredClone(s);bad.phase='branch';assert.throws(()=>restore(serialize(bad)));
 const atFork=createGame({seed:123,players});atFork.players[0].pos=1;
 const fork=send(atFork,{type:'roll-start'});assert.equal(fork.phase,'branch');
 const wrong=structuredClone(fork);wrong.phase='moving';assert.throws(()=>restore(serialize(wrong)));
});
