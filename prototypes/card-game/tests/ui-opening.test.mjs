import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame,restore} from '../engine.mjs';
import {HotseatSession} from '../ui-session.mjs';
import * as ui from '../ui-presentation.mjs';
const start=()=>{const x=new HotseatSession();x.start(createGame(4));x.reveal();return x;};
const execute=(x,a)=>{const v=x.projection;return x.commit(a.id,v.revision,x.viewer);};
test('R1 hand tap → egg bottom → both response passes → hand tap birth costs exactly time1',()=>{
 const x=start();let v=x.projection;const main=v.players.A.hand.find(c=>c.cardId==='M-beetle-01');
 assert.ok(main);assert.equal(main.stage,1);assert.equal(v.round,1);assert.equal(v.players.A.time,1);assert.equal(v.players.A.hand.length,7);
 assert.equal(ui.cardActions(v,'A',main).some(a=>a.kind==='place'),false);
 const returned=v.players.A.hand.find(c=>c.id!==main.id),choice=ui.cardActions(v,'A',returned)[0];
 assert.match(ui.detailMarkup(returned,{v,viewer:'A'}),/山札の下へ戻す/);
 assert.equal(x.prepare(choice.id).required,false);execute(x,choice);
 const state=restore(x.save());assert.equal(state.players.A.deck.at(-1),returned.id);assert.equal(state.players.A.hand.includes(returned.id),false);
 v=x.projection;assert.equal(v.phase,'response');assert.equal(v.chain.length,0);assert.equal(v.players.A.time,1);
 assert.equal(ui.cardActions(v,'A',main).length,0);
 for(const seat of ['A','B']){
  v=x.projection;assert.equal(v.actor,seat);
  const html=ui.compactOperationMarkup(v,seat),pass=v.actions.find(a=>a.kind==='pass');
  assert.match(html,new RegExp(seat+' の応答待ち'));assert.ok(html.includes('data-action="'+pass.id+'"'));
  assert.equal(execute(x,pass),true);assert.equal(x.viewer,null);
  assert.doesNotMatch(ui.gameMarkup(x.projection,null),/id="hand"|data-action=|operation-notice/);
  const saved=x.save();x.restore(saved);assert.equal(x.viewer,null);x.reveal();
 }
 v=x.projection;assert.equal(v.phase,'normal');assert.equal(v.actor,'A');assert.equal(v.choice,null);assert.equal(v.chain.length,0);assert.equal(v.effect,null);assert.equal(v.players.A.time,1);
 assert.ok(v.players.A.hand.some(c=>c.id===main.id));
 const birth=ui.cardActions(v,'A',main).find(a=>a.kind==='place');assert.ok(birth);assert.match(birth.label,/たんじょう（時1）/);
 assert.ok(ui.detailMarkup(main,{v,viewer:'A'}).includes('data-action="'+birth.id+'"'));
 assert.match(ui.compactOperationMarkup(v,'A'),/通常行動/);
 const prepared=x.prepare(birth.id);assert.equal(prepared.required,true);assert.equal(prepared.paidTime,1);
 execute(x,birth);assert.equal(x.projection.players.A.time,0);assert.equal(x.projection.players.A.board.main.id,main.id);
 assert.throws(()=>x.commit(birth.id,v.revision,'A'));
});
test('compact notice separates notification from card choices and opens the complete fallback',()=>{
 const x=start(),v=x.projection,html=ui.compactOperationMarkup(v,'A');
 assert.match(html,/data-workflow aria-label="たまご[^"]*手札をタップ/);assert.match(html,/たまご/);assert.match(html,/手札をタップ/);
 assert.doesNotMatch(html,/data-action=|operation-scroll|class="chain"/);
 const full=ui.workflowMarkup(v,'A');for(const a of v.actions)assert.ok(full.includes('data-action="'+a.id+'"'));
 const detail=ui.detailMarkup(v.players.A.hand[0],{v,viewer:'A'});
 assert.equal(detail.split('class="effect-focus"').length-1,0);assert.equal(detail.split('class="choice-guide"').length-1,1);
 assert.equal(ui.compactOperationMarkup(v,null),'');
});
test('non-card mandatory choices remain reachable; singleton choices still require a tap',()=>{
 const x=start(),v=x.projection,before=x.save();
 const one={...v,actions:[{id:'test-only',kind:'choose',label:'山札の上に置く'}]};
 assert.match(ui.compactOperationMarkup(one,'A'),/data-action="test-only"/);
 const many={...one,actions:[...one.actions,{id:'test-only-2',kind:'choose',label:'山札の下に置く'}]};
 assert.match(ui.compactOperationMarkup(many,'A'),/選択肢を開く/);
 assert.ok(ui.workflowMarkup(many,'A').includes('test-only-2'));assert.equal(x.save(),before);
});
