import test from 'node:test';import assert from 'node:assert/strict';
import {createGame,actor,act,legalActions,view,save,restore,CARDS} from '../engine.mjs';
import {HotseatSession} from '../ui-session.mjs';import * as ui from '../ui-presentation.mjs';
const session=s=>{const x=new HotseatSession();x.start(s);x.reveal();return x;};
const step=(x,a)=>{const v=x.projection;x.commit(a.id,v.revision,x.viewer);if(!x.viewer&&!x.finished)x.reveal();};
test('egg choice names the move and remains pinned until its response window ends',()=>{
 const x=session(createGame(719)),v=x.projection,before=x.save();
 assert.equal(v.effect?.kind,'egg');assert.match(v.effect?.instruction??'',/山札の下/);
 assert.ok(v.actions.every(a=>a.displayLabel?.includes('山札の下へ戻す')));
 const c=v.players.A.hand[0],detail=ui.detailMarkup(c,{v,viewer:'A'});assert.match(detail,/山札の下へ戻す/);assert.match(detail,/effect-focus/);
 const a=v.actions.find(a=>a.choiceCard===c.id);assert.equal(x.prepare(a.id).required,false);assert.equal(x.save(),before);
 step(x,a);assert.equal(x.projection.effect.kind,'egg');assert.equal(x.projection.phase,'response');
 const restored=new HotseatSession();restored.restore(x.save());assert.equal(restored.projection.effect,null);restored.reveal();assert.deepEqual(restored.projection.effect,x.projection.effect);
 step(x,x.projection.actions.find(a=>a.kind==='pass'));assert.equal(x.projection.effect.kind,'egg');
 step(x,x.projection.actions.find(a=>a.kind==='pass'));assert.equal(x.projection.phase,'normal');assert.equal(x.projection.effect,null);
});
test('one legal choice is a direct button; no automatic selection or intermediate card picker',()=>{
 const x=session(createGame(719)),v=x.projection,one={...v,actions:[v.actions[0]]};const before=x.save();
 const html=ui.operationMarkup(one,'A');assert.match(html,new RegExp('data-action="'+v.actions[0].id+'"'));assert.doesNotMatch(html,/choice-cards/);assert.equal(x.save(),before);
});
test('birth effect survives trigger, response, hand-bottom choice and restore',()=>{
 let s=createGame(4);const id=s.players.A.hand.find(id=>s.cards[id].cardId==='M-beetle-01');assert.ok(id);
 s=act(s,'A',s.revision,legalActions(s).find(a=>a.value!==id).id);
 while(s.phase!=='normal')s=act(s,actor(s),s.revision,legalActions(s).find(a=>a.kind==='pass').id);
 s=act(s,'A',s.revision,legalActions(s).find(a=>a.source===id&&a.kind==='place').id);
 const x=session(s);assert.equal(x.projection.effect.card.id,id);step(x,x.projection.actions.find(a=>a.kind==='trigger'));
 assert.equal(x.projection.effect.card.id,id);assert.match(ui.operationMarkup(x.projection,x.viewer),/応答せず進む/);
 for(let i=0;i<4&&!x.projection.choice;i++)step(x,x.projection.actions.find(a=>a.kind==='pass'));
 const restored=new HotseatSession();restored.restore(x.save());restored.reveal();assert.deepEqual(restored.projection.effect,x.projection.effect);
 const v=x.projection;assert.equal(v.choice.kind,'birth_bottom');assert.equal(v.effect.card.id,id);assert.ok(v.actions.every(a=>a.displayLabel.includes('山札の下へ戻す')));
 const chosen=v.actions[0];step(x,chosen);assert.equal(x.projection.choice,null);assert.notEqual(x.projection.effect?.card?.id,id);
});
test('card detail exposes pass directly and only selected card actions during response',()=>{
 const x=session(createGame(719));step(x,x.projection.actions[0]);const v=x.projection,c=v.players[x.viewer].hand[0];
 const html=ui.detailMarkup(c,{v,viewer:x.viewer}),pass=v.actions.find(a=>a.kind==='pass');assert.ok(html.includes('data-action="'+pass.id+'"'));assert.doesNotMatch(html,/選択・応答を続ける/);
});
test('board has separate persistent opponent own and operation regions; handoff has no effect/private DOM',()=>{
 const x=session(createGame(719)),html=ui.gameMarkup(x.projection,x.viewer);
 assert.match(html,/opponent-shell/);assert.match(html,/own-shell/);assert.match(html,/id="operation-panel"/);assert.match(html,/effect-focus/);
 x.hide();assert.equal(x.projection.effect,null);assert.doesNotMatch(ui.gameMarkup(x.projection,null),/effect-focus|data-action=|id="hand"/);
});

test('chain focus follows the latest public effect, then resolving choice; handoff reveals no opponent hand',()=>{
 let s=createGame(71);s.choice=null;s.pending=[];s.phase='normal';s.players.A.time=10;s.players.B.time=10;
 const put=(seat,definition)=>{const p=s.players[seat],id=p.deck.shift();s.cards[id].cardId=definition;p.hand.push(id);return id;};
 const one=put('A','G-puzzle-2048'),two=put('A','I-c_coin2');
 const play=id=>{s=act(s,actor(s),s.revision,legalActions(s).find(a=>a.source===id&&['programPlay','play'].includes(a.kind)).id);};
 play(one);play(two);let x=session(s);assert.equal(x.projection.effect.card.id,two);assert.equal(x.projection.effectQueue.length,2);
 x.hide();assert.equal(x.projection.effect,null);assert.deepEqual(x.projection.effectQueue,[]);assert.doesNotMatch(JSON.stringify(x.projection),/"hand":/);
 x.reveal();for(let i=0;i<6&&!x.projection.choice;i++)step(x,x.projection.actions.find(a=>a.kind==='pass'));
 assert.equal(x.projection.choice.kind,'resolve_selection');assert.equal(x.projection.effect.card.id,one);assert.match(x.projection.effect.instruction,/山札の下/);
 const saved=x.save();x.projection;assert.equal(x.save(),saved);
});
test('activation target explains its declared destination without claiming it has already moved',()=>{
 let s=createGame(71);s.choice=null;s.pending=[];s.phase='normal';s.players.A.time=10;
 const put=(definition,zone)=>{const id=s.players.A.deck.shift();s.cards[id].cardId=definition;s.players.A[zone].push(id);return id;};
 const id=put('E-naoto','hand');put('C-box','discard');put('P-cliff_goat','discard');put('W-deepsea','discard');
 s=act(s,'A',s.revision,legalActions(s).find(a=>a.kind==='programPlay'&&a.source===id).id);
 const x=session(s),v=x.projection;assert.equal(v.choice.kind,'activation_selection');assert.ok(v.actions.filter(a=>a.choiceCard).every(a=>/山札の下へ戻す対象に選ぶ/.test(a.displayLabel)));assert.equal(s.players.A.discard.length,3);
});
