// CPU time opportunity cost, deck-informed search and discard-recovery valuation. Engine rules/effects untouched.
import test from 'node:test';import assert from 'node:assert/strict';
import * as e from '../engine.mjs';
import {observeCpu} from '../cpu-observation.mjs';
import {chooseCpuAction,scoreCpuAction,timeOpportunity,legacySpend} from '../cpu-policy.mjs';
function normal(seed=20261019){let s=e.createGame(seed);while(s.phase!=='normal'){const a=e.legalActions(s).find(a=>a.kind==='pass')??e.legalActions(s)[0];s=e.act(s,e.actor(s),s.revision,a.id);}return s;}
function put(s,seat,id,zone='hand'){const p=s.players[seat],x=p.deck.shift();s.cards[x].cardId=id;if(zone==='hand')p.hand.push(x);return x;}
// Fixture only: relabel the remaining own deck (instances stay located) to control its composition.
function deck(s,seat,spec){const ids=s.players[seat].deck;let k=0;for(const [id,n] of spec)for(let i=0;i<n&&k<ids.length;i++)s.cards[ids[k++]].cardId=id;}
const only=(o,pred)=>{const opts=[...o.actions.filter(pred),o.actions.find(a=>a.kind==='pass')];return {...o,actions:opts};};
const pick=(o)=>o.actions.find(a=>a.id===chooseCpuAction(o).id);
function late(){const s=normal();s.round=6;s.players.A.time=6;s.players.A.deck.push(...s.players.A.hand.splice(0));return s;}
test('time is use-it-or-lose-it in the own normal phase: a positive tutor beats ending the turn',()=>{
 const s=late();s.players.A.time=2;put(s,'A','I-c_friend');const N=s.players.A.deck.length;deck(s,'A',[['C-owl',10],['G-hit-blow',N-10]]);
 const o=only(observeCpu(s,'A'),a=>a.card?.cardId==='I-c_friend'),a=o.actions[0];
 assert.ok(scoreCpuAction(a,o,()=>0)>0,'effect worth more than the card');assert.ok(scoreCpuAction(a,o,legacySpend)<=0,'old flat penalty rejected it');
 assert.equal(pick(o).card?.cardId,'I-c_friend');
});
test('search with no matching card in the own deck is worthless and not played',()=>{
 const s=late();s.players.A.time=2;put(s,'A','I-c_friend');deck(s,'A',[['G-hit-blow',99]]);
 const o=only(observeCpu(s,'A'),a=>a.card?.cardId==='I-c_friend');assert.deepEqual(o.actions[0].program.steps[0].hit.matches,[]);assert.equal(pick(o).kind,'pass');
});
test('search hit estimate follows the own remaining deck and never its order or the opponent',()=>{
 const s=late();put(s,'A','I-c_friend');const N=s.players.A.deck.length;deck(s,'A',[['C-owl',5],['G-hit-blow',N-5]]);
 const o=observeCpu(s,'A'),hit=o.actions.find(a=>a.card?.cardId==='I-c_friend').program.steps[0].hit;
 assert.equal(hit.N,N);assert.deepEqual(hit.matches.map(c=>[c.cardId,c.count]),[['C-owl',5]]);
 assert.equal(o.deck.reduce((n,c)=>n+c.count,0),N);
 const t=structuredClone(s);t.players.A.deck.reverse();for(const id of [...t.players.B.hand,...t.players.B.deck])t.cards[id].cardId='E-naoto';
 assert.deepEqual(observeCpu(t,'A'),o);assert.ok(!JSON.stringify(o.deck).includes('E-naoto'));
});
test('a paid action that would make a better action unaffordable is deferred',()=>{
 const s=late();s.players.A.time=2;const b=s.players.A.board;b.main=put(s,'A','M-dog-02','board');
 put(s,'A','E-mirror');put(s,'A','M-dog-04');deck(s,'A',[['M-dog-05',2],['M-dog-06',1]]);
 const o=observeCpu(s,'A'),t=timeOpportunity(o),i=o.actions.findIndex(a=>a.card?.cardId==='E-mirror'),skip=o.actions.findIndex(a=>a.variant==='time_skip');
 assert.ok(i>=0&&skip>=0);assert.ok(t[i]<scoreCpuAction(o.actions[i],o,()=>0),'charged for the lost time skip');
 assert.equal(pick(o).variant,'time_skip');
});
test('time is reserved for a held reaction card, and own-turn response windows keep the old cost',()=>{
 const base=()=>{const s=late();put(s,'A','I-c_coin2');put(s,'A','G-air-hockey');return s;};
 const one=base();one.players.A.time=1;const two=base();two.players.A.time=2;
 const score=s=>{const o=observeCpu(s,'A'),i=o.actions.findIndex(a=>a.card?.cardId==='I-c_coin2');return [timeOpportunity(o)[i],scoreCpuAction(o.actions[i],o,()=>0)];};
 const [f1,b1]=score(one),[f2,b2]=score(two);assert.equal(b1-f1,3);assert.equal(b2-f2,0);
 const s=late();put(s,'A','I-c_coin2');let n=e.act(s,'A',s.revision,e.legalActions(s).find(a=>a.kind==='play').id);
 assert.equal(n.phase,'response');assert.equal(e.actor(n),'A');assert.equal(timeOpportunity(observeCpu(n,'A')),null);
 n=e.act(n,'A',n.revision,e.legalActions(n).find(a=>a.kind==='pass').id);assert.equal(e.actor(n),'B');assert.ok(timeOpportunity(observeCpu(n,'B')));
});
test('どうぶつしょうぎ: recovery is valued by the actual discarded target and chosen when useful',()=>{
 const s=late();s.players.A.time=2;s.players.A.board.main=put(s,'A','M-beetle-03','board');const cat=put(s,'A','C-owl','discard');s.players.A.discard.push(cat);
 put(s,'A','G-animal-shogi');deck(s,'A',[['G-hit-blow',99]]);
 const o=only(observeCpu(s,'A'),a=>a.card?.cardId==='G-animal-shogi'),a=o.actions[0];assert.equal(a.targetZone,'ownDiscard');assert.equal(a.target.id,cat);
 assert.ok(scoreCpuAction(a,o,()=>0)>0);assert.equal(pick(o).card?.cardId,'G-animal-shogi');
 // With three companions on the field, another companion is worth little: not chosen.
 // The value is relative to the own deck: with three companions out and a deck of affordable same-species mains,
 // recovering another companion is worse than an average draw and is not chosen.
 const f=structuredClone(s);for(let k=0;k<3;k++)f.players.A.board.companions.push(put(f,'A','C-box','board'));deck(f,'A',[['M-beetle-04',99]]);
 const of=only(observeCpu(f,'A'),x=>x.card?.cardId==='G-animal-shogi');assert.ok(scoreCpuAction(of.actions[0],of,()=>0)<scoreCpuAction(a,o,()=>0));assert.equal(pick(of).kind,'pass');
});
test('unsupported search filters fall back to the previous flat estimate',()=>{
 const o=observeCpu(late(),'A');const a={kind:'programPlay',cost:0,card:{id:'x',type:'play',cost:0},program:{steps:[{op:'search',n:3,max:1,hit:null,steps:[]}],handCost:false,selfCost:false,select:[]}};
 assert.equal(scoreCpuAction(a,o,()=>0),5-3);
});
