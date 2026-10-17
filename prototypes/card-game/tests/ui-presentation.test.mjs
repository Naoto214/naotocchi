import test from 'node:test';
import assert from 'node:assert/strict';
import {CARDS,createGame,view} from '../engine.mjs';
import {cardMarkup,boardMarkup,gameMarkup,needsConfirmation} from '../ui-presentation.mjs';

test('every catalog card renders current text; main-only fields never leak into other categories',()=>{
 assert.equal(Object.keys(CARDS).length,452);
 for(const c of Object.values(CARDS)){
  const html=cardMarkup(c);
  assert.ok(html.includes(c.text.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;')));
  assert.equal((html.match(/class="card-cost"/g)||[]).length,1);
  assert.equal(html.includes('class="card-stats"'),c.type==='main');
  assert.equal(html.includes('class="card-attribute"'),c.type==='main');
 }
 const pupa=cardMarkup(CARDS['M-beetle-04']);
 assert.match(pupa,/さなぎ/);assert.match(pupa,/さなぎのじかん/);
 assert.match(pupa,/通常時コスト 4/);assert.doesNotMatch(pupa,/段階 4/);
 assert.doesNotMatch(pupa,/ときとばし/);
});
test('hidden cards never look up or embed supplied private identity',()=>{
 const html=cardMarkup({...CARDS['M-beetle-04'],hidden:true});
 assert.match(html,/card-back-approved/);assert.doesNotMatch(html,/カブト|さなぎ|M-beetle|ちから/);
});
test('board has nine ordered slots, shared preparation, management order and exactly one egg',()=>{
 const p=view(createGame(719),'A').players.A;
 const html=boardMarkup(p,'A','A',[]);
 assert.equal((html.match(/data-slot=/g)||[]).length,9);
 assert.ok(html.indexOf('data-zone="discard"')<html.indexOf('data-zone="activation"'));
 assert.ok(html.indexOf('data-zone="activation"')<html.indexOf('data-zone="deck"'));
 assert.equal((html.match(/class="egg-image"/g)||[]).length,1);
 assert.match(html,/data-egg-location="main"/);assert.match(html,/準備③/);
 p.board.main={...CARDS['M-beetle-01'],cardId:'M-beetle-01',id:'A:0'};
 const born=boardMarkup(p,'A','A',[]);assert.match(born,/data-egg-location="parking"/);
 assert.equal((born.match(/class="egg-image"/g)||[]).length,1);
});
test('null viewer has no private hand or controls, and acting player is the large board',()=>{
 const s=createGame(719),hidden=gameMarkup(view(s,null),null);
 assert.doesNotMatch(hidden,/id="hand"|data-action=/);
 const html=gameMarkup(view(s,'B'),'B');
 assert.match(html,/data-player="B" class="player-board own/);
 assert.ok(html.indexOf('data-player="A"')<html.indexOf('data-player="B"'));
});
test('confirmation protects payment/target/final selection without interrupting pass or incremental choices',()=>{
 for(const label of ['カード（時2）','カード → メイン（時0）','支払い：カード','この選択を確定'])assert.equal(needsConfirmation({label,kind:'play'}),true);
 for(const label of ['パス','なかまをなかまへ','対象 1：カード','発動を取りやめる'])assert.equal(needsConfirmation({label,kind:'choose'}),false);
});
test('card names and text are escaped, never interpreted as markup',()=>{
 const html=cardMarkup({...CARDS['C-box'],name:'<img src=x onerror=alert(1)>',text:'<script>bad()</script>'});
 assert.doesNotMatch(html,/<script>|<img src=x/);assert.match(html,/&lt;script&gt;/);
});
