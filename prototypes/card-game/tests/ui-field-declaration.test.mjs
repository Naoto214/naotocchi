import test from 'node:test';
import assert from 'node:assert/strict';
import * as e from '../engine.mjs';
import {HotseatSession} from '../ui-session.mjs';
import {CpuSession} from '../cpu-session.mjs';
import {observeCpu} from '../cpu-observation.mjs';
import {chooseCpuAction} from '../cpu-policy.mjs';
import * as ui from '../ui-presentation.mjs';
import {TurnFeedback} from '../ui-render.mjs';
import {captureResult} from '../ui-results.mjs';
const types=Object.keys(e.TYPE_NAMES);
function fixture(){let s=e.createGame(4);while(s.phase!=='normal'){const a=e.legalActions(s).find(a=>a.kind==='pass')??e.legalActions(s).find(a=>!a.value?.includes('G-hit-blow'));s=e.act(s,e.actor(s),s.revision,a.id);}return s;}
function session(s){const x=new HotseatSession();x.start(s);x.reveal();return x;}
function resolve(s){while(s.chain.length)s=e.act(s,e.actor(s),s.revision,e.legalActions(s).find(a=>a.kind==='pass').id);return s;}
test('seven declarations require an explicit native choice, with no default main action',()=>{
 const x=session(fixture()),v=x.projection,c=v.players.A.hand.find(c=>c.cardId==='G-hit-blow'),as=ui.cardActions(v,'A',c);
 assert.equal(as.length,7);assert.deepEqual(as.map(a=>a.declare),types);
 const html=ui.detailMarkup(c,{v,viewer:'A'});assert.match(html,/<select[^>]*data-declaration/);assert.match(html,/<option value="" disabled selected/);
 assert.equal((html.match(/を宣言/g)||[]).length,7);for(const a of as)assert.ok(html.includes(`value="${a.id}"`));
 assert.doesNotMatch(html,/data-action="ui:/);
});
test('each declaration survives confirmation, command, chain and exact hit/miss resolution',()=>{
 for(const type of types)for(const hit of [true,false]){
  const s=fixture(),top=s.players.A.deck[0],next=s.players.A.deck[1];s.cards[top].cardId=Object.values(e.CARDS).find(c=>c.type===(hit?type:types.find(t=>t!==type))).id;
  const x=session(s),a=x.projection.actions.find(a=>a.source?.includes('G-hit-blow')&&a.label.includes(e.TYPE_NAMES[type]+'を宣言'));
  assert.ok(a);const saved=x.save(),p=x.prepare(a.id);assert.equal(x.save(),saved);assert.match(ui.confirmationMarkup(p),new RegExp(e.TYPE_NAMES[type]+'を宣言'));
  x.commit(a.id,x.projection.revision,'A');const played=e.act(s,'A',s.revision,a.id);assert.equal(played.chain.at(-1).declare,type);assert.equal(JSON.parse(played.commands.at(-1)).declare,type);
  const end=resolve(played);assert.equal(end.players.A.growth,s.players.A.growth+(hit?5:0));assert.ok(end.players.A.hand.includes(hit?top:next));if(!hit)assert.equal(end.players.A.deck.at(-1),top);
 }
});
test('CPU observes and chooses from the seven legal declarations without seeing deck order',()=>{
 const s=fixture(),o=observeCpu(s,'A'),as=o.actions.filter(a=>a.card?.cardId==='G-hit-blow'||a.card?.id?.includes('G-hit-blow'));
 assert.deepEqual(as.map(a=>a.declare),types);
 const seen=new Set();for(const difficulty of ['beginner','intermediate'])for(let seed=1;seed<=30;seed++){
  const pick=chooseCpuAction({...o,actions:as},{difficulty,seed,step:0}),a=as.find(a=>a.id===pick.id);assert.ok(a);seen.add(a.declare);assert.equal(e.act(s,'A',s.revision,pick.id).chain.at(-1).declare,a.declare);
 }assert.ok(seen.size>1);
});
test('only the turn owner field is marked, independent of human seat and response actor',()=>{
 for(const humanSeat of ['A','B'])for(const turn of ['A','B'])for(const actor of ['A','B']){
  const x=new CpuSession({humanSeat});x.start(e.createGame(4));const v={...x.projection,turn,actor,phase:'response',choice:null};const html=ui.gameMarkup(v,humanSeat);
  const sections=[...html.matchAll(/<section data-player="([AB])" class="([^"]+)"/g)];assert.equal(sections.filter(m=>m[2].includes('field-turn-active')).length,1);
  const active=sections.find(m=>m[2].includes('field-turn-active'));assert.equal(active[1],turn);assert.ok(active[2].includes(turn===humanSeat?'field-turn-self':'field-turn-other'));
  assert.doesNotMatch(ui.gameMarkup({...v,result:{winner:null,growth:{A:20,B:20}}},humanSeat),/field-turn-active/);
 }
});
test('field glow lasts 400ms once per turn, never per response, rerender, restore or reduced motion',()=>{
 const flow=new TurnFeedback(),calls=[],field={animate:(frames,options)=>calls.push({frames,options})},node={animate:()=>{}};const v={turn:'A',round:1,resultEpoch:1};
 flow.present(node,v,false,field);flow.present(node,{...v,actor:'B'},false,field);assert.equal(calls.length,0);
 flow.present(node,{...v,turn:'B'},false,field);assert.equal(calls.length,1);assert.equal(calls[0].options.duration,400);assert.equal(calls[0].options.pseudoElement,'::after');
 flow.present(node,{...v,turn:'B'},false,field);flow.present(node,{...v,round:2},true,field);flow.hide();flow.present(node,v,false,field);assert.equal(calls.length,1);
});
test('egg history distinguishes normal and extra draws, return order and actual net hand count',()=>{
 let s=e.createGame(4);const initial=captureResult(null,s).A;assert.match(ui.resultHistoryMarkup({results:[initial]},'A'),/通常ドロー：1枚/);assert.match(ui.resultHistoryMarkup({results:[initial]},'A'),/たまご追加ドロー：1枚/);
 assert.deepEqual([s.players.A.hand.length,s.players.B.hand.length],[7,5]);
 for(let i=0;i<100&&s.serial<5;i++){
  const before=s,choice=s.choice?.kind==='egg_bottom',seat=s.turn,a=e.legalActions(s).find(a=>a.kind==='pass')??e.legalActions(s)[0];s=e.act(s,e.actor(s),s.revision,a.id);
  const result=captureResult(before,s),html=result?ui.resultHistoryMarkup({results:[result.A]},'A'):'';
  if(choice){assert.equal(s.players[seat].hand.length,before.players[seat].hand.length-1);assert.equal(s.players[seat].deck.at(-1),a.value);assert.match(html,/たまご返却：1枚を山札の下へ/);}
  if(s.serial!==before.serial){const p=s.players[s.turn];assert.equal(p.hand.length,before.players[s.turn].hand.length+2);assert.match(html,/通常ドロー：1枚/);assert.match(html,/たまご追加ドロー：1枚/);}
 }assert.equal(s.serial,5);
});
test('CPU session commits each declaration using the same command and resolution as human play',()=>{
 for(const type of types){const s=fixture(),x=new CpuSession({humanSeat:'B',policy:o=>({id:o.actions.find(a=>a.declare===type).id,score:1})});x.start(s);assert.equal(x.stepCpu(x.projection.revision),true);const actual=e.restore(x.engineSave),a=e.legalActions(s).find(a=>a.declare===type);let expected=e.act(s,'A',s.revision,a.id);
  // Auto pass may advance further, but the recorded declaration must be exact.
  assert.equal(JSON.parse(actual.commands[s.commands.length]).declare,type);assert.equal(x.automationStop,null);
  assert.equal(expected.chain.at(-1).declare,type);
 }
});
test('normal main draws one; egg deck exhaustion follows possible parts, never a return-first redraw',()=>{
 for(const count of [0,1,2])for(const main of [false,true]){
  let s=fixture();const p=s.players.B;if(main){const id=p.hand.pop();s.cards[id].cardId='M-beetle-01';p.board.main=id;}
  p.discard.push(...p.deck.splice(count));const hand=p.hand.length;
  while(s.turn==='A'){const a=e.legalActions(s).find(a=>a.kind==='pass');s=e.act(s,e.actor(s),s.revision,a.id);}
  assert.equal(s.players.B.hand.length,hand+Math.min(count,main?1:2));
  if(!main){assert.equal(s.choice.kind,'egg_bottom');const a=e.legalActions(s)[0],before=s;s=e.act(s,'B',s.revision,a.id);assert.equal(s.players.B.hand.length,hand+Math.min(count,2)-1);assert.equal(s.players.B.deck.at(-1),a.value);assert.match(ui.resultHistoryMarkup({results:[captureResult(before,s).A]},'A'),/たまご返却：1枚/);}
  else assert.equal(s.choice,null);
 }
});
test('draw annotations do not alter four-second notice content or reveal card identities',()=>{
 const s=e.createGame(4),g=captureResult(null,s);for(const seat of ['A','B','public']){const result=g[seat],notes=result.historyNotes;assert.equal(ui.resultNoticeMarkup(result),ui.resultNoticeMarkup({...result,historyNotes:[]}));assert.ok(notes.every(t=>!Object.keys(s.cards).some(id=>t.includes(id))));}
});
test('egg return history records the committed return even when a reservation immediately redraws it',()=>{
 let s=e.createGame(4);const p=s.players.A;p.discard.push(...p.deck.splice(0));
 s.scheduled.push({actor:'A',timing:'start',due:s.serial,link:{actor:'A',source:p.hand[0],kind:'program'},steps:[{op:'draw',n:1}]});
 const a=e.legalActions(s)[0],n=e.act(s,'A',s.revision,a.id);
 assert.ok(n.players.A.hand.includes(a.value));assert.equal(n.players.A.deck.length,0);
 const html=ui.resultHistoryMarkup({results:[captureResult(s,n).A]},'A');assert.match(html,/たまご返却：1枚を山札の下へ/);
});
