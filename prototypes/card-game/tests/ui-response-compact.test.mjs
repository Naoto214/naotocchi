import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame} from '../engine.mjs';
import {CpuSession} from '../cpu-session.mjs';
import {responseOptionsMarkup,compactOperationMarkup,inspectButton} from '../ui-presentation.mjs';
const opening=()=>{const x=new CpuSession();x.start(createGame(4));let v=x.projection;x.commit(v.actions.find(a=>a.kind==='choose'&&!a.choiceCard.includes('M-beetle-01')).id,v.revision,'A');return x.projection;};
test('hand responses use the hand only; off-hand legal sources keep a reachable shortcut',()=>{
 const v=opening(),c=v.players.A.hand.find(c=>v.actions.some(a=>a.source===c.id));assert.ok(c);
 assert.equal(responseOptionsMarkup(v,'A'),'');assert.doesNotMatch(compactOperationMarkup(v,'A'),/response-options/);
 const moved=structuredClone(v);moved.players.A.hand=moved.players.A.hand.filter(x=>x.id!==c.id);moved.players.A.discard.push(c);
 assert.match(responseOptionsMarkup(moved,'A'),new RegExp('data-inspect="'+c.id+'"'));
});
test('CPU read-only inspection does not highlight cards that cannot respond',()=>{
 const v=opening();
 for(const c of v.players.A.hand){const html=inspectButton(c,'card-tap',v,'A'),legal=v.actions.some(a=>a.source===c.id);
  assert.equal(html.includes('is-eligible'),legal);assert.doesNotMatch(html,/ disabled/,'CPU mode still allows reading any own card');
 }
});
