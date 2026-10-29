// かえるのおうちがえり（G-frogger-road）：発動中のかえる自身は対象にできない（正式裁定 81 接続「自身は発動領域へ移るので対象にできない」）。
// ほかの準備枠の札は従来どおり対象にでき、旧保存（hotseat-2〜5）は旧挙動のまま再生する。
import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import {createHash} from 'node:crypto';
import * as e from '../engine.mjs';import * as fx from '../effects.mjs';
import {CATALOG} from '../full-catalog.mjs';import {RULES} from '../rules.mjs';
import {observeCpu} from '../cpu-observation.mjs';import {chooseCpuAction} from '../cpu-policy.mjs';
import {restoreMatch} from '../cpu-session.mjs';

const FROG='G-frogger-road';
const TEXT='自分が通常のセカイ変更を行った時に発動できる。自分の準備枠のカード1枚を対象とする。このターン、そのカードは相手のカード効果では手札にも捨て札にも移らない。';
const OLD_VERSIONS=['hotseat-2','hotseat-3','hotseat-4','hotseat-5'];
function fixture(version){const s=version?e.createGame(71,undefined,version):e.createGame(71);s.choice=null;s.pending=[];s.phase='normal';s.window='normal';s.players.A.time=10;s.players.B.time=10;return s;}
function take(s,a,c){const x=s.players[a].deck.shift();s.cards[x].cardId=c;return x;}
function field(s,a,c,slot='main'){const id=take(s,a,c);s.cards[id].generation++;s.players[a].board[slot]=id;return id;}
function trap(s,a,c){const id=take(s,a,c);s.players[a].board.prepared.push({id,faceDown:true,setSerial:0});return id;}
function equip(s,a,c,target){const id=take(s,a,c);s.players[a].board.prepared.push({id,target,targetGeneration:s.cards[target].generation,attachedAt:0});return id;}
function hand(s,a,c){const id=take(s,a,c);s.players[a].hand.push(id);return id;}
const find=(s,p)=>e.legalActions(s).find(p);
const doAction=(s,a)=>{assert.ok(a,'action not legal');return e.act(s,e.actor(s),s.revision,a.id);};
const frogTriggers=(s,frog)=>e.legalActions(s).filter(a=>a.kind==='trigger'&&a.source===frog);
function settle(s,pick=()=>null){let g=0;while(s.phase!=='normal'||s.choice){assert.ok(g++<80,'settle loop');if(s.phase==='finished')return s;const acts=e.legalActions(s);const a=pick(s,acts)??acts.find(x=>x.kind==='skip')??acts.find(x=>x.kind==='pass')??acts.find(x=>x.kind==='choose'&&x.value!=='cancel')??acts[0];s=e.act(s,e.actor(s),s.revision,a.id);}return s;}
// A：メイン・セカイ（ゆきぐに）・準備枠にかえる、手札にいなか。セカイを通常の方法で変更して誘発させる。
function setup(version,{other='trap'}={}){const s=fixture(version);const main=field(s,'A','M-dog-03');field(s,'B','M-dog-01');field(s,'A','W-snow','world');const frog=trap(s,'A',FROG);
 const target=other==='trap'?trap(s,'A','G-real-fishing'):other==='equip'?equip(s,'A','I-bowtie',main):null;const w2=hand(s,'A','W-countryside');return {s,frog,target,w2};}
const changeWorld=(s,w2)=>doAction(s,find(s,a=>a.source===w2&&a.kind==='place'));

test('正式本文・時1・しかけるは不変',()=>{const c=CATALOG[FROG];assert.equal(c.text,TEXT);assert.deepEqual([c.cost,c.type,c.method],[1,'play','しかける']);});
test('通常のセカイ変更での誘発で、かえる自身は対象の候補に出ない（ほかの準備枠の札は出る）',()=>{
 let {s,frog,target,w2}=setup();s=changeWorld(s,w2);assert.equal(s.phase,'trigger');
 const rows=frogTriggers(s,frog);assert.ok(rows.every(a=>a.target!==frog),'自分自身は候補に出ない');assert.deepEqual(rows.map(a=>a.target),[target]);
});
test('伏せ札・装備のどちらも選べ、複数あればすべて選べる',()=>{
 let {s,frog,target,w2}=setup(undefined,{other:'equip'});const fish=trap(s,'A','G-real-fishing');s=changeWorld(s,w2);
 assert.deepEqual(frogTriggers(s,frog).map(a=>a.target).sort(),[target,fish].sort());
});
test('準備枠がかえるだけなら対象がなく、発動できない（見送りだけ）',()=>{
 let {s,frog,w2}=setup(undefined,{other:null});s=changeWorld(s,w2);assert.equal(frogTriggers(s,frog).length,0);
 s=settle(s);assert.ok(s.players.A.board.prepared.some(x=>x.id===frog),'かえるは準備枠に残る');
});
test('ほかの札を対象にした時：かえるは準備枠を離れ、このターン対象は相手の効果で手札に戻らない',()=>{
 let {s,frog,target,w2}=setup();s=changeWorld(s,w2);s=settle(doAction(s,frogTriggers(s,frog).find(a=>a.target===target)));
 assert.ok(!s.players.A.board.prepared.some(x=>x.id===frog),'かえるは準備枠を離れる');
 const prot=s.effects.find(x=>x.kind==='protection'&&x.target===target);assert.ok(prot,'対象への保護');
 // 相手（B）の応答でタンクバトル（相手のしかけてあるカード1枚を手札に戻す）を、同じターン中に使わせる
 const tank=hand(s,'B','G-tank-battle');const coin=hand(s,'A','I-c_coin2');s=doAction(s,find(s,a=>a.source===coin));s=doAction(s,find(s,a=>a.kind==='pass'));
 assert.equal(e.actor(s),'B');const t=find(s,a=>a.source===tank&&a.target===target);assert.ok(t,'相手は対象を狙える');s=settle(doAction(s,t));
 assert.ok(s.players.A.board.prepared.some(x=>x.id===target),'保護で準備枠に残る');assert.ok(!s.players.A.hand.includes(target));
});
test('対象は発動時に確定し、連鎖に同じ対象で載る',()=>{
 let {s,frog,target,w2}=setup();s=changeWorld(s,w2);s=doAction(s,frogTriggers(s,frog).find(a=>a.target===target));
 assert.equal(s.chain.at(-1)?.target,target);
});
test('共通の対象種別 ownPrepared（ほかのカードが使う）は変わらず、準備枠のすべての札を返す',()=>{
 const {s,frog,target}=setup();assert.deepEqual(fx.targets(s,'A','ownPrepared',frog).sort(),[frog,target].sort());
});
test('たこやきやさんの修正（自分自身を対象にできない）はそのまま',()=>{
 const s=fixture();const tako=trap(s,'A','G-takoyaki-grill'),fish=trap(s,'A','G-real-fishing');assert.deepEqual(fx.targets(s,'A','ownPreparedOther',tako),[fish]);
});

// --- 保存の版 ---
const NEW_VERSIONS=e.RULE_VERSIONS.slice(e.RULE_VERSIONS.indexOf('hotseat-6'));
test('新規対戦は最新の版（hotseat-6 以降）。旧版 hotseat-2〜5 を指定した対戦では、旧挙動（自分自身も選べる）のまま',()=>{
 assert.equal(e.VERSION,e.RULE_VERSIONS.at(-1));assert.deepEqual([...e.RULE_VERSIONS].slice(0,5),[...OLD_VERSIONS,'hotseat-6']);assert.equal(e.createGame(1).version,e.VERSION);
 for(const version of NEW_VERSIONS){let {s,frog,target,w2}=setup(version);s=changeWorld(s,w2);assert.deepEqual(frogTriggers(s,frog).map(a=>a.target),[target],version);}
 for(const version of OLD_VERSIONS){let {s,frog,target,w2}=setup(version);s=changeWorld(s,w2);assert.deepEqual(frogTriggers(s,frog).map(a=>a.target).sort(),[frog,target].sort(),version);}
});
const saves=JSON.parse(readFileSync(new URL('./frogger-hotseat5-saves.json',import.meta.url)));
const digest=s=>createHash('sha256').update(JSON.stringify({players:s.players,result:s.result,log:s.log})).digest('hex');
test('旧保存（hotseat-5、修正前エンジンで作成、かえる自身を対象にした操作を含む）は旧挙動のまま完全に再生される',()=>{
 assert.ok(saves.rows.length>=2);
 for(const r of saves.rows){const s=e.restore(JSON.stringify(r.save));assert.equal(s.version,'hotseat-5',r.case);assert.equal(s.revision,r.finalRevision,r.case);
  assert.deepEqual(s.result,r.result,r.case);assert.equal(digest(s),r.stateSha256,r.case);assert.equal(e.save(s),JSON.stringify(r.save),r.case);
  assert.equal(restoreMatch(JSON.stringify(r.save)).save(),JSON.stringify(r.save),r.case+'：CPU・記録の読込経路');}
});
test('自分自身を対象にした旧保存を新しい版（hotseat-6）として読ませると拒否される（無条件に変換しない）。存在しない版も拒否',()=>{
 for(const r of saves.rows.filter(r=>r.selfTargeted))for(const version of NEW_VERSIONS)assert.throws(()=>e.restore(JSON.stringify({...r.save,version})),r.case+' '+version);
 assert.throws(()=>e.createGame(1,undefined,'hotseat-99'),/対戦の版が不正です/);assert.throws(()=>e.restore(JSON.stringify({...saves.rows[0].save,version:'hotseat-99'})),/保存形式が異なります/);
});
test('旧保存の途中（かえるの誘発の直前）から復帰して続けても同じ結果',()=>{
 for(const r of saves.rows){let s=e.restore(JSON.stringify({...r.save,commands:r.save.commands.slice(0,r.triggerRevision)}));
  for(const id of r.save.commands.slice(r.triggerRevision))s=e.act(s,e.actor(s),s.revision,id);assert.equal(digest(s),r.stateSha256,r.case);}
});

test('すべての版で、たこやき・かえるの誘発はちょうど1つずつ有効（版を足した時の定義漏れを防ぐ）',()=>{
 for(const id of ['G-takoyaki-grill',FROG]){const triggers=RULES[id].triggers;
  for(const version of e.RULE_VERSIONS)assert.equal(triggers.filter(t=>!t.onlyVersions||t.onlyVersions.includes(version)).length,1,id+' '+version);}
});

// --- CPU ---
const x=spec=>Object.entries(spec).flatMap(([id,n])=>Array(n).fill(id));
const DECK=x({[FROG]:3,'G-real-fishing':3,'I-bowtie':3,'W-snow':3,'W-countryside':3,'M-dog-01':3,'M-dog-02':3,'M-dog-03':3,'M-dog-04':3,'M-dog-05':2,'M-beetle-01':3,'C-panda':3,'C-shiba':2,'I-c_coin2':3});
test('CPU（初級・中級）は新しい版でかえる自身を対象にせず、対戦は最後まで進み、保存→復帰も一致',()=>{
 let used=0;for(const difficulty of ['beginner','intermediate'])for(const seed of [1,2]){let s=e.createGame(seed,{A:DECK,B:DECK});let g=0;
  while(s.phase!=='finished'&&g++<5000){const a=e.actor(s),o=observeCpu(s,a),d=chooseCpuAction(o,{difficulty,seed:seed+(a==='A'?1:2),step:s.revision});const act=e.legalActions(s)[o.actions.findIndex(q=>q.id===d.id)];
   if(act?.kind==='trigger'&&s.cards[act.source]?.cardId===FROG){used++;assert.notEqual(act.target,act.source,'自分自身を対象にしない');}s=e.act(s,a,s.revision,d.id);}
  assert.equal(s.phase,'finished');assert.equal(digest(e.restore(e.save(s))),digest(s));}
 assert.ok(used>0,'CPUがかえるを使う場面がある');
});
