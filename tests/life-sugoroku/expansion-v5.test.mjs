import test from 'node:test';import assert from 'node:assert/strict';
import {createNodeOfficialRuntime,OFFICIAL_IDS} from '../../prototypes/life-sugoroku/official-runtime-v4.mjs';
import {POOLS,openTournament,validateTournament} from '../../prototypes/life-sugoroku/tournament-v4.mjs';
import * as E from '../../prototypes/life-sugoroku/engine-v4.mjs';
import fs from 'node:fs';import vm from 'node:vm';
test('every admitted quick ID exists in the original registry; legacy typo is resume-only',()=>{
 const realm=vm.createContext({});vm.runInContext(fs.readFileSync(new URL('../../prototypes/life-sugoroku/official/quick.js',import.meta.url),'utf8'),realm);
 const ids=Array.from(realm.installNaotocchiQuick({}).QUICK_GAMES,g=>g.id);
 assert.equal(ids.length,50);assert.equal(POOLS.quick.length,45);
 for(const id of POOLS.quick)assert.ok(ids.includes(id),id);
 assert.equal(POOLS.quick.includes('defend'),false);
 const s=E.createGame({seed:3,rounds:15,players:['dog','cat','frog','penguin'].map(id=>({character:{id},human:true}))});
 s.players[0].pos=5;s.players[0].walkPath=[5];s.phase='official';s.pending=openTournament(s,'quick',()=>0);s.pending.gameId='defend';s.lastOfficial='defend';
 assert.ok(validateTournament(s,s.pending));assert.deepEqual(E.restore(E.serialize(s)),s);
});
const candidates=["eat", "dodge", "catch", "mash", "clean", "stop", "swipe", "medicine", "find", "charge", "partner", "season", "jump", "pull", "pet", "button", "flames", "coins", "cliff", "throw", "flee", "mole", "slice", "guard", "bento", "lift", "tickle", "balance", "color", "count", "bigger", "odd", "order", "holdlid", "umbrella", "shutter", "sort", "trace", "pushbox", "fish", "stack", "pair", "doors", "feather", "weather", "takoyaki-grill"];
for(const gameId of candidates)test(gameId+' candidate callback, idle completion, exact partial replay',async()=>{
 assert.ok(OFFICIAL_IDS.includes(gameId),'runtime supports candidate');
 for(const difficulty of ['easy','normal']){
  const a=await createNodeOfficialRuntime();a.start({gameId,seed:3,cpu:true,difficulty});
  const saved=a.step(330),b=await createNodeOfficialRuntime();assert.deepEqual(b.start(saved),saved);
  const result=a.step(3600);assert.equal(result.done,true);assert.ok(result.frame<=(gameId==='takoyaki-grill'?3600:1800));
  assert.deepEqual(b.step(3600),result);if(gameId==='takoyaki-grill')assert.ok(result.inputs.length>0);assert.ok(Number.isInteger(result.score));
 }
 const idle=await createNodeOfficialRuntime();idle.start({gameId,seed:3,cpu:false});assert.equal(idle.step(3600).done,true);
});
