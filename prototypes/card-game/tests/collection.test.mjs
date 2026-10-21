import test from 'node:test';
import assert from 'node:assert/strict';
import {CARDS} from '../engine.mjs';
import {DeckLibrary,MY_DECK_KEY} from '../my-decks.mjs';
const mod=await import('../collection.mjs').catch(()=>({}));
const storage=()=>{const m=new Map();return {getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,v)}};
test('453 unique cards, egg first, 31 contiguous eight-stage families and 51 nine-pocket pages',()=>{
 assert.equal(typeof mod.collectionCards,'function');const all=mod.collectionCards();assert.equal(all.length,453);assert.equal(new Set(all.map(c=>c.id)).size,453);assert.equal(all[0].id,'special-egg');const main=all.filter(c=>c.type==='main');for(let i=0;i<248;i+=8){assert.equal(new Set(main.slice(i,i+8).map(c=>c.species)).size,1);assert.deepEqual(main.slice(i,i+8).map(c=>c.stage),[1,2,3,4,5,6,7,8]);}assert.equal(mod.collectionPage(all,50).cards.length,3);assert.equal(mod.collectionPage(all,999).page,50);assert.equal(mod.collectionPage([],8).page,0);
});
test('filters compose for name/effect/type/attribute/species/stage/rarity/favorites',()=>{
 assert.equal(typeof mod.collectionCards,'function');const c=Object.values(CARDS).find(c=>c.type==='main');assert.equal(mod.collectionCards({species:c.species}).length,8);assert.equal(mod.collectionCards({species:c.species,stage:String(c.stage),attribute:c.attribute})[0].id,c.id);assert.equal(mod.collectionCards({query:c.name})[0].id,c.id);assert.ok(mod.collectionCards({query:c.text}).some(v=>v.id===c.id));assert.ok(mod.collectionCards({rarity:'rare'}).every(v=>v.rare));assert.equal(mod.collectionCards({favoritesOnly:true},['special-egg']).length,1);assert.equal(mod.collectionCards({type:'special'})[0].id,'special-egg');
});
test('preferences persist independently, merge latest fields, preserve corrupt data and reject failed saves',()=>{
 assert.equal(typeof mod.CollectionPreferences,'function');const s=storage();s.setItem(MY_DECK_KEY,'untouched');const p=new mod.CollectionPreferences(s);p.update({page:13,noticeSeen:true});p.toggle('special-egg');const q=new mod.CollectionPreferences(s);assert.equal(q.data.page,13);assert.ok(q.data.noticeSeen);assert.deepEqual(q.data.favorites,['special-egg']);q.update({discoveryHistory:{future:1}});p.toggle('M-cat-01');assert.deepEqual(JSON.parse(s.getItem(mod.COLLECTION_KEY)).discoveryHistory,{future:1});assert.equal(s.getItem(MY_DECK_KEY),'untouched');s.setItem(mod.COLLECTION_KEY,'broken');assert.throws(()=>new mod.CollectionPreferences(s));assert.equal(s.getItem(mod.COLLECTION_KEY),'broken');const bad=new mod.CollectionPreferences({getItem:()=>null,setItem:()=>{throw Error('quota');}});assert.throws(()=>bad.toggle('special-egg'));assert.deepEqual(bad.data.favorites,[]);
});
test('deck additions share original schema, reject egg/full/normal4/rare2 and roll back quota/conflicts',()=>{
 assert.equal(typeof mod.addCollectionCard,'function');const s=storage(),l=new DeckLibrary(s),d=l.create('コレクション');l.save();const n=Object.values(CARDS).find(c=>!c.rare),r=Object.values(CARDS).find(c=>c.rare);
 mod.addCollectionCard(l,d.id,n.id);assert.equal(new DeckLibrary(s).get(d.id).cards.length,1);for(let i=0;i<2;i++)mod.addCollectionCard(l,d.id,n.id);assert.throws(()=>mod.addCollectionCard(l,d.id,n.id));mod.addCollectionCard(l,d.id,r.id);assert.throws(()=>mod.addCollectionCard(l,d.id,r.id));assert.throws(()=>mod.addCollectionCard(l,d.id,'special-egg'));assert.throws(()=>mod.addCollectionCard(l,l.data.decks[0].id,n.id));const before=l.exportJSON();s.setItem=()=>{throw Error('quota');};assert.throws(()=>mod.addCollectionCard(l,d.id,'M-dog-01'));assert.equal(l.exportJSON(),before);
 const shared=storage(),a=new DeckLibrary(shared);a.save();const b=new DeckLibrary(shared),empty=b.create('empty');a.rename(a.data.decks[0].id,'other');a.save();assert.throws(()=>mod.addCollectionCard(b,empty.id,n.id));assert.equal(empty.cards.length,0);assert.match(shared.getItem(MY_DECK_KEY),/other/);
});
test('deck creation works where secure-context randomUUID is unavailable',()=>{
 const original=globalThis.crypto;Object.defineProperty(globalThis,'crypto',{value:{getRandomValues:array=>original.getRandomValues(array)},configurable:true});
 try{const l=new DeckLibrary(storage());for(let i=0;i<18;i++)l.create('追加');assert.equal(new Set(l.data.decks.map(d=>d.id)).size,20);l.save();}finally{Object.defineProperty(globalThis,'crypto',{value:original,configurable:true});}
});
