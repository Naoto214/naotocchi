// ボンバー（G-bomber-maze）：発動中のボンバー自身は発動領域にあるので、自分側の対象にできない（正式裁定 84 P12・83 接続「自身は既に発動領域へ移るため対象にできない」）。
// 自分側はほかの準備枠の札、相手側は従来どおり相手の準備枠の札。旧保存（hotseat-2〜6）は旧挙動のまま再生する。
import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import {createHash} from 'node:crypto';
import * as e from '../engine.mjs';import * as selections from '../selection.mjs';
import {CATALOG} from '../full-catalog.mjs';import {RULES} from '../rules.mjs';
import {observeCpu} from '../cpu-observation.mjs';import {chooseCpuAction} from '../cpu-policy.mjs';
import {restoreMatch} from '../cpu-session.mjs';

const BOMB='G-bomber-maze';
const TEXT='相手のターン開始時に発動できる。自分と相手の準備枠のカードを1枚ずつ対象とする。このターン終了時、それぞれを捨て札に置く。';
const OLD_VERSIONS=['hotseat-2','hotseat-3','hotseat-4','hotseat-5','hotseat-6'];
function fixture(version){const s=version?e.createGame(71,undefined,version):e.createGame(71);s.choice=null;s.pending=[];s.phase='normal';s.window='normal';s.players.A.time=10;s.players.B.time=10;return s;}
function take(s,a,c){const x=s.players[a].deck.shift();s.cards[x].cardId=c;return x;}
function field(s,a,c,slot='main'){const id=take(s,a,c);s.cards[id].generation++;s.players[a].board[slot]=id;return id;}
function trap(s,a,c){const id=take(s,a,c);s.players[a].board.prepared.push({id,faceDown:true,setSerial:0});return id;}
function equip(s,a,c,target){const id=take(s,a,c);s.players[a].board.prepared.push({id,target,targetGeneration:s.cards[target].generation,attachedAt:0});return id;}
const doAction=(s,a)=>{assert.ok(a,'action not legal');return e.act(s,e.actor(s),s.revision,a.id);};
const bombTriggers=(s,bomb)=>e.legalActions(s).filter(a=>a.kind==='trigger'&&a.source===bomb);
const options=s=>e.legalActions(s).filter(a=>a.kind==='choose'&&!['done','cancel'].includes(a.value)).map(a=>a.value);
const pick=(s,id)=>doAction(s,e.legalActions(s).find(a=>a.kind==='choose'&&a.value===id));
// A：メイン・準備枠にボンバー（＋ほかの札）。B：メイン・準備枠に伏せ札。A のターンを終えて、B のターン開始時の誘発まで進める。
function setup(version,{own='trap',opp=1,extra=false}={}){const s0=fixture(version);const mainA=field(s0,'A','M-dog-03');field(s0,'B','M-dog-01');const bomb=trap(s0,'A',BOMB);
 const ownTarget=own==='trap'?trap(s0,'A','G-real-fishing'):own==='equip'?equip(s0,'A','I-bowtie',mainA):null;if(extra)trap(s0,'A','G-real-fishing');const oppTargets=Array.from({length:opp},()=>trap(s0,'B','G-real-fishing'));
 let s=s0,g=0;while(!bombTriggers(s,bomb).length&&!(s.turn==='B'&&s.phase==='normal')){assert.ok(g++<40,'reach B start');const acts=e.legalActions(s);
  const a=acts.find(x=>x.kind==='end')??acts.find(x=>x.kind==='pass')??acts.find(x=>x.kind==='skip'&&x.source!==bomb)??acts.find(x=>x.kind==='choose'&&x.value!=='cancel')??acts[0];s=doAction(s,a);}
 return {s,bomb,ownTarget,oppTargets};}
function settle(s){let g=0;while(s.phase!=='normal'||s.choice){assert.ok(g++<80,'settle loop');if(s.phase==='finished')return s;const acts=e.legalActions(s);const a=acts.find(x=>x.kind==='skip')??acts.find(x=>x.kind==='pass')??acts.find(x=>x.kind==='choose'&&x.value!=='cancel')??acts[0];s=e.act(s,e.actor(s),s.revision,a.id);}return s;}
function endTurn(s){let g=0;const turn=s.turn;while(s.turn===turn&&s.phase!=='finished'){assert.ok(g++<80,'end turn');const acts=e.legalActions(s);const a=acts.find(x=>x.kind==='end')??acts.find(x=>x.kind==='pass')??acts.find(x=>x.kind==='skip')??acts.find(x=>x.kind==='choose'&&x.value!=='cancel')??acts[0];s=e.act(s,e.actor(s),s.revision,a.id);}return s;}

test('正式本文・時2・しかけるは不変',()=>{const c=CATALOG[BOMB];assert.equal(c.text,TEXT);assert.deepEqual([c.cost,c.type,c.method],[2,'play','しかける']);});
test('相手のターン開始時に誘発し、自分側の対象の候補にボンバー自身は出ない（ほかの準備枠の札は出る）',()=>{
 let {s,bomb,ownTarget}=setup();assert.equal(s.turn,'B');const t=bombTriggers(s,bomb);assert.equal(t.length,1);s=doAction(s,t[0]);
 assert.equal(s.choice?.kind,'activation_selection');assert.ok(!options(s).includes(bomb),'自分自身は候補に出ない');assert.deepEqual(options(s),[ownTarget]);
});
test('自分側は伏せ札・装備のどちらも選べ、複数あればすべて選べる',()=>{
 let {s,bomb,ownTarget}=setup(undefined,{own:'equip',extra:true});const fish=s.players.A.board.prepared.map(x=>x.id).find(id=>![bomb,ownTarget].includes(id));assert.ok(fish);
 s=doAction(s,bombTriggers(s,bomb)[0]);assert.deepEqual(options(s).sort(),[ownTarget,fish].sort());
});
test('相手側の対象は従来どおり相手の準備枠のすべての札',()=>{
 let {s,bomb,ownTarget,oppTargets}=setup(undefined,{opp:2});s=pick(doAction(s,bombTriggers(s,bomb)[0]),ownTarget);assert.deepEqual(options(s).sort(),[...oppTargets].sort());
});
test('自分の準備枠がボンバーだけなら対象がなく、発動できない（見送りだけ）。ボンバーは準備枠に残る',()=>{
 let {s,bomb}=setup(undefined,{own:null});assert.equal(bombTriggers(s,bomb).length,0);
 s=settle(s);assert.ok(s.players.A.board.prepared.some(x=>x.id===bomb),'ボンバーは準備枠に残る');
});
test('相手の準備枠が空なら発動できない（従来どおり）',()=>{let {s,bomb}=setup(undefined,{opp:0});assert.equal(bombTriggers(s,bomb).length,0);});
test('解決：ボンバーは準備枠を離れ、そのターン終了時に両方の対象が捨て札へ',()=>{
 let {s,bomb,ownTarget,oppTargets:[opp]}=setup();s=pick(pick(doAction(s,bombTriggers(s,bomb)[0]),ownTarget),opp);s=settle(s);
 assert.ok(!s.players.A.board.prepared.some(x=>x.id===bomb),'ボンバーは準備枠を離れる');assert.ok(s.players.A.discard.includes(bomb));
 assert.ok(s.players.A.board.prepared.some(x=>x.id===ownTarget)&&s.players.B.board.prepared.some(x=>x.id===opp),'終了時まで残る');
 s=endTurn(s);assert.ok(s.players.A.discard.includes(ownTarget),'自分側の対象は捨て札へ');assert.ok(s.players.B.discard.includes(opp),'相手側の対象は捨て札へ');
});
test('共通の選択（zone ownPrepared、絞り込みなし）はこれまでどおり発動元も含む。excludeSource のときだけ除く',()=>{
 const {s,bomb,ownTarget}=setup();const ctx={source:bomb};
 assert.deepEqual(selections.candidates(s,'A',{zone:'ownPrepared',count:1},ctx).sort(),[bomb,ownTarget].sort());
 assert.deepEqual(selections.candidates(s,'A',{zone:'ownPrepared',count:1,filter:{excludeSource:true}},ctx),[ownTarget]);
});

// --- 保存の版 ---
const NEW_VERSIONS=e.RULE_VERSIONS.slice(e.RULE_VERSIONS.indexOf('hotseat-7'));
test('新規対戦は最新の版（hotseat-7 以降）。旧版 hotseat-2〜6 を指定した対戦では、旧挙動（自分自身も選べる）のまま',()=>{
 assert.equal(e.VERSION,e.RULE_VERSIONS.at(-1));assert.deepEqual([...e.RULE_VERSIONS].slice(0,6),[...OLD_VERSIONS,'hotseat-7']);assert.equal(e.createGame(1).version,e.VERSION);
 for(const version of NEW_VERSIONS){let {s,bomb,ownTarget}=setup(version);s=doAction(s,bombTriggers(s,bomb)[0]);assert.deepEqual(options(s),[ownTarget],version);}
 for(const version of OLD_VERSIONS){let {s,bomb,ownTarget}=setup(version);s=doAction(s,bombTriggers(s,bomb)[0]);assert.deepEqual(options(s).sort(),[bomb,ownTarget].sort(),version);}
});
const saves=JSON.parse(readFileSync(new URL('./bomber-hotseat6-saves.json',import.meta.url)));
const digest=s=>createHash('sha256').update(JSON.stringify({players:s.players,result:s.result,log:s.log})).digest('hex');
test('旧保存（hotseat-6、修正前エンジンで作成、ボンバー自身を対象にした操作を含む）は旧挙動のまま完全に再生される',()=>{
 assert.ok(saves.rows.length>=2&&saves.rows.some(r=>r.selfTargeted));
 for(const r of saves.rows){const s=e.restore(JSON.stringify(r.save));assert.equal(s.version,'hotseat-6',r.case);assert.equal(s.revision,r.finalRevision,r.case);
  assert.deepEqual(s.result,r.result,r.case);assert.equal(digest(s),r.stateSha256,r.case);assert.equal(e.save(s),JSON.stringify(r.save),r.case);
  assert.equal(restoreMatch(JSON.stringify(r.save)).save(),JSON.stringify(r.save),r.case+'：CPU・記録の読込経路');
  const used=s.history.filter(x=>x.kind==='activation'&&x.sourceCardId===BOMB);assert.equal(used.some(x=>x.targets?.includes(x.source)),r.selfTargeted,r.case);}
});
test('自分自身を対象にした旧保存を新しい版（hotseat-7 以降）として読ませると拒否される（無条件に変換しない）',()=>{
 for(const r of saves.rows.filter(r=>r.selfTargeted))for(const version of NEW_VERSIONS)assert.throws(()=>e.restore(JSON.stringify({...r.save,version})),r.case+' '+version);
 assert.throws(()=>e.restore(JSON.stringify({...saves.rows[0].save,version:'hotseat-99'})),/保存形式が異なります/);
});
test('旧保存の途中（ボンバーの誘発の直前）から復帰して続けても同じ結果',()=>{
 for(const r of saves.rows){let s=e.restore(JSON.stringify({...r.save,commands:r.save.commands.slice(0,r.triggerRevision)}));
  for(const id of r.save.commands.slice(r.triggerRevision))s=e.act(s,e.actor(s),s.revision,id);assert.equal(digest(s),r.stateSha256,r.case);}
});
test('すべての版で、ボンバー・たこやき・かえるの誘発はちょうど1つずつ有効（版を足した時の定義漏れを防ぐ）',()=>{
 for(const id of [BOMB,'G-takoyaki-grill','G-frogger-road']){const triggers=RULES[id].triggers;
  for(const version of e.RULE_VERSIONS)assert.equal(triggers.filter(t=>!t.onlyVersions||t.onlyVersions.includes(version)).length,1,id+' '+version);}
});

// --- CPU ---
const x=spec=>Object.entries(spec).flatMap(([id,n])=>Array(n).fill(id));
const DECK=x({[BOMB]:3,'G-real-fishing':3,'I-bowtie':3,'W-snow':3,'W-countryside':3,'M-dog-01':3,'M-dog-02':3,'M-dog-03':3,'M-dog-04':3,'M-dog-05':2,'M-beetle-01':3,'C-panda':3,'C-shiba':2,'I-c_coin2':3});
test('CPU（初級・中級）は新しい版でボンバー自身を対象にせず、対戦は最後まで進み、保存→復帰も一致',()=>{
 let used=0;for(const difficulty of ['beginner','intermediate'])for(const seed of [1,2,7]){let s=e.createGame(seed,{A:DECK,B:DECK});let g=0;
  while(s.phase!=='finished'&&g++<6000){const a=e.actor(s),o=observeCpu(s,a),d=chooseCpuAction(o,{difficulty,seed:seed+(a==='A'?1:2),step:s.revision});
   if(s.choice?.kind==='activation_selection'&&s.cards[s.activationDraft.action.source]?.cardId===BOMB){const act=e.legalActions(s)[o.actions.findIndex(q=>q.id===d.id)];assert.notEqual(act?.value,s.activationDraft.action.source,'自分自身を対象にしない');}
   s=e.act(s,a,s.revision,d.id);}
  used+=s.history.filter(r=>r.kind==='activation'&&r.sourceCardId===BOMB).length;assert.ok(!s.history.some(r=>r.kind==='activation'&&r.sourceCardId===BOMB&&r.targets?.includes(r.source)));
  assert.equal(s.phase,'finished');assert.equal(digest(e.restore(e.save(s))),digest(s));}
 assert.ok(used>0,'CPUがボンバーを使う場面がある');
});
