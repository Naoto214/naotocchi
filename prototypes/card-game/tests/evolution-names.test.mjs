import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {createHash} from 'node:crypto';
import {filterCards} from '../my-decks.mjs';
import {CATALOG} from '../full-catalog.mjs';
import {collectionCards} from '../collection.mjs';
import {cardMarkup} from '../ui-presentation.mjs';
import * as e from '../engine.mjs';
const expected={"M-starfish-01": "浮かぶあかちゃん", "M-starfish-02": "透けたあかちゃん", "M-starfish-03": "色づく小さな星", "M-starfish-04": "ふっくらした星", "M-starfish-05": "金色の子ヒトデ", "M-starfish-06": "若いヒトデ", "M-starfish-07": "大人のヒトデ", "M-starfish-08": "長生きしたヒトデ", "M-sakura-01": "芽ぶきのたね", "M-world_tree-01": "光るたね", "M-world_tree-03": "若い木", "M-world_tree-07": "天にのびる木", "M-unknown-02": "ぷるたま", "M-unknown-03": "あしつきたま", "M-unknown-04": "ふたつぶたま", "M-unknown-05": "はねつきたま", "M-unknown-06": "おおたま", "M-unknown-07": "ちいさなたま", "M-unknown-08": "もどりの点"};
test('19候補名が本体・図鑑マスター・カード表示で一致する',()=>{
 const ctx={window:{}};vm.runInNewContext(fs.readFileSync(new URL('../../../character-world-master.v1.js',import.meta.url),'utf8'),ctx);
 const m=ctx.window.NAOTOCCHI_CHARACTER_WORLD_MASTER_V1;
 const species=Object.values(m.playerSpecies).flat();
 const expressions=JSON.parse(fs.readFileSync(new URL('../../../tools/expression-stage-names.json',import.meta.url)));
 assert.equal(Object.keys(expected).length,19);
 for(const [id,name] of Object.entries(expected)){
  const c=CATALOG[id],s=c.species.slice(2);
  assert.equal(c.form,name,id);assert.equal(species.find(x=>x.id===s).stages[c.stage-1],name,id);assert.equal(expressions[s][c.stage-1],name,id);
  assert.ok(cardMarkup(e.CARDS[id]).includes(name),id);
  assert.ok(collectionCards({query:name}).some(x=>x.id===id),id);
  for(const alias of c.searchAliases??[]){assert.ok(collectionCards({query:alias}).some(x=>x.id===id),alias);assert.ok(filterCards({query:alias}).some(x=>x.id===id),alias);}
 }
});
test('452 IDs・能力・数値・原典・正式名を保持する',()=>{
 const baseline=JSON.parse(fs.readFileSync(new URL('./fixtures/evolution-names-baseline.json',import.meta.url)));
 const kanji=JSON.parse(fs.readFileSync(new URL('../../../tools/kanji-display-names-v17-20261119.json',import.meta.url))).cards;
 const actual=Object.fromEntries(Object.entries(CATALOG).filter(([id])=>baseline.ids.includes(id)).map(([id,card])=>{const c={...card};if(kanji[id]){assert.equal(c.name,kanji[id].displayName);c.name=kanji[id].legacyNames[0];delete c.reading;delete c.searchAliases;delete c.displayNameVersion;}if(id==='E-special-trip-memory')for(const region of ['W-memory_lake','W-star_stop'])c.text=c.text.replace(kanji[region].displayName,kanji[region].legacyNames[0]);if(expected[id]){delete c.form;delete c.searchAliases;delete c.displayNameVersion;}return [id,c];}));
 assert.deepEqual(Object.keys(actual),baseline.ids);
 assert.equal(createHash('sha256').update(JSON.stringify(actual)).digest('hex'),baseline.sha256);
});
test('旧保存のversion/seed/decks/commandsを維持し再生できる',()=>{
 const fixtures=JSON.parse(fs.readFileSync(new URL('./fixtures/evolution-names-old-replays.json',import.meta.url)));
 assert.deepEqual(fixtures.map(x=>x.version),e.RULE_VERSIONS.filter(v=>v!=='hotseat-9'));
 for(const {save,stateSha256} of fixtures){
  const restored=e.restore(save);
  assert.equal(e.save(restored),save);
  assert.equal(createHash('sha256').update(JSON.stringify(restored)).digest('hex'),stateSha256);
 }
});
