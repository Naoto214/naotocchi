// CPU strategy decks, deck selection, saved deck label, challenge declaration and difficulty profiles.
import test from 'node:test';import assert from 'node:assert/strict';
import * as e from '../engine.mjs';
import {observeCpu} from '../cpu-observation.mjs';
import {chooseCpuAction,scoreCpuAction,PROFILES} from '../cpu-policy.mjs';
import {CpuSession,restoreMatch} from '../cpu-session.mjs';
import {CPU_DECKS,CPU_DECK_IDS,pickCpuDeck,resolveCpuDeck,cpuDeck} from '../cpu-decks.mjs';
import {gameMarkup} from '../ui-presentation.mjs';
function normal(seed=20261019){let s=e.createGame(seed);while(s.phase!=='normal'){const a=e.legalActions(s).find(a=>a.kind==='pass')??e.legalActions(s)[0];s=e.act(s,e.actor(s),s.revision,a.id);}return s;}
function put(s,seat,id,zone='hand'){const p=s.players[seat],x=p.deck.shift();s.cards[x].cardId=id;if(zone==='hand')p.hand.push(x);return x;}
test('seven CPU strategy decks are legal, distinct and each has a main growth line',()=>{
 assert.equal(CPU_DECKS.length,7);assert.equal(new Set(CPU_DECK_IDS).size,7);assert.equal(new Set(CPU_DECKS.map(d=>d.name)).size,7);
 for(const d of CPU_DECKS){assert.ok(e.validateDeck(d.cards),d.id);assert.ok(d.summary.length>10);
  const mains=d.cards.map(id=>e.CARDS[id]).filter(c=>c.type==='main');assert.ok(mains.length>=9,d.id);
  const stages=new Map();for(const c of mains)(stages.get(c.species)??stages.set(c.species,new Set()).get(c.species)).add(c.stage);
  // Growth path: a species with ① and at least three stages reaching ④+ (ときおくり may skip stages).
  assert.ok([...stages.values()].some(x=>x.has(1)&&x.size>=3&&Math.max(...x)>=4),`${d.id} has a main growth line`);}
});
test('deck selection: おまかせ is seeded, 指定 and 固定 pick known decks, マイデッキ keeps the old behaviour',()=>{
 assert.equal(pickCpuDeck(123),pickCpuDeck(123));const seen=new Set();for(let s=0;s<400;s++)seen.add(pickCpuDeck(s*977));assert.equal(seen.size,7);
 const auto=resolveCpuDeck({mode:'auto',seed:42});assert.equal(auto.id,pickCpuDeck(42));assert.equal(auto.seed,42);assert.deepEqual(auto.cards,cpuDeck(auto.id).cards);
 assert.equal(resolveCpuDeck({mode:'choose',chosen:'item'}).id,'item');assert.equal(resolveCpuDeck({mode:'fixed',last:'growth'}).id,'growth');
 assert.equal(resolveCpuDeck({mode:'fixed',last:null}).id,'balance');assert.equal(resolveCpuDeck({mode:'mydeck'}),null);
 assert.throws(()=>resolveCpuDeck({mode:'cheat'}));assert.throws(()=>resolveCpuDeck({mode:'choose',chosen:'nope'}));
});
test('saved CPU match keeps the deck label, rejects a mismatched label and older saves still restore',()=>{
 const label=resolveCpuDeck({mode:'choose',chosen:'partner'}),decks={A:[...e.DEFAULT_DECK],B:label.cards};
 const x=new CpuSession({humanSeat:'A',policySeed:7,cpuDeck:label});x.start(e.createGame(99,decks));const raw=x.save(),d=JSON.parse(raw);
 assert.deepEqual(d.cpuDeck,{mode:'choose',id:'partner',name:'こいびと・交際',seed:null});assert.equal(restoreMatch(raw).cpuDeck.id,'partner');
 assert.throws(()=>restoreMatch(JSON.stringify({...d,cpuDeck:{...d.cpuDeck,id:'challenge'}})),/一致しません/);
 const {cpuDeck:_,...old}=d;assert.equal(restoreMatch(JSON.stringify(old)).cpuDeck,null);
 assert.throws(()=>new CpuSession({humanSeat:'A',cpuDeck:label}).start(e.createGame(99)),/一致しません/);
});
test('CPU deck name stays hidden during play and appears with the result',()=>{
 const label=resolveCpuDeck({mode:'auto',seed:5}),x=new CpuSession({humanSeat:'B',policySeed:3,cpuDeck:label});x.start(e.createGame(77,{A:label.cards,B:[...e.DEFAULT_DECK]}));
 assert.equal(x.projection.cpuDeckName,null);assert.doesNotMatch(gameMarkup(x.projection,'B'),/CPUのデッキ：/);
 for(let i=0;i<4000&&!x.finished;i++){if(x.cpuPending)x.stepCpu(x.projection.revision);else{const o=x.decisionInput(),a=chooseCpuAction(o,{seed:11,step:o.revision});x.commit(a.id,o.revision,o.seat);}}
 assert.equal(x.finished,true);assert.equal(x.projection.cpuDeckName,label.name);assert.match(gameMarkup(x.projection,'B'),new RegExp('CPUのデッキ：'+label.name));
});
test('intermediate declares a tied challenge only when an own modifier can win it',()=>{
 const tie=()=>{const s=normal();for(const a of ['A','B']){const m=put(s,a,'M-beetle-02','board');s.players[a].board.main=m;}s.players.A.time=3;s.players.A.challengeUsed=false;return s;};
 const pick=o=>o.actions.find(a=>a.id===chooseCpuAction({...o,actions:o.actions.filter(a=>a.kind==='challenge'||a.kind==='pass')}).id);
 const plain=tie();const op=observeCpu(plain,'A');assert.equal(op.challengeKit.own.length,0);assert.equal(pick(op).kind,'pass');
 const kit=tie();put(kit,'A','G-baseball-batting');const ok=observeCpu(kit,'A');assert.ok(ok.challengeKit.own.some(x=>x.param==='power'&&x.n===2));
 const choice=pick(ok);assert.equal(choice.kind,'challenge');assert.equal(choice.parameter,'power');
 // Beginner keeps the old rule: never declares without a current lead.
 assert.equal(ok.actions.find(a=>a.id===chooseCpuAction({...ok,actions:ok.actions.filter(a=>a.kind==='challenge'||a.kind==='pass')},{difficulty:'beginner'}).id).kind,'pass');
 // Far behind: a +2 modifier cannot win, so no declaration.
 const far=tie();far.cards[far.players.B.board.main].cardId='M-beetle-07';put(far,'A','G-baseball-batting');assert.equal(pick(observeCpu(far,'A')).kind,'pass');
 // The kit never depends on the opponent's hidden cards.
 const t=structuredClone(kit);for(const id of t.players.B.hand)t.cards[id].cardId='G-ski-jump';assert.deepEqual(observeCpu(t,'A').challengeKit,ok.challengeKit);
});
test('beginner profile uses the simpler evaluations and does not react on the opponent turn',()=>{
 assert.deepEqual(PROFILES.beginner,{time:'flat',search:'flat',challenge:'simple',opponentTurn:false,cap:12});
 const s=normal();s.round=6;s.players.A.time=6;put(s,'A','I-c_coin2');put(s,'B','I-c_coin2');
 let n=e.act(s,'A',s.revision,e.legalActions(s).find(a=>a.kind==='play').id);
 while(e.actor(n)==='A'&&n.phase==='response')n=e.act(n,'A',n.revision,e.legalActions(n).find(a=>a.kind==='pass').id);
 assert.equal(n.turn,'A');assert.equal(e.actor(n),'B');n.players.B.time=3;
 const o=observeCpu(n,'B'),play=o.actions.find(a=>a.kind==='play');assert.ok(play,'B may quick-play on A turn');
 assert.equal(o.actions.find(a=>a.id===chooseCpuAction(o,{difficulty:'beginner'}).id).kind,'pass');
 assert.equal(o.actions.find(a=>a.id===chooseCpuAction(o,{difficulty:'intermediate'}).id).kind,'play','unused time is lost at the own turn start');
});
