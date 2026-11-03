import test from 'node:test';
import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
import {createGame,restore,actor} from '../engine.mjs';
import {HotseatSession} from '../ui-session.mjs';
import * as ui from '../ui-presentation.mjs';
const start=()=>{const x=new HotseatSession();x.start(createGame(4));x.reveal();return x;};
function step(x,kind,predicate=()=>true){const v=x.projection,a=v.actions.find(a=>a.kind===kind&&predicate(a));assert.ok(a,kind);x.commit(a.id,v.revision,x.viewer);if(!x.viewer)x.reveal();return a;}
function opening(x){step(x,'choose',a=>!a.choiceCard.includes('M-beetle-01'));step(x,'pass');step(x,'pass');}

test('normal end-turn action is never relabelled as a response pass',()=>{
 const x=start();opening(x);const v=x.projection,a=v.actions.find(a=>a.kind==='pass');
 assert.equal(a.displayLabel,'ターン終了を申し出る');
 for(const html of [ui.compactOperationMarkup(v,'A'),ui.workflowMarkup(v,'A')]){
  assert.match(html,/ターン終了を申し出る/);assert.doesNotMatch(html,/パスして|応答待ち/);
 }
 assert.match(ui.gameMarkup(v,'A'),/Aの通常行動/);
});
test('empty-chain response after birth resolution cannot claim normal action',()=>{
 const x=start();opening(x);step(x,'place',a=>a.source.includes('M-beetle-01'));step(x,'trigger');step(x,'pass');step(x,'pass');step(x,'choose');
 const v=x.projection;assert.equal(v.phase,'response');assert.equal(v.chain.length,0);assert.equal(v.effect,null);
 const html=ui.compactOperationMarkup(v,'A');assert.doesNotMatch(html,/>通常行動</);assert.match(html,/行動後の応答/);
 assert.match(ui.gameMarkup(v,'A'),/Aのターン/);assert.match(ui.gameMarkup(v,'A'),/Aが応答中/);
});
test('opening handoff states owner, response reason, no response and exact pass destination',()=>{
 const x=start();step(x,'choose',a=>!a.choiceCard.includes('M-beetle-01'));
 assert.match(x.projection.actions.find(a=>a.kind==='pass').displayLabel,/Bの応答へ/);
 step(x,'pass');let v=x.projection;
 assert.equal(v.turn,'A');assert.equal(v.actor,'B');assert.equal(v.players.B.time,0);
 assert.match(ui.choiceGuide(v),/Bは応答できるカードがありません/);
 assert.match(ui.choiceGuide(v),/ターン開始時の処理後/);
 assert.match(v.actions.find(a=>a.kind==='pass').displayLabel,/Aの通常行動へ/);
 const before=x.save();x.hide();v=x.projection;
 assert.match(ui.turnStatus(v),/Aのターン・Bの応答待ち/);
 assert.match(ui.handoffMessage(v),/ターン交代ではありません/);
 assert.doesNotMatch(JSON.stringify(v),/"hand":|"peek":|"effectQueue":\[\{/);
 x.restore(before);assert.equal(x.viewer,null);x.reveal();assert.equal(x.save(),before);
 step(x,'pass');assert.equal(x.projection.effect,null);assert.doesNotMatch(ui.compactOperationMarkup(x.projection,'A'),/応答待ち/);
});

test('full first turn trace: egg, exact responses, birth effect, end boundary and B start',()=>{
 const x=start(),trace=[];
 function record(label){const s=restore(x.save());trace.push({label,revision:s.revision,turnOwner:s.turn,actingPlayer:actor(s),phase:s.phase,window:s.window,passes:s.passes,choice:s.choice?.kind??null,chain:s.chain.map(l=>({actor:l.actor,kind:l.kind,source:l.source})),players:Object.fromEntries(['A','B'].map(a=>[a,{time:s.players[a].time,hand:[...s.players[a].hand],deck:[...s.players[a].deck],main:s.players[a].board.main}])),status:ui.turnStatus(x.projection)});return s;}
 function go(kind,predicate){const old=x.projection,a=step(x,kind,predicate);assert.throws(()=>x.commit(a.id,old.revision,old.actor));const saved=x.save();x.restore(saved);assert.equal(x.viewer,null);assert.deepEqual(x.projection.actions,[]);x.reveal();assert.equal(x.save(),saved);return record(a.label);}
 let s=record('A開始・通常＋たまごドロー済み');assert.deepEqual([s.players.A.time,s.players.A.hand.length,s.players.A.deck.length,s.players.B.time,s.players.B.hand.length,s.players.B.deck.length],[1,7,33,0,5,35]);
 go('choose',a=>!a.choiceCard.includes('M-beetle-01'));go('pass');s=go('pass');assert.equal(s.phase,'normal');assert.equal(s.turn,'A');assert.equal(s.players.A.time,1);
 s=go('place',a=>a.source.includes('M-beetle-01'));assert.equal(s.players.A.time,0);assert.ok(s.players.A.board.main);
 go('trigger');go('pass');s=go('pass');assert.equal(s.choice.kind,'birth_bottom');assert.equal(s.chain.length,0);
 go('choose');go('pass');s=go('pass');assert.equal(s.phase,'normal');assert.equal(s.turn,'A');
 s=go('pass');assert.equal(s.window,'end_request');assert.equal(actor(s),'B');assert.equal(s.passes,1);
 assert.match(x.projection.actions.find(a=>a.kind==='pass').displayLabel,/Aの終了処理へ/);
 s=go('pass');assert.equal(s.window,'end');assert.equal(s.turn,'A');go('pass');
 assert.match(x.projection.actions.find(a=>a.kind==='pass').displayLabel,/ターン終了処理を進める/);
 s=go('pass');assert.equal(s.turn,'B');assert.equal(s.choice.kind,'egg_bottom');assert.deepEqual([s.players.B.time,s.players.B.hand.length,s.players.B.deck.length],[1,7,33]);
 go('choose');s=go('pass');assert.equal(actor(s),'A');s=go('pass');assert.equal(s.turn,'B');assert.equal(s.phase,'normal');assert.deepEqual([s.players.B.time,s.players.B.hand.length,s.players.B.deck.length],[1,6,34]);
 assert.deepEqual(trace.map(r=>[r.turnOwner,r.actingPlayer,r.phase]),[
  ['A','A','choice'],['A','A','response'],['A','B','response'],['A','A','normal'],['A','A','trigger'],['A','A','response'],['A','B','response'],['A','A','choice'],['A','A','response'],['A','B','response'],['A','A','normal'],['A','B','response'],['A','A','response'],['A','B','response'],['B','B','choice'],['B','B','response'],['B','A','response'],['B','B','normal']]);
 if(process.env.QA5_TRACE)writeFileSync(process.env.QA5_TRACE,JSON.stringify({seed:4,scenario:'Natural default decks; optional birth ability used; all responses explicitly passed',trace},null,2)+'\n');
});
test('opening quick card requires chain passes then start-window passes without starting B turn',()=>{
 const x=start();step(x,'choose',a=>!a.choiceCard.includes('M-beetle-01'));
 step(x,'play');assert.equal(x.projection.chain.length,1);step(x,'pass');
 assert.match(x.projection.actions.find(a=>a.kind==='pass').displayLabel,/効果を解決/);
 step(x,'pass');assert.equal(x.projection.chain.length,0);assert.equal(x.projection.phase,'response');assert.equal(x.projection.turn,'A');assert.equal(x.projection.actor,'A');
 step(x,'pass');step(x,'pass');assert.equal(x.projection.phase,'normal');assert.equal(x.projection.players.A.time,0);assert.equal(x.projection.players.B.time,0);
 assert.equal(x.projection.actions.some(a=>a.kind==='place'&&a.label.includes('たんじょう')),false);
});

test('hidden mandatory choice is labelled as selection without revealing private choice content',()=>{
 const x=start();x.hide();assert.equal(x.projection.choice,null);
 assert.match(ui.handoffMessage(x.projection),/Aのターン・選択待ち/);
 assert.doesNotMatch(ui.handoffMessage(x.projection),/応答待ち/);
});
test('new response link resets passes; LIFO resolution choice cannot offer a pass',()=>{
 const s=createGame(71);s.choice=null;s.pending=[];s.phase='normal';s.players.A.time=10;s.players.B.time=10;
 const put=(seat,definition)=>{const id=s.players[seat].deck.shift();s.cards[id].cardId=definition;s.players[seat].hand.push(id);return id;};
 const one=put('A','G-puzzle-2048'),two=put('B','I-c_coin2');
 const x=new HotseatSession();x.start(s);x.reveal();
 step(x,'programPlay',a=>a.source===one);step(x,'pass');assert.equal(x.projection.progress.passes,1);
 step(x,'play',a=>a.source===two);assert.equal(x.projection.progress.passes,0);assert.equal(x.projection.actor,'B');assert.equal(x.projection.chain.length,2);
 assert.match(x.projection.actions.find(a=>a.kind==='pass').displayLabel,/Aの応答へ/);
 step(x,'pass');step(x,'pass');const v=x.projection;
 assert.equal(v.choice.kind,'resolve_selection');assert.equal(v.progress,null);assert.equal(v.effect.card.id,one);
 assert.ok(v.players.B.discard.some(c=>c.id===two));assert.equal(v.actions.some(a=>a.kind==='pass'),false);
 assert.doesNotMatch(ui.compactOperationMarkup(v,'A'),/応答待ち|パスして/);
});

test('aborted challenge pass does not promise a comparison that the engine will skip',()=>{
 const s=createGame(4);s.choice=null;s.phase='response';s.window='compare';s.priority='B';s.passes=1;
 s.challenge={actor:'A',aborted:true,participants:{A:null,B:null},parameter:'power'};
 const x=new HotseatSession();x.start(s);x.reveal();
 assert.equal(x.projection.actions.find(a=>a.kind==='pass').displayLabel,'パスしてちょうせんの処理を進める');
 step(x,'pass');assert.equal(x.projection.progress.window,'challenge_end');
 assert.doesNotMatch(x.projection.log.join('\n'),/対.*引き分け/);
});
