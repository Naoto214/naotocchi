// CPU こいびと・交際 deck list (2026-10-25): legality, lover counts, the other six decks unchanged,
// matches saved with the earlier list still restore with their own 40 cards, both difficulties play it out.
import test from 'node:test';import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as e from '../engine.mjs';
import {chooseCpuAction} from '../cpu-policy.mjs';
import {CpuSession,restoreMatch} from '../cpu-session.mjs';
import {CPU_DECKS,CPU_DECK_HISTORY,cpuDeck,cpuDeckVersion,resolveCpuDeck,pickCpuDeck} from '../cpu-decks.mjs';
import {ALL_VARIANTS} from '../partner-deck-20261025/variants.mjs';
const count=l=>l.reduce((m,id)=>(m[id]=(m[id]??0)+1,m),{});
const sorted=l=>[...l].sort();
// Lists fixed before the comparison ran (generated from the decks as they were on main 0b3bb1fe).
const planned=JSON.parse(readFileSync(new URL('../partner-deck-20261025/runs/PD-manifest.json',import.meta.url),'utf8')).decks;

test('partner list is legal and holds six lovers of two kinds, three copies each',()=>{
 const d=cpuDeck('partner'),c=count(d.cards);assert.ok(e.validateDeck(d.cards));assert.equal(d.cards.length,40);assert.equal(d.version,'2026-10-25');
 const lovers=Object.entries(c).filter(([id])=>e.CARDS[id].type==='partner');
 assert.deepEqual(Object.fromEntries(lovers),{'P-grove_deer':3,'P-high_eagle':3});
 for(const [id,n] of Object.entries(c))assert.ok(n<=(e.CARDS[id].rare?1:3),id);
 assert.deepEqual(sorted(d.cards),sorted(ALL_VARIANTS.L6cf.cards));
 assert.equal(d.name,'こいびと・交際');
});
test('the other six CPU decks are exactly the lists used before the change',()=>{
 for(const d of CPU_DECKS.filter(d=>d.id!=='partner'))assert.deepEqual(d.cards,planned[d.id].cards,d.id);
 assert.equal(CPU_DECKS.length,7);
});
test('earlier partner list is kept as a version and still recognised',()=>{
 const old=CPU_DECK_HISTORY.partner[0];assert.equal(old.version,'2026-10-22');assert.deepEqual([...old.cards],planned['partner@L10'].cards);
 assert.equal(count(old.cards)['P-cat_ceo'],2);
 assert.equal(cpuDeckVersion('partner',cpuDeck('partner').cards),'current');
 assert.equal(cpuDeckVersion('partner',[...old.cards].reverse()),'2026-10-22');
 assert.equal(cpuDeckVersion('partner',ALL_VARIANTS.L6.cards),null);
 assert.equal(cpuDeckVersion('balance',old.cards),null);
});
test('new matches use the current list in every selection mode',()=>{
 const cur=cpuDeck('partner').cards;assert.deepEqual(resolveCpuDeck({mode:'choose',chosen:'partner'}).cards,cur);
 assert.deepEqual(resolveCpuDeck({mode:'fixed',last:'partner'}).cards,cur);
 const seed=[...Array(200).keys()].find(s=>pickCpuDeck(s)==='partner');assert.deepEqual(resolveCpuDeck({mode:'auto',seed}).cards,cur);
});
test('a match saved with the earlier partner list restores with its own 40 cards; other lists are rejected',()=>{
 const label={mode:'choose',id:'partner',name:'こいびと・交際',seed:null},old=[...CPU_DECK_HISTORY.partner[0].cards];
 const x=new CpuSession({humanSeat:'A',policySeed:7,cpuDeck:label});x.start(e.createGame(99,{A:[...e.DEFAULT_DECK],B:old}));
 const raw=x.save(),d=JSON.parse(raw),back=restoreMatch(raw);
 assert.equal(back.cpuDeck.id,'partner');assert.deepEqual(sorted(d.game.decks.B),sorted(old));
 assert.equal(JSON.parse(back.save()).game.decks.B.join(),d.game.decks.B.join());
 const y=new CpuSession({humanSeat:'A',policySeed:7,cpuDeck:label});y.start(e.createGame(99,{A:[...e.DEFAULT_DECK],B:[...cpuDeck('partner').cards]}));assert.equal(restoreMatch(y.save()).cpuDeck.id,'partner');
 assert.throws(()=>new CpuSession({humanSeat:'A',cpuDeck:label}).start(e.createGame(99,{A:[...e.DEFAULT_DECK],B:[...ALL_VARIANTS.L6.cards]})),/一致しません/);
 assert.throws(()=>restoreMatch(JSON.stringify({...d,cpuDeck:{...d.cpuDeck,id:'balance'}})),/一致しません/);
});
for(const difficulty of ['beginner','intermediate'])test(`${difficulty} CPU plays the partner list to the end and the save restores`,()=>{
 const label=resolveCpuDeck({mode:'choose',chosen:'partner'}),x=new CpuSession({humanSeat:'A',difficulty,policySeed:5,cpuDeck:label});
 x.start(e.createGame(424242,{A:[...cpuDeck('balance').cards],B:label.cards}));
 for(let i=0;i<4000&&!x.finished;i++){if(x.cpuPending)x.stepCpu(x.projection.revision);else{const o=x.decisionInput(),a=chooseCpuAction(o,{seed:13,step:o.revision});x.commit(a.id,o.revision,o.seat);}}
 assert.equal(x.finished,true);assert.equal(x.projection.cpuDeckName,'こいびと・交際');
 const back=restoreMatch(x.save());assert.equal(back.finished,true);assert.equal(back.cpuDeck.id,'partner');
});
test('a finished match played with the earlier partner list is recorded under the partner opponent with its own cards',async()=>{
 const {encodeMatch,decodeMatch,newMetadata}=await import('../records-match.mjs'),records=await import('../records.mjs');
 const label={mode:'choose',id:'partner',name:'こいびと・交際',seed:null},old=[...CPU_DECK_HISTORY.partner[0].cards];
 const x=new CpuSession({humanSeat:'A',policySeed:21,cpuDeck:label});x.start(e.createGame(777,{A:[...e.DEFAULT_DECK],B:old}));
 for(let i=0;i<4000&&!x.finished;i++){if(x.cpuPending)x.stepCpu(x.projection.revision);else{const o=x.decisionInput(),a=chooseCpuAction(o,{seed:2,step:o.revision});x.commit(a.id,o.revision,o.seat);}}
 assert.equal(x.finished,true);const decks=JSON.parse(x.save()).game.decks;
 const meta={...newMetadata({mode:'cpu',human:'A',difficulty:'intermediate',cpuDeck:'partner',decks:{A:{id:null,name:'初期デッキ',cards:decks.A},B:{id:null,name:'CPU こいびと・交際',cards:decks.B}}}),completedAt:null};
 const {session,metadata}=decodeMatch(encodeMatch(x.save(),meta));assert.equal(session.cpuDeck.id,'partner');
 const g=JSON.parse(session.save()).game,state=e.restore(JSON.stringify(g)),rec=records.buildRecord(state,{...metadata,completedAt:metadata.startedAt+1},metadata.startedAt+1);
 assert.equal(rec.cpuDeck,'partner');assert.deepEqual(rec.decks.B.cards,decks.B);assert.equal(records.summarize([rec]).opponents.partner.total,1);
});
