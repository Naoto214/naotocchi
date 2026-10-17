import test from 'node:test';import assert from 'node:assert/strict';
import * as e from '../engine.mjs';import {HotseatSession} from '../ui-session.mjs';import {needsConfirmation,confirmationMarkup} from '../ui-presentation.mjs';
function fixture(){const s=e.createGame(71);s.choice=null;s.pending=[];s.phase='normal';s.players.A.time=10;s.players.B.time=10;return s;}
function put(s,a,id){const x=s.players[a].deck.shift();s.cards[x].cardId=id;s.players[a].hand.push(x);return x;}
function choose(session,part){const v=session.projection,a=v.actions.find(a=>a.label.includes(part));assert.ok(a,part);session.commit(a.id,v.revision,v.actor);}
test('irreversible replacement payments require confirmation although they are choose actions',()=>{
 assert.equal(needsConfirmation({kind:'choose',label:'カクレクマノミ⑥で置換 / 支払い：ただのはこ'}),true);
});
test('engine-paid reaction requires confirmation even when its label has no cost token',()=>{
 let s=fixture();const source=put(s,'A','G-area-claim');put(s,'B','G-pingpong-3d');const main=put(s,'B','M-beetle-01');s.players.B.hand.pop();s.players.B.board.main=main;
 const play=e.legalActions(s).find(a=>a.source===source);s=e.act(s,'A',s.revision,play.id);s=e.act(s,e.actor(s),s.revision,e.legalActions(s).find(a=>a.kind==='pass').id);
 const session=new HotseatSession();session.start(s);session.reveal();
 const a=session.projection.actions.find(a=>a.label.includes('に反応'));assert.ok(a);
 assert.doesNotMatch(a.label,/時\d/);const before=session.save(),pending=session.prepare(a.id);
 assert.equal(pending.required,true);assert.ok(pending.paidTime>0);assert.equal(session.save(),before,'preview never commits');
});
test('automatic last pick confirms accumulated payment names and survives hide without leaking',()=>{
 const s=fixture(),source=put(s,'A','G-falling-block-puzzle');put(s,'A','C-box');put(s,'A','W-deepsea');put(s,'A','I-c_coin2');
 const session=new HotseatSession();session.start(s);session.reveal();
 const v=session.projection,a=v.actions.find(a=>a.source===source);assert.equal(session.prepare(a.id).required,false,'starting a draft is not a payment');session.commit(a.id,v.revision,v.actor);
 choose(session,'ただのはこ');choose(session,'しんかい');
 const current=session.projection,last=current.actions.find(a=>a.label.includes(e.CARDS['I-c_coin2'].name));assert.ok(last);
 const pending=session.prepare(last.id);assert.equal(pending.required,true);
 assert.ok(pending.details.some(x=>x.includes('ただのはこ')));assert.ok(pending.details.some(x=>x.includes('しんかい')));assert.ok(pending.details.some(x=>x.includes(e.CARDS['I-c_coin2'].name)));
 const dialog=confirmationMarkup(pending);assert.match(dialog,/ただのはこ/);assert.match(dialog,/しんかい/);assert.match(dialog,/ラッキーコイン/);
 assert.equal(session.projection.choice.kind,'activation_selection','preview does not consume final choice');
 session.hide();assert.equal(session.projection.selectionSummary,undefined);session.reveal();assert.ok(session.projection.selectionSummary.join().includes('ただのはこ'));
 const cancel=session.projection.actions.find(a=>a.label==='発動を取りやめる');session.commit(cancel.id,session.projection.revision,session.viewer);assert.equal(session.projection.selectionSummary,undefined);
});
test('selection presentation redacts identities of opponents face-down targets',()=>{
 const s=fixture(),x=put(s,'B','G-real-fishing');s.players.B.hand.pop();s.players.B.board.prepared.push({id:x,faceDown:true});
 s.activationDraft={actor:'A',action:{cost:0},rule:{select:[{key:'target'}]},selection:{target:[x]}};
 const session=new HotseatSession();session.start(s);session.reveal();
 assert.deepEqual(session.projection.selectionSummary,['対象：非公開のカード']);
});
