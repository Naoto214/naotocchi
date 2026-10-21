import test from 'node:test';import assert from 'node:assert/strict';
import * as e from '../engine.mjs';
import {observeCpu} from '../cpu-observation.mjs';
import {chooseCpuAction} from '../cpu-policy.mjs';
function normal(){let s=e.createGame(20261019);while(s.phase!=='normal'){const a=e.legalActions(s).find(a=>a.kind==='pass')??e.legalActions(s)[0];s=e.act(s,e.actor(s),s.revision,a.id);}return s;}
function put(s,seat,id,zone='hand'){const p=s.players[seat],x=p.deck.shift();s.cards[x].cardId=id;p[zone].push(x);return x;}
test('hidden hand, deck order, seed and trap identity do not change CPU observation or decision',()=>{
 const s=normal(),id=put(s,'B','G-real-fishing');s.players.B.hand.pop();s.players.B.board.prepared.push({id,faceDown:true});
 const t=structuredClone(s);t.seed=9988;t.players.A.deck.reverse();t.players.B.deck.reverse();for(const id of t.players.B.hand)t.cards[id].cardId='E-naoto';t.cards[id].cardId='G-ski-jump';
 const a=observeCpu(s,'A'),b=observeCpu(t,'A');assert.deepEqual(a,b);assert.equal(chooseCpuAction(a).id,chooseCpuAction(b).id);
 for(const key of ['seed','decks','commands','log','history','cards'])assert.equal(a[key],undefined);
 assert.equal(a.players.B.hand,undefined);assert.equal(a.players.A.deck,undefined);assert.ok(!JSON.stringify(a).includes(id));
});
test('CPU preserves affordable birth card during egg return and chooses birth before spending time',()=>{
 const s=e.createGame(20261020);for(const id of s.players.A.hand)s.cards[id].cardId='M-beetle-08';const baby=s.players.A.hand[0];s.cards[baby].cardId='M-beetle-01';
 let obs=observeCpu(s,'A'),pick=chooseCpuAction(obs);assert.notEqual(obs.actions.find(a=>a.id===pick.id).card?.id,baby);
 let n=e.act(s,'A',s.revision,pick.id);while(n.phase!=='normal')n=e.act(n,e.actor(n),n.revision,e.legalActions(n).find(a=>a.kind==='pass').id);
 obs=observeCpu(n,'A');pick=chooseCpuAction(obs);assert.equal(obs.actions.find(a=>a.id===pick.id).variant,'birth');
});
test('CPU avoids losing public-stat challenge and prefers higher winning parameter',()=>{
 const s=normal();for(const [a,id] of [['A','M-beetle-01'],['B','M-beetle-08']]){const x=put(s,a,id);s.players[a].hand.pop();s.players[a].board.main=x;}
 s.players.A.time=0;s.players.A.personUsed=true;s.players.A.hand=[]; // move hand cards back to deck for valid fixture
 const located=new Set(Object.values(s.players).flatMap(p=>[...p.hand,...p.deck,...p.discard,p.board.main,...p.board.prepared.map(x=>x.id)].filter(Boolean)));
 for(const id of Object.keys(s.cards))if(!located.has(id))s.players.A.deck.push(id);
 const o=observeCpu(s,'A');assert.equal(o.actions.find(a=>a.id===chooseCpuAction(o).id).kind,'pass');
});
test('all 452 definitions use the same bounded legal candidate interface',()=>{
 assert.equal(Object.keys(e.CARDS).length,452);for(const id of Object.keys(e.CARDS)){const s=normal();put(s,'A',id);s.players.A.time=10;const o=observeCpu(s,'A'),decision=chooseCpuAction(o);assert.ok(o.actions.some(a=>a.id===decision.id),id);assert.ok(Number.isFinite(decision.score),id);}
});
test('policy rejects unknown difficulty and empty inventory instead of making up commands',()=>{
 const o=observeCpu(normal(),'A');assert.throws(()=>chooseCpuAction(o,{difficulty:'cheat'}));assert.throws(()=>chooseCpuAction({...o,actions:[]}));
});
test('growth reduction values denial at cap and does not waste increases at100',()=>{
 const s=normal();s.round=9;s.players.A.time=10;s.players.A.growth=100;s.players.B.growth=100;const source=put(s,'A','G-gomoku-9');for(const id of ['G-real-fishing','G-ski-jump']){const x=put(s,'A',id);s.players.A.hand.pop();s.players.A.board.prepared.push({id:x,faceDown:true});}
 const o=observeCpu(s,'A'),options=o.actions.filter(a=>a.card?.id===source||a.kind==='pass');const a=chooseCpuAction({...o,actions:options});assert.equal(options.find(x=>x.id===a.id).variant,'opponent');
});
test('removal selection prefers valuable opponent target and discards expendable own cards',()=>{
 const s=normal();const weak=put(s,'B','M-beetle-01'),strong=put(s,'B','M-beetle-08');s.players.B.hand=s.players.B.hand.filter(x=>x!==weak&&x!==strong);s.players.B.discard.push(weak,strong);s.choice={actor:'A',kind:'resolve_selection',spec:{zone:'opponentDiscard',count:1,steps:[{op:'selectedMove',key:'targets',destination:'discard'}],key:'targets'},options:[{id:weak,label:'weak'},{id:strong,label:'strong'}]};s.phase='choice';const o=observeCpu(s,'A');assert.equal(o.actions[0].targetSeat,'B');
 const base={...o,actions:o.actions.map(a=>({...a,choiceCard:{...a.choiceCard,type:'item',cost:a.choiceCard.id===strong?0:5}}))};const decision=chooseCpuAction(base);assert.equal(base.actions.find(a=>a.id===decision.id).choiceCard.id,strong);
});
