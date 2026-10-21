import test from 'node:test';import assert from 'node:assert/strict';import * as e from '../engine.mjs';
function put(s,a,id,zone='hand'){const p=s.players[a],x=p.deck.shift();s.cards[x].cardId=id;p[zone].push(x);return x;}
function field(s,a,id,slot='main'){const x=put(s,a,id);s.players[a].hand.pop();if(slot==='companions')s.players[a].board.companions.push(x);else s.players[a].board[slot]=x;s.cards[x].generation++;return x;}
function go(s,kind,p=()=>true){const a=e.legalActions(s).find(a=>a.kind===kind&&p(a));assert.ok(a,kind);return e.act(s,e.actor(s),s.revision,a.id);}
function fixture(){const s=e.createGame(71);s.choice=null;s.pending=[];s.phase='normal';s.players.A.time=10;s.players.B.time=10;return s;}
function resolve(s){return go(go(s,'pass'),'pass');}
test('life charm replacement is a private mandatory choice, consumes charm, preserves main',()=>{
 let s=fixture();const source=field(s,'A','M-dragon-06'),target=field(s,'B','M-antlion-01');const own=put(s,'A','I-bowtie');s.players.A.hand.pop();s.players.A.board.prepared.push({id:own,target:source,targetGeneration:s.cards[source].generation});const charm=put(s,'B','I-c_life_charm');s.players.B.hand.pop();s.players.B.board.prepared.push({id:charm,target,targetGeneration:s.cards[target].generation});s=go(s,'programAbility',a=>a.source===source&&a.target===target);s=go(s,'choose',a=>a.value===own);s=resolve(s);assert.equal(s.choice.kind,'replacement');assert.equal(e.actor(s),'B');assert.equal(e.view(s,'A').choice,null);s=go(s,'choose',a=>a.value!=='decline');assert.equal(s.players.B.board.main,target);assert.ok(s.players.B.discard.includes(charm));e.validate(s);
});
test('growth prevention consumes round limit, never prevents own costs',()=>{
 let s=fixture();field(s,'B','C-hedgehog','companions');const first=put(s,'A','G-gomoku-9');for(let i=0;i<2;i++){const id=put(s,'A','G-real-fishing');s.players.A.hand.pop();s.players.A.board.prepared.push({id,faceDown:true,setSerial:0});}s=go(s,'programPlay',a=>a.source===first&&a.variant==='opponent');s=resolve(s);assert.equal(s.choice.kind,'quantity_prevention');s=go(s,'choose');assert.equal(s.players.B.growth,20);const second=put(s,'A','G-gomoku-9');s=resolve(go(s,'programPlay',a=>a.source===second&&a.variant==='opponent'));assert.equal(s.players.B.growth,15);e.validate(s);
});
test('one shared stat-prevention use allows choosing power or wisdom',()=>{
 let s=fixture();field(s,'B','M-cat-06');const illness=put(s,'A','E-big-illness');s=resolve(go(s,'programPlay',a=>a.source===illness));assert.equal(s.choice.kind,'quantity_prevention');assert.equal(e.legalActions(s).length,2);s=go(s,'choose',a=>a.label.includes('ちえ'));const effect=s.effects.find(x=>x.kind==='stat');assert.deepEqual([effect.power,effect.wisdom],[-2,-1]);assert.equal(s.replacementUsed.length,1);
});
test('changed destination is checked against remaining replacement effects',()=>{
 let s=fixture();const source=field(s,'A','M-dragon-06');field(s,'B','M-world_tree-03');const stone=field(s,'B','C-sekizou','companions');for(const who of ['A','B']){const x=put(s,who,'G-real-fishing');s.players[who].hand.pop();s.players[who].board.prepared.push({id:x,faceDown:true,setSerial:0});}s=go(s,'programAbility',a=>a.source===source&&a.target===stone);s=go(s,'choose',a=>a.value!=='cancel');s=resolve(s);assert.equal(s.choice.kind,'replacement');s=go(s,'choose',a=>a.value!=='decline');assert.equal(s.choice.kind,'replacement');s=go(s,'choose',a=>a.value!=='decline');assert.ok(s.players.B.board.companions.includes(stone));assert.equal(s.replacementUsed.length,2);
});
