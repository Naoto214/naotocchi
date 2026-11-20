import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {CPU_DECKS,CPU_DECK_HISTORY,cpuDeckVersion} from '../cpu-decks.mjs';
import {chooseCpuAction,POLICY_VERSION,POLICY_VERSIONS} from '../cpu-policy.mjs';
import {observeCpu} from '../cpu-observation.mjs';
import {createGame} from '../engine.mjs';
const fixture=JSON.parse(fs.readFileSync(new URL('./fixtures/card459-p3.json',import.meta.url)));
test('P3 adopts the exact seven approved ordered lists and preserves every prior list',()=>{
 for(const d of fixture.p3){assert.deepEqual(CPU_DECKS.find(x=>x.id===d.id).cards,d.cards);assert.equal(cpuDeckVersion(d.id,d.cards),'current');}
 for(const d of fixture.old){assert.ok(CPU_DECK_HISTORY[d.id].some(x=>JSON.stringify(x.cards)===JSON.stringify(d.cards)));assert.notEqual(cpuDeckVersion(d.id,d.cards),null);assert.notEqual(cpuDeckVersion(d.id,d.cards),'current');}
 for(const [id,history] of Object.entries(fixture.history))for(const d of history)assert.ok(CPU_DECK_HISTORY[id].some(x=>x.version===d.version&&JSON.stringify(x.cards)===JSON.stringify(d.cards)));
});
test('legacy policies retain frozen action IDs and scores for both difficulties',()=>{
 for(const {observation:o,choices,step} of fixture.decisions)for(const [key,expected] of Object.entries(choices)){const [version,difficulty]=key.split('/');assert.deepEqual(chooseCpuAction(o,{version,difficulty,seed:31,step}),expected);}
});
test('new policy is versioned and agrees with heuristic-3 without new cards',()=>{
 assert.equal(POLICY_VERSION,'heuristic-4');assert.deepEqual(POLICY_VERSIONS,['heuristic-1','heuristic-2','heuristic-3','heuristic-4']);
 for(const {observation:o,choices,step} of fixture.decisions)for(const difficulty of ['beginner','intermediate'])assert.deepEqual(chooseCpuAction(o,{version:'heuristic-4',difficulty,seed:31,step}),{...choices['heuristic-3/'+difficulty],policy:'heuristic-4'});
});
test('observation exposes only public life metadata and keeps legacy observations unchanged',()=>{
 const decks={A:fixture.old[0].cards,B:fixture.old[1].cards},old=createGame(31,decks,'hotseat-8');assert.equal('life' in observeCpu(old,'A'),false);
 const s=createGame(31,decks,'hotseat-9');s.life={final:12,events:[{privateTestSentinel:1}]};const o=observeCpu(s,'A');assert.deepEqual(o.life,{final:12,cap:{A:100,B:100},hold:{A:100,B:100},holding:{A:false,B:false}});assert.ok(Object.isFrozen(o.life));
 const changed=structuredClone(s);changed.players.B.hand.reverse();changed.players.B.deck.reverse();assert.deepEqual(observeCpu(changed,'A'),o);
});
test('adaptive reversal and time evaluation is enabled only in heuristic-4 for both difficulties',()=>{
 const o=structuredClone(fixture.decisions[0].observation);o.round=8;o.turn=o.seat;o.phase='normal';o.players[o.seat].growth=30;o.players.B.growth=80;o.players[o.seat].time=8;o.life={final:10,cap:{A:100,B:100},hold:{A:100,B:100},holding:{A:false,B:false}};
 o.players[o.seat].hand=[{cardId:'E-nagaiki',name:'長生きの秘訣',type:'event',cost:2},{cardId:'W-time-xii',name:'時のカード XII',type:'world',cost:2}];
 o.actions=[{id:'long',kind:'place',slot:'world',cost:2,card:o.players[o.seat].hand[1]},{id:'pass',kind:'pass',cost:0}];
 for(const difficulty of ['beginner','intermediate']){assert.equal(chooseCpuAction(o,{version:'heuristic-4',difficulty}).id,'pass');const legacy=chooseCpuAction(o,{version:'heuristic-3',difficulty});assert.equal(legacy.id,'long');const without=structuredClone(o);delete without.life;assert.deepEqual(chooseCpuAction(without,{version:'heuristic-3',difficulty}),legacy);}
 o.actions=[{id:'naga',kind:'programPlay',cost:2,card:o.players[o.seat].hand[0],program:{steps:[{op:'growth',n:5}]}},{id:'pass',kind:'pass',cost:0}];
 for(const difficulty of ['beginner','intermediate'])assert.equal(chooseCpuAction(o,{version:'heuristic-4',difficulty}).id,'pass');
});
test('heuristic-4 matches frozen approved candidate actions and scores across final rounds and holdings',()=>{
 for(const {observation:o,choices,step} of fixture.candidate)for(const difficulty of ['beginner','intermediate']){
  const expected={...choices[difficulty],policy:'heuristic-4'};assert.deepEqual(chooseCpuAction(o,{version:'heuristic-4',difficulty,seed:19,step}),expected);
  const formal=JSON.parse(JSON.stringify(o).replaceAll('"IX"','"時のカード IX"').replaceAll('"X"','"時のカード X"').replaceAll('"XI"','"時のカード XI"').replaceAll('"XII"','"時のカード XII"'));
  assert.deepEqual(chooseCpuAction(formal,{version:'heuristic-4',difficulty,seed:19,step}),expected);
 }
});
