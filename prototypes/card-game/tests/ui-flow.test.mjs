import test from 'node:test';import assert from 'node:assert/strict';
import {createGame,CARDS} from '../engine.mjs';import {HotseatSession} from '../ui-session.mjs';
import * as ui from '../ui-presentation.mjs';import * as drag from '../ui-drag.mjs';import {HandOrder} from '../ui-hand.mjs';
test('selected mandatory card offers only its own engine choice, never another card action',()=>{
 const s=new HotseatSession();s.start(createGame(719));s.reveal();const v=s.projection,c=v.players.A.hand[0],actions=ui.cardActions(v,'A',c);
 assert.equal(actions.length,1);assert.equal(actions[0].choiceCard,c.id);
 const html=ui.detailMarkup(c,{v,viewer:'A'});assert.ok(html.includes(actions[0].id));
 for(const a of v.actions.filter(a=>a.choiceCard!==c.id))assert.ok(!html.includes('data-action="'+a.id+'"'));
});
test('court keeps actor-relative seats and current operations with chain collapsed',()=>{
 const s=new HotseatSession();s.start(createGame(719));s.reveal();let switches=0;
 for(let i=0;i<45;i++){
  const v=s.projection,html=ui.gameMarkup(v,s.viewer);assert.match(html,/battle-area/);assert.match(html,/id="operation-panel"/);assert.doesNotMatch(html,/class="chain" open/);
  assert.ok(html.indexOf('data-depth="far"')<html.indexOf('data-depth="near"'));assert.match(html,new RegExp('data-player="'+s.viewer+'" class="player-board own'));
  assert.doesNotMatch(html,/class="chain" open/);
  const a=v.actions.find(a=>a.kind==='pass')??v.actions[0];if(s.commit(a.id,v.revision,s.viewer)){switches++;assert.doesNotMatch(ui.gameMarkup(s.projection,null),/id="hand"|data-action=/);s.reveal();}
 }assert.ok(switches>2);
});
test('response workflow exposes engine responses/pass and mandatory workflow cannot skip',()=>{
 const s=new HotseatSession();s.start(createGame(719));s.reveal();let v=s.projection;
 const html=ui.workflowMarkup(v,'A');for(const a of v.actions)assert.ok(html.includes(a.id)||html.includes(a.choiceCard));assert.doesNotMatch(html,/data-kind="pass"/);
 for(let i=0;i<30&&!['response','chain'].includes(v.phase);i++){const a=v.actions.find(a=>!['pass','skip'].includes(a.kind))??v.actions[0];s.commit(a.id,v.revision,s.viewer);if(!s.viewer)s.reveal();v=s.projection;}
 const actual=v.actions.filter(a=>a.kind==='pass');assert.ok(actual.length);assert.ok(ui.workflowMarkup(v,s.viewer).includes(actual[0].id));
});
test('long press reorder commits display order only; pan/cancel never commits or opens card',()=>{
 const s=new HotseatSession();s.start(createGame(719));s.reveal();const before=s.save(),hand=s.projection.players.A.hand,ids=hand.map(c=>c.id),order=new HandOrder();order.bind(before);
 const g=new drag.DragGesture();g.begin(ids,ids[0],10,20,0);assert.equal(g.activate(200),false);assert.equal(g.activate(360),true);g.over(ids[2]);assert.deepEqual(g.preview,[ids[1],ids[2],ids[0],...ids.slice(3)]);
 const done=g.finish();assert.equal(done.kind,'reorder');order.reorder('A',hand,done.ids);assert.deepEqual(order.arrange('A',hand).map(c=>c.id),done.ids);assert.equal(s.save(),before);
 g.begin(ids,ids[0],0,0,0);g.move(30,0);assert.equal(g.activate(500),false);assert.equal(g.finish().kind,'pan');
 g.begin(ids,ids[0],0,0,0);g.activate(400);g.over(ids[2]);g.cancel();assert.equal(g.finish().kind,'none');assert.deepEqual(order.arrange('A',hand).map(c=>c.id),done.ids);
 const restored=new HandOrder(order.serialize());restored.bind(before);assert.deepEqual(restored.arrange('A',hand),order.arrange('A',hand));
});
test('invalid reordered IDs cannot add cards, lose duplicates or alter original hand',()=>{
 const o=new HandOrder(),hand=[{id:'a',name:'same'},{id:'b',name:'same'},{id:'c'}];o.reorder('A',hand,['b','fake','b']);assert.deepEqual(o.arrange('A',hand).map(c=>c.id),['b','a','c']);assert.deepEqual(hand.map(c=>c.id),['a','b','c']);
});
