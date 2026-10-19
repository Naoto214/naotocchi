import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as e from '../engine.mjs';
import {HotseatSession} from '../ui-session.mjs';
import {CpuSession} from '../cpu-session.mjs';
import {boardMarkup,cardActions,detailMarkup,cardMarkup} from '../ui-presentation.mjs';
function fixture(seat='A'){
 const s=e.createGame(202610194);s.choice=null;s.pending=[];s.phase='normal';s.turn=seat;s.priority=seat;
 for(const a of ['A','B']){
  const p=s.players[a];p.time=3;
  for(const [slot,id] of [['main','M-beetle-01'],['partner',Object.values(e.CARDS).find(c=>c.type==='partner').id]]){
   const instance=p.deck.shift();s.cards[instance].cardId=id;p.board[slot]=instance;
  }p.relationship=0;
 }return s;
}
function start(state,cpu=false){const x=cpu?new CpuSession({humanSeat:state.turn}):new HotseatSession();x.start(state);x.reveal();return x;}
test('either main opens exact legal challenge choices in both seats and match modes',()=>{
 for(const cpu of [false,true])for(const seat of ['A','B']){
  const x=start(fixture(seat),cpu),v=x.projection,expected=v.actions.filter(a=>a.kind==='challenge');assert.equal(expected.length,2);
  for(const owner of ['A','B']){
   const c=v.players[owner].board.main,actions=cardActions(v,seat,c).filter(a=>a.kind==='challenge');assert.deepEqual(actions,expected);
   const board=boardMarkup(v.players[owner],owner,seat,[],v);assert.ok(board.includes(`data-inspect="${c.id}"`),'main tap must directly open action detail');
   const detail=detailMarkup(c,{v,viewer:seat});for(const a of expected)assert.ok(detail.includes(`data-action="${a.id}"`));
  }
  const a=expected[0],prepared=x.prepare(a.id);x.commit(prepared.action.id,prepared.revision,prepared.who);
  const raw=e.act(fixture(seat),seat,v.revision,a.id);assert.equal(raw.challenge.actor,seat);assert.equal(raw.players[seat].challengeUsed,true);assert.equal(raw.players[seat].time,3);
  assert.throws(()=>x.commit(a.id,v.revision,seat));
 }
});
test('own partner opens the existing costed relationship action and commits once',()=>{
 for(const cpu of [false,true])for(const seat of ['A','B']){
  const x=start(fixture(seat),cpu),v=x.projection,c=v.players[seat].board.partner,action=v.actions.find(a=>a.kind==='relationship');assert.ok(action);
  assert.deepEqual(cardActions(v,seat,c).filter(a=>a.kind==='relationship'),[action]);
  assert.match(detailMarkup(c,{v,viewer:seat}),/交際を進める.*時1/);
  assert.ok(boardMarkup(v.players[seat],seat,seat,[],v).includes(`data-inspect="${c.id}"`));
  const prepared=x.prepare(action.id);assert.equal(prepared.required,true);assert.equal(prepared.paidTime,1);x.commit(action.id,prepared.revision,seat);
  assert.equal(x.projection.players[seat].relationship,1);assert.equal(x.projection.players[seat].time,2);assert.throws(()=>x.commit(action.id,prepared.revision,seat));
 }
});
test('no shortcuts for absent candidates, wrong cards, nonacting viewer or hidden cards',()=>{
 const x=start(fixture()),v=x.projection;
 assert.equal(cardActions(v,'A',v.players.B.board.partner).some(a=>a.kind==='relationship'),false);
 for(const c of [v.players.A.hand[0],v.players.A.board.partner])assert.equal(cardActions(v,'A',c).some(a=>a.kind==='challenge'),false);
 for(const viewer of [null,'B'])for(const owner of ['A','B'])assert.deepEqual(cardActions(v,viewer,v.players[owner].board.main),[]);
 for(const c of [v.players.A.board.main,v.players.A.board.partner]){
  assert.deepEqual(cardActions({...v,actions:[]},'A',c),[]);
  assert.deepEqual(cardActions(v,'A',{...c,hidden:true}),[]);
  assert.deepEqual(cardActions({...v,result:{winner:'A'}},'A',c),[]);
  assert.doesNotMatch(detailMarkup({...c,hidden:true},{v,viewer:'A'}),/data-action=/);
 }
 for(const mutate of [s=>s.players.A.time=0,s=>s.players.A.relationshipUsed=true,s=>s.players.A.relationship=4]){
  const s=fixture();mutate(s);const t=start(s),w=t.projection;assert.equal(cardActions(w,'A',w.players.A.board.partner).some(a=>a.kind==='relationship'),false);
 }
 const s=fixture();s.players.A.challengeUsed=true;const t=start(s);assert.equal(cardActions(t.projection,'A',t.projection.players.B.board.main).some(a=>a.kind==='challenge'),false);
});
test('mandatory choices still route only their exact choice card and browsing stays read-only',()=>{
 const x=start(fixture()),v=x.projection,c=v.players.A.board.main;
 const w={...v,choice:{kind:'test'},actions:[{id:'pick',kind:'choose',choiceCard:c.id,label:'選択'},...v.actions]};
 assert.deepEqual(cardActions(w,'A',c).map(a=>a.id),['pick']);assert.doesNotMatch(detailMarkup(c,{v,viewer:'A',readOnly:true}),/data-action=/);
});
test('removed egg parking leaves both management columns aligned with the grid',()=>{
 const css=readFileSync(new URL('../style.css',import.meta.url),'utf8');
 assert.doesNotMatch(css,/egg-parking/);
 assert.match(css,/\.management\{padding-top:0;display:grid/);
 assert.match(css,/\.opponent \.management\{padding-top:0;padding-bottom:0/);
});
test('cost badge uses bold high contrast numerals without changing any of 452 values',()=>{
 const css=readFileSync(new URL('../style.css',import.meta.url),'utf8');
 assert.match(css,/\.card-cost\{[^}]*font-weight:900/);
 for(const c of Object.values(e.CARDS))assert.ok(cardMarkup(c).includes(`aria-label="通常時コスト ${c.type==='main'?c.stage:c.cost}">${c.type==='main'?c.stage:c.cost}</span>`));
});
