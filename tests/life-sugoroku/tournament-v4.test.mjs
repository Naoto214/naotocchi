import test from 'node:test';import assert from 'node:assert/strict';
import * as E from '../../prototypes/life-sugoroku/engine-v4.mjs';
let T={};try{T=await import('../../prototypes/life-sugoroku/tournament-v4.mjs');}catch(e){if(e.code!=='ERR_MODULE_NOT_FOUND')throw e;}
const game=()=>E.createGame({seed:17,rounds:15,players:['dog','cat','frog','penguin'].map(id=>({character:{id},human:true,difficulty:'normal'}))});
const snap=(m,p,score)=>({gameId:m.gameId,seed:m.seed,difficulty:p.difficulty,cpu:!p.human,frame:300,inputs:[],done:score!==undefined,...(score===undefined?{}:{score,summary:'正式ゲームの結果'})});
test('draw uses uniform candidates, separate pools, excludes only previous ID and fixes seed',()=>{
 let s=game();for(const pool of ['quick','game']){const seen=new Set();for(let n=0;n<T.POOLS[pool].length;n++){let calls=0;const m=T.openTournament(s,pool,x=>{calls++;return n%x;});assert.equal(calls,2);seen.add(m.gameId);assert.ok(T.POOLS[pool].includes(m.gameId));assert.equal(m.seat,0);assert.equal(m.scores.length,0);}assert.equal(seen.size,T.POOLS[pool].length);}
 s.lastOfficial='eat';for(let n=0;n<9;n++)assert.notEqual(T.openTournament(s,'quick',x=>n%x).gameId,'eat');s.lastOfficial='lights-out';assert.equal(T.openTournament(s,'game',()=>0).gameId,'lights-out');
});
test('same challenge, sequential seats and tie rank resource-only rewards apply once',()=>{
 for(const pool of ['quick','game']){let s=game(),m=T.openTournament(s,pool,()=>0);const seed=m.seed;for(const score of [100,70,70,20]){const p=s.players[m.seat];T.checkpoint(s,m,snap(m,p,score));assert.equal(m.seed,seed);}
 assert.deepEqual(m.results.map(r=>r.rank),[1,2,2,4]);assert.deepEqual(m.results.map(r=>r.reward),[15,10,10,0]);assert.deepEqual(s.players.map(p=>pool==='quick'?p.money:p.sodachi),[35,30,30,20]);assert.deepEqual(s.players.map(p=>pool==='quick'?p.sodachi:p.money),[20,20,20,20]);assert.throws(()=>T.checkpoint(s,m,snap(m,s.players[0],100)));assert.equal(s.miniHistory.length,1);}
});
test('checkpoints preserve input prefix and reject wrong seed/cpu/player score',()=>{
 let s=game(),m=T.openTournament(s,'quick',()=>0),p=s.players[0];const a=snap(m,p);a.inputs=[{frame:20,type:'pointerdown',x:40,y:50}];T.checkpoint(s,m,a);assert.deepEqual(m.attempt,a);assert.ok(T.validateTournament(s,m));
 for(const change of [{seed:m.seed+1},{frame:299},{cpu:true},{inputs:[]},{done:true,score:101},{inputs:[{frame:301,type:'pointerdown',x:1,y:2}]},{inputs:[{frame:20,type:'keydown',x:1,y:2}]}])assert.throws(()=>T.checkpoint(s,m,{...a,...change}));
 const restored=structuredClone({s,m});T.checkpoint(s,m,{...a,frame:320,done:true,score:50,summary:'結果'});T.checkpoint(restored.s,restored.m,{...a,frame:320,done:true,score:50,summary:'結果'});assert.deepEqual({s,m},restored);
});

test('save boundary rejects malformed CPU seeds and pending inputs before choosing a backup',()=>{
 const s=game(),m=T.openTournament(s,'game',()=>0),p=s.players[0],a={...snap(m,p),cpuSeed:123,pendingInputs:[{frame:301,type:'pointerdown',x:40,y:50}]};
 assert.equal(T.validAttempt(a,m,p),true);
 for(const change of [{cpuSeed:-1},{cpuSeed:4294967296},{cpuSeed:1.5},{pendingInputs:{}},{pendingInputs:null},{pendingInputs:[null]},{pendingInputs:[{frame:300,type:'pointerdown',x:0,y:0}]},{pendingInputs:[{frame:3601,type:'pointerdown',x:0,y:0}]},{pendingInputs:[{frame:301,type:'keydown',x:0,y:0}]},{pendingInputs:[{frame:301,type:'pointerdown',x:Infinity,y:0}]},{pendingInputs:[{frame:303,type:'pointerdown',x:0,y:0},{frame:302,type:'pointerup',x:0,y:0}]}]){
  assert.equal(T.validAttempt({...a,...change},m,p),false,JSON.stringify(change));
 }
 T.checkpoint(s,m,a);assert.throws(()=>T.checkpoint(s,m,{...a,frame:301,inputs:a.pendingInputs,pendingInputs:[],cpuSeed:124}));
});

test('corrupted resumable official snapshot recovers the valid backup',async()=>{
 const {readWithBackup}=await import('../../prototypes/life-sugoroku/storage.mjs');
 let s=game();while(s.phase!=='official')s=E.dispatch(s,E.cpuAction(s));
 const m=s.pending,p=s.players[m.seat];s=E.dispatch(s,{type:'official-checkpoint',revision:s.revision,requestId:m.requestId,seat:m.seat,snapshot:{...snap(m,p),cpuSeed:123,pendingInputs:[]}});
 const valid=E.serialize(s),broken=JSON.parse(valid);broken.pending.attempt.cpuSeed=-1;
 const storage={getItem:k=>k==='match'?JSON.stringify(broken):k==='match-backup'?valid:null};
 const result=readWithBackup(storage,'match',E.restore);assert.equal(result.recovered,true);assert.deepEqual(result.value,E.restore(valid));
});
