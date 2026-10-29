// 旧保存 hotseat-1 の「続きから」復帰と、戦績（#411）への接続。
// hotseat-1 の保存は {version, seed, commands} だけで、デッキ情報も対戦履歴（history）も持たない。
import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
import * as e from '../engine.mjs';import * as legacy from '../legacy-engine.mjs';
import {CpuSession} from '../cpu-session.mjs';import {chooseCpuAction} from '../cpu-policy.mjs';
import {newMetadata,encodeMatch,decodeMatch} from '../records-match.mjs';
import {buildRecord,RecordsStore,summarize,RECORDS_KEY} from '../records.mjs';

const h1=JSON.parse(readFileSync(new URL('./hotseat1-saves.json',import.meta.url)));
const h2=JSON.parse(readFileSync(new URL('./lover-fix-hotseat2-saves.json',import.meta.url))).rows;
const raw1=x=>JSON.stringify(x.save);
class Mem{constructor(){this.m=new Map();}getItem(k){return this.m.has(k)?this.m.get(k):null;}setItem(k,v){this.m.set(k,String(v));}removeItem(k){this.m.delete(k);}}
// app.mjs と同じ保存・記録の流れ（saveMatch / recordFinished）
const saveMatch=(session,meta)=>meta?encodeMatch(session.save(),meta):session.save();
function recordFinished(store,session,meta,seen){if(!session.finished||!meta||seen.has(meta.id))return false;seen.add(meta.id);const r=buildRecord(e.restore(session.engineSave??session.save()),meta,Date.now());if(r)store.add(r);return !!r;}

test('hotseat-1 途中保存：続きから復帰でき、操作列・seed は変わらない',()=>{
 const {session,metadata}=decodeMatch(raw1(h1.mid));
 assert.equal(metadata,null,'デッキ情報も対戦履歴もないので戦績の対象外');
 assert.equal(session.finished,false);assert.equal(session.save(),raw1(h1.mid));
 const s=legacy.restore(session.save());assert.equal(s.revision,h1.mid.revision);assert.equal(s.round,h1.mid.round);
});

test('hotseat-1 途中保存：復帰後に合法な操作ができ、再保存・再復帰できる',()=>{
 const {session}=decodeMatch(raw1(h1.mid));session.viewer=session.actor;
 const v=session.projection;assert.ok(v.actions.length>0,'画面に合法な操作が出る');const seat=session.actor;
 session.commit(v.actions[0].id,v.revision,seat);
 const again=decodeMatch(saveMatch(session,null));assert.equal(again.metadata,null);
 assert.equal(JSON.parse(again.session.save()).commands.length,h1.mid.revision+1);assert.equal(JSON.parse(again.session.save()).version,'hotseat-1');
});

test('hotseat-1 決着済み保存：復帰でき、戦績には記録しない（二重計上もしない）',()=>{
 const {session,metadata}=decodeMatch(raw1(h1.finished));assert.equal(session.finished,true);assert.equal(metadata,null);
 const store=new RecordsStore(new Mem()),seen=new Set();
 assert.equal(recordFinished(store,session,metadata,seen),false);assert.equal(recordFinished(store,decodeMatch(raw1(h1.finished)).session,null,seen),false);
 assert.equal(store.records.length,0);assert.equal(decodeMatch(saveMatch(session,metadata)).session.save(),raw1(h1.finished));
});

test('hotseat-1 の破損・改変は拒否する',()=>{
 const bad=[
  {...h1.mid.save,commands:[...h1.mid.save.commands.slice(0,-1),'{"kind":"forged"}']},
  {...h1.mid.save,seed:-1},
  {...h1.mid.save,decks:{A:e.DEFAULT_DECK,B:e.DEFAULT_DECK}},
  {...h1.mid.save,recordsMeta:newMetadata({mode:'hotseat',decks:{A:{id:null,name:'A',cards:[...e.DEFAULT_DECK]},B:{id:null,name:'B',cards:[...e.DEFAULT_DECK]}}})},
  {version:'cpu-match-1',policy:'heuristic-1',humanSeat:'A',difficulty:'beginner',policySeed:1,step:0,guard:{turn:null,count:0,seen:{}},diagnostic:null,game:h1.mid.save},
 ];
 const expect=[/今は選べない行動です/,/開始seedが不正です/,/保存形式が異なります/,/戦績情報と対戦が一致しません/,/2人対戦だけです/];
 bad.forEach((x,i)=>assert.throws(()=>decodeMatch(JSON.stringify(x)),expect[i],JSON.stringify(Object.keys(x))));
 assert.throws(()=>decodeMatch(JSON.stringify({...h1.mid.save,recordsMeta:null})),/戦績情報と対戦が一致しません/);
});

test('hotseat-2：途中・決着済みとも従来どおり（デッキ不明の旧セーブとして戦績に接続）',()=>{
 for(const r of h2){for(const save of [r.save,{...r.save,commands:r.save.commands.slice(0,r.triggerRevision-5)}]){
  const {session,metadata}=decodeMatch(JSON.stringify(save));assert.equal(JSON.parse(session.save()).version,'hotseat-2');
  assert.equal(metadata.decks.A.id,null);assert.match(metadata.decks.A.name,/旧セーブ・デッキ不明/);assert.deepEqual(metadata.decks.B.cards,save.decks.B);
  assert.equal(decodeMatch(JSON.stringify(save)).metadata.id,metadata.id,'同じ旧セーブは同じIDになる');}}
});

function playHotseat(seed,limit,version=e.VERSION){let s=e.createGame(seed,undefined,version);for(let i=0;i<limit&&s.phase!=='finished';i++){const a=e.legalActions(s);s=e.act(s,e.actor(s),s.revision,(a.find(x=>x.kind!=='pass')??a[0]).id);}return s;}
test('hotseat-3・現行版：途中・決着済みとも保存と戦績が従来どおり、A/B 席別に集計し、二重計上しない',()=>{
 for(const version of [...new Set(['hotseat-3',e.VERSION])]){
 const decks={A:{id:'deck-a',name:'Aデッキ',cards:[...e.DEFAULT_DECK]},B:{id:'deck-b',name:'Bデッキ',cards:[...e.DEFAULT_DECK]}};
 const mid=playHotseat(31,30,version),meta=newMetadata({mode:'hotseat',decks});const r1=decodeMatch(encodeMatch(e.save(mid),meta));assert.equal(r1.metadata.id,meta.id);assert.equal(r1.session.finished,false);
 let fin=e.createGame(32,undefined,version);for(let i=0;i<5000&&fin.phase!=='finished';i++){const a=e.legalActions(fin);fin=e.act(fin,e.actor(fin),fin.revision,a[Math.floor(i*7919%a.length)].id);}
 assert.equal(fin.phase,'finished');const m2=newMetadata({mode:'hotseat',decks});const r2=decodeMatch(encodeMatch(e.save(fin),m2));assert.equal(JSON.parse(r2.session.save()).version,version);assert.equal(JSON.parse(r1.session.save()).version,version);
 const store=new RecordsStore(new Mem()),seen=new Set();assert.equal(recordFinished(store,r2.session,r2.metadata,seen),true);
 assert.equal(recordFinished(store,r2.session,r2.metadata,seen),false);store.add(buildRecord(e.restore(r2.session.save()),r2.metadata,Date.now()));
 assert.equal(store.records.length,1,'同じ対戦IDは1件');
 const sum=summarize(store.records,{scope:'hotseat-A'}),w=fin.result.winner;assert.equal(sum.hotseat.total,1);
 assert.equal(sum.hotseat.A.wins,w==='A'?1:0);assert.equal(sum.hotseat.B.wins,w==='B'?1:0);assert.equal(sum.hotseat.A.total,1);assert.equal(sum.hotseat.B.total,1);assert.equal(sum.cpu.total,0);
}
});

test('CPU 初級・中級：保存・復帰で設定と戦績情報を保つ',()=>{
 for(const difficulty of ['beginner','intermediate']){const s=new CpuSession({humanSeat:'B',difficulty,policySeed:5});s.start(e.createGame(77));
  for(let i=0;i<40&&!s.finished;i++){if(s.cpuPending)s.stepCpu(s.projection.revision);else{const o=s.decisionInput(),a=chooseCpuAction(o,{seed:3,step:o.revision});s.commit(a.id,o.revision,o.seat);}}
  const meta=newMetadata({mode:'cpu',human:'B',difficulty,decks:{A:{id:null,name:'CPU',cards:[...e.DEFAULT_DECK]},B:{id:'mine',name:'わたし',cards:[...e.DEFAULT_DECK]}}});
  const r=decodeMatch(encodeMatch(s.save(),meta));assert.equal(r.session.mode,'cpu');assert.equal(r.session.difficulty,difficulty);assert.equal(r.metadata.id,meta.id);assert.equal(r.session.save(),s.save());}
});

test('戦績の台帳（書き出し・読み込み・バックアップ）は hotseat-1 の復帰で変わらない',()=>{
 const mem=new Mem(),store=new RecordsStore(mem);const fin=playHotseat(33,1);
 let s=e.createGame(34);for(let i=0;i<5000&&s.phase!=='finished';i++){const a=e.legalActions(s);s=e.act(s,e.actor(s),s.revision,a[Math.floor(i*104729%a.length)].id);}
 store.add(buildRecord(s,newMetadata({mode:'hotseat',decks:{A:{id:null,name:'A',cards:[...e.DEFAULT_DECK]},B:{id:null,name:'B',cards:[...e.DEFAULT_DECK]}}}),Date.now()));
 const before=mem.getItem(RECORDS_KEY),exported=store.exportJSON();
 decodeMatch(raw1(h1.finished));decodeMatch(raw1(h1.mid));
 assert.equal(mem.getItem(RECORDS_KEY),before);const other=new RecordsStore(new Mem());other.importJSON(exported);assert.equal(other.records.length,1);assert.ok(fin);
});

test('hotseat-1 の表示：現行のカード面に必要な属性・姿だけを補い、ルール・本文・状態は変えない',()=>{
 const s=legacy.restore(raw1(h1.mid)),before=JSON.stringify(s),v=e.view(s,'A'),raw=legacy.view(s,'A');
 const diff=[];const cmp=(a,b,p)=>{if(a&&typeof a==='object'){for(const k of new Set([...Object.keys(a),...Object.keys(b??{})]))cmp(a[k],b?.[k],p+'.'+k);}else if(a!==b)diff.push(p);};cmp(v,raw,'');
 assert.ok(diff.length>0);assert.ok(diff.every(p=>/\.(attribute|form)$/.test(p)),diff.join());
 assert.equal(JSON.stringify(s),before,'状態は変えない');assert.equal(JSON.stringify(legacy.view(s,'A')),JSON.stringify(raw));
 const main=v.players.A.board.main;assert.ok(main.attribute);assert.equal(main.text,raw.players.A.board.main.text,'旧ルールの本文のまま');
});
