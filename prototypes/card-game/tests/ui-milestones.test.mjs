import test from 'node:test';
import assert from 'node:assert/strict';
import * as e from '../engine.mjs';
import {captureResult} from '../ui-results.mjs';
import * as ui from '../ui-presentation.mjs';
import {HotseatSession} from '../ui-session.mjs';
const fixture=()=>{const s=e.createGame(71);s.choice=null;s.pending=[];s.phase='normal';s.players.A.time=10;s.players.B.time=10;return s;};
function put(s,seat,cardId,zone='hand'){const p=s.players[seat],id=p.deck.shift();s.cards[id].cardId=cardId;if(zone==='hand')p.hand.push(id);else{p.board[zone]=id;s.cards[id].generation++;}return id;}
function go(s,kind,p=()=>true){const a=e.legalActions(s).find(a=>a.kind===kind&&p(a));assert.ok(a,kind);return e.act(s,e.actor(s),s.revision,a.id);}
test('history renders newest first without mutating chronological journal and survives replay',()=>{
 const x=new HotseatSession({autoAdvance:true});x.start(e.createGame(4));x.reveal();let v=x.projection;x.commit(v.actions[0].id,v.revision,x.actor);v=x.projection;
 const before=JSON.stringify(v.results),html=ui.resultHistoryMarkup(v,x.viewer),ids=[...html.matchAll(/data-result-revision="(\d+)"/g)].map(m=>+m[1]);
 assert.ok(ids.length>1);assert.deepEqual(ids,[...ids].sort((a,b)=>b-a));assert.equal(JSON.stringify(v.results),before);
 const y=new HotseatSession({autoAdvance:true});y.restore(x.save());y.reveal();assert.equal(ui.resultHistoryMarkup(y.projection,y.viewer),html);
});
test('turn ownership and response operator stay distinct for either human seat and hotseat',()=>{
 for(const humanSeat of ['A','B'])for(const turn of ['A','B']){
  const actor=turn==='A'?'B':'A',v={...e.view(e.createGame(4),humanSeat),mode:'cpu',humanSeat,turn,actor,choice:null,phase:'response',round:4};
  const html=ui.gameMarkup(v,humanSeat);assert.match(html,new RegExp(`${turn===humanSeat?'あなた':'CPU'}のターン`));assert.match(html,new RegExp(`${actor===humanSeat?'あなた':'CPU'}が応答中`));assert.match(html,/ROUND 4\/10/);assert.match(html,new RegExp(`data-turn-owner="${turn}"`));
  const hot=ui.gameMarkup({...v,...e.view(e.createGame(4),actor),mode:undefined,turn,actor,choice:null,phase:'response',round:4},actor);assert.match(hot,new RegExp(`${turn}のターン`));assert.match(hot,new RegExp(`${actor}が応答中`));
 }
});
test('marriage derives from actual transition and reports capped growth, payment, public couple, operator',()=>{
 const s=fixture();put(s,'A','M-cat-04','main');const partner=put(s,'A','P-rock_octopus','partner');s.players.A.relationship=3;s.players.A.growth=97;
 const after=go(s,'relationship'),snap=JSON.stringify([s,after]),g=captureResult(s,after).B,html=ui.resultNoticeMarkup(g);
 assert.match(html,/けっこん！/);assert.match(html,/97 → 100（\+3）/);assert.match(html,/10 → 9（−1）/);assert.match(html,/交際 3 → 結婚/);assert.match(html,new RegExp(e.CARDS[s.cards[partner].cardId].name));assert.match(html,/次/);
 assert.equal(g.actor,'A');assert.equal(JSON.stringify([s,after]),snap);
 const repeat=captureResult(after,{...after,revision:after.revision+1});assert.ok(!repeat||!ui.resultNoticeMarkup(repeat.B).includes('けっこん！'));
});
test('birth and main growth emphasize the actual card and stats, ordinary effects stay ordinary',()=>{
 let s=fixture();const first=put(s,'A','M-beetle-01');let after=go(s,'place',a=>a.source===first);assert.match(ui.resultNoticeMarkup(captureResult(s,after).A),/たんじょう！/);
 s=fixture();put(s,'A','M-beetle-01','main');const next=put(s,'A','M-beetle-02');after=go(s,'place',a=>a.source===next&&a.variant==='time_skip');const html=ui.resultNoticeMarkup(captureResult(s,after).A);assert.match(html,/成長！/);assert.match(html,/ときおくり/);assert.match(html,/ちから/);
 assert.doesNotMatch(ui.resultNoticeMarkup({heading:'通常',rows:[{kind:'time',text:'時 3 → 2',cards:[]}]}),/result-important/);
});
test('history labels the command owner and turn before a turn boundary, no repeated pass-only rows',()=>{
 const s=fixture();s.phase='response';s.priority='B';s.passes=1;s.window='end';const after=go(s,'pass'),g=captureResult(s,after).public;
 assert.equal(g.actor,'B');assert.equal(g.turn,'A');assert.equal(g.round,s.round);
 const html=ui.resultHistoryMarkup({results:[{revision:1,trace:['A：パス'],rows:[],historyOnly:true,turn:'A',round:1},{...g,revision:2}]},null);assert.doesNotMatch(html,/手順1</);assert.match(html,/操作 B/);
});
test('finished result is public and explicitly states the actual outcome',()=>{
 const s=fixture();s.round=10;s.turn='B';s.phase='response';s.priority='A';s.passes=1;s.window='end';s.players.A.growth=30;s.players.B.growth=20;
 let after=go(s,'pass');for(let i=0;i<20&&!after.result;i++)after=go(after,'pass');assert.ok(after.result);
 const html=ui.resultNoticeMarkup(captureResult(s,after).public);assert.match(html,/対戦終了！/);assert.match(html,/A の勝利/);
});
test('turn motion only occurs on a real turn change, never on response/render/restore',async()=>{
 const {TurnFeedback}=await import('../ui-render.mjs');assert.equal(typeof TurnFeedback,'function');
 const flow=new TurnFeedback();let count=0;const node={animate:()=>count++};const v={turn:'A',round:1,resultEpoch:1};
 flow.present(node,v);flow.present(node,{...v,actor:'B'});assert.equal(count,0);
 flow.present(node,{...v,turn:'B'});assert.equal(count,1);flow.present(node,{...v,turn:'B'});assert.equal(count,1);
 flow.hide();flow.present(node,{...v,round:2});assert.equal(count,1);
 flow.present(node,{...v,round:2,turn:'B'},true);assert.equal(count,1);
 flow.present(node,{...v,resultEpoch:2});assert.equal(count,1);
});
test('burst of important events stays in order without timer multiplication',async()=>{
 const {ResultFeedback}=await import('../ui-result-feedback.mjs');const seen=[],tasks=new Map();let id=0;
 const f=new ResultFeedback({paint:g=>seen.push(g.revision),clear:()=>{},schedule:(fn,ms)=>{assert.equal(ms,4000);tasks.set(++id,fn);return id;},cancel:i=>tasks.delete(i)});
 const groups=Array.from({length:12},(_,i)=>({revision:i+1,rows:[{kind:'marriage',text:'けっこん成立',cards:[]}]}));
 f.present(groups,'A',1,1);f.present(groups,'A',1,1);while(tasks.size){assert.equal(tasks.size,1);const [i,fn]=tasks.entries().next().value;tasks.delete(i);fn();}
 assert.deepEqual(seen,groups.map(g=>g.revision));
});
test('new human input preserves pending important results but hide clears them',async()=>{
 const {ResultFeedback}=await import('../ui-result-feedback.mjs');const seen=[],tasks=new Map();let id=0;
 const f=new ResultFeedback({paint:g=>seen.push(g.revision),clear:()=>{},schedule:fn=>{tasks.set(++id,fn);return id;},cancel:i=>tasks.delete(i)});
 const groups=[1,2,3].map(revision=>({revision,rows:[{kind:'marriage',cards:[]}]}));
 f.present(groups.slice(0,2),'A',1,1);f.present(groups,'A',1,3);assert.deepEqual(seen,[1]);
 while(tasks.size){const [i,fn]=tasks.entries().next().value;tasks.delete(i);fn();}assert.deepEqual(seen,[1,2,3]);
 f.hide();f.present(groups,'A',1,3);assert.deepEqual(seen,[1,2,3]);
});
