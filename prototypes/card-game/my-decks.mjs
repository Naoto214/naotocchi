import {CARDS,DEFAULT_DECK,supported} from './engine.mjs';
export const MY_DECK_KEY='naotocchi-my-decks-v1';
export const LEGACY_DECK_KEY='naotocchi-deck-drafts-v1';
export const MAX_DECKS=20;
const fail=message=>{throw Error(message);};
const newID=()=>crypto.randomUUID();
function name(value){if(typeof value!=='string'||!value.trim()||value.length>48)fail('名前は1〜48文字で入力してください');return value.trim();}
function cards(value){
 if(!Array.isArray(value)||value.length>40)fail('デッキは最大40枚です');
 const counts=new Map();for(const id of value){if(typeof id!=='string'||!Object.hasOwn(CARDS,id)||!supported(id))fail('不明なカードIDです');const n=(counts.get(id)??0)+1;counts.set(id,n);if(n>(CARDS[id].rare?1:3))fail('同名上限を超えています：'+CARDS[id].name);}
 return [...value];
}
function validate(data){
 if(!data||data.version!==1||!Array.isArray(data.decks)||!data.decks.length||data.decks.length>MAX_DECKS)fail('マイデッキの形式・件数が不正です');
 const ids=new Set(),decks=data.decks.map(d=>{if(!d||typeof d.id!=='string'||!d.id||d.id.length>80||ids.has(d.id))fail('デッキIDが不正または重複しています');ids.add(d.id);return {id:d.id,name:name(d.name),cards:cards(d.cards)};});
 if(!data.selected||!['A','B'].every(s=>ids.has(data.selected[s])))fail('使用デッキが見つかりません');
 return {version:1,decks,selected:{A:data.selected.A,B:data.selected.B}};
}
export class DeckLibrary{
 constructor(storage){
  this.storage=storage;const raw=storage.getItem(MY_DECK_KEY);this.snapshot=raw;
  if(raw!==null){this.data=validate(JSON.parse(raw));return;}
  const old=storage.getItem(LEGACY_DECK_KEY),legacy=old===null?{A:DEFAULT_DECK,B:DEFAULT_DECK}:JSON.parse(old);
  const a={id:newID(),name:'引き継ぎ A',cards:cards(legacy?.A)},b={id:newID(),name:'引き継ぎ B',cards:cards(legacy?.B)};
  if(old===null){a.name='標準デッキ A';b.name='標準デッキ B';}
  this.data={version:1,decks:[a,b],selected:{A:a.id,B:b.id}};
 }
 get(id){return this.data.decks.find(d=>d.id===id)??fail('デッキが見つかりません');}
 save(){if(this.storage.getItem(MY_DECK_KEY)!==this.snapshot)fail('別タブで変更されています。書き出してから再読込してください');const raw=JSON.stringify(validate(this.data));this.storage.setItem(MY_DECK_KEY,raw);this.snapshot=raw;}
 create(label='新しいデッキ',values=[]){if(this.data.decks.length>=MAX_DECKS)fail('保存できるデッキは20件までです');const d={id:newID(),name:name(label),cards:cards(values)};this.data.decks.push(d);return d;}
 duplicate(id){const d=this.get(id);return this.create((d.name.slice(0,43)+' のコピー').slice(0,48),d.cards);}
 rename(id,label){this.get(id).name=name(label);}
 replace(id,values){this.get(id).cards=cards(values);}
 change(id,cardId,delta){if(![1,-1].includes(delta))fail('枚数操作が不正です');const d=this.get(id),next=[...d.cards];if(delta===1)next.push(cardId);else{const i=next.indexOf(cardId);if(i<0)return;next.splice(i,1);}this.replace(id,next);}
 remove(id){this.get(id);if(this.data.decks.length===1)fail('デッキを1件以上残してください');this.data.decks=this.data.decks.filter(d=>d.id!==id);for(const s of ['A','B'])if(this.data.selected[s]===id)this.data.selected[s]=this.data.decks[0].id;}
 select(seat,id){if(!['A','B'].includes(seat))fail('席が不正です');this.get(id);this.data.selected[seat]=id;}
 selectedDecks(){return Object.fromEntries(['A','B'].map(s=>[s,[...this.get(this.data.selected[s]).cards]]));}
 exportJSON(){return JSON.stringify(this.data,null,2);}
 importJSON(raw,{replace=false}={}){
  if(typeof raw!=='string'||raw.length>100000)fail('ファイルが大きすぎます');const input=JSON.parse(raw);let incoming;
  if(Array.isArray(input?.decks)){incoming=validate(input).decks;}
  else{if(input?.version!==undefined&&input.version!==1)fail('未対応の形式です');const old=input?.decks??input;incoming=['A','B'].map(s=>({name:'読み込み '+s,cards:cards(old?.[s])}));}
  if((replace?0:this.data.decks.length)+incoming.length>MAX_DECKS)fail('読み込み後に20件を超えます。不要なデッキを削除してください');
  const next=incoming.map(d=>({id:newID(),name:d.name,cards:[...d.cards]}));if(replace){const seats=Array.isArray(input?.decks)?input.selected:null;this.data={version:1,decks:next,selected:Object.fromEntries(['A','B'].map((seat,i)=>[seat,next[seats?incoming.findIndex(d=>d.id===seats[seat]):i].id]))};}else this.data.decks.push(...next);return next;
 }
}
export function filterCards({query='',type='',attribute='',species='',stage=''}={}){
 const q=query.trim().toLowerCase();return Object.values(CARDS).filter(c=>(!type||c.type===type)&&(!attribute||c.attribute===attribute)&&(!species||c.species===species)&&(!stage||String(c.stage)===stage)&&(!q||`${c.id} ${c.name} ${c.form??''} ${c.text}`.toLowerCase().includes(q)));
}
