// Independent, local-only statistics. Never writes game state or main-game achievements.
import {CARDS,validateDeck} from './engine.mjs';
import {CPU_DECK_IDS} from './cpu-decks.mjs';
export const RECORDS_KEY='naotocchi-card-records-v1',BACKUP_KEY=RECORDS_KEY+'-backup',MAX_RECORDS=5000,MAX_BYTES=8000000,HISTORY_LIMIT=200;
const ids=Object.keys(CARDS).sort(),fail=m=>{throw Error(m);},clone=x=>JSON.parse(JSON.stringify(x));
const obj=x=>x&&typeof x==='object'&&!Array.isArray(x);
const num=(x,max=Number.MAX_SAFE_INTEGER)=>Number.isSafeInteger(x)&&x>=0&&x<=max;
const str=(x,max)=>typeof x==='string'&&x.length>0&&x.length<=max;
export function validateMetadata(m){
 if(!obj(m)||!str(m.id,100)||!['cpu','hotseat','online'].includes(m.mode)||!(m.startedAt===null||num(m.startedAt)))fail('対戦情報が不正です');
 if(m.mode==='cpu'?(!['A','B'].includes(m.human)||!['beginner','intermediate'].includes(m.difficulty)||!(m.cpuDeck===null||CPU_DECK_IDS.includes(m.cpuDeck))):(m.human!==null||m.difficulty!==null||m.cpuDeck!==null))fail('対戦モードが不正です');
 const decks={};for(const seat of ['A','B']){const d=m.decks?.[seat];if(!obj(d)||!(d.id===null||str(d.id,80))||!str(d.name,80))fail('デッキ情報が不正です');validateDeck(d.cards);decks[seat]={id:d.id,name:d.name,cards:[...d.cards]};}
 return {id:m.id,startedAt:m.startedAt,mode:m.mode,human:m.human,difficulty:m.difficulty,cpuDeck:m.cpuDeck,decks};
}
export function validateRecord(r){
 const m=validateMetadata(r);if(!(r.endedAt===null||num(r.endedAt))||m.startedAt!==null&&r.endedAt!==null&&r.endedAt<m.startedAt||!['A','B',null].includes(r.winner)||!num(r.round,10)||r.round<1||!obj(r.growth)||!['A','B'].every(s=>num(r.growth[s],100)))fail('対戦結果が不正です');
 const uses={};for(const s of ['A','B']){const list=r.uses?.[s],seen=new Set();if(!Array.isArray(list)||list.length>452)fail('カード統計が不正です');uses[s]=list.map(pair=>{if(!Array.isArray(pair)||pair.length!==2||!Object.hasOwn(CARDS,pair[0])||!num(pair[1],10000)||!pair[1]||seen.has(pair[0]))fail('カード使用数が不正です');seen.add(pair[0]);return [...pair];}).sort((a,b)=>a[0].localeCompare(b[0]));}
 return {...m,endedAt:r.endedAt,winner:r.winner,growth:{A:r.growth.A,B:r.growth.B},round:r.round,uses};
}
export function buildRecord(state,metadata,endedAt=Date.now()){
 if(state.phase!=='finished'||!state.result)return null;
 const m=validateMetadata(metadata);for(const s of ['A','B'])if(JSON.stringify(m.decks[s].cards)!==JSON.stringify(state.decks[s]))fail('開始時のデッキと対戦が一致しません');
 const uses={A:new Map(),B:new Map()};for(const e of state.history??[])if(e.kind==='play'&&uses[e.actor]&&Object.hasOwn(CARDS,e.cardId))uses[e.actor].set(e.cardId,(uses[e.actor].get(e.cardId)??0)+1);
 return validateRecord({...m,endedAt:m.startedAt===null?null:endedAt,winner:state.result.winner??null,growth:state.result.growth,round:state.round,uses:{A:[...uses.A],B:[...uses.B]}});
}
// Shared deck snapshots and numeric card indices keep long-term storage compact.
function pack(records){const decks=[],keys=new Map(),deck=d=>{const k=JSON.stringify(d);if(!keys.has(k)){keys.set(k,decks.length);decks.push([d.id,d.name,d.cards.map(x=>ids.indexOf(x))]);}return keys.get(k);};return {format:'naotocchi-records',version:1,catalog:ids,decks,rows:records.map(r=>[r.id,r.startedAt,r.endedAt,r.mode,r.human,r.difficulty,r.cpuDeck,r.winner,r.growth.A,r.growth.B,r.round,deck(r.decks.A),deck(r.decks.B),...['A','B'].map(s=>r.uses[s].map(([id,n])=>[ids.indexOf(id),n]))])};}
export function parseJournal(raw){
 if(typeof raw!=='string'||raw.length>MAX_BYTES)fail('戦績ファイルは8MB以内です');const d=JSON.parse(raw);
 if(!obj(d)||d.format!=='naotocchi-records'||d.version!==1||JSON.stringify(d.catalog)!==JSON.stringify(ids)||!Array.isArray(d.decks)||d.decks.length>MAX_RECORDS*2||!Array.isArray(d.rows)||d.rows.length>MAX_RECORDS)fail('戦績の形式・件数が不正です');
 const decks=d.decks.map(x=>{if(!Array.isArray(x)||x.length!==3||!Array.isArray(x[2])||x[2].some(i=>!num(i,451)))fail('デッキ辞書が不正です');return {id:x[0],name:x[1],cards:x[2].map(i=>ids[i])};});
 const seen=new Set();return d.rows.map(x=>{if(!Array.isArray(x)||x.length!==15||seen.has(x[0])||![x[11],x[12]].every(i=>num(i,decks.length-1)))fail('対戦ID・行が不正です');seen.add(x[0]);const uses={};for(const [s,i] of [['A',13],['B',14]]){if(!Array.isArray(x[i]))fail('使用一覧が不正です');uses[s]=x[i].map(p=>{if(!Array.isArray(p)||p.length!==2||!num(p[0],451))fail('カード番号が不正です');return [ids[p[0]],p[1]];});}return validateRecord({id:x[0],startedAt:x[1],endedAt:x[2],mode:x[3],human:x[4],difficulty:x[5],cpuDeck:x[6],winner:x[7],growth:{A:x[8],B:x[9]},round:x[10],decks:{A:decks[x[11]],B:decks[x[12]]},uses});});
}
function union(a,b){const m=new Map(a.map(r=>[r.id,r]));for(const value of b){const r=validateRecord(value),old=m.get(r.id);if(old&&JSON.stringify({...old,endedAt:null})!==JSON.stringify({...r,endedAt:null})){const e=Error('同じ対戦IDの内容が一致しません。元データを確認してください');e.code='record-conflict';throw e;}m.set(r.id,old?{...old,endedAt:old.endedAt===null?r.endedAt:r.endedAt===null?old.endedAt:Math.min(old.endedAt,r.endedAt)}:r);}if(m.size>MAX_RECORDS)fail('累計台帳は5000戦までです。既存戦績は保持しています');return [...m.values()];}
function serialize(records){const raw=JSON.stringify(pack(records));if(raw.length>MAX_BYTES)fail('戦績の容量上限です。書き出して保護してください');return raw;}
export class RecordsStore{
 constructor(storage){this.storage=storage;this.records=[];this.pending=[];this.error=null;this.raw=null;try{this.raw=storage.getItem(RECORDS_KEY);if(this.raw!==null)this.records=parseJournal(this.raw);}catch(e){this.error='戦績を読み込めません：'+e.message;}}
 refresh(){const raw=this.storage.getItem(RECORDS_KEY);if(raw!==this.raw){this.records=raw===null?[]:parseJournal(raw);this.raw=raw;}return this.records;}
 write(incoming,{retainOnFailure=false}={}){const validated=incoming.map(validateRecord);try{if(this.error)fail(this.error);this.refresh();const next=union(this.records,union(this.pending,validated));const raw=serialize(next);if(raw===this.raw){this.pending=[];return;}
 if(this.raw!==null)this.storage.setItem(BACKUP_KEY,this.raw);this.storage.setItem(RECORDS_KEY,raw);this.records=next;this.raw=raw;this.pending=[];
 }catch(e){if(retainOnFailure&&e.code!=='record-conflict')this.pending=union(this.pending,validated);throw e;}}
 add(r){this.write([r],{retainOnFailure:true});}
 exportPendingJSON(){return serialize(this.pending);}
 importJSON(raw){const incoming=parseJournal(raw);this.write(incoming);}
 exportJSON(){return serialize(union(this.records,this.pending));}
 exportDamaged(){return this.storage.getItem(RECORDS_KEY)??this.raw??'';}
 recover(){const raw=this.storage.getItem(BACKUP_KEY);if(raw===null)fail('復旧できるバックアップがありません');const next=parseJournal(raw);this.storage.setItem(RECORDS_KEY,raw);this.records=next;this.raw=raw;this.error=null;}
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
