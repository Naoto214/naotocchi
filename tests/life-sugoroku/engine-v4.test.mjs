import test from 'node:test';import assert from 'node:assert/strict';
import * as V3 from '../../prototypes/life-sugoroku/engine.mjs';
let E={};try{E=await import('../../prototypes/life-sugoroku/engine-v4.mjs');}catch(e){if(e.code!=='ERR_MODULE_NOT_FOUND')throw e;}
const config=n=>({seed:177,rounds:15,players:['dog','cat','frog','penguin'].slice(0,n).map(id=>({character:{id,label:id},human:true,difficulty:'normal'}))});
const game=(n=4)=>E.createGame(config(n));
const command=(s,type,extra={})=>E.dispatch(s,{revision:s.revision,type,...extra});
// A saved last edge: this exercises the real movement-to-landing transaction.
function arrival(s,to){const from=E.BOARD.find(n=>n.next.includes(to));s.players[s.active].pos=from.id;s.players[s.active].walkPath=[from.id];s.phase=from.next.length>1?'branch':'moving';s.pending={staged:true,path:[from.id],remaining:1,dice:[1]};return command(s,s.phase==='branch'?'branch':'step',{to});}

test('V4 creates isolated 2/3/4-seat state, preserving the V3 entry point',()=>{
 assert.equal(typeof E.createGame,'function');for(const n of [2,3,4]){const s=game(n);assert.equal(s.rulesVersion,4);assert.equal(s.players.length,n);assert.ok(s.players.every(p=>p.stage===1&&p.sodachi===20&&p.money===20));assert.deepEqual(E.restore(E.serialize(s)),s);}
 assert.equal(V3.createGame(config(4)).rulesVersion,3);
});
test('candidate landing and selection survive reload and reject stale double-application',()=>{
 let s=arrival(game(),7);assert.equal(s.phase,'v4-choice');const restored=E.restore(E.serialize(s));const c={type:'select',index:1,revision:s.revision};const next=E.dispatch(s,c);assert.deepEqual(next,E.dispatch(restored,c));assert.equal(next.players[0].friends.length,1);assert.throws(()=>E.dispatch(next,c));assert.equal(s.players[0].friends.length,0);
});
test('double reroll replaces both dice before any movement; accepting preserves RNG',()=>{
 let s=game();s.players[0].friends=['dummy'];assert.throws(()=>E.restore(E.serialize(s)));
 s=arrival(game(),7);s=command(s,'select',{index:0});s=command(s,'continue');while(s.active!==0){s=arrival(s,1);s=command(s,'continue');}s.players[0].dieMode='double';s=command(s,'dice-start');const pos=s.players[0].pos;s=command(s,'dice-stop');s=command(s,'dice-settle');assert.equal(s.phase,'reroll');assert.equal(s.pending.dice.length,2);const loaded=E.restore(E.serialize(s));s=command(s,'reroll');assert.deepEqual(s,command(loaded,'reroll'));assert.equal(s.players[0].rerolls,0);assert.equal(s.players[0].pos,pos);assert.equal(s.pending.dice.length,2);assert.equal(s.pending.remaining,s.pending.dice[0]+s.pending.dice[1]);
 s=command(s,'dice-stop');s=command(s,'dice-settle');assert.ok(['branch','moving'].includes(s.phase));assert.throws(()=>command(s,'reroll'));
});
test('shop is landing-only, keeps prices and cannot purchase twice',()=>{
 let s=game();assert.throws(()=>command(s,'buy',{id:'double'}));s=arrival(s,12);assert.equal(s.phase,'shop');assert.equal(s.players[0].money,20);s=command(s,'buy',{id:'slow'});assert.equal(s.players[0].money,12);assert.ok(s.players[0].items.includes('slow'));assert.equal(s.phase,'result');assert.throws(()=>command(s,'buy',{id:'slow'}));
});
test('round-end has no forced mini and final round completes exactly once',()=>{
 for(const n of [2,3,4]){let s=game(n);s.active=n-1;s.round=2;s.players.forEach((p,i)=>p.turns=i<n-1?2:1);s=arrival(s,1);s=command(s,'continue');assert.equal(s.phase,'turn');assert.equal(s.round,3);assert.equal(s.active,0);assert.deepEqual(E.restore(E.serialize(s)),s);
 s.round=s.rounds;s.active=n-1;s.players.forEach((p,i)=>p.turns=i<n-1?s.rounds:s.rounds-1);s=arrival(s,1);s=command(s,'continue');assert.equal(s.phase,'done');assert.deepEqual(E.restore(E.serialize(s)),s);assert.throws(()=>command(s,'continue'));}
});
test('quick/game landing saves an official tournament and no legacy game kind',()=>{
 for(const [id,type]of[[5,'quick'],[9,'game']]){let s=arrival(game(),id);assert.equal(s.phase,'official');assert.equal(s.pending.pool,type);assert.equal(s.pending.kind,'official');assert.deepEqual(E.restore(E.serialize(s)),s);assert.throws(()=>command(s,'mini-auto'));}
});
test('time and transformation keep state through repeated serialization',()=>{
 let s=arrival(game(),8);assert.notEqual(s.players[0].stage,1);assert.deepEqual(E.restore(E.serialize(s)),s);
 s=arrival(game(),20);const old=s.players[0].character.id;s=command(E.restore(E.serialize(s)),'select',{index:2});assert.notEqual(s.players[0].character.id,old);assert.deepEqual(E.restore(E.serialize(s)),s);
});
for(const [key,value]of[['uses','broken'],['purchases',[]],['uses',{seed:-1}],['purchases',{unknown:1}],['rerolls',3],['turns',15]])test(`restore rejects invalid ${key} ${JSON.stringify(value)}`,()=>{const s=game();s.players[0][key]=value;assert.throws(()=>E.restore(E.serialize(s)),key);});
test('restore rejects reroll grant ledger contradictions',()=>{
 let s=arrival(game(),7);s=command(s,'select',{index:0});s.players[0].rerollGranted=[];assert.throws(()=>E.restore(E.serialize(s)));
 s=arrival(game(),7);s=command(s,'select',{index:0});s.players[0].rerollLedger.push({...s.players[0].rerollLedger[0]});assert.throws(()=>E.restore(E.serialize(s)));
});
test('event landing fixes candidate, reload preserves choice and reward applies once',()=>{
 let s=arrival(game(),2);assert.equal(s.phase,'event');assert.equal(s.pending.kind,'event');
 const saved=E.restore(E.serialize(s)),old=structuredClone(s),c={type:'choose',index:0,revision:s.revision};
 const next=E.dispatch(s,c);assert.deepEqual(s,old);assert.deepEqual(next,E.dispatch(saved,c));assert.equal(next.phase,'result');
 assert.equal(next.players[0].seen.length,1);assert.equal(next.players[0].history.at(-1).eventId,s.pending.eventId);assert.throws(()=>E.dispatch(next,c));assert.throws(()=>command(next,'choose',{index:1}));
});
test('restore rejects event on wrong tile or seen event, and mismatched tile choices',()=>{
 let s=arrival(game(),2);s.players[0].seen.push(s.pending.eventId);assert.throws(()=>E.restore(E.serialize(s)));
 s=arrival(game(),2);s.players[0].pos=1;s.players[0].walkPath=[1];assert.throws(()=>E.restore(E.serialize(s)));
 s=arrival(game(),7);s.players[0].pos=23;s.players[0].walkPath=[23];assert.throws(()=>E.restore(E.serialize(s)));
});
test('dice rejects mode/count mismatch and normalizes nonfinite UI clocks',()=>{
 for(const now of [Infinity,-Infinity,NaN]){let s=command(game(),'dice-start',{now});assert.ok(Number.isFinite(s.pending.deadline));s=command(s,'dice-stop',{now});assert.deepEqual(E.restore(E.serialize(s)),s);}
 let s=command(game(),'dice-start');s.pending.dice=[2,2];s.pending.remaining=4;assert.throws(()=>E.restore(E.serialize(s)));
 s=game();s.players[0].dieMode='slow';s=command(s,'dice-start');s.pending.dice=[6];s.pending.remaining=6;assert.throws(()=>E.restore(E.serialize(s)));
});
test('CPU handles V4 choices, reroll, event and landing shop without mutating decisions',()=>{
 for(const id of [7,23,20,2,12]){let s=arrival(game(),id),old=structuredClone(s);const action=E.cpuAction(s);assert.deepEqual(E.cpuAction(s),action);assert.deepEqual(s,old);s=E.dispatch(s,action);assert.equal(s.phase,'result');assert.deepEqual(E.restore(E.serialize(s)),s);}
 let s=game();s.players[0].items=['seed'];const a=E.cpuAction(s);assert.equal(a.type,'item');s=E.dispatch(s,a);assert.equal(E.cpuAction(s).type,'dice-start');
});
test('CPU skip replays legal commands to result without redraw or double effects',()=>{
 for(let seed=1;seed<=30;seed++){
  let s=E.createGame({...config(4),seed});s.players[0].human=false;
  let regular=structuredClone(s),steps=0;
  while(!['result','official'].includes(regular.phase)&&steps++<100)regular=E.dispatch(regular,E.cpuAction(regular));
  const skipped=command(s,'skip-cpu');delete skipped.cpuPresentation;delete regular.cpuPresentation;assert.deepEqual(skipped,regular);assert.deepEqual(E.restore(E.serialize(skipped)),skipped);
 }
 assert.throws(()=>command(game(),'skip-cpu'));
});
test('all protected item effects match V3 at 10/15/20 rounds',()=>{
 for(const rounds of [10,15,20])for(const id of ['double','slow','charm','clock','seed','box']){
  const opts={...config(4),rounds};let a=E.createGame(opts),b=V3.createGame(opts);
  for(const s of [a,b]){s.players[0].stage=4;s.players[0].items=[id];}
  a=E.dispatch(a,{type:'item',id,revision:a.revision});b=V3.dispatch(b,{type:'item',id,revision:b.revision});
  for(const key of ['sodachi','money','stage','youth','suppressUntil','charm','dieMode','items','used','uses'])assert.deepEqual(a.players[0][key],b.players[0][key],`${rounds}/${id}/${key}`);
 }
});
test('official four-seat game reload fixes seed, records every score and pays once',()=>{
 let s=arrival(game(),5),request=s.pending.requestId;
 for(const score of [100,50,50,0]){const m=s.pending,p=s.players[m.seat],c={type:'official-checkpoint',revision:s.revision,requestId:request,seat:m.seat,snapshot:{gameId:m.gameId,seed:m.seed,cpu:false,difficulty:'normal',frame:300,inputs:[],done:true,score,summary:'結果'}};
  const loaded=E.restore(E.serialize(s)),next=E.dispatch(s,c);assert.deepEqual(next,E.dispatch(loaded,c));s=next;assert.throws(()=>E.dispatch(s,c));}
 assert.equal(s.phase,'official-result');assert.deepEqual(s.players.map(p=>p.money),[35,30,30,20]);assert.equal(s.miniHistory.length,1);assert.deepEqual(E.restore(E.serialize(s)),s);s=command(s,'continue');assert.equal(s.active,1);assert.equal(s.phase,'turn');
});
