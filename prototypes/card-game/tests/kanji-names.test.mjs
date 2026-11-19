import test from 'node:test';
import assert from 'node:assert/strict';
import {CARDS} from '../engine.mjs';
import {collectionCards} from '../collection.mjs';
import {filterCards} from '../my-decks.mjs';
const pairs=[['I-scarf','きゅうきゅうばこ','救急箱'],['W-memory_lake','きおくのみずうみ','記憶の湖'],['E-big-illness','おおきなびょうき','大きな病気'],['E-fateful-transform','うんめいのへんしん','運命の変身'],['W-star_stop','ほしぞらのていりゅうじょ','星空の停留所'],['E-stairs','どこにもつながらないかいだん','どこにもつながらない階段'],['E-boss','あやまりにきただいおういか','謝りにきた大王イカ'],['C-sekizou','むひょうじょうのせきぞう','無表情の石像'],['P-knitting_spider','あみものがすきなクモさん','編み物が好きなクモさん'],['E-special-trip-memory','とくべつなたびのおもいで','特別な旅の思い出'],['C-clock','じかんにルーズなとけい','時間にルーズな時計']];
for(const [id,old,name] of pairs)test(`${id}: approved title and old/new queries resolve same ID`,()=>{assert.equal(CARDS[id].name,name);for(const query of [old,name])for(const search of [filterCards,collectionCards])assert(search({query}).some(c=>c.id===id),query);});
test('travel effect references exact renamed regions; catalog remains452',()=>{assert.equal(Object.keys(CARDS).length,452);assert(CARDS['E-special-trip-memory'].text.includes('記憶の湖'));assert(CARDS['E-special-trip-memory'].text.includes('星空の停留所'));});

import fs from 'node:fs';
import vm from 'node:vm';
import {execFileSync} from 'node:child_process';
import {CATALOG} from '../full-catalog.mjs';
import * as engine from '../engine.mjs';
import {CollectionPreferences,COLLECTION_KEY} from '../collection.mjs';
import {DeckLibrary,MY_DECK_KEY} from '../my-decks.mjs';
const root=new URL('../../../',import.meta.url);
const meta=JSON.parse(fs.readFileSync(new URL('tools/kanji-display-names-v17-20261119.json',root)));
test('all452 identities and non-display fields equal baseline; only11 specified cards change',()=>{
 const raw=execFileSync('git',['show','38b4e9d0c8ed4cacdfc1cc6c072a7a9e62e5c053:prototypes/card-game/full-catalog.mjs'],{cwd:root,encoding:'utf8'});
 const before=JSON.parse(raw.slice(raw.indexOf('{'),raw.lastIndexOf(';')));
 const evolutionPath=new URL('tools/evolution-display-names-v13-20261119.json',root);
 const evolution=fs.existsSync(evolutionPath)?JSON.parse(fs.readFileSync(evolutionPath)).cards:{};
 assert.deepEqual(Object.keys(CATALOG),Object.keys(before));
 for(const [id,card] of Object.entries(CATALOG)){
  const actual={...card};
  if(meta.cards[id]){assert.equal(actual.name,meta.cards[id].displayName);actual.name=meta.cards[id].legacyNames[0];delete actual.reading;delete actual.searchAliases;delete actual.displayNameVersion;}
  if(id==='E-special-trip-memory')for(const region of ['W-memory_lake','W-star_stop'])actual.text=actual.text.replace(meta.cards[region].displayName,meta.cards[region].legacyNames[0]);
  if(evolution[id]){assert.equal(actual.form,evolution[id].displayName);actual.form=before[id].form;delete actual.searchAliases;delete actual.displayNameVersion;}
  assert.deepEqual(actual,before[id],id);
 }
 assert.equal(Object.keys(meta.cards).length,11);
 for(const id of Object.keys(meta.deferredCards))assert.equal(CARDS[id],undefined,id);
});
test('shared entity IDs use canonical spelling; current unrelated events preserved',()=>{
 const ctx={window:{}};vm.runInNewContext(fs.readFileSync(new URL('character-world-master.v1.js',root),'utf8'),ctx);
 const m=ctx.window.NAOTOCCHI_CHARACTER_WORLD_MASTER_V1;
 const find=(x,id)=>{if(!x||typeof x!=='object')return; if(x.id===id&&x.label)return x;for(const v of Object.values(x)){const r=find(v,id);if(r)return r;}};
 for(const [id,d] of Object.entries(meta.cards))if(d.mainEntityId&&d.mainEntityId!=='scarf')assert.equal(find(m,d.mainEntityId)?.label,d.displayName,id);
 const script=fs.readFileSync(new URL('script.js',root),'utf8');
 for(const name of ['救急箱','記憶の湖','星空の停留所','たまごのないところ','むかしのぼく'])assert(script.includes(name));
 assert(script.includes('p.label || WORLD_MASTER?.partners?.find'));
});
test('old saved decks and favorites retain IDs and serialized schema',()=>{
 const saved={version:1,decks:[{id:'legacy',name:'きおくのみずうみデッキ',cards:['I-scarf','W-memory_lake','C-sekizou']}],selected:{A:'legacy',B:'legacy'}};
 const prefs={version:1,favorites:saved.decks[0].cards,page:0,noticeSeen:true};
 const map=new Map([[MY_DECK_KEY,JSON.stringify(saved)],[COLLECTION_KEY,JSON.stringify(prefs)]]);
 const storage={getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,v)};
 const lib=new DeckLibrary(storage);lib.save();assert.deepEqual(JSON.parse(map.get(MY_DECK_KEY)),saved);
 const c=new CollectionPreferences(storage);c.update({});assert.deepEqual(JSON.parse(map.get(COLLECTION_KEY)),prefs);
});
test('all supported historical replay versions roundtrip without save migration',()=>{
 const fixtures=JSON.parse(fs.readFileSync(new URL('./fixtures/kanji-old-replays.json',import.meta.url)));
 assert.deepEqual(fixtures.map(x=>x.version),engine.RULE_VERSIONS);
 for(const {save} of fixtures)assert.equal(engine.save(engine.restore(save)),save);
});
