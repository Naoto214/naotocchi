import test from 'node:test';import assert from 'node:assert/strict';import * as e from '../engine.mjs';
function put(s,a,id,zone='hand'){const p=s.players[a],x=p.deck.shift();s.cards[x].cardId=id;p[zone].push(x);return x;}
function field(s,a,id,slot='main'){const x=put(s,a,id);s.players[a].hand.pop();if(slot==='companions')s.players[a].board.companions.push(x);else s.players[a].board[slot]=x;s.cards[x].generation++;return x;}
function go(s,kind,p=()=>true){const a=e.legalActions(s).find(a=>a.kind===kind&&p(a));assert.ok(a,kind);return e.act(s,e.actor(s),s.revision,a.id);}
function fixture(){const s=e.createGame(71);s.choice=null;s.pending=[];s.phase='normal';s.players.A.time=10;s.players.B.time=10;return s;}
function resolve(s){return go(go(s,'pass'),'pass');}
test('trap negates a specific action link, leaves paid costs and discards both cards',()=>{
 let s=fixture();const trap=put(s,'B','G-space-gunner-3d');s.players.B.hand.pop();s.players.B.board.prepared.push({id:trap,faceDown:true,setSerial:0});const play=put(s,'A','G-dot-eater');const hand=s.players.A.hand.length,growth=s.players.B.growth,time=s.players.A.time;s=go(s,'programPlay',a=>a.source===play);assert.equal(s.phase,'trigger');s=go(s,'trigger',a=>a.source===trap);s=resolve(s);assert.equal(s.players.A.hand.length,hand-1);assert.equal(s.players.B.growth,growth);assert.equal(s.players.A.time,time-e.CARDS['G-dot-eater'].cost);assert.ok(s.players.A.discard.includes(play));assert.ok(s.players.B.discard.includes(trap));assert.ok(s.history.some(x=>x.kind==='negated'));e.validate(s);
});
test('effect-applied triggers wait until all links resolve, and negated effects never trigger',()=>{
 let s=fixture();const main=field(s,'A','M-antlion-01');const badge=put(s,'A','I-star');s.players.A.hand.pop();s.players.A.board.prepared.push({id:badge,target:main,targetGeneration:s.cards[main].generation});const play=put(s,'A','G-dot-eater'),other=put(s,'B','I-c_coin2');s=go(s,'programPlay',a=>a.source===play);s=go(s,'pass');s=go(s,'play',a=>a.source===other);s=resolve(s);assert.equal(s.chain.length,0);assert.equal(s.phase,'trigger');assert.ok(s.pending.some(x=>x.source===badge));s=go(s,'trigger',a=>a.source===badge);s=resolve(s);assert.equal(s.players.A.growth,25);
});
test('retarget keeps the original effect target restrictions and changes one field reference',()=>{
 let s=fixture();const traps=[];for(let i=0;i<2;i++){const x=put(s,'B','G-real-fishing');s.players.B.hand.pop();s.players.B.board.prepared.push({id:x,faceDown:true,setSerial:0});traps.push(x);}const play=put(s,'A','G-tank-battle'),redirect=put(s,'B','G-tilt-maze-3d');s=go(s,'programPlay',a=>a.source===play&&a.target===traps[0]);s=go(s,'pass');s=go(s,'programPlay',a=>a.source===redirect&&a.target===traps[1]);s=resolve(s);assert.ok(s.players.B.board.prepared.some(x=>x.id===traps[0]));assert.ok(s.players.B.hand.includes(traps[1]));e.validate(s);
});
test('one round ability cannot be activated twice from pending events in one chain',()=>{
 let s=fixture();const main=field(s,'A','M-antlion-01'),badge=put(s,'A','I-star');s.players.A.hand.pop();s.players.A.board.prepared.push({id:badge,target:main,targetGeneration:s.cards[main].generation});for(let i=0;i<2;i++){const p=put(s,'A','G-dot-eater');s=go(s,'programPlay',a=>a.source===p);}s=resolve(s);assert.equal(s.pending.filter(x=>x.source===badge).length,2);s=go(s,'trigger',a=>a.source===badge);assert.equal(s.pending.filter(x=>x.source===badge).length,0);s=resolve(s);assert.equal(s.players.A.growth,25);
});
test('reveal effects emit applied but an empty optional selection does not',()=>{
 let s=fixture();const play=put(s,'A','G-sugoroku-race');s=resolve(go(s,'programPlay',a=>a.source===play));assert.ok(s.history.some(x=>x.kind==='effectApplied'&&x.source===play));
 s=fixture();const man=field(s,'A','M-man-04');field(s,'B','M-beetle-01');s=go(s,'challenge');s=go(s,'trigger',a=>a.source===man);s=resolve(s);assert.equal(s.choice.kind,'resolve_selection');s=go(s,'choose',a=>a.value==='done');assert.equal(s.history.some(x=>x.kind==='effectApplied'&&x.source===man),false);
});
test('empty-deck deepsea still records the applied growth loss',()=>{
 let s=fixture();field(s,'A','W-deepsea','world');const play=put(s,'A','G-fishing-deepsea');s.players.A.discard.push(...s.players.A.deck);s.players.A.deck=[];s=resolve(go(s,'programPlay',a=>a.source===play));assert.equal(s.players.A.growth,15);assert.ok(s.history.some(x=>x.kind==='effectApplied'&&x.source===play));
});
