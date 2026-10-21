import {CARDS} from './engine.mjs';
export const COLLECTION_KEY='naotocchi-card-collection-v1';
export const EGG=Object.freeze({id:'special-egg',name:'たまご',type:'special',rare:false,text:'メインがいない待機状態。デッキ外の状態表示用カードです。',viewOnly:true});
const order=['special','main','companion','partner','world','play','item','event'];
const entries=[EGG,...Object.values(CARDS)].sort((a,b)=>order.indexOf(a.type)-order.indexOf(b.type)||(a.type==='main'?(a.species.localeCompare(b.species,'en')||a.stage-b.stage):a.id.localeCompare(b.id,'en')));
const ids=new Set(entries.map(c=>c.id));
export function collectionCards({query='',type='',attribute='',species='',stage='',rarity='',favoritesOnly=false}={},favorites=[]){
 const q=query.trim().toLowerCase(),f=new Set(favorites);
 return entries.filter(c=>(!type||c.type===type)&&(!attribute||c.attribute===attribute)&&(!species||c.species===species)&&(!stage||String(c.stage)===String(stage))&&(!rarity||(rarity==='rare'?c.rare:!c.rare))&&(!favoritesOnly||f.has(c.id))&&(!q||`${c.name} ${c.form??''} ${c.id} ${c.text}`.toLowerCase().includes(q)));
}
export function collectionPage(cards,page=0){const pages=Math.max(1,Math.ceil(cards.length/9)),p=Math.max(0,Math.min(pages-1,Math.trunc(Number(page)||0)));return {page:p,pages,cards:cards.slice(p*9,p*9+9)};}
function parse(raw){
 const v=raw===null?{version:1,favorites:[],page:0,noticeSeen:false}:JSON.parse(raw);
 if(v?.version!==1||!Array.isArray(v.favorites)||!v.favorites.every(id=>typeof id==='string')||!Number.isInteger(v.page)||v.page<0||typeof v.noticeSeen!=='boolean')throw Error('コレクションの保存形式を読み込めません');
 return {...v,favorites:[...new Set(v.favorites.filter(id=>ids.has(id)))],page:Math.min(50,v.page)};
}
export class CollectionPreferences{
 constructor(storage){this.storage=storage;this.data=parse(storage.getItem(COLLECTION_KEY));}
 update(patch){const next=parse(JSON.stringify({...parse(this.storage.getItem(COLLECTION_KEY)),...patch}));this.storage.setItem(COLLECTION_KEY,JSON.stringify(next));this.data=next;return next;}
 toggle(id){if(!ids.has(id))throw Error('不明なカードです');const latest=parse(this.storage.getItem(COLLECTION_KEY)),f=new Set(latest.favorites);f.has(id)?f.delete(id):f.add(id);return this.update({favorites:[...f]});}
}
// Same in-memory library as the editor. A rejected write must not become a latent addition.
export function addCollectionCard(library,deckId,cardId){
 if(!Object.hasOwn(CARDS,cardId))throw Error('たまごは閲覧専用です。デッキには追加できません');
 const d=library.get(deckId),before=[...d.cards];
 try{library.change(deckId,cardId,1);library.save();return {name:d.name,count:d.cards.length};}catch(e){d.cards=before;throw e;}
}
