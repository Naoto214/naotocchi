// Independent, local-only statistics. Never writes game state or main-game achievements.
import {CARDS,validateDeck} from './engine.mjs';
import {CPU_DECK_IDS} from './cpu-decks.mjs';
import V1_CATALOG from './records-v1-catalog.json' with {type:'json'};
export {V1_CATALOG};
export const V1_KEY='naotocchi-card-records-v1',V1_LEGACY_KEY=V1_KEY+'-legacy',RECORDS_KEY='naotocchi-card-records-v2',BACKUP_KEY=RECORDS_KEY+'-backup',MAX_RECORDS=5000,MAX_BYTES=8000000,HISTORY_LIMIT=200,MAX_ROUND=12;
const ids=Object.keys(CARDS).sort(),fail=m=>{throw Error(m);},clone=x=>JSON.parse(JSON.stringify(x));
const obj=x=>x&&typeof x==='object'&&!Array.isArray(x);
const num=(x,max=Number.MAX_SAFE_INTEGER)=>Number.isSafeInteger(x)&&x>=0&&x<=max;
const str=(x,max)=>typeof x==='string'&&x.length>0&&x.length<=max;
export function validateMetadata(m){return metadata(m,false);}
function metadata(m,allowUnknown){
 if(!obj(m)||!str(m.id,100)||!['cpu','hotseat','online'].includes(m.mode)||!(m.startedAt===null||num(m.startedAt)))fail('対戦情報が不正です');
 if(m.mode==='cpu'?(!['A','B'].includes(m.human)||!['beginner','intermediate'].includes(m.difficulty)||!(m.cpuDeck===null||CPU_DECK_IDS.includes(m.cpuDeck))):(m.human!==null||m.difficulty!==null||m.cpuDeck!==null))fail('対戦モードが不正です');
 const decks={};for(const seat of ['A','B']){const d=m.decks?.[seat];if(!obj(d)||!(d.id===null||str(d.id,80))||!str(d.name,80))fail('デッキ情報が不正です');if(allowUnknown)validateFutureDeck(d.cards);else validateDeck(d.cards);decks[seat]={id:d.id,name:d.name,cards:[...d.cards]};}
 return {id:m.id,startedAt:m.startedAt,mode:m.mode,human:m.human,difficulty:m.difficulty,cpuDeck:m.cpuDeck,decks};
}
export function validateRecord(r){return record(r,false);}
function record(r,allowUnknown){
 const m=metadata(r,allowUnknown);if(!(r.endedAt===null||num(r.endedAt))||m.startedAt!==null&&r.endedAt!==null&&r.endedAt<m.startedAt||!['A','B',null].includes(r.winner)||!num(r.round,MAX_ROUND)||r.round<1||!obj(r.growth)||!['A','B'].every(s=>num(r.growth[s],100)))fail('対戦結果が不正です');
 const uses={};for(const s of ['A','B']){const list=r.uses?.[s],seen=new Set();if(!Array.isArray(list)||list.length>(allowUnknown?MAX_BYTES:ids.length))fail('カード統計が不正です');uses[s]=list.map(pair=>{if(!Array.isArray(pair)||pair.length!==2||!(allowUnknown?str(pair[0],80):Object.hasOwn(CARDS,pair[0]))||!num(pair[1],10000)||!pair[1]||seen.has(pair[0]))fail('カード使用数が不正です');seen.add(pair[0]);return [...pair];}).sort((a,b)=>a[0].localeCompare(b[0]));}
 return {...m,endedAt:r.endedAt,winner:r.winner,growth:{A:r.growth.A,B:r.growth.B},round:r.round,uses};
}
export function buildRecord(state,metadata,endedAt=Date.now()){
 if(state.phase!=='finished'||!state.result)return null;
 const m=validateMetadata(metadata);for(const s of ['A','B'])if(JSON.stringify(m.decks[s].cards)!==JSON.stringify(state.decks[s]))fail('開始時のデッキと対戦が一致しません');
 const uses={A:new Map(),B:new Map()};for(const e of state.history??[])if(e.kind==='play'&&uses[e.actor]&&Object.hasOwn(CARDS,e.cardId))uses[e.actor].set(e.cardId,(uses[e.actor].get(e.cardId)??0)+1);
 return validateRecord({...m,endedAt:m.startedAt===null?null:endedAt,winner:state.result.winner??null,growth:state.result.growth,round:state.round,uses:{A:[...uses.A],B:[...uses.B]}});
}
// Future IDs are opaque, but malformed envelopes must never enter the held journal.
function validateFutureDeck(cards){
 if(!Array.isArray(cards)||cards.length!==40)fail('デッキは40枚です');
 const counts=new Map();for(const id of cards){if(!str(id,80))fail('カードIDが不正です');const n=(counts.get(id)??0)+1;counts.set(id,n);if(Object.hasOwn(CARDS,id)&&n>(CARDS[id].rare?1:3))fail('同名上限を超えています');}
}
function pack(records,held=[]){const decks=[],keys=new Map(),deck=d=>{const value=[d.id,d.name,d.cards],key=JSON.stringify(value);if(!keys.has(key)){keys.set(key,decks.length);decks.push(value);}return keys.get(key);};return {format:'naotocchi-records',version:2,decks,rows:records.map(r=>[r.id,r.startedAt,r.endedAt,r.mode,r.human,r.difficulty,r.cpuDeck,r.winner,r.growth.A,r.growth.B,r.round,deck(r.decks.A),deck(r.decks.B),r.uses.A,r.uses.B]),held};}
function unpack(row,decks){return {id:row[0],startedAt:row[1],endedAt:row[2],mode:row[3],human:row[4],difficulty:row[5],cpuDeck:row[6],winner:row[7],growth:{A:row[8],B:row[9]},round:row[10],decks:Object.fromEntries(['A','B'].map((s,i)=>[s,{id:decks[i][0],name:decks[i][1],cards:decks[i][2]}])),uses:{A:row[13],B:row[14]}};}
export function parseJournalData(raw){
 if(typeof raw!=='string'||raw.length>MAX_BYTES)fail('戦績ファイルは8MB以内です');const d=JSON.parse(raw);
 if(!obj(d)||d.format!=='naotocchi-records')fail('戦績の形式・件数が不正です');
 if(![1,2].includes(d.version))fail('戦績の版に対応していません');
 if(!Array.isArray(d.decks)||d.decks.length>MAX_RECORDS*2||!Array.isArray(d.rows)||!Array.isArray(d.held??[])||d.rows.length+(d.held?.length??0)>MAX_RECORDS)fail('戦績の形式・件数が不正です');
 const v1=d.version===1;if(v1&&(JSON.stringify(d.catalog)!==JSON.stringify(V1_CATALOG)||(d.held?.length??0)))fail('戦績の形式・件数が不正です');
 const deck=x=>{if(!Array.isArray(x)||x.length!==3||!Array.isArray(x[2]))fail('デッキ辞書が不正です');if(v1){if(x[2].some(i=>!num(i,V1_CATALOG.length-1)))fail('デッキ辞書が不正です');return [x[0],x[1],x[2].map(i=>V1_CATALOG[i])];}if(x[2].some(id=>!str(id,80)))fail('デッキ辞書が不正です');return x;};
 const decks=d.decks.map(deck),records=[],held=[],seen=new Set();
 function accept(row,snapshots,original=null){
  if(!Array.isArray(row)||row.length!==15||!str(row[0],100)||seen.has(row[0]))fail('対戦ID・行が不正です');seen.add(row[0]);
  const value=unpack(row,snapshots);record(value,!v1);
  const unknown=[...value.decks.A.cards,...value.decks.B.cards,...value.uses.A.map(p=>p[0]),...value.uses.B.map(p=>p[0])].some(id=>!Object.hasOwn(CARDS,id));
  if(unknown)held.push(clone(original??{row,decks:snapshots}));else records.push(validateRecord(value));
 }
 for(const source of d.rows){if(!Array.isArray(source)||source.length!==15||![source[11],source[12]].every(i=>num(i,decks.length-1)))fail('対戦ID・行が不正です');const row=clone(source);if(v1)for(const j of [13,14]){if(!Array.isArray(row[j]))fail('使用一覧が不正です');row[j]=row[j].map(p=>{if(!Array.isArray(p)||p.length!==2||!num(p[0],V1_CATALOG.length-1))fail('カード番号が不正です');return [V1_CATALOG[p[0]],p[1]];});}accept(row,[decks[row[11]],decks[row[12]]]);}
 for(const h of d.held??[]){if(!obj(h)||!Array.isArray(h.decks)||h.decks.length!==2||!Array.isArray(h.row)||![h.row[11],h.row[12]].every(i=>num(i,MAX_RECORDS*2-1)))fail('保留中の戦績が不正です');accept(h.row,h.decks.map(deck),h);}
 return {records,held,from:d.version};
}
// Existing callers consume only understood records; storage/import use the rich parser.
export function parseJournal(raw){return parseJournalData(raw).records;}
function conflict(){const e=Error('同じ対戦IDの内容が一致しません。元データを確認してください');e.code='record-conflict';throw e;}
function union(a,b){const m=new Map(a.map(r=>[r.id,r]));for(const value of b){const r=validateRecord(value),old=m.get(r.id);if(old&&JSON.stringify({...old,endedAt:null})!==JSON.stringify({...r,endedAt:null}))conflict();m.set(r.id,old?{...old,endedAt:old.endedAt===null?r.endedAt:r.endedAt===null?old.endedAt:Math.min(old.endedAt,r.endedAt)}:r);}if(m.size>MAX_RECORDS)fail('累計台帳は5000戦までです。既存戦績は保持しています');return [...m.values()];}
function mergeHeld(a,b,records){
 const known=new Set(records.map(r=>r.id)),m=new Map();
 const identity=h=>JSON.stringify({...h,row:h.row.map((v,i)=>i===2?null:i===11?0:i===12?1:v)});
 for(const h of [...a,...b]){
  const id=h.row[0];if(known.has(id))conflict();const old=m.get(id);
  if(old&&identity(old)!==identity(h))conflict();
  if(!old)m.set(id,h);
  else{const previous=old.row[2],incoming=h.row[2],endedAt=previous===null?incoming:incoming===null?previous:Math.min(previous,incoming);
   // Do not mutate the stored row: a later conflicting row or failed write rejects the entire import.
   if(endedAt!==previous)m.set(id,{...old,row:old.row.map((v,i)=>i===2?endedAt:v)});
  }
 }
 return [...m.values()];
}
function serialize(records,held=[]){if(records.length+held.length>MAX_RECORDS)fail('累計台帳は5000戦までです。既存戦績は保持しています');const raw=JSON.stringify(pack(records,held));if(raw.length>MAX_BYTES)fail('戦績の容量上限です。書き出して保護してください');return raw;}
export class RecordsStore{
 constructor(storage){this.storage=storage;this.records=[];this.held=[];this.pending=[];this.error=null;this.raw=null;this.migratedFrom=null;
  try{this.raw=storage.getItem(RECORDS_KEY);if(this.raw!==null)({records:this.records,held:this.held}=parseJournalData(this.raw));else{const raw=storage.getItem(V1_KEY);if(raw!==null){const data=parseJournalData(raw);if(data.from!==1)fail('旧戦績の形式が不正です');this.records=data.records;this.migratedFrom=raw;}}}catch(e){this.error='戦績を読み込めません：'+e.message;}}
 refresh(){const raw=this.storage.getItem(RECORDS_KEY);if(raw!==this.raw){const data=raw===null?{records:[],held:[]}:parseJournalData(raw);this.records=data.records;this.held=data.held;this.raw=raw;this.migratedFrom=null;}return this.records;}
 write(incoming,{retainOnFailure=false,held=[]}={}){const validated=incoming.map(validateRecord);try{if(this.error)fail(this.error);this.refresh();const next=union(this.records,union(this.pending,validated)),nextHeld=mergeHeld(this.held,held,next),raw=serialize(next,nextHeld);if(raw===this.raw){this.pending=[];return;}
  if(this.migratedFrom!==null&&this.storage.getItem(V1_LEGACY_KEY)===null)this.storage.setItem(V1_LEGACY_KEY,this.migratedFrom);
  if(this.raw!==null)this.storage.setItem(BACKUP_KEY,this.raw);this.storage.setItem(RECORDS_KEY,raw);this.records=next;this.held=nextHeld;this.raw=raw;this.pending=[];this.migratedFrom=null;
 }catch(e){if(retainOnFailure&&e.code!=='record-conflict')this.pending=union(this.pending,validated);throw e;}}
 add(r){this.write([r],{retainOnFailure:true});}
 migrate(){this.write([]);}
 importJSON(raw){const {records,held}=parseJournalData(raw);this.write(records,{held});}
 exportJSON(){return serialize(union(this.records,this.pending),this.held);}
 exportPendingJSON(){return serialize(this.pending);}
 exportDamaged(){return this.storage.getItem(RECORDS_KEY)??this.raw??this.storage.getItem(V1_KEY)??'';}
 recover(){const raw=this.storage.getItem(BACKUP_KEY);if(raw===null)fail('復旧できるバックアップがありません');const next=parseJournalData(raw);this.storage.setItem(RECORDS_KEY,raw);this.records=next.records;this.held=next.held;this.raw=raw;this.error=null;this.migratedFrom=null;}
}
const tally=()=>({total:0,wins:0,losses:0,draws:0});
function add(t,result){t.total++;t[result==='win'?'wins':result==='loss'?'losses':'draws']++;}
export const resultFor=(r,seat)=>r.winner===null?'draw':r.winner===seat?'win':'loss';
export const winRate=t=>t.total?`${(100*t.wins/t.total).toFixed(1)}%`:'—';
export function summarize(records,{scope='cpu'}={}){
 const out={total:records.length,cpu:tally(),difficulty:{beginner:tally(),intermediate:tally()},opponents:Object.fromEntries(CPU_DECK_IDS.map(id=>[id,tally()])),hotseat:{total:0,A:tally(),B:tally()},online:tally(),decks:Object.create(null),cards:Object.fromEntries(ids.map(id=>[id,{...tally(),copies:0,uses:0,usedMatches:0,usedWins:0,usedLosses:0,usedDraws:0}]))};
 for(const r of records){if(r.mode==='cpu'){const result=resultFor(r,r.human);add(out.cpu,result);add(out.difficulty[r.difficulty],result);if(r.cpuDeck)add(out.opponents[r.cpuDeck],result);}else if(r.mode==='hotseat'){out.hotseat.total++;for(const s of ['A','B'])add(out.hotseat[s],resultFor(r,s));}
 const seats=scope==='cpu'?(r.mode==='cpu'?[r.human]:[]):scope==='hotseat-A'?(r.mode==='hotseat'?['A']:[]):scope==='hotseat-B'?(r.mode==='hotseat'?['B']:[]):[];
 for(const seat of seats){const result=resultFor(r,seat),d=r.decks[seat];if(d.id){let t=out.decks[d.id];if(!t)t=out.decks[d.id]={...tally(),name:d.name,lastUsed:null,versions:Object.create(null)};add(t,result);const when=r.startedAt??r.endedAt;if(t.lastUsed===null||when>t.lastUsed){t.lastUsed=when;t.name=d.name;}const key=JSON.stringify([...d.cards].sort());if(!t.versions[key])t.versions[key]={...tally(),cards:[...d.cards]};add(t.versions[key],result);}
 const counts=new Map();for(const id of d.cards)counts.set(id,(counts.get(id)??0)+1);for(const [id,n] of counts){const t=out.cards[id];t.copies+=n;add(t,result);}for(const [id,n] of r.uses[seat]){const t=out.cards[id];t.uses+=n;t.usedMatches++;t[result==='win'?'usedWins':result==='loss'?'usedLosses':'usedDraws']++;}
 }}return out;
}
