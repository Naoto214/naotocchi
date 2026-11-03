// 479 共通ルール改定（2026-11-04 正式決定）：結婚前の別れ そだち−5・結婚 +10・結婚後の別れ（離婚）−10。
// 減少は engine.mjs の共通処理（discardField → breakupPenalty）だけで決まり、別れの経路（相手のすれちがい・自分のタンポポ⑧）によらない。
// 旧保存（hotseat-2〜6）は旧ルール（交際段階によらず−10）のまま再生する。
import test from 'node:test';import assert from 'node:assert/strict';
import * as e from '../engine.mjs';
import {captureResult} from '../ui-results.mjs';import {importantResult,resultNoticeMarkup} from '../ui-presentation.mjs';
import {observeCpu} from '../cpu-observation.mjs';import {chooseCpuAction} from '../cpu-policy.mjs';import {advanceResponses} from '../auto-progress.mjs';
import {CPU_DECKS} from '../cpu-decks.mjs';import {restoreMatch} from '../cpu-session.mjs';

const OLD=['hotseat-2','hotseat-3','hotseat-4','hotseat-5','hotseat-6'];
function fixture(version,seat='A'){const s=version?e.createGame(41,undefined,version):e.createGame(41);s.choice=null;s.pending=[];s.phase='normal';s.window='normal';s.turn=seat;s.players.A.time=10;s.players.B.time=10;s.players.A.growth=50;s.players.B.growth=50;s.history=[];return s;}
function take(s,a,c){const x=s.players[a].deck.shift();s.cards[x].cardId=c;return x;}
function field(s,a,c,slot='main'){const id=take(s,a,c);s.cards[id].generation++;s.players[a].board[slot]=id;return id;}
function hand(s,a,c){const id=take(s,a,c);s.players[a].hand.push(id);return id;}
const find=(s,p)=>e.legalActions(s).find(p);
const doAction=(s,a)=>{assert.ok(a,'action not legal');return e.act(s,e.actor(s),s.revision,a.id);};
function settle(s,pick=()=>null){let g=0;while(s.phase!=='normal'||s.choice){assert.ok(g++<80,'settle loop');if(s.phase==='finished')return s;const acts=e.legalActions(s);const a=pick(s,acts)??acts.find(x=>x.kind==='skip')??acts.find(x=>x.kind==='pass')??acts.find(x=>x.kind==='choose'&&x.value!=='cancel')??acts[0];s=e.act(s,e.actor(s),s.revision,a.id);}return s;}
const other=a=>a==='A'?'B':'A';
// lover owner `seat` with a lover at `stage` (0..3, 4 = married); the opponent holds すれちがい and acts on its own turn.
function loverAt(stage,{version,seat='A',growth=50,lover='P-robot_neighbor'}={}){const s=fixture(version,other(seat));field(s,seat,'M-dog-03');field(s,other(seat),'M-dog-01');
 const p=field(s,seat,lover,'partner');s.players[seat].relationship=stage;s.players[seat].growth=growth;const mis=hand(s,other(seat),'E-misunderstanding');return {s,p,mis};}
function misunderstand(s,mis){s=doAction(s,find(s,a=>a.source===mis&&['play','programPlay'].includes(a.kind)));return settle(s);}

test('共通処理：結婚前（交際0〜3）は5、結婚後は10。旧版（hotseat-2〜6）は交際段階によらず10',()=>{
 const s=e.createGame(1);assert.equal(s.version,'hotseat-7');assert.equal(e.VERSION,e.RULE_VERSIONS.at(-1));
 for(const k of [0,1,2,3])assert.equal(e.breakupPenalty(s,k),5,'stage '+k);assert.equal(e.breakupPenalty(s,4),10);
 for(const version of OLD)for(const k of [0,1,2,3,4])assert.equal(e.breakupPenalty(e.createGame(1,undefined,version),k),10,version+' '+k);
});

for(const seat of ['A','B'])test(`相手のすれちがい：交際0〜3は−5、結婚後は−10（こいびと側 ${seat}）`,()=>{
 for(const [stage,loss] of [[0,5],[1,5],[2,5],[3,5],[4,10]]){let {s,p,mis}=loverAt(stage,{seat});s=misunderstand(s,mis);const me=s.players[seat];
  assert.equal(me.growth,50-loss,`stage ${stage}`);assert.equal(me.board.partner,null);assert.equal(me.relationship,null);assert.ok(me.hand.includes(p),'こいびとは手札に戻る');
  const ev=s.history.filter(x=>x.kind==='breakup');assert.equal(ev.length,1);assert.deepEqual([ev[0].actor,ev[0].stage,ev[0].married,ev[0].penalty],[seat,stage,stage===4,loss]);
  assert.deepEqual(s.history.filter(x=>x.kind==='growth'&&x.actor===seat).map(x=>x.delta),[-loss]);
  assert.equal(s.players[other(seat)].growth,50,'相手のそだちは変わらない');}
});

test('自分のタンポポ⑧でこいびとを山札の上へ戻す経路も同じ数値（−5／−10）',()=>{
 for(const [stage,loss] of [[0,5],[2,5],[4,10]]){const s0=fixture(undefined,'A');const main=field(s0,'A','M-dandelion-08');field(s0,'B','M-dog-01');const p=field(s0,'A','P-robot_neighbor','partner');s0.players.A.relationship=stage;
  const junk=take(s0,'A','G-real-fishing');s0.players.A.discard.push(junk);
  let s=doAction(s0,find(s0,a=>a.source===main&&a.kind==='programAbility'));
  s=settle(s,(st,acts)=>acts.find(x=>x.kind==='choose'&&x.value===p)??acts.find(x=>x.kind==='choose'&&x.value===junk)??acts.find(x=>x.kind==='choose'&&x.value==='done'));
  assert.equal(s.players.A.board.partner,null,'stage '+stage);assert.equal(s.players.A.deck[0],p,'山札の一番上');assert.equal(s.players.A.growth,50-loss,'stage '+stage);
  assert.equal(s.history.find(x=>x.kind==='breakup').penalty,loss);}
});

test('そだちは0を下回らない（5で結婚前の別れ→0、5で離婚→0）',()=>{
 for(const stage of [0,4]){let {s,mis}=loverAt(stage,{growth:5});s=misunderstand(s,mis);assert.equal(s.players.A.growth,0,'stage '+stage);
  assert.deepEqual(s.history.filter(x=>x.kind==='growth'&&x.actor==='A').map(x=>x.delta),[-5]);}
 let {s,mis}=loverAt(1,{growth:0});s=misunderstand(s,mis);assert.equal(s.players.A.growth,0);assert.equal(s.history.filter(x=>x.kind==='growth').length,0);
});

test('旧版（hotseat-6）の対戦では、結婚前の別れも従来どおり−10',()=>{
 for(const version of OLD){let {s,mis}=loverAt(0,{version});s=misunderstand(s,mis);assert.equal(s.players.A.growth,40,version);}
});

test('こいびとを出してもそだちは変わらない。交際3→結婚で+10',()=>{
 const s0=fixture(undefined,'A');field(s0,'A','M-dog-03');field(s0,'B','M-dog-01');const lover=hand(s0,'A','P-robot_neighbor');
 let s=settle(doAction(s0,find(s0,a=>a.kind==='place'&&a.slot==='partner'&&a.source===lover)));assert.equal(s.players.A.relationship,0);assert.equal(s.players.A.growth,50);
 assert.equal(s.history.filter(x=>x.kind==='growth').length,0);
 s.players.A.relationship=3;s.players.A.relationshipUsed=false;s=settle(doAction(s,find(s,a=>a.kind==='relationship')));assert.equal(s.players.A.relationship,4);assert.equal(s.players.A.growth,60);
});

test('別れるとこいびとの能力を失う（ロボットのちから+1が消える）',()=>{
 let {s,mis}=loverAt(4);const before=e.stats(s,'A');s=misunderstand(s,mis);const after=e.stats(s,'A');assert.equal(after.power,before.power-1);assert.equal(after.wisdom,before.wisdom);
});

test('結果通知：結婚前と結婚後の別れを区別して表示する',()=>{
 for(const [stage,text,title] of [[1,'こいびとと おわかれ（そだち−5）','おわかれ'],[4,'けっこんした あいてと おわかれ（そだち−10）','おわかれ']]){
  const {s,mis}=loverAt(stage);const after=misunderstand(s,mis);const g=captureResult(s,after).public;const row=g.rows.find(r=>r.kind==='breakup');
  assert.ok(row,'breakup row');assert.ok(row.text.startsWith('A：'+text),row.text);assert.match(row.text,/となりまちのロボット/);
  assert.equal(importantResult(g).kind,'breakup');assert.equal(importantResult(g).title,title);assert.match(resultNoticeMarkup(g),new RegExp(text.replace(/[（）]/g,'.')));
  assert.ok(g.rows.some(r=>r.kind==='growth'&&r.delta===-(stage===4?10:5)),'そだちの増減も出る');}
});

// 実際のCPU対戦（相手デッキにすれちがい）：保存・復帰で同じ結果、別れの減少は交際段階の規則どおり。
function cpuMatch(seed,version){const S='E-misunderstanding',lover=CPU_DECKS.find(d=>d.id==='partner').cards,base=CPU_DECKS.find(d=>d.id==='challenge').cards;let n=0;
 const opp=base.map(id=>id==='E-mirror'&&n<2?(n++,S):id);let s=version?e.createGame(seed,{A:lover,B:opp},version):e.createGame(seed,{A:lover,B:opp});
 const adv=()=>{s=advanceResponses(s).state;};adv();for(let i=0;s.phase!=='finished'&&i<4000;i++){const a=e.actor(s),o=observeCpu(s,a),d=chooseCpuAction(o,{difficulty:'intermediate',seed:seed+(a==='A'?0:7),step:i});s=e.act(s,a,s.revision,d.id);adv();}return s;}
test('CPU対戦：別れを含む対戦を最後まで進め、保存→復帰で状態が一致する（先攻・後攻とも）',()=>{
 let found=0;
 for(const seed of [3,5,8,13,21,34,55,89]){const s=cpuMatch(seed);assert.equal(s.phase,'finished');const ev=s.history.filter(x=>x.kind==='breakup');
  for(const x of ev)assert.equal(x.penalty,x.stage===4?10:5);found+=ev.length;
  const back=e.restore(e.save(s));assert.deepEqual(back.players,s.players);assert.deepEqual(back.result,s.result);assert.equal(e.save(back),e.save(s));
  assert.deepEqual(back.history.filter(x=>x.kind==='breakup'),ev);}
 assert.ok(found>0,'少なくとも1回は別れが起きる');
});
test('CPU対戦の保存（cpu-session の読込経路）でも新ルールの版のまま',()=>{const s=cpuMatch(5);const saved=e.save(s);assert.equal(JSON.parse(saved).version,'hotseat-7');assert.equal(restoreMatch(saved).save(),saved);});
