import {Progress,KEY as ORIGINAL_KEY,QA_KEY as ORIGINAL_QA} from '../naopoyo-chapter1/progress.mjs';
import {stages as chapter1} from '../naopoyo-chapter1/stages.mjs';
import {stages} from './stages.mjs';
export const KEY='naopoyo.komorebi.pilot.20261024.v1',QA_KEY=KEY+'.qa';
export const allStages=[...chapter1,...stages];
export class ForestProgress extends Progress{
 board(id,value){
  if(!this.allowed(id))return false;
  try{
   const key=this.key+'.board.'+id,raw=this.storage.getItem(key);
   let existing=this.data.boards[id];
   if(raw){try{existing=JSON.parse(raw)}catch{this.backup(id,raw);}}
   if(existing?.version!==undefined&&existing.version!==1){this.error=true;return false;}
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
  // Same-origin legacy evidence is read-only. Cross-origin private Sites cannot
  // access GitHub Pages storage; their normal mode replays chapter one separately.
  if(!qa)try{
   const raw=JSON.parse(storage.getItem(ORIGINAL_KEY)||'null');
   const completed=raw?.version===1&&raw.cleared?.includes('light-owl-trial')||storage.getItem(ORIGINAL_KEY+'.cleared.light-owl-trial')==='1';
   if(completed){this.merge({cleared:chapter1.map(s=>s.id),unlocked:allStages.slice(0,11).map(s=>s.id)});if(!storage.getItem(target))this.data.current=stages[0].id;}
  }catch{/* Never repair or write a legacy record. */}
 }
}
