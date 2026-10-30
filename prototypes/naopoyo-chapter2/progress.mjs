import {Progress,KEY as ORIGINAL_KEY,QA_KEY as ORIGINAL_QA} from '../naopoyo-chapter1/progress.mjs';
import {stages as chapter1} from '../naopoyo-chapter1/stages.mjs';
import {stages} from './stages.mjs';
export const LEGACY_KEY='naopoyo.komorebi.pilot.20261024.v1';
export const PREVIOUS_KEY='naopoyo.komorebi.supported.20261024.v1';
export const CONTACT_KEY='naopoyo.komorebi.contact.20261025.v1';
export const MAGIC_ROCK_KEY='naopoyo.komorebi.magic-rock.20261025.v1';
export const VERSION9_KEY='naopoyo.komorebi.gate-surface.20261026.v1';
export const RECOMBINE_KEY='naopoyo.komorebi.recombine-once.20261028.v1';
export const KEY='naopoyo.komorebi.contact-v2.20261030.v1',QA_KEY=KEY+'.qa';
export const allStages=[...chapter1,...stages];
export class ForestProgress extends Progress{
 merge(raw,restore=false){
  super.merge(raw,restore);
  // A completed old Pilot must open its newly appended successor, including
  // clears recovered from append-only markers after a stale tab writes.
  if(this.qa||this.future)return;
  for(const id of this.data.cleared){
   if(!this.order.includes(id))continue;
   const next=this.next(id);
   if(next&&!this.data.unlocked.includes(next))this.data.unlocked.push(next);
  }
 }
 board(id,value){
  if(!this.allowed(id))return false;
  try{
   let summary=null;try{summary=JSON.parse(this.storage.getItem(this.key)||'null');}catch{/* load() archives the damaged summary. */}
   this.merge(this.load());
   if(this.future)return false;
   const key=this.key+'.board.'+id,raw=this.storage.getItem(key);
   const candidates=[summary?.boards?.[id],this.data.boards[id]];
   let existing=this.data.boards[id];
   if(raw){try{existing=JSON.parse(raw)}catch{this.backup(id,raw);}}
   candidates.push(existing);
   if(candidates.some(board=>board?.version!==undefined&&board.version!==1)){this.error=true;return false;}
  }catch{this.error=true;return false;}
  return super.board(id,value);
 }
 backup(id,raw){
  const key=this.key+'.board.'+id+'.damaged';
  if(!this.storage.getItem(key))this.storage.setItem(key,typeof raw==='string'?raw:JSON.stringify(raw));
 }
 constructor(storage,{qa=false}={}){
  const chosen=qa?stages:allStages,target=qa?QA_KEY:KEY;
  const map=k=>target+k.slice((qa?ORIGINAL_QA:ORIGINAL_KEY).length);
  super(chosen.map(s=>s.id),{getItem:k=>storage.getItem(map(k)),setItem:(k,v)=>storage.setItem(map(k),v)},{qa,order:chosen.map(s=>s.id)});
  this.actualKey=target;
  // Physics changes never reinterpret or overwrite old boards/Undo snapshots.
  // Read progress/append-only markers, but leave legacy storage entirely intact.
  for(const legacyKey of [LEGACY_KEY,PREVIOUS_KEY,CONTACT_KEY,MAGIC_ROCK_KEY,VERSION9_KEY,RECOMBINE_KEY])try{
   const oldKey=legacyKey+(qa?'.qa':'');
   let old=null;try{old=JSON.parse(storage.getItem(oldKey)||'null');}catch{/* Recover markers even when the summary is damaged. */}
   if(!old||old.version===1){
    const cleared=Array.isArray(old?.cleared)?[...old.cleared]:[],unlocked=Array.isArray(old?.unlocked)?[...old.unlocked]:[];
    for(const id of this.ids){if(storage.getItem(oldKey+'.cleared.'+id)==='1')cleared.push(id);if(storage.getItem(oldKey+'.unlocked.'+id)==='1')unlocked.push(id);}
    this.merge({...old,cleared,unlocked,boards:{}},!storage.getItem(target));
   }
  }catch{/* Keep malformed/future legacy data untouched. */}
  // Same-origin legacy evidence is read-only. Cross-origin private Sites cannot
  // access GitHub Pages storage; their normal mode replays chapter one separately.
  if(!qa)try{
   let raw=null;try{raw=JSON.parse(storage.getItem(ORIGINAL_KEY)||'null');}catch{/* The final-clear marker remains authoritative. */}
   const completed=raw?.version===1&&raw.cleared?.includes('light-owl-trial')||storage.getItem(ORIGINAL_KEY+'.cleared.light-owl-trial')==='1';
   if(completed){this.merge({cleared:chapter1.map(s=>s.id),unlocked:allStages.slice(0,11).map(s=>s.id)});if(!storage.getItem(target))this.data.current=stages[0].id;}
  }catch{/* Never repair or write a legacy record. */}
 }
}
