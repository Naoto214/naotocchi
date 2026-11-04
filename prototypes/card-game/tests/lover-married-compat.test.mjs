// hotseat-8（恋人の「♥ 結婚したら」、480）の互換と回帰：旧保存（hotseat-7）は旧ルールのまま、新しい対戦だけで追加能力が働く。
// fixtures/hotseat7-saves.json は、統合前の main（3a9929ef、hotseat-7）のエンジンで記録した CPU 対戦20件（恋人18種類＋2デッキ）。
// 指紋は {round,turn,phase,result,players,history} の sha256。版の切り替え用の onlyVersions（処理には使わないメタ情報）だけを除く（#498 の compat-replay と同じ）。
import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import {createHash} from 'node:crypto';
import * as e from '../engine.mjs';
import {observeCpu} from '../cpu-observation.mjs';import {chooseCpuAction} from '../cpu-policy.mjs';import {advanceResponses} from '../auto-progress.mjs';import {CPU_DECKS} from '../cpu-decks.mjs';
import {captureResult} from '../ui-results.mjs';
import {LOVER_MARRIED,MARRIED_VERSIONS,marriedAbilitiesActive} from '../lover-married.mjs';
const F=JSON.parse(fs.readFileSync(new URL('./fixtures/hotseat7-saves.json',import.meta.url),'utf8'));
const sha=t=>createHash('sha256').update(t).digest('hex');
const fingerprint=s=>sha(JSON.stringify({round:s.round,turn:s.turn,phase:s.phase,result:s.result,players:s.players,history:s.history},(k,v)=>k==='onlyVersions'?undefined:v));

test('版：新しい対戦は hotseat-8、旧版 hotseat-2〜7 も読める。結婚の能力は hotseat-8 だけ',()=>{
 assert.equal(e.VERSION,'hotseat-8');assert.deepEqual([...MARRIED_VERSIONS],['hotseat-8']);
 for(const v of ['hotseat-2','hotseat-3','hotseat-4','hotseat-5','hotseat-6','hotseat-7'])assert.ok(e.RULE_VERSIONS.includes(v),v);
 assert.equal(marriedAbilitiesActive(e.createGame(1)),true);assert.equal(marriedAbilitiesActive(e.createGame(1,undefined,'hotseat-7')),false);
});

test('旧保存（hotseat-7、統合前の main で記録した20件）：旧ルールのまま再生され、盤面・手札・そだち・結果・記録が変わらない',()=>{
 assert.equal(F.games.length,20);
 for(const g of F.games){const s=e.restore(g.save);assert.equal(s.version,'hotseat-7',g.lover);assert.equal(e.save(s),g.save,g.lover+' 保存の文字列');
  assert.equal(fingerprint(s),g.fingerprint,g.lover+' 状態の指紋');assert.deepEqual([s.players.A.growth,s.players.B.growth],g.growth,g.lover+' そだち');
  assert.ok(!s.history.some(x=>x.marriedAbility),g.lover+' 結婚の能力の記録が混ざらない');}
});

test('旧保存の続きを指しても、結婚の能力は働かない（hotseat-7 のまま保存される）',()=>{
 const g=F.games.find(x=>x.marriages>0);const full=JSON.parse(g.save);const half={...full,commands:full.commands.slice(0,Math.floor(full.commands.length*0.6))};
 let s=e.restore(JSON.stringify(half));assert.equal(s.version,'hotseat-7');
 for(let k=0;s.phase!=='finished'&&k<4000;k++){s=advanceResponses(s).state;if(s.phase==='finished')break;const a=e.actor(s),o=observeCpu(s,a),d=chooseCpuAction(o,{difficulty:'intermediate',seed:9,step:k});s=e.act(s,a,s.revision,d.id);}
 assert.equal(s.phase,'finished');assert.equal(JSON.parse(e.save(s)).version,'hotseat-7');assert.ok(!s.history.some(x=>x.marriedAbility));
});

function play(seed,A,B,{reload=0}={}){let s=e.createGame(seed,{A,B});s=advanceResponses(s).state;
 for(let k=0;s.phase!=='finished';k++){assert.ok(k<6000,'step limit');if(reload&&k%reload===0)s=e.restore(e.save(s));const a=e.actor(s),o=observeCpu(s,a),d=chooseCpuAction(o,{difficulty:'intermediate',seed:seed+(a==='A'?0:7),step:k});s=e.act(s,a,s.revision,d.id);s=advanceResponses(s).state;}return s;}
const deck=id=>CPU_DECKS.find(d=>d.id===id).cards;

test('新しい対戦（hotseat-8）：同じ山札で、旧版では出ない結婚の能力が実際に発動し、保存→復帰で一致する',()=>{
 let fired=0;for(const seed of [11,12,13]){const s=play(seed,deck('partner'),deck('main'));assert.equal(s.version,'hotseat-8');const back=e.restore(e.save(s));assert.equal(e.save(back),e.save(s));assert.equal(fingerprint(back),fingerprint(s));
  fired+=s.history.filter(x=>x.marriedAbility).length;}
 assert.ok(fired>0,'恋人デッキ（シカ・ワシ）の結婚の能力が発動した');
});

test('先攻・後攻の対称性：同じデッキを入れ替えても、結婚の能力はどちらの席でも同じ規則で発動する',()=>{
 const used={A:0,B:0};for(const seed of [21,22,23,24]){for(const [A,B,me] of [[deck('partner'),deck('balance'),'A'],[deck('balance'),deck('partner'),'B']]){const s=play(seed,A,B);
  for(const x of s.history.filter(x=>x.marriedAbility)){assert.ok(LOVER_MARRIED[x.cardId],x.cardId);used[x.actor]++;}}}
 assert.ok(used.A>0&&used.B>0,'先攻の席でも後攻の席でも発動 '+JSON.stringify(used));
});

test('通知と処理の一致：結婚の能力が発動した結果の通知には、発動した恋人の名前が出る（記録の数と通知の数が同じ）',()=>{
 let checked=0;for(const seed of [31,32,33]){let s=e.createGame(seed,{A:deck('partner'),B:deck('main')});s=advanceResponses(s).state;
  for(let k=0;s.phase!=='finished'&&k<6000;k++){const a=e.actor(s),o=observeCpu(s,a),d=chooseCpuAction(o,{difficulty:'intermediate',seed,step:k});const before=s;s=e.act(s,a,s.revision,d.id);s=advanceResponses(s).state;
   const added=s.history.slice(before.history.length).filter(x=>x.kind==='ability'&&x.marriedAbility);if(!added.length)continue;
   const rows=captureResult(before,s).public.rows.filter(r=>r.kind==='loverMarried');assert.equal(rows.length,added.length,'通知の数');
   for(const [i,x] of added.entries())assert.match(rows[i].text,new RegExp(e.CARDS[x.cardId].name));checked+=added.length;}}
 assert.ok(checked>0);
});

test('同じ端末の2人対戦（hotseat-8）：途中で何度保存→復帰しても、最後まで同じ結果になる',()=>{
 const a=play(41,deck('partner'),deck('companion')),b=play(41,deck('partner'),deck('companion'),{reload:29});assert.equal(e.save(b),e.save(a));
});
