import test from 'node:test';import assert from 'node:assert/strict';
import {createGame} from '../engine.mjs';import {HotseatSession} from '../ui-session.mjs';import * as ui from '../ui-presentation.mjs';
const opening=()=>{const x=new HotseatSession({autoAdvance:true});x.start(createGame(4));x.reveal();const v=x.projection,a=v.actions.find(a=>a.kind==='choose'&&!a.choiceCard.includes('M-beetle-01'));x.commit(a.id,v.revision,'A');return x;};
test('response picker only enables engine candidate sources, including discard and board',()=>{
 const x=opening(),v=x.projection;assert.equal(v.phase,'response');const cards=v.players.A.hand;
 for(const c of cards){const eligible=v.actions.some(a=>a.source===c.id);assert.equal(ui.canInspectCard(v,'A',c),eligible);const button=ui.inspectButton(c,'card-tap',v,'A');assert.equal(button.includes(' disabled'),!eligible);assert.equal(button.includes('response-unavailable'),!eligible);}
 const c=cards.find(c=>v.actions.some(a=>a.source===c.id));assert.ok(c);const html=ui.gameMarkup(v,'A');assert.match(html,/response-options/);assert.match(html,new RegExp('data-inspect="'+c.id+'"'));assert.match(ui.detailMarkup(c,{v,viewer:'A'}),/data-action=/);
 const moved=structuredClone(v);moved.players.A.hand=moved.players.A.hand.filter(x=>x.id!==c.id);moved.players.A.discard.push(c);assert.match(ui.responseOptionsMarkup(moved,'A'),new RegExp('data-inspect="'+c.id+'"'));
 moved.players.A.discard=[];moved.players.A.board.world=c;assert.match(ui.boardMarkup(moved.players.A,'A','A',[],moved),/is-eligible/);
});
test('automatic UI is concise, has explicit pass, and public history stays collapsed',()=>{
 const x=opening(),v=x.projection;assert.equal(v.autoEnabled,true);assert.equal(v.actions.find(a=>a.kind==='pass').displayLabel,'応答しない（パス）');assert.doesNotMatch(ui.compactOperationMarkup(v,'A'),/連続パス/);
 const a=v.actions.find(a=>a.kind==='pass');x.commit(a.id,v.revision,'A');const next=x.projection;assert.equal(next.phase,'normal');assert.doesNotMatch(ui.compactOperationMarkup(next,'A'),/応答待ち|response-options/);assert.match(ui.workflowMarkup(next,'A'),/応答・チェーン処理が完了/);assert.doesNotMatch(ui.workflowMarkup(next,'A'),/応答なしのパス|リビジョン/);assert.ok(next.autoLog.length>0);
});
test('normal inspection and mandatory choices remain available',()=>{const x=new HotseatSession({autoAdvance:true});x.start(createGame(4));x.reveal();const v=x.projection;for(const c of v.players.A.hand)assert.equal(ui.canInspectCard(v,'A',c),true);assert.equal(ui.canInspectCard({...v,phase:'normal',choice:null},'A',v.players.A.hand[0]),true);});
