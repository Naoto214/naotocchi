// たこやきやさん（G-takoyaki-grill）：発動中のたこやき自身は対象にできない（正式裁定 87 接続・88 X06）。
// ほかの準備枠の札は従来どおり対象にでき、旧保存（hotseat-2〜4）は旧挙動のまま再生する。
import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import {createHash} from 'node:crypto';
import * as e from '../engine.mjs';import * as fx from '../effects.mjs';
import {CATALOG} from '../full-catalog.mjs';
import {observeCpu} from '../cpu-observation.mjs';import {chooseCpuAction} from '../cpu-policy.mjs';
import {restoreMatch,CpuSession} from '../cpu-session.mjs';

const TAKO='G-takoyaki-grill';
const TEXT='自分のターン終了時に発動できる。自分の準備枠のカード1枚を対象とする。次の自分ターン開始時、対象が自分の準備枠に残っているなら、1枚引き、自分のそだち+5。';
function fixture(version){const s=version?e.createGame(71,undefined,version):e.createGame(71);s.choice=null;s.pending=[];s.phase='normal';s.window='normal';s.players.A.time=10;s.players.B.time=10;return s;}
function take(s,a,c){const x=s.players[a].deck.shift();s.cards[x].cardId=c;return x;}
function field(s,a,c,slot='main'){const id=take(s,a,c);s.cards[id].generation++;s.players[a].board[slot]=id;return id;}
function trap(s,a,c){const id=take(s,a,c);s.players[a].board.prepared.push({id,faceDown:true,setSerial:0});return id;}
function equip(s,a,c,target){const id=take(s,a,c);s.players[a].board.prepared.push({id,target,targetGeneration:s.cards[target].generation,attachedAt:0});return id;}
function hand(s,a,c){const id=take(s,a,c);s.players[a].hand.push(id);return id;}
const find=(s,p)=>e.legalActions(s).find(p);
const doAction=(s,a)=>{assert.ok(a,'action not legal');return e.act(s,e.actor(s),s.revision,a.id);};
// A のターン終了を申し出て、たこやきの誘発が出るまで進める（相手の応答はパス）。
function toEndTrigger(s){s=doAction(s,find(s,a=>a.kind==='pass'));let g=0;while(!(s.phase==='trigger'&&s.pending.some(t=>s.cards[t.source]?.cardId===TAKO))&&g++<8){if(s.phase!=='response'&&s.phase!=='trigger')break;s=doAction(s,find(s,a=>a.kind==='pass')??find(s,a=>a.kind==='skip'));}return s;}
const takoTriggers=(s,tako)=>e.legalActions(s).filter(a=>a.kind==='trigger'&&a.source===tako);
function settle(s,pick=()=>null){let g=0;while(s.phase!=='normal'||s.choice){assert.ok(g++<80,'settle loop');if(s.phase==='finished')return s;const acts=e.legalActions(s);const a=pick(s,acts)??acts.find(x=>x.kind==='skip')??acts.find(x=>x.kind==='pass')??acts.find(x=>x.kind==='choose'&&x.value!=='cancel')??acts[0];s=e.act(s,e.actor(s),s.revision,a.id);}return s;}
// 次の A のターン開始まで進める（相手ターンはパスだけ、開始時の誘発は見送り）
function toNextOwnStart(s){let g=0;while(!(s.turn==='A'&&s.phase==='normal'&&!s.choice&&s.round>1)){assert.ok(g++<60,'toNextOwnStart');const acts=e.legalActions(s);s=e.act(s,e.actor(s),s.revision,(acts.find(x=>x.kind==='skip')??acts.find(x=>x.kind==='pass')??acts[0]).id);}return s;}
function setup(version,{other=true}={}){const s=fixture(version);const main=field(s,'A','M-dog-03');field(s,'B','M-dog-01');const tako=trap(s,'A',TAKO);const bow=other?equip(s,'A','I-bowtie',main):null;return {s,main,tako,bow};}

test('正式本文・時1・しかけるは不変',()=>{const c=CATALOG[TAKO];assert.equal(c.text,TEXT);assert.deepEqual([c.cost,c.type,c.method],[1,'play','しかける']);});

test('ターン終了時の誘発で、たこやき自身は対象の候補に出ない（ほかの準備枠の札は出る）',()=>{
 let {s,tako,bow}=setup();s=toEndTrigger(s);const rows=takoTriggers(s,tako);
 assert.ok(rows.length>0,'誘発は出る');assert.ok(rows.every(a=>a.target!==tako),'自分自身は候補に出ない');assert.deepEqual(rows.map(a=>a.target),[bow]);
});
test('準備枠にほかの札が複数あれば、そのすべてを選べる（伏せ札・装備とも）',()=>{
 let {s,tako,bow}=setup();const fish=trap(s,'A','G-real-fishing');s=toEndTrigger(s);
 assert.deepEqual(takoTriggers(s,tako).map(a=>a.target).sort(),[bow,fish].sort());
});
test('準備枠がたこやきだけなら対象がなく、発動できない（見送りだけ）',()=>{
 let {s,tako}=setup(undefined,{other:false});s=toEndTrigger(s);
 assert.equal(takoTriggers(s,tako).length,0,'発動の選択肢なし');
 if(s.phase==='trigger')assert.ok(e.legalActions(s).some(a=>a.kind==='skip'&&a.source===tako),'見送りはできる');
 s=settle(s);assert.ok(s.players.A.board.prepared.some(x=>x.id===tako),'たこやきは準備枠に残る');
});
test('ほかの札を対象にした時：発動でたこやきは発動領域→捨て札、次の自分のターン開始に対象が残っていれば1枚引き+5',()=>{
 let {s,tako,bow}=setup();s=toEndTrigger(s);s=settle(doAction(s,takoTriggers(s,tako).find(a=>a.target===bow)));
 assert.ok(!s.players.A.board.prepared.some(x=>x.id===tako),'たこやきは準備枠を離れる');assert.ok(s.players.A.discard.includes(tako));
 const g0=s.players.A.growth;s=toNextOwnStart(s);assert.ok(s.players.A.board.prepared.some(x=>x.id===bow));assert.equal(s.players.A.growth,g0+5);
});
test('対象が次の開始までに準備枠を離れたら（相手の効果で手札へ）、何も起きない',()=>{
 let {s,tako,bow}=setup();const fish=trap(s,'A','G-real-fishing');const tank=hand(s,'B','G-tank-battle');s=toEndTrigger(s);
 s=settle(doAction(s,takoTriggers(s,tako).find(a=>a.target===fish)));
 let g=0;while(!(s.turn==='B'&&s.phase==='normal'&&!s.choice)){assert.ok(g++<30);const acts=e.legalActions(s);s=e.act(s,e.actor(s),s.revision,(acts.find(x=>x.kind==='skip')??acts.find(x=>x.kind==='pass')??acts[0]).id);}
 s=settle(doAction(s,find(s,a=>a.source===tank&&a.target===fish)));assert.ok(s.players.A.hand.includes(fish),'対象は手札へ');
 const g0=s.players.A.growth;s=toNextOwnStart(s);assert.equal(s.players.A.growth,g0,'+5なし');
});
test('対象は発動時に確定し、発動の応答中に変わらない（応答後の解決でも同じ対象）',()=>{
 let {s,tako,bow}=setup();const fish=trap(s,'A','G-real-fishing');s=toEndTrigger(s);s=doAction(s,takoTriggers(s,tako).find(a=>a.target===fish));
 const link=s.chain.at(-1);assert.equal(link?.target,fish,'連鎖に対象つきで載る');assert.notEqual(link?.target,tako);
 s=settle(s);const sched=s.scheduled.find(x=>x.link.source===tako);assert.ok(sched,'開始時の予約');assert.equal(sched.timing,'start');assert.equal(sched.link.target,fish,'予約の対象も同じ');
});
test('共通の対象種別 ownPrepared（ほかのカードが使う）は変わらず、準備枠のすべての札を返す',()=>{
 const {s,tako,bow}=setup();assert.deepEqual(fx.targets(s,'A','ownPrepared',tako).sort(),[tako,bow].sort());
});

// --- 保存の版 ---
// hotseat-5 以降のすべての版（新規対戦は最新の版）で自分自身は対象にできない。
const NEW_VERSIONS=e.RULE_VERSIONS.slice(e.RULE_VERSIONS.indexOf('hotseat-5'));
test('新規対戦は最新の版（hotseat-5 以降）。旧版 hotseat-2〜4 を指定した対戦では、旧挙動（自分自身も選べる）のまま',()=>{
 assert.ok(NEW_VERSIONS.length>=1);assert.equal(e.VERSION,e.RULE_VERSIONS.at(-1));assert.equal(e.createGame(1).version,e.VERSION);assert.deepEqual([...e.RULE_VERSIONS].slice(0,4),['hotseat-2','hotseat-3','hotseat-4','hotseat-5']);
 for(const version of NEW_VERSIONS){let {s,tako,bow}=setup(version);s=toEndTrigger(s);assert.deepEqual(takoTriggers(s,tako).map(a=>a.target),[bow],version);}
 for(const version of ['hotseat-2','hotseat-3','hotseat-4']){let {s,tako,bow}=setup(version);s=toEndTrigger(s);
  assert.deepEqual(takoTriggers(s,tako).map(a=>a.target).sort(),[tako,bow].sort(),version);}
});
const saves=JSON.parse(readFileSync(new URL('./takoyaki-hotseat4-saves.json',import.meta.url)));
const digest=s=>createHash('sha256').update(JSON.stringify({players:s.players,result:s.result,log:s.log})).digest('hex');
test('旧保存（hotseat-4、修正前エンジンで作成、たこやき自身を対象にした操作を含む）は旧挙動のまま完全に再生される',()=>{
 assert.ok(saves.rows.length>=2);
 for(const r of saves.rows){const s=e.restore(JSON.stringify(r.save));assert.equal(s.version,'hotseat-4',r.case);assert.equal(s.revision,r.finalRevision,r.case);
  assert.deepEqual(s.result,r.result,r.case);assert.equal(digest(s),r.stateSha256,r.case);assert.equal(e.save(s),JSON.stringify(r.save),r.case);
  const m=restoreMatch(JSON.stringify(r.save));assert.equal(m.save(),JSON.stringify(r.save),r.case+'：CPU・記録の読込経路');}
});
test('自分自身を対象にした旧保存を新しい版（hotseat-5 以降）として読ませると拒否される（無条件に変換しない）',()=>{
 assert.throws(()=>e.createGame(1,undefined,'hotseat-99'),/対戦の版が不正です/);assert.throws(()=>e.restore(JSON.stringify({...saves.rows[0].save,version:'hotseat-99'})),/保存形式が異なります/);
 for(const r of saves.rows.filter(r=>r.selfTargeted))for(const version of NEW_VERSIONS)assert.throws(()=>e.restore(JSON.stringify({...r.save,version})),r.case+' '+version);
});
test('旧保存の途中（たこやき誘発の直前）から復帰して続けても同じ結果',()=>{
 for(const r of saves.rows){const pre={...r.save,commands:r.save.commands.slice(0,r.triggerRevision)};let s=e.restore(JSON.stringify(pre));
  for(const id of r.save.commands.slice(r.triggerRevision))s=e.act(s,e.actor(s),s.revision,id);assert.equal(digest(s),r.stateSha256,r.case);}
});

// --- CPU ---
const x=spec=>Object.entries(spec).flatMap(([id,n])=>Array(n).fill(id));
const DECK=x({[TAKO]:3,'G-real-fishing':3,'I-bowtie':3,'M-dog-01':3,'M-dog-02':3,'M-dog-03':3,'M-dog-04':3,'M-dog-05':2,'M-beetle-01':3,'M-beetle-02':3,'C-panda':3,'C-shiba':3,'W-snow':2,'I-c_coin2':3});
test('CPU（初級・中級）は新しい版でたこやき自身を対象にせず、対戦は最後まで進み、保存→復帰も一致',()=>{
 let used=0;for(const difficulty of ['beginner','intermediate'])for(const seed of [1,2]){let s=e.createGame(seed,{A:DECK,B:DECK});let g=0;
  while(s.phase!=='finished'&&g++<5000){const a=e.actor(s),o=observeCpu(s,a),d=chooseCpuAction(o,{difficulty,seed:seed+(a==='A'?1:2),step:s.revision});const act=e.legalActions(s)[o.actions.findIndex(q=>q.id===d.id)];
   if(act?.kind==='trigger'&&s.cards[act.source]?.cardId===TAKO){used++;assert.notEqual(act.target,act.source,'自分自身を対象にしない');}s=e.act(s,a,s.revision,d.id);}
  assert.equal(s.phase,'finished');const back=e.restore(e.save(s));assert.equal(digest(back),digest(s));}
 assert.ok(used>0,'CPUがたこやきを使う場面がある');
});
test('CPU対戦セッション（CpuSession）の保存→復帰も新しい版で一致',()=>{
 const session=new CpuSession({humanSeat:'A',policySeed:7});session.start(e.createGame(3,{A:DECK,B:DECK}));
 const raw=session.save();const back=restoreMatch(raw);assert.equal(back.save(),raw);
});
