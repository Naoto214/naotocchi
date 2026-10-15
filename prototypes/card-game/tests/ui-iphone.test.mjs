import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame,CARDS} from '../engine.mjs';
import {HotseatSession} from '../ui-session.mjs';
import {HandOrder} from '../ui-hand.mjs';
import {detailGeometry} from '../ui-viewport.mjs';
import {detailMarkup,gameMarkup} from '../ui-presentation.mjs';

test('hand ordering is seat-local, instance-based, persistent and never changes engine save',()=>{
 const s=new HotseatSession();s.start(createGame(719));s.reveal();
 const before=s.save(),hand=s.projection.players.A.hand,ids=hand.map(c=>c.id),order=new HandOrder();
 order.bind(before);order.move('A',hand,ids[0],1);
 assert.deepEqual(order.arrange('A',hand).map(c=>c.id),[ids[1],ids[0],...ids.slice(2)]);
 assert.deepEqual(hand.map(c=>c.id),ids);assert.equal(s.save(),before);
 const restored=new HandOrder(order.serialize());restored.bind(before);
 assert.deepEqual(restored.arrange('A',hand),order.arrange('A',hand));
 assert.deepEqual(restored.arrange('B',hand).map(c=>c.id),ids);
 const changed=[...hand.slice(2),{id:'new-instance'}];
 assert.deepEqual(restored.arrange('A',changed).map(c=>c.id),[...ids.slice(2),'new-instance']);
 restored.bind(JSON.stringify({...JSON.parse(before),seed:123}));assert.deepEqual(restored.arrange('A',hand).map(c=>c.id),ids);
 assert.doesNotThrow(()=>new HandOrder('{broken'));
});
test('whole detail card fits Safari reduced viewports and portrait after rotation',()=>{
 for(const [width,height] of [[844,390],[844,280],[932,430],[667,265],[390,664],[320,480],[390,300]]){
  const g=detailGeometry(width,height,{top:0,bottom:21,left:44,right:44});
  assert.ok(g.cardHeight<=g.contentHeight);assert.ok(g.cardWidth<=g.contentWidth);
  assert.equal(g.cardHeight/g.cardWidth,1.5);
  if(g.landscape)assert.ok(g.contentWidth-g.cardWidth-12>=150);
  else assert.ok(g.contentHeight-g.cardHeight-12>=100);
 }
});
test('mandatory choices work inside card detail; hidden detail exposes no choices or identities',()=>{
 const s=new HotseatSession();s.start(createGame(719));s.reveal();const v=s.projection,c=v.players.A.hand[0];
 const html=detailMarkup(c,{v,viewer:'A'});
 assert.match(html,/必須選択/);assert.match(html,/山札の下/);assert.match(html,/data-action=/);
 assert.match(html,/effect-scroll/);assert.match(html,/detail-actions/);
 assert.match(html,/data-choice-card=/);
 const hidden=detailMarkup({...c,hidden:true},{v,viewer:'A'});
 assert.doesNotMatch(hidden,/data-action=|full-effect|data-choice-card=/);
 assert.ok(!hidden.includes(c.name));
});
test('action hints mirror engine destinations and only expose safe choice card IDs',()=>{
 const s=new HotseatSession();s.start(createGame(719));s.reveal();
 const v=s.projection;assert.ok(v.actions.every(a=>a.choiceCard&&v.players.A.hand.some(c=>c.id===a.choiceCard)));
 s.commit(v.actions[0].id,v.revision,'A');if(!s.viewer)s.reveal();
 const current=s.projection,places=current.actions.filter(a=>a.kind==='place');
 for(const a of places)assert.ok(a.destination&&a.destination.seat===current.actor);
 s.hide();assert.deepEqual(s.projection.actions,[]);
});
test('hand presentation highlights selected instance and exposes accessible reorder controls only in reorder mode',()=>{
 const s=new HotseatSession();s.start(createGame(719));s.reveal();const v=s.projection,id=v.players.A.hand[0].id;
 const html=gameMarkup(v,'A',{selected:id,reordering:true});
 assert.match(html,/is-selected/);assert.match(html,/data-move="-1"/);assert.match(html,/data-move="1"/);
 assert.match(html,/操作中 A/);assert.match(html,/data-workflow/);
 assert.doesNotMatch(gameMarkup(v,'A'),/data-move=/);
 s.hide();assert.doesNotMatch(gameMarkup(s.projection,null,{reordering:true}),/data-move=|id="hand"/);
});
test('all 452 details keep current full text in the independent readable column',()=>{
 for(const c of Object.values(CARDS)){
  const html=detailMarkup(c,{catalog:true});
  assert.match(html,/detail-card-canvas/);assert.match(html,/effect-scroll/);
  assert.ok(html.includes(c.text.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;')));
 }
});
test('UI session completes a match and renders/restores the finished public result',()=>{
 const s=new HotseatSession();s.start(createGame(719));s.reveal();
 for(let i=0;i<1000&&!s.finished;i++){
  const v=s.projection,a=v.actions.find(a=>a.kind==='pass')??v.actions[0];
  s.commit(a.id,v.revision,s.viewer);if(!s.finished&&!s.viewer)s.reveal();
 }
 assert.ok(s.finished);assert.equal(s.viewer,null);assert.ok(s.projection.result);
 assert.match(gameMarkup(s.projection,null),/対戦終了/);
 const restored=new HotseatSession();restored.restore(s.save());assert.deepEqual(restored.projection.result,s.projection.result);
});
