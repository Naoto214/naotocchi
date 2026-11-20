import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import {execFileSync} from 'node:child_process';
import {CATALOG} from '../full-catalog.mjs';import {filterCards} from '../my-decks.mjs';
const approved=JSON.parse(fs.readFileSync(new URL('./fixtures/approved-seven-v18.json',import.meta.url)));
const names={'W-time-ix':'時のカード IX','W-time-x':'時のカード X','W-time-xi':'時のカード XI','W-time-xii':'時のカード XII','E-hayajimai':'早じまい','E-nagaiki':'長生きの秘訣','E-omoide-photo':'思い出の写真'};
const oldText=execFileSync('git',['show','526b326d16717fca46ce585fc32638e8b852d15d:prototypes/card-game/full-catalog.mjs'],{cwd:new URL('../../../',import.meta.url),encoding:'utf8'});
const old=JSON.parse(oldText.slice(oldText.indexOf('{'),oldText.lastIndexOf(';')));
test('formal459 contains exactly original452 plus seven approved IDs',()=>{assert.equal(Object.keys(CATALOG).length,459);assert.deepEqual(Object.keys(CATALOG).filter(id=>!old[id]).sort(),Object.keys(names).sort());});
test('existing452 catalog entries retain IDs, effects, numeric fields and name metadata exactly',()=>{for(const [id,c]of Object.entries(old))assert.deepEqual(CATALOG[id],c,id);});
for(const [id,name]of Object.entries(names))test(`${id} retains approved effect/cost and formal name`,()=>{const c=CATALOG[id],src=approved.cards[id];assert.ok(c,id);assert.equal(c.name,name);for(const key of ['id','type','cost','rare','text','method'])assert.deepEqual(c[key],src[key],key);assert(filterCards({query:src.name}).some(c=>c.id===id),'old-name search');});
