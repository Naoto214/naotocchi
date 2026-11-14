// VERSION 7 checks of the integration candidate (build-main/I7, integration/build-candidate.mjs) and records version 2.
// Run: node integration/build-candidate.mjs && node --test integration/test-candidate.mjs
// Read only: the official modules of main are imported as they are; nothing official is written.
import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import {createHash} from 'node:crypto';
import {fileURLToPath,pathToFileURL} from 'node:url';import {dirname,join} from 'node:path';
import * as off from '../../engine.mjs';import {CATALOG as OFF_CATALOG} from '../../full-catalog.mjs';import {CPU_DECKS,CPU_DECK_IDS} from '../../cpu-decks.mjs';
import * as offRecords from '../../records.mjs';
import {observeCpu as offObserve} from '../../cpu-observation.mjs';import {chooseCpuAction as offChoose} from '../../cpu-policy.mjs';import {advanceResponses as offAdvance} from '../../auto-progress.mjs';
import {CANDIDATE_CARDS,CANDIDATE_IDS,ID_MAP,candidateRules,mapId} from './candidate-cards.mjs';
import {createRecords,V1_CATALOG,V1_KEY,V1_LEGACY_KEY,RECORDS_KEY} from './records-v2.mjs';
import {newRules,timeRules} from '../lib/life-patches.mjs';
import {deckForConfig} from '../lib/decks-life.mjs';
const HERE=dirname(fileURLToPath(import.meta.url)),I7=join(HERE,'..','build-main','I7'),imp=f=>import(pathToFileURL(join(I7,f)).href);
const e=await imp('engine.mjs'),{CATALOG}=await imp('full-catalog.mjs'),{RULES}=await imp('rules.mjs');
const {observeCpu}=await imp('cpu-observation.mjs'),{chooseCpuAction,POLICY_VERSION}=await imp('cpu-policy.mjs'),{advanceResponses}=await imp('auto-progress.mjs');
const sha=t=>createHash('sha256').update(t).digest('hex');
const fp=s=>sha(JSON.stringify({round:s.round,turn:s.turn,phase:s.phase,result:s.result,players:s.players,history:s.history},(k,v)=>k==='onlyVersions'?undefined:v));
const memory=(init={})=>{const m=new Map(Object.entries(init));return {getItem:k=>m.has(k)?m.get(k):null,setItem:(k,v)=>m.set(k,String(v)),removeItem:k=>m.delete(k),dump:()=>Object.fromEntries(m)};};
const R7=createRecords({CARDS:CATALOG,validateDeck:e.validateDeck,CPU_DECK_IDS}),R452=createRecords({CARDS:OFF_CATALOG,validateDeck:off.validateDeck,CPU_DECK_IDS});
const P3=id=>deckForConfig(id,'P3').cards.map(mapId);
function playCpu(s,{until=()=>false,seed=7,official=false}={}){const [E,adv,obs,ch]=official?[off,offAdvance,offObserve,offChoose]:[e,advanceResponses,observeCpu,chooseCpuAction];
 for(let k=0;s.phase!=='finished'&&k<8000&&!until(s);k++){s=adv(s).state;if(s.phase==='finished'||until(s))break;const a=E.actor(s),d=ch(obs(s,a),{difficulty:'intermediate',seed,step:k});s=E.act(s,a,s.revision,d.id);}return s;}
const rec=(id,decks,{round=10,winner='A',uses={A:[],B:[]},mode='cpu'}={})=>({id,startedAt:1000,endedAt:2000,mode,human:mode==='cpu'?'A':null,difficulty:mode==='cpu'?'intermediate':null,cpuDeck:mode==='cpu'?'partner':null,decks:{A:{id:null,name:'A',cards:decks.A},B:{id:'partner',name:'B',cards:decks.B}},winner,growth:{A:80,B:70},round,uses});
const OFFICIAL_DECK=CPU_DECKS.find(d=>d.id==='partner').cards;

test('1. 候補7枚：正式と同じデータ構造・衝突しないID・合計459枚。既存452枚は1文字も変わらない',()=>{
 assert.equal(Object.keys(CATALOG).length,459);assert.equal(CANDIDATE_IDS.length,7);
 for(const id of Object.keys(OFF_CATALOG))assert.deepEqual(CATALOG[id],OFF_CATALOG[id],id);
 for(const id of CANDIDATE_IDS){assert.ok(!Object.hasOwn(OFF_CATALOG,id),'衝突 '+id);const c=CATALOG[id],ref=OFF_CATALOG[c.type==='world'?'W-sea':'E-final-time'];
  assert.deepEqual(Object.keys(c),Object.keys(ref),'キーの並び '+id);assert.equal(c.cost,2);assert.equal(c.rare,false);assert.match(id,/^(W|E)-[a-z0-9-]+$/);assert.ok(RULES[id],'規則 '+id);assert.ok(e.supported(id));}
 assert.deepEqual(Object.keys(CATALOG).filter(id=>!Object.hasOwn(OFF_CATALOG,id)),CANDIDATE_IDS);
});
test('1b. 出典：正式と同じ形（docs/card-game の文書＃見出し、文書全体の sha256、本文は文書にそのまま）',()=>{
 const raw=fs.readFileSync(join(HERE,'481-time-reversal-cards.md')),text=raw.toString(),h=sha(raw);
 for(const id of CANDIDATE_IDS){const c=CATALOG[id],[file,anchor]=c.source.split('#');assert.equal(file,'481-time-reversal-cards.md');assert.equal(c.source_sha256,h,id);
  assert.ok(text.split('\n').some(l=>/^#{1,3} /.test(l)&&l.replace(/^#{1,3} /,'')===anchor),id);assert.ok(text.includes(c.text),id);assert.ok(!fs.existsSync(join(HERE,'..','..','..','..','docs','card-game',file)),'正式の docs にはまだ置かない');}
});
test('2. 候補の規則は、VERSION 4〜6 で検証した実験の規則と同じ（IDだけ違う）',()=>{
 const exp=(newRules()+timeRules(true)).split('\n').filter(l=>/X-N-(hayajimai|nagaiki|photo)'|X-T-/.test(l)&&l.startsWith('add(')).map(l=>Object.entries(ID_MAP).reduce((t,[a,b])=>t.split(`'${a}'`).join(`'${b}'`),l)).sort();
 const got=candidateRules().split('\n').filter(l=>l.startsWith('add(')).sort();assert.deepEqual(got,exp);
});
test('3. 公式の保存（hotseat-1・2・5・7・8 の fixtures）を、候補が main と同じに再生する',()=>{
 const saves=[];const walk=x=>{if(typeof x==='string'&&x.startsWith('{"version":"hotseat-'))saves.push(x);else if(x&&typeof x==='object'&&typeof x.version==='string'&&x.version.startsWith('hotseat-')&&Array.isArray(x.commands))saves.push(JSON.stringify(x));else if(x&&typeof x==='object')Object.values(x).forEach(walk);};
 for(const f of ['hotseat1-saves.json','doodle-jump-hotseat2-saves.json','frogger-hotseat5-saves.json','fixtures/hotseat7-saves.json'])walk(JSON.parse(fs.readFileSync(join(HERE,'..','..','tests',f),'utf8')));
 // hotseat-8: CPU games on main (the current version)
 for(const [i,d] of CPU_DECKS.entries()){let s=off.createGame(800+i,{A:d.cards,B:CPU_DECKS[(i+3)%7].cards});s=playCpu(s,{seed:i,official:true});assert.equal(s.phase,'finished');saves.push(off.save(s));}
 assert.ok(saves.length>=30,'保存の件数 '+saves.length);const versions=new Set();
 for(const raw of saves){const a=off.restore(raw),b=e.restore(raw);versions.add(a.version);assert.equal(e.save(b),off.save(a));assert.equal(fp(b),fp(a));}
 for(const v of ['hotseat-1','hotseat-2','hotseat-5','hotseat-7','hotseat-8'])assert.ok(versions.has(v),v);
});
test('4. 旧デッキ（正式7デッキ・マイデッキの正式カード）は候補でもそのまま使え、新カードのデッキは今の main では使えない（誤読しない）',()=>{
 for(const d of CPU_DECKS)assert.equal(e.validateDeck(d.cards),true);const deck=P3('partner');assert.equal(e.validateDeck(deck),true);
 assert.throws(()=>off.validateDeck(deck),/未対応カード/);
});
test('5. 保存途中の対戦（新カード入り）を再開できる：途中で保存→読み直し→続きを最後まで。旧アプリは安全に拒否',()=>{
 let s=e.createGame(4242,{A:P3('partner'),B:P3('balance')});s=playCpu(s,{until:x=>x.round>=8});assert.equal(s.round,8);
 const mid=e.save(s),back=e.restore(mid);assert.equal(fp(back),fp(s));assert.equal(e.save(back),mid);
 const done=playCpu(back,{seed:11});assert.equal(done.phase,'finished');assert.ok(done.round>=9&&done.round<=12);
 const full=e.save(done);assert.equal(e.save(e.restore(full)),full);assert.equal(fp(e.restore(full)),fp(done));
 assert.throws(()=>off.restore(full));
});
// ---- records version 2 ----
function officialV1(records){const st=memory(),store=new offRecords.RecordsStore(st);for(const r of records)store.add(r);return st.getItem(offRecords.RECORDS_KEY);}
const OLD=[rec('old-1',{A:OFFICIAL_DECK,B:OFFICIAL_DECK},{uses:{A:[['E-first-date',2]],B:[]}}),rec('old-2',{A:OFFICIAL_DECK,B:CPU_DECKS[0].cards},{mode:'hotseat',winner:null})];
test('R1・R2. 既存452枚のIDは変えず、正式の records.mjs が書いた version 1 を読める（正式の読み込みと同じ内容）',()=>{
 assert.deepEqual(V1_CATALOG,Object.keys(OFF_CATALOG).sort());const raw=officialV1(OLD);
 assert.deepEqual(R7.parse(raw).records,offRecords.parseJournal(raw));assert.deepEqual(R452.parse(raw).records,offRecords.parseJournal(raw));
});
test('R3・R4. version 2 で459枚を扱え、R9〜R12 の終了を記録できる（R13 は拒否）',()=>{
 const deck=P3('partner'),uses={A:CANDIDATE_IDS.map(id=>[id,1]),B:[]};
 const rs=[9,10,11,12].map(r=>R7.validateRecord(rec('new-'+r,{A:deck,B:OFFICIAL_DECK},{round:r,uses})));
 const raw=R7.serialize(rs),back=R7.parse(raw);assert.deepEqual(back.records,rs);assert.equal(back.held.length,0);
 assert.throws(()=>R7.validateRecord(rec('r13',{A:deck,B:OFFICIAL_DECK},{round:13})),/対戦結果/);
 assert.ok(!raw.includes('"catalog"'));
});
test('R5・R6. 旧形式からの移行：v1 は読むだけ（1文字も変えない）、最初の書き込みで v2 と v1 の控えを作る',()=>{
 const raw=officialV1(OLD),st=memory({[V1_KEY]:raw}),store=new R7.RecordsStore(st);assert.equal(store.error,null);assert.equal(store.records.length,2);
 assert.equal(st.getItem(RECORDS_KEY),null,'読んだだけでは書かない');
 store.add(R7.validateRecord(rec('new-1',{A:P3('partner'),B:OFFICIAL_DECK},{round:12})));
 assert.equal(st.getItem(V1_KEY),raw,'v1 は変えない');assert.equal(st.getItem(V1_LEGACY_KEY),raw,'v1 の控え');
 const v2=JSON.parse(st.getItem(RECORDS_KEY));assert.equal(v2.version,2);assert.equal(new R7.RecordsStore(st).records.length,3);
 // the current app keeps working on its own (unchanged) v1 data, and refuses a v2 file instead of misreading it
 assert.equal(new offRecords.RecordsStore(st).records.length,2);assert.throws(()=>offRecords.parseJournal(st.getItem(RECORDS_KEY)),/形式/);
});
test('R7. 移行を繰り返しても壊れない（何度読み直し・書き直しても同じバイト列、控えは最初の v1 のまま）',()=>{
 const raw=officialV1(OLD),st=memory({[V1_KEY]:raw});new R7.RecordsStore(st).migrate();const first=st.getItem(RECORDS_KEY);
 for(let k=0;k<5;k++){const s=new R7.RecordsStore(st);s.migrate();s.write([]);s.importJSON(raw);s.importJSON(first);}
 assert.equal(st.getItem(RECORDS_KEY),first);assert.equal(st.getItem(V1_KEY),raw);assert.equal(st.getItem(V1_LEGACY_KEY),raw);
 assert.equal(R7.serialize(R7.parse(first).records),first);
});
test('R8. 知らないカードIDは安全に扱う：その対戦は保留して統計から外し、書き直しても失わない。知る版では元に戻る',()=>{
 const withNew=R7.serialize([R7.validateRecord(rec('n1',{A:P3('partner'),B:OFFICIAL_DECK},{round:11,uses:{A:[['E-hayajimai',1]],B:[]}})),R7.validateRecord(rec('o1',{A:OFFICIAL_DECK,B:OFFICIAL_DECK}))]);
 const st=memory({[RECORDS_KEY]:withNew}),old=new R452.RecordsStore(st); // a 452-card app reads a file written by the 459-card app
 assert.equal(old.error,null);assert.deepEqual(old.records.map(r=>r.id),['o1']);assert.equal(old.held.length,1);
 old.add(R452.validateRecord(rec('o2',{A:OFFICIAL_DECK,B:OFFICIAL_DECK})));
 const after=new R7.RecordsStore(st);assert.deepEqual(after.records.map(r=>r.id).sort(),['n1','o1','o2']);assert.equal(after.held.length,0);
 assert.deepEqual(after.records.find(r=>r.id==='n1'),R7.parse(withNew).records.find(r=>r.id==='n1'));
 // unknown IDs inside a v1 file, a newer format version and broken JSON are rejected without writing anything
 const bad=JSON.parse(officialV1(OLD));bad.decks[0][2][0]=999;const st2=memory({[V1_KEY]:JSON.stringify(bad)}),s2=new R7.RecordsStore(st2);
 assert.match(s2.error,/デッキ辞書/);assert.throws(()=>s2.add(R7.validateRecord(rec('x',{A:OFFICIAL_DECK,B:OFFICIAL_DECK}))));assert.equal(st2.getItem(RECORDS_KEY),null);
 assert.throws(()=>R7.parse(JSON.stringify({format:'naotocchi-records',version:3,decks:[],rows:[]})),/版に対応していません/);
});
test('R9. 戦績の対象：新カード入りの CPU 対戦を最後まで行い、buildRecord → 保存 → 読み直し',()=>{
 let s=e.createGame(77,{A:P3('partner'),B:P3('item')});s=playCpu(s,{seed:3});assert.equal(s.phase,'finished');
 const meta={id:'m77',startedAt:1,mode:'cpu',human:'A',difficulty:'intermediate',cpuDeck:'item',decks:{A:{id:null,name:'P3',cards:s.decks.A},B:{id:'item',name:'item',cards:s.decks.B}}};
 const r=R7.buildRecord(s,meta,5);assert.equal(r.round,s.round);const back=R7.parse(R7.serialize([r])).records[0];assert.deepEqual(back,r);
 assert.equal(POLICY_VERSION,'heuristic-4-candidate');
});

// ---- VERSION 8 ----
import {CPU_DECKS_P3,P3_BASELINE} from './cpu-decks-p3.mjs';
import {check as artCheck} from './art-intake.mjs';
import {RULEBOOK_TIME_CARDS} from './candidate-cards.mjs';
import os from 'node:os';
test('V8 P3：CPU の標準構成（候補）。正式7デッキの決まった7枠だけが新カード7枚に替わり、候補のエンジンで使える。正式7デッキは不変',()=>{
 assert.equal(CPU_DECKS_P3.length,7);
 for(const d of CPU_DECKS_P3){const o=CPU_DECKS.find(x=>x.id===d.id);assert.equal(d.cards.length,40);assert.equal(e.validateDeck(d.cards),true);assert.throws(()=>off.validateDeck(d.cards));
  assert.deepEqual([...d.cards.filter(id=>CANDIDATE_IDS.includes(id))].sort(),[...CANDIDATE_IDS].sort(),d.id+'：7枚が各1');
  const diff=d.cards.map((id,i)=>id!==o.cards[i]?i:-1).filter(i=>i>=0);assert.deepEqual(diff,d.replaced.map(r=>r.index).sort((a,b)=>a-b),d.id+'：替わったのは7枠だけ');
  for(const r of d.replaced)assert.equal(o.cards[r.index],r.from);}
 assert.equal(P3_BASELINE.firstSeatScore,0.491);
});
test('V8 U9：本文は短縮版。時のカードの共通ルールはルールブックの項に1回だけ書く',()=>{
 for(const id of ['W-time-ix','W-time-x','W-time-xi','W-time-xii'])assert.match(CATALOG[id].text,/^【時のカード】終了ラウンドを(9|10|11|12)にする。$/);
 for(const id of CANDIDATE_IDS)assert.ok(CATALOG[id].text.length<=70,id);
 const rb=RULEBOOK_TIME_CARDS.join('');for(const k of ['両者共通','カウンター','最後に出された','捨て札','すべての応答','100維持','現在のラウンドより前'])assert.ok(rb.includes(k),k);
 const doc=fs.readFileSync(join(HERE,'481-time-reversal-cards.md'),'utf8');for(const t of RULEBOOK_TIME_CARDS)assert.ok(doc.includes(t));
});
test('V8 Astra：画像の受け入れ確認（既存の正式の原画で検査だけを確かめる。画像は作らない）と、画像がない間の仮表示',async()=>{
 const tmp=fs.mkdtempSync(join(os.tmpdir(),'art-intake-')),A=join(HERE,'..','..','art-pilot');
 fs.copyFileSync(join(A,'illustrations','C-bat.png'),join(tmp,'W-time-ix.png'));                       // 1536×1024 RGB
 fs.copyFileSync(join(HERE,'..','..','ui-assets','pupa-reference-approved.png'),join(tmp,'W-time-x.png'));  // 1024×1536
 fs.copyFileSync(join(A,'references','approved-attribute-sheet.png'),join(tmp,'W-time-xi.png'));         // RGBA
 const r=artCheck(tmp);fs.rmSync(tmp,{recursive:true,force:true});
 assert.equal(r['W-time-ix'].status,'ok');assert.equal(r['W-time-x'].status,'rejected');assert.match(r['W-time-x'].problems.join(),/1536×1024/);
 assert.equal(r['W-time-xi'].status,'rejected');assert.match(r['W-time-xi'].problems.join(),/透過/);assert.equal(r['E-hayajimai'].status,'placeholder');
 const {cardMarkup}=await imp('ui-presentation.mjs'),{CARD_ART}=await imp('ui-art.mjs');
 for(const id of CANDIDATE_IDS){assert.ok(!CARD_ART[id],'まだ絵の登録はない '+id);const h=cardMarkup(CATALOG[id]);assert.match(h,/art-fallback/);assert.doesNotMatch(h,/dedicated-art/);}
 assert.match(cardMarkup(CATALOG['W-sea']),/dedicated-art/);
});
