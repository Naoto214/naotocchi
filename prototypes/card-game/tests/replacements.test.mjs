import test from 'node:test';import assert from 'node:assert/strict';import * as e from '../engine.mjs';
function put(s,a,id,zone='hand'){const p=s.players[a],x=p.deck.shift();s.cards[x].cardId=id;p[zone].push(x);return x;}
function field(s,a,id,slot='main'){const x=put(s,a,id);s.players[a].hand.pop();if(slot==='companions')s.players[a].board.companions.push(x);else s.players[a].board[slot]=x;s.cards[x].generation++;return x;}
function go(s,kind,p=()=>true){const a=e.legalActions(s).find(a=>a.kind===kind&&p(a));assert.ok(a,kind);return e.act(s,e.actor(s),s.revision,a.id);}
function fixture(){const s=e.createGame(71);s.choice=null;s.pending=[];s.phase='normal';s.players.A.time=10;s.players.B.time=10;return s;}
function resolve(s){return go(go(s,'pass'),'pass');}
test('life charm replacement is a private mandatory choice, consumes charm, preserves main',()=>{
 let s=fixture();const source=field(s,'A','M-dragon-06'),target=field(s,'B','M-antlion-01');const own=put(s,'A','I-bowtie');s.players.A.hand.pop();s.players.A.board.prepared.push({id:own,target:source,targetGeneration:s.cards[source].generation});const charm=put(s,'B','I-c_life_charm');s.players.B.hand.pop();s.players.B.board.prepared.push({id:charm,target,targetGeneration:s.cards[target].generation});s=go(s,'programAbility',a=>a.source===source&&a.target===target);s=go(s,'choose',a=>a.value===own);s=resolve(s);assert.equal(s.choice.kind,'replacement');assert.equal(e.actor(s),'B');assert.equal(e.view(s,'A').choice,null);s=go(s,'choose',a=>a.value!=='decline');assert.equal(s.players.B.board.main,target);assert.ok(s.players.B.discard.includes(charm));e.validate(s);
});
