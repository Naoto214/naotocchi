import test from 'node:test';
import assert from 'node:assert/strict';
import * as e from '../engine.mjs';
import {appendResult,captureResult,replayResults,projectResults} from '../ui-results.mjs';
import {resultHistoryMarkup} from '../ui-presentation.mjs';
import {ResultFeedback} from '../ui-result-feedback.mjs';
test('history retains the whole match and restore reproduces it beyond forty results',()=>{
 let s=e.createGame(4);const journal=[];appendResult(journal,null,s);
 for(let i=0;i<350&&!s.result;i++){
  const a=e.legalActions(s)[0];assert.ok(a);const n=e.act(s,e.actor(s),s.revision,a.id);appendResult(journal,s,n);s=n;
 }
 assert.ok(journal.length>40);assert.equal(journal[0].A.revision,0);
 assert.deepEqual(replayResults(e.restore(e.save(s))),journal);
 const html=resultHistoryMarkup({results:projectResults(journal,'A')},'A');
 assert.ok(html.indexOf('手順0</small>')>html.indexOf('手順1</small>'));assert.match(html,/ターン終了/);assert.match(html,/ターン開始/);
});
test('trace-only operations enter history without generating extra result notices',()=>{
 const s=e.createGame(4),n=structuredClone(s);n.revision++;n.log.push('A：ちょうせんを宣言');
 const g=captureResult(s,n).A;assert.equal(g.historyOnly,true);
 let painted=false;new ResultFeedback({paint:()=>painted=true,clear:()=>{},schedule:()=>1}).present([g],'A',1,1);
 assert.equal(painted,false);
});
test('history renders an event once, omits mass pass diagnostics, and escapes text',()=>{
 const line='A：<カード>を解決';const g={revision:1,round:1,turn:'A',heading:line,trace:[line],rows:[{kind:'event',text:line}],combined:false};
 const html=resultHistoryMarkup({results:[g],log:[line],autoLog:Array(20).fill({actor:'B'})},'A');
 assert.equal(html.split('&lt;カード&gt;').length-1,1);assert.doesNotMatch(html,/<カード>|リビジョン/);
});
test('private identities stay out of public and opposing history projections',()=>{
 const s=e.createGame(4),n=structuredClone(s),id=n.players.A.deck.shift();n.players.A.hand.push(id);n.revision++;
 const g=captureResult(s,n);assert.equal(g.A.rows.find(r=>r.kind==='draw').cards[0].id,id);
 for(const viewer of ['public','B']){assert.equal(g[viewer].rows.find(r=>r.kind==='draw').cards.length,0);assert.ok(!JSON.stringify(g[viewer]).includes(id));}
});
