import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
import {createGame,CARDS} from '../engine.mjs';import {HotseatSession} from '../ui-session.mjs';import * as ui from '../ui-presentation.mjs';
const start=()=>{const x=new HotseatSession({autoAdvance:true});x.start(createGame(4));x.reveal();return x;};
test('dedicated compact guidance names current operator and phase; closing result cannot remove guidance',()=>{
 const x=start(),v=x.projection,html=ui.compactOperationMarkup(v,'A');assert.match(html,/操作 A · 必須選択/);assert.match(html,/手札をタップ/);assert.doesNotMatch(html,/result-notice|data-result-collapse|notice-thumb/);
 const response={...v,choice:null,effect:null,phase:'response',actor:'B',actions:[{id:'test-pass',kind:'pass',label:'パス'}]};assert.match(ui.compactOperationMarkup(response,'B'),/操作 B · 応答/);assert.match(ui.compactOperationMarkup(response,'B'),/data-action="test-pass"/);
 const normal={...response,phase:'normal',actor:'A',actions:[{id:'test-end',kind:'pass',displayLabel:'ターン終了を申し出る'}]};const n=ui.compactOperationMarkup(normal,'A');assert.match(n,/操作 A · 通常行動/);assert.match(n,/ターン終了を申し出る/);
});
test('compact card markup omits full-copy/footer and tiny stat labels across all 452 definitions',()=>{
 for(const c of Object.values(CARDS)){const thumb=ui.cardMarkup(c,{compact:true});assert.doesNotMatch(thumb,/class="card-copy"|class="card-footer"|<small>ちから|<small>ちえ/);assert.match(thumb,/card-title/);assert.match(thumb,/card-art/);assert.equal(thumb.includes('class="card-stats"'),c.type==='main');const full=ui.cardMarkup(c);assert.match(full,/class="card-copy"/);assert.match(full,/class="card-footer"/);}
});
test('result host is laid out in flow separately from the operation guide and hand',()=>{
 const app=readFileSync(new URL('../app.mjs',import.meta.url),'utf8'),css=readFileSync(new URL('../style.css',import.meta.url),'utf8');assert.match(app,/insertBefore\(feedbackHost,.*battle-area/);assert.doesNotMatch(css,/#result-feedback\{[^}]*position:fixed/);assert.match(css,/#result-feedback:empty\{display:none/);
});
test('a board card needed for current choice opens exact action detail directly; other cards remain browsing-only',()=>{
 const x=start(),v=x.projection,c=v.players.A.hand[0];v.players.A.board.main=c;v.actions=[{id:'choose-one',kind:'choose',choiceCard:c.id,label:'このカードを選ぶ'}];
 const html=ui.boardMarkup(v.players.A,'A','A',[],v);assert.match(html,new RegExp('data-inspect="'+c.id+'"'));assert.match(ui.detailMarkup(c,{v,viewer:'A'}),/data-action="choose-one"/);
 v.actions=[];assert.match(ui.boardMarkup(v.players.A,'A','A',[],v),new RegExp('data-browse="'+c.id+'"'));
});
