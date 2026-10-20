// CPU evaluation of the six legacy hard-coded play cards (no RULES program). Engine rules/effects are untouched.
import test from 'node:test';import assert from 'node:assert/strict';
import * as e from '../engine.mjs';
import {observeCpu} from '../cpu-observation.mjs';
import {chooseCpuAction,scoreCpuAction} from '../cpu-policy.mjs';
import {CpuSession,restoreMatch} from '../cpu-session.mjs';
const LEGACY=['I-c_coin2','G-hit-blow','G-area-claim','E-first-date','G-animal-shogi','G-archery-3d'];
function normal(seed=20261019){let s=e.createGame(seed);while(s.phase!=='normal'){const a=e.legalActions(s).find(a=>a.kind==='pass')??e.legalActions(s)[0];s=e.act(s,e.actor(s),s.revision,a.id);}return s;}
// Re-label a deck card in place (keeps all 80 instances located; fixture only).
function put(s,seat,id,zone='hand'){const p=s.players[seat],x=p.deck.shift();s.cards[x].cardId=id;if(zone==='hand')p.hand.push(x);return x;}
function late(s){s.round=6;s.players.A.time=6;return s;}
const legacyActions=(o,id)=>o.actions.filter(a=>a.kind==='play'&&a.card?.cardId===id);
const picks=(o,id)=>{const opts=[...legacyActions(o,id),o.actions.find(a=>a.kind==='pass')];const d=chooseCpuAction({...o,actions:opts});return opts.find(a=>a.id===d.id);};
function field(s,seat,{main=true,partner=false,world=false,companions=0,prepared=0}={}){
 const b=s.players[seat].board;if(main)b.main=put(s,seat,'M-beetle-03','board');if(partner)b.partner=put(s,seat,'P-grove_deer','board');if(world)b.world=put(s,seat,'W-forest','board');
 for(let i=0;i<companions;i++)b.companions.push(put(s,seat,'C-box','board'));for(let i=0;i<prepared;i++)b.prepared.push({id:put(s,seat,'I-bowtie','board'),target:b.main});
}
test('root cause: legacy play cards no longer receive an empty truthy program',()=>{
 const s=late(normal());for(const id of LEGACY)put(s,'A',id);field(s,'A',{partner:true,world:true});field(s,'B',{prepared:1});
 const x=put(s,'A','C-cat_friend','discard');s.players.A.discard.push(x);
 const o=observeCpu(s,'A');
 for(const id of LEGACY){const as=legacyActions(o,id);assert.ok(as.length,id);for(const a of as){assert.ok(a.program,id);assert.equal(a.program.legacy,id);}}
 // Non-legacy programs are unchanged: real RULES programs keep their own hints.
 const fishing=put(s,'A','G-real-fishing');const p=observeCpu(s,'A').actions.find(a=>a.source===undefined&&a.card?.id===fishing);if(p)assert.equal(p.program.legacy,undefined);
});
test('useful legacy plays are chosen over ending the turn',()=>{
 {const s=late(normal());field(s,'A',{partner:true});s.players.A.relationship=0;put(s,'A','E-first-date');assert.equal(picks(observeCpu(s,'A'),'E-first-date')?.kind,'play');}
 {const s=late(normal());field(s,'A',{partner:true,world:true,companions:3,prepared:1});put(s,'A','G-area-claim');assert.equal(picks(observeCpu(s,'A'),'G-area-claim')?.kind,'play');}
 {const s=late(normal());put(s,'A','I-c_coin2');assert.equal(picks(observeCpu(s,'A'),'I-c_coin2')?.kind,'play');}
 {const s=late(normal());field(s,'A',{world:true});field(s,'B',{prepared:1});put(s,'A','G-archery-3d');assert.equal(picks(observeCpu(s,'A'),'G-archery-3d')?.kind,'play');}
});
test('meaningless or impossible legacy plays are not chosen',()=>{
 // first date after the relationship already advanced: resolves to nothing.
 {const s=late(normal());field(s,'A',{partner:true});s.players.A.relationship=2;put(s,'A','E-first-date');const o=observeCpu(s,'A');assert.deepEqual(legacyActions(o,'E-first-date')[0].program.steps,[]);assert.equal(picks(o,'E-first-date').kind,'pass');}
 // area claim below 7 own field cards: no growth.
 {const s=late(normal());field(s,'A',{partner:true,world:true,companions:2});put(s,'A','G-area-claim');const o=observeCpu(s,'A');assert.deepEqual(legacyActions(o,'G-area-claim')[0].program.steps,[]);assert.equal(picks(o,'G-area-claim').kind,'pass');}
 // coin with an empty deck reveals nothing.
 {const s=late(normal());const c=put(s,'A','I-c_coin2');s.players.A.discard.push(...s.players.A.deck.splice(0));const o=observeCpu(s,'A');assert.ok(legacyActions(o,'I-c_coin2').length);assert.notEqual(picks(o,'I-c_coin2').kind,'play');assert.ok(c);}
 // not enough time: the engine offers no candidate, so the CPU cannot pick it.
 {const s=late(normal());put(s,'A','G-area-claim');s.players.A.time=2;assert.equal(legacyActions(observeCpu(s,'A'),'G-area-claim').length,0);}
 // conditions unmet: archery needs an own world and an opponent prepared card; shogi needs a discarded companion.
 {const s=late(normal());field(s,'B',{prepared:1});put(s,'A','G-archery-3d');put(s,'A','G-animal-shogi');const o=observeCpu(s,'A');assert.equal(legacyActions(o,'G-archery-3d').length,0);assert.equal(legacyActions(o,'G-animal-shogi').length,0);}
});
test('hit-blow declaration uses only own known cards, never hidden opponent or deck information',()=>{
 const s=late(normal());const hb=put(s,'A','G-hit-blow');for(const id of ['M-beetle-01','M-beetle-02','M-antlion-01'])put(s,'A',id);
 const o=observeCpu(s,'A'),pick=picks(o,'G-hit-blow');assert.equal(pick.kind,'play');assert.equal(pick.declare,'main');
 const t=structuredClone(s);t.players.A.deck.reverse();for(const id of t.players.B.hand)t.cards[id].cardId='E-naoto';t.players.B.deck.reverse();
 assert.deepEqual(observeCpu(t,'A').actions.map(a=>a.program),o.actions.map(a=>a.program));
 const shares=legacyActions(o,'G-hit-blow').filter(a=>a.card.id===hb).map(a=>a.program.steps[1].p);assert.equal(shares.length,7);assert.ok(shares.every(p=>p>=0&&p<=1));assert.ok(Math.abs(shares.reduce((a,b)=>a+b,0)-1)<1e-9);
});
test('chosen legacy play goes through the normal response window and chain resolution',()=>{
 const s=late(normal());field(s,'A',{partner:true});s.players.A.relationship=0;put(s,'A','E-first-date');
 const o=observeCpu(s,'A'),a=picks(o,'E-first-date'),i=o.actions.findIndex(x=>x.id===a.id);let n=e.act(s,'A',s.revision,e.legalActions(s)[i].id);
 assert.equal(n.phase,'response');assert.equal(n.chain.length,1);const before=s.players.A.growth;
 // Both seats can be observed and decide in the window; then everyone passes so only the first date resolves.
 for(const who of ['A','B']){if(e.actor(n)!==who)break;const ob=observeCpu(n,who);assert.ok(ob.actions.some(x=>x.id===chooseCpuAction(ob).id));n=e.act(n,who,n.revision,e.legalActions(n).find(x=>x.kind==='pass').id);}
 while(n.chain.length)n=e.act(n,e.actor(n),n.revision,e.legalActions(n).find(x=>x.kind==='pass').id);
 assert.equal(n.players.A.growth,before+5);assert.equal(n.players.A.hand.length,s.players.A.hand.length);
});
test('CPU games with the standard deck use legacy cards, finish, replay and restore for both seats and difficulties',()=>{
 for(const humanSeat of ['A','B'])for(const difficulty of ['beginner','intermediate']){
  let x=new CpuSession({humanSeat,difficulty,policySeed:4242});x.start(e.createGame(20261020));let restored=false,legacyPlays=0;
  for(let i=0;i<3000&&!x.finished;i++){assert.equal(x.automationStop,null);
   if(x.cpuPending)x.stepCpu(x.projection.revision);else{const o=x.decisionInput(),d=chooseCpuAction(o,{difficulty,seed:99,step:o.revision});x.commit(d.id,o.revision,o.seat);}
   if(!restored&&i>40){x=restoreMatch(x.save());x.reveal();restored=true;}}
  assert.equal(x.finished,true);const raw=x.engineSave,state=e.restore(raw);assert.equal(e.save(state),raw);
  for(const id of state.commands){const c=JSON.parse(id);if(c.kind==='play'&&LEGACY.includes(state.cards[c.source]?.cardId))legacyPlays++;}
  assert.ok(legacyPlays>0,`${humanSeat}/${difficulty} played no legacy card`);
 }
});
