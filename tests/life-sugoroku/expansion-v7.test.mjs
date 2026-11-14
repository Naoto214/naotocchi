import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createNodeOfficialRuntime} from '../../prototypes/life-sugoroku/official-runtime-v4.mjs';
import * as E from '../../prototypes/life-sugoroku/engine-v4.mjs';
import * as T from '../../prototypes/life-sugoroku/tournament-v4.mjs';
const candidates=['knock','wait','spin','sneak','rhythm'];
for(const gameId of candidates){
 test(gameId+' official callback, both CPU levels and exact partial restore',async()=>{
  for(const difficulty of ['easy','normal']){
   const a=await createNodeOfficialRuntime();a.start({gameId,seed:3,cpuSeed:29,cpu:true,difficulty});
   const saved=a.step(85),b=await createNodeOfficialRuntime();assert.deepEqual(b.start(saved),saved);
   const done=a.step(1800);assert.equal(done.done,true);assert.ok(done.frame<=1800);assert.ok([0,33,67,100].includes(done.score));
   assert.deepEqual(b.step(1800),done);
   if(gameId==='wait'){assert.equal(done.score,100);assert.equal(done.inputs.length,0);}else assert.ok(done.inputs.length>0);
   const human=await createNodeOfficialRuntime();human.start({...done,cpu:false});assert.equal(human.snapshot().score,done.score);assert.deepEqual(human.snapshot().inputs,done.inputs);
  }
 });
 test(gameId+' four equal seeds, save every boundary, rewards exactly once',async()=>{
  let s=E.createGame({seed:27,rounds:10,players:['dog','cat','frog','penguin'].map((id,i)=>({character:{id},human:false,difficulty:i%2?'easy':'normal'}))});
  s.players[0].pos=5;s.players[0].walkPath=[5];s.phase='official';s.pending=T.openTournament(s,'quick',()=>0);s.pending.gameId=gameId;
  const seed=s.pending.seed;
  for(let seat=0;seat<4;seat++){
   s=E.restore(E.serialize(s));const r=await createNodeOfficialRuntime();r.start({gameId,seed,cpuSeed:100+seat,cpu:true,difficulty:s.players[seat].difficulty});
   const checkpoint=snapshot=>({type:'official-checkpoint',revision:s.revision,requestId:s.pending.requestId,seat,snapshot});
   s=E.dispatch(s,checkpoint(r.step(85)));s=E.restore(E.serialize(s));
   const b=await createNodeOfficialRuntime();b.start(s.pending.attempt);const result=r.step(1800);assert.deepEqual(b.step(1800),result);
   const command=checkpoint(result);s=E.dispatch(s,command);assert.throws(()=>E.dispatch(s,command));assert.equal(s.pending.seed,seed);
  }
  assert.equal(s.phase,'official-result');assert.equal(s.miniHistory.length,1);
  for(const row of s.pending.results){assert.equal(row.rank,1+s.pending.results.filter(q=>q.score>row.score).length);assert.equal(s.players[row.id].money,20+20-row.rank*5);assert.equal(s.players[row.id].sodachi,20);}
  assert.deepEqual(E.restore(E.serialize(s)),s);
 });
}
test('official sources unchanged from main, quick CPU never reads target or game closure',()=>{
 assert.deepEqual(fs.readFileSync(new URL('../../quick.js',import.meta.url)),fs.readFileSync(new URL('../../prototypes/life-sugoroku/official/quick.js',import.meta.url)));
 const code=fs.readFileSync(new URL('../../prototypes/life-sugoroku/official-quick-cpu-v7.mjs',import.meta.url),'utf8');
 assert.doesNotMatch(code,/\.target\s*\(|current\.game\b/);
});
test('rhythm anticipates visible motion before reaction delay consumes its hit window',async()=>{
 const scores=[];
 for(let seed=1;seed<=16;seed++){
  const r=await createNodeOfficialRuntime();r.start({gameId:'rhythm',seed,cpuSeed:seed+100,cpu:true,difficulty:'easy'});
  const done=r.step(1800);assert.ok(done.inputs.length>0,'seed '+seed);scores.push(done.score);
 }
 assert.ok(scores.some(score=>score>0));
});
