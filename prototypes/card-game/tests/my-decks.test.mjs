import test from 'node:test';
import assert from 'node:assert/strict';
import {DEFAULT_DECK,CARDS,validateDeck,createGame} from '../engine.mjs';
import {DeckLibrary,MY_DECK_KEY,LEGACY_DECK_KEY,MAX_DECKS,filterCards} from '../my-decks.mjs';
const storage=()=>{const m=new Map();return {getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,v)}};
test('migrates A/B independently, never changes legacy or match saves and persists names and selections',()=>{
 const s=storage(),b=[...DEFAULT_DECK].reverse(),old=JSON.stringify({A:DEFAULT_DECK,B:b});s.setItem(LEGACY_DECK_KEY,old);s.setItem('naotocchi-cpu-match-v1','sentinel');
 const x=new DeckLibrary(s);assert.deepEqual(x.selectedDecks(),{A:DEFAULT_DECK,B:b});x.rename(x.data.decks[0].id,'お気に入り');x.save();
 const y=new DeckLibrary(s);assert.equal(y.data.decks[0].name,'お気に入り');assert.equal(s.getItem(LEGACY_DECK_KEY),old);assert.equal(s.getItem('naotocchi-cpu-match-v1'),'sentinel');
});
test('create clone edit delete and independent selection retain distinct identities',()=>{
 const x=new DeckLibrary(storage()),a=x.data.decks[0];const b=x.duplicate(a.id);x.rename(b.id,'複製');x.select('B',b.id);x.change(b.id,b.cards[0],-1);assert.equal(a.cards.length,40);assert.equal(x.selectedDecks().B.length,39);assert.throws(()=>validateDeck(x.selectedDecks().B));x.remove(b.id);assert.equal(x.selectedDecks().B.length,40);
 const empty=x.create('空');assert.equal(empty.cards.length,0);while(x.data.decks.length<MAX_DECKS)x.create('追加');assert.throws(()=>x.create('超過'));assert.throws(()=>x.duplicate(a.id));
});
test('copy limits and forty-card bound are enforced; invalid inputs never mutate',()=>{
 const x=new DeckLibrary(storage()),d=x.create('新規'),normal=Object.values(CARDS).find(c=>!c.rare),rare=Object.values(CARDS).find(c=>c.rare);
 for(let i=0;i<3;i++)x.change(d.id,normal.id,1);assert.throws(()=>x.change(d.id,normal.id,1));x.change(d.id,rare.id,1);assert.throws(()=>x.change(d.id,rare.id,1));assert.throws(()=>x.change(d.id,'toString',1));assert.throws(()=>x.rename(d.id,' '));assert.throws(()=>x.rename(d.id,'名'.repeat(49)));const full=x.data.decks[0];assert.throws(()=>x.change(full.id,normal.id,1));
});
test('JSON roundtrip and old A/B import append without loss and reject malicious schema atomically',()=>{
 const x=new DeckLibrary(storage());x.create('途中');const raw=x.exportJSON(),y=new DeckLibrary(storage());y.importJSON(raw);assert.equal(y.data.decks.length,5);assert.equal(new Set(y.data.decks.map(d=>d.id)).size,5);
 y.importJSON(JSON.stringify({version:1,decks:{A:DEFAULT_DECK,B:DEFAULT_DECK}}));assert.equal(y.data.decks.length,7);
 for(const mutate of [d=>d.decks[1].id=d.decks[0].id,d=>d.decks[0].cards=Array(41).fill(DEFAULT_DECK[0]),d=>d.decks[0].cards=['__proto__'],d=>d.decks[0].cards=Array(4).fill(DEFAULT_DECK[0]),d=>d.version=999,d=>d.selected.A='missing']){
 const data=JSON.parse(raw);mutate(data);const before=y.exportJSON();assert.throws(()=>y.importJSON(JSON.stringify(data)));assert.equal(y.exportJSON(),before);
 }
});
test('bad existing data stays untouched; quota failures leave edits available for export',()=>{
 const s=storage();s.setItem(MY_DECK_KEY,'broken');assert.throws(()=>new DeckLibrary(s));assert.equal(s.getItem(MY_DECK_KEY),'broken');
 const x=new DeckLibrary(storage());x.storage.setItem=()=>{throw Error('quota')};x.rename(x.data.decks[0].id,'未保存');assert.throws(()=>x.save());assert.match(x.exportJSON(),/未保存/);
});
test('catalog filters cover all cards, attribute, species and stage in combination',()=>{
 assert.equal(filterCards({}).length,452);const c=Object.values(CARDS).find(c=>c.type==='main');assert.equal(filterCards({species:c.species}).length,8);assert.equal(filterCards({species:c.species,stage:String(c.stage)}).length,1);assert.ok(filterCards({attribute:c.attribute}).every(v=>v.attribute===c.attribute));assert.equal(filterCards({query:c.id})[0].id,c.id);assert.ok(filterCards({type:'item'}).every(v=>v.type==='item'));
});
test('selected arrays are independent from the library and valid for existing engine',()=>{const x=new DeckLibrary(storage()),d=x.selectedDecks();createGame(123,d);d.A.pop();assert.equal(x.selectedDecks().A.length,40);});
test('explicit restore can recover a full 20-deck backup with selected seats; default import never replaces',()=>{
 const source=new DeckLibrary(storage());while(source.data.decks.length<MAX_DECKS)source.create('保管');source.select('B',source.data.decks.at(-1).id);const raw=source.exportJSON(),dest=new DeckLibrary(storage()),before=dest.exportJSON();assert.throws(()=>dest.importJSON(raw));assert.equal(dest.exportJSON(),before);dest.importJSON(raw,{replace:true});assert.equal(dest.data.decks.length,20);assert.equal(dest.get(dest.data.selected.B).name,'保管');const invalid=JSON.parse(raw);invalid.decks[0].cards=['bad'];const good=dest.exportJSON();assert.throws(()=>dest.importJSON(JSON.stringify(invalid),{replace:true}));assert.equal(dest.exportJSON(),good);
});
test('stale writers fail even before a storage event and retain edits for export',()=>{
 const s=storage(),first=new DeckLibrary(s);first.save();const stale=new DeckLibrary(s);first.rename(first.data.decks[0].id,'別タブの更新');first.save();stale.rename(stale.data.decks[0].id,'こちらの編集');assert.throws(()=>stale.save(),/別タブ/);assert.match(s.getItem(MY_DECK_KEY),/別タブの更新/);assert.match(stale.exportJSON(),/こちらの編集/);
});
