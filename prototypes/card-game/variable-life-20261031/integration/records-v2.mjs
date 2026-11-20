// VERSION 7: records ("戦績") version 2 — candidate for the official records.mjs (RECORDS-V2.md). Not used by the official app.
// Based on main's records.mjs (same validation, union, backup and summary rules). Differences:
//   * Storage: a NEW key `naotocchi-card-records-v2`. The v1 key and its data are never written or deleted, so the current app
//     keeps working on them and the user can always go back. The first v2 write migrates from v1 (read only) and also keeps a
//     copy of the v1 text under `naotocchi-card-records-v1-legacy` (written once, never overwritten).
//   * Format v2: deck dictionary and card uses hold card ID strings (no catalog list, no numeric indices), so adding cards
//     never invalidates a journal. Round 1–12 (R9–R12 final rounds), uses up to the catalog size.
//   * v1 files are read with the FROZEN v1 catalog (the 452 official IDs sorted; integration/records-v1-catalog.json), so they
//     stay readable after cards are added. A v1 file whose catalog differs is rejected as before.
//   * Unknown card IDs in a v2 file (e.g. written by a newer app) do not fail the whole file: those rows are held unchanged
//     (`held`), excluded from statistics, and written back byte-for-byte; once the app knows the IDs they are restored.
// Usage: const R=createRecords({CARDS,validateDeck,CPU_DECK_IDS}) — the official engine (452) or the candidate build (459).
import V1_CATALOG from './records-v1-catalog.json' with {type:'json'};
export const V1_KEY='naotocchi-card-records-v1',V1_LEGACY_KEY=V1_KEY+'-legacy',RECORDS_KEY='naotocchi-card-records-v2',BACKUP_KEY=RECORDS_KEY+'-backup';
export const MAX_RECORDS=5000,MAX_BYTES=8000000,MAX_ROUND=12;
const fail=m=>{throw Error(m);},obj=x=>x&&typeof x==='object'&&!Array.isArray(x);
const num=(x,max=Number.MAX_SAFE_INTEGER)=>Number.isSafeInteger(x)&&x>=0&&x<=max;
const str=(x,max)=>typeof x==='string'&&x.length>0&&x.length<=max;
export {V1_CATALOG};
export function createRecords({CARDS,validateDeck,CPU_DECK_IDS,v1Catalogs=[V1_CATALOG]}){
 // v1Catalogs: the v1 catalogs accepted (official app: only the frozen 452 list; the trial adds its own earlier list).
 const known=id=>Object.hasOwn(CARDS,id),size=Object.keys(CARDS).length;
 function validateMetadata(m){
  if(!obj(m)||!str(m.id,100)||!['cpu','hotseat','online'].includes(m.mode)||!(m.startedAt===null||num(m.startedAt)))fail('対戦情報が不正です');
  if(m.mode==='cpu'?(!['A','B'].includes(m.human)||!['beginner','intermediate'].includes(m.difficulty)||!(m.cpuDeck===null||CPU_DECK_IDS.includes(m.cpuDeck))):(m.human!==null||m.difficulty!==null||m.cpuDeck!==null))fail('対戦モードが不正です');
  const decks={};for(const seat of ['A','B']){const d=m.decks?.[seat];if(!obj(d)||!(d.id===null||str(d.id,80))||!str(d.name,80))fail('デッキ情報が不正です');validateDeck(d.cards);decks[seat]={id:d.id,name:d.name,cards:[...d.cards]};}
  return {id:m.id,startedAt:m.startedAt,mode:m.mode,human:m.human,difficulty:m.difficulty,cpuDeck:m.cpuDeck,decks};
 }
 function validateRecord(r){
  const m=validateMetadata(r);if(!(r.endedAt===null||num(r.endedAt))||m.startedAt!==null&&r.endedAt!==null&&r.endedAt<m.startedAt||!['A','B',null].includes(r.winner)||!num(r.round,MAX_ROUND)||r.round<1||!obj(r.growth)||!['A','B'].every(s=>num(r.growth[s],100)))fail('対戦結果が不正です');
  const uses={};for(const s of ['A','B']){const list=r.uses?.[s],seen=new Set();if(!Array.isArray(list)||list.length>size)fail('カード統計が不正です');uses[s]=list.map(pair=>{if(!Array.isArray(pair)||pair.length!==2||!known(pair[0])||!num(pair[1],10000)||!pair[1]||seen.has(pair[0]))fail('カード使用数が不正です');seen.add(pair[0]);return [...pair];}).sort((a,b)=>a[0]<b[0]?-1:a[0]>b[0]?1:0);}
  return {...m,endedAt:r.endedAt,winner:r.winner,growth:{A:r.growth.A,B:r.growth.B},round:r.round,uses};
 }
 function buildRecord(state,metadata,endedAt=Date.now()){
  if(state.phase!=='finished'||!state.result)return null;
  const m=validateMetadata(metadata);for(const s of ['A','B'])if(JSON.stringify(m.decks[s].cards)!==JSON.stringify(state.decks[s]))fail('開始時のデッキと対戦が一致しません');
  const uses={A:new Map(),B:new Map()};for(const e of state.history??[])if(e.kind==='play'&&uses[e.actor]&&known(e.cardId))uses[e.actor].set(e.cardId,(uses[e.actor].get(e.cardId)??0)+1);
  return validateRecord({...m,endedAt:m.startedAt===null?null:endedAt,winner:state.result.winner??null,growth:state.result.growth,round:state.round,uses:{A:[...uses.A],B:[...uses.B]}});
 }
 const ROW=r=>[r.id,r.startedAt,r.endedAt,r.mode,r.human,r.difficulty,r.cpuDeck,r.winner,r.growth.A,r.growth.B,r.round];
 const UNROW=(x,deck,uses)=>({id:x[0],startedAt:x[1],endedAt:x[2],mode:x[3],human:x[4],difficulty:x[5],cpuDeck:x[6],decks:{A:deck(x[11]),B:deck(x[12])},winner:x[7],growth:{A:x[8],B:x[9]},round:x[10],uses});
 // v2: decks [[id,name,[cardId…]]], rows [...ROW, deckA, deckB, usesA [[cardId,n]], usesB]; held = rows kept unchanged.
 function pack(records,held=[]){const decks=[],keys=new Map(),deck=d=>{const k=JSON.stringify([d.id,d.name,d.cards]);if(!keys.has(k)){keys.set(k,decks.length);decks.push([d.id,d.name,[...d.cards]]);}return keys.get(k);};
  return {format:'naotocchi-records',version:2,decks,rows:records.map(r=>[...ROW(r),deck(r.decks.A),deck(r.decks.B),r.uses.A,r.uses.B]),held};}
 function parseV1(d){ // the official v1 reader, with the frozen 452 catalog instead of the live one
  const ids=v1Catalogs.find(c=>JSON.stringify(c)===JSON.stringify(d.catalog));
  if(!ids||!Array.isArray(d.decks)||d.decks.length>MAX_RECORDS*2||!Array.isArray(d.rows)||d.rows.length>MAX_RECORDS)fail('戦績の形式・件数が不正です');
  const decks=d.decks.map(x=>{if(!Array.isArray(x)||x.length!==3||!Array.isArray(x[2])||x[2].some(i=>!num(i,ids.length-1)))fail('デッキ辞書が不正です');return {id:x[0],name:x[1],cards:x[2].map(i=>ids[i])};});
  const seen=new Set();return d.rows.map(x=>{if(!Array.isArray(x)||x.length!==15||seen.has(x[0])||![x[11],x[12]].every(i=>num(i,decks.length-1)))fail('対戦ID・行が不正です');seen.add(x[0]);const uses={};
   for(const [s,i] of [['A',13],['B',14]]){if(!Array.isArray(x[i]))fail('使用一覧が不正です');uses[s]=x[i].map(p=>{if(!Array.isArray(p)||p.length!==2||!num(p[0],ids.length-1))fail('カード使用数が不正です');return [ids[p[0]],p[1]];});}
   return validateRecord(UNROW(x,i=>structuredClone(decks[i]),uses));});
 }
 function parseV2(d){
  if(!Array.isArray(d.decks)||d.decks.length>MAX_RECORDS*2||!Array.isArray(d.rows)||!Array.isArray(d.held??[])||d.rows.length+(d.held?.length??0)>MAX_RECORDS)fail('戦績の形式・件数が不正です');
  const decks=d.decks.map(x=>{if(!Array.isArray(x)||x.length!==3||!Array.isArray(x[2])||x[2].some(id=>!str(id,80)))fail('デッキ辞書が不正です');return {id:x[0],name:x[1],cards:x[2]};});
  const seen=new Set(),records=[],held=[];
  const rows=[...d.rows.map(x=>({x,deckOf:i=>decks[i]})),...(d.held??[]).map(h=>{if(!obj(h)||!Array.isArray(h.row)||!Array.isArray(h.decks)||h.decks.length!==2)fail('保留中の戦績が不正です');if(h.decks.some(x=>!Array.isArray(x)||x.length!==3||!Array.isArray(x[2])||x[2].some(id=>!str(id,80))))fail('保留中の戦績が不正です');return {x:h.row,deckOf:null,held:h};})];
  for(const {x,deckOf,held:h} of rows){
   if(!Array.isArray(x)||x.length!==15||!str(x[0],100)||seen.has(x[0]))fail('対戦ID・行が不正です');seen.add(x[0]);
   if(!h&&![x[11],x[12]].every(i=>num(i,decks.length-1)))fail('対戦ID・行が不正です');
   const dA=h?{id:h.decks[0][0],name:h.decks[0][1],cards:h.decks[0][2]}:deckOf(x[11]),dB=h?{id:h.decks[1][0],name:h.decks[1][1],cards:h.decks[1][2]}:deckOf(x[12]);
   const ids=[...dA.cards,...dB.cards,...[x[13],x[14]].flatMap(u=>Array.isArray(u)?u.map(p=>Array.isArray(p)?p[0]:null):[null])];
   if(ids.some(id=>typeof id!=='string'))fail('使用一覧が不正です');
   if(ids.some(id=>!known(id))){held.push({row:x,decks:[[dA.id,dA.name,dA.cards],[dB.id,dB.name,dB.cards]]});continue;} // newer cards: keep as-is
   records.push(validateRecord(UNROW(x,i=>structuredClone(i===x[11]?dA:dB),{A:x[13],B:x[14]})));
  }
  return {records,held};
 }
 function parse(raw){
  if(typeof raw!=='string'||raw.length>MAX_BYTES)fail('戦績ファイルは8MB以内です');const d=JSON.parse(raw);
  if(!obj(d)||d.format!=='naotocchi-records')fail('戦績の形式・件数が不正です');
  if(d.version===1)return {records:parseV1(d),held:[],from:1};
  if(d.version===2)return {...parseV2(d),from:2};
  fail('戦績の版に対応していません（新しいアプリで書かれた可能性があります）');
 }
 function union(a,b){const m=new Map(a.map(r=>[r.id,r]));for(const value of b){const r=validateRecord(value),old=m.get(r.id);if(old&&JSON.stringify({...old,endedAt:null})!==JSON.stringify({...r,endedAt:null})){const e=Error('同じ対戦IDの内容が一致しません。元データを確認してください');e.code='record-conflict';throw e;}m.set(r.id,old?{...old,endedAt:old.endedAt===null?r.endedAt:old.endedAt}:r);}return [...m.values()];}
 function serialize(records,held=[]){const raw=JSON.stringify(pack(records,held));if(raw.length>MAX_BYTES)fail('戦績の容量上限です。書き出して保護してください');return raw;}
 class RecordsStore{
  constructor(storage){this.storage=storage;this.records=[];this.held=[];this.pending=[];this.error=null;this.raw=null;this.migratedFrom=null;
   try{this.raw=storage.getItem(RECORDS_KEY);if(this.raw!==null)({records:this.records,held:this.held}=parse(this.raw));
    else{const v1=storage.getItem(V1_KEY);if(v1!==null){this.records=parse(v1).records;this.migratedFrom=v1;}}} // v1 is only read
   catch(e){this.error='戦績を読み込めません：'+e.message;}}
  refresh(){const raw=this.storage.getItem(RECORDS_KEY);if(raw!==null&&raw!==this.raw){({records:this.records,held:this.held}=parse(raw));this.raw=raw;}return this.records;}
  write(incoming,{retainOnFailure=false}={}){const validated=incoming.map(validateRecord);try{if(this.error)fail(this.error);this.refresh();const next=union(this.records,union(this.pending,validated));const raw=serialize(next,this.held);if(raw===this.raw){this.pending=[];return;}
   if(this.migratedFrom!==null&&this.storage.getItem(V1_LEGACY_KEY)===null)this.storage.setItem(V1_LEGACY_KEY,this.migratedFrom);
   if(this.raw!==null)this.storage.setItem(BACKUP_KEY,this.raw);this.storage.setItem(RECORDS_KEY,raw);this.records=next;this.raw=raw;this.pending=[];this.migratedFrom=null;
  }catch(e){if(retainOnFailure&&e.code!=='record-conflict')this.pending=union(this.pending,validated);throw e;}}
  add(r){this.write([r],{retainOnFailure:true});}
  migrate(){this.write([]);if(this.raw===null&&!this.error){const raw=serialize(this.records,this.held);if(this.migratedFrom!==null&&this.storage.getItem(V1_LEGACY_KEY)===null)this.storage.setItem(V1_LEGACY_KEY,this.migratedFrom);this.storage.setItem(RECORDS_KEY,raw);this.raw=raw;this.migratedFrom=null;}}
  importJSON(raw){const {records}=parse(raw);this.write(records);}
  exportJSON(){return serialize(union(this.records,this.pending),this.held);}
  exportPendingJSON(){return serialize(this.pending);}
  exportDamaged(){return this.storage.getItem(RECORDS_KEY)??this.raw??this.storage.getItem(V1_KEY)??'';}
  recover(){const raw=this.storage.getItem(BACKUP_KEY);if(raw===null)fail('復旧できるバックアップがありません');const next=parse(raw);this.storage.setItem(RECORDS_KEY,raw);({records:this.records,held:this.held}=next);this.raw=raw;this.error=null;}
 }
 return {validateMetadata,validateRecord,buildRecord,parse,pack,serialize,RecordsStore};
}
