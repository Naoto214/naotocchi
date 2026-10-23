import {progression} from './stages.mjs';
export const KEY='naopoyo.chapter1.20261023.v1', QA_KEY=KEY+'.qa';
const strings=a=>Array.isArray(a)?a.filter(x=>typeof x==='string'):[];
const union=(...a)=>[...new Set(a.flatMap(strings))];
const obj=a=>a&&typeof a==='object'&&!Array.isArray(a)?a:{};
export class Progress{
 constructor(ids,storage,{qa=false,order=progression}={}){
  this.ids=[...ids];this.order=order.filter(id=>ids.includes(id));if(!this.order.length)throw Error('Progress requires a canonical entry');
  this.storage=storage;this.key=qa?QA_KEY:KEY;this.qa=qa;this.error=false;this.future=false;
  this.data={version:1,unlocked:[this.order[0]],cleared:[],current:this.order[0],boards:{},hints:{},read:[]};
  this.merge(this.load(),true);if(qa)this.data.unlocked=union(this.data.unlocked,ids);
 }
 load(){
  let v=null;
  try{const raw=this.storage.getItem(this.key);if(raw){try{v=JSON.parse(raw)}catch{if(!this.storage.getItem(this.key+'.damaged'))this.storage.setItem(this.key+'.damaged',raw);this.error=true}
   if(v?.version!==1&&v!==null){this.future=true;this.error=true;return null}}}
  catch{this.error=true;return null}
  v={...obj(v),version:1,unlocked:strings(v?.unlocked),cleared:strings(v?.cleared),boards:{...obj(v?.boards)}};
  // Separate append-only markers cannot be undone by a stale whole-save write.
  // Per-stage board slots likewise prevent another stage's autosave erasing it.
  try{for(const id of this.ids){for(const field of ['unlocked','cleared'])if(this.storage.getItem(this.key+'.'+field+'.'+id)==='1')v[field]=union(v[field],[id]);const b=this.storage.getItem(this.key+'.board.'+id);if(b){try{v.boards[id]=JSON.parse(b)}catch{this.error=true}}}}catch{this.error=true}
  return v;
 }
 merge(raw,restore=false){if(!raw)return;const d=this.data;d.unlocked=union(d.unlocked,raw.unlocked,raw.cleared);d.cleared=union(d.cleared,raw.cleared);d.read=union(d.read,raw.read);d.boards={...d.boards,...obj(raw.boards)};for(const[k,v]of Object.entries(obj(raw.hints)))if(Number.isInteger(v)&&v>=0&&v<=3)d.hints[k]=Math.max(d.hints[k]||0,v);if(restore&&this.ids.includes(raw.current)&&d.unlocked.includes(raw.current))d.current=raw.current;}
 flush(){this.merge(this.load());if(this.future)return false;try{for(const field of ['unlocked','cleared'])for(const id of this.data[field])this.storage.setItem(this.key+'.'+field+'.'+id,'1');this.storage.setItem(this.key,JSON.stringify(this.data));this.error=false;return true}catch{this.error=true;return false}}
 allowed(id){return this.ids.includes(id)&&this.data.unlocked.includes(id)}
 next(id){return this.order[this.order.indexOf(id)+1]}
 select(id){this.merge(this.load());if(!this.allowed(id))return false;this.data.current=id;this.flush();return true}
 clear(id){this.merge(this.load());if(!this.allowed(id))return false;this.data.cleared=union(this.data.cleared,[id]);const next=this.next(id),fresh=next&&!this.data.unlocked.includes(next);if(next)this.data.unlocked=union(this.data.unlocked,[next]);this.flush();return fresh?next:null}
 board(id,value){if(!this.allowed(id))return false;this.merge(this.load());if(this.future)return false;try{this.storage.setItem(this.key+'.board.'+id,JSON.stringify(value));this.data.boards[id]=value;return this.flush()}catch{this.error=true;return false}}
 hint(id,count){if(!this.allowed(id))return;this.data.hints[id]=Math.max(this.data.hints[id]||0,Math.min(3,count));this.flush()}
 read(id){this.data.read=union(this.data.read,[id]);this.flush()}
}
