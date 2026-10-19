import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame,CARDS} from '../engine.mjs';
import {CpuSession,restoreMatch} from '../cpu-session.mjs';
import {gameMarkup,resultHistoryMarkup} from '../ui-presentation.mjs';
import {CARD_ART} from '../ui-art.mjs';

test('illustrated CPU boards preserve viewer orientation and hidden art through restore',()=>{
 for(const humanSeat of ['A','B']) for(const difficulty of ['beginner','intermediate']){
  const s=new CpuSession({humanSeat,difficulty});s.start(createGame(71));
  const v=s.projection,html=gameMarkup(v,humanSeat);
  assert.match(html,/dedicated-art/);assert.match(html,/field-turn-active/);
  for(const c of v.players[humanSeat].hand)assert.ok(html.includes(CARD_ART[c.cardId].small));
  assert.equal(v.players[s.cpuSeat].hand,undefined);
  const r=restoreMatch(s.save());r.reveal();assert.equal(r.engineSave,s.engineSave);assert.equal(gameMarkup(r.projection,humanSeat),html);
  s.hide();assert.doesNotMatch(gameMarkup(s.projection,null),/dedicated-art|\.webp/);
 }
});
test('illustrated history keeps CPU newest-first order and actual result text',()=>{
 const cards=[CARDS['G-area-claim'],CARDS['M-beetle-01']];
 const results=cards.map((c,i)=>({revision:i+1,round:1,turn:'A',actor:'A',trace:[],rows:[{kind:'event',text:'result '+i,cards:[c]}]}));
 const html=resultHistoryMarkup({results},'A');
 assert.ok(html.indexOf('data-result-revision="2"')<html.indexOf('data-result-revision="1"'));
 assert.ok(html.indexOf(CARD_ART[cards[1].id].small)<html.indexOf(CARD_ART[cards[0].id].small));
 assert.match(html,/result 0/);assert.match(html,/result 1/);
});
