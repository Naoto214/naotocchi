import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {tutorialPages} from '../tutorial.mjs';
const source=name=>fs.readFileSync(new URL('../'+name,import.meta.url),'utf8');
test('no added directional pad in approved touch UI',()=>{assert.doesNotMatch(source('index.html'),/id="directions"/);assert.doesNotMatch(source('app.mjs'),/directions.*innerHTML/)});
test('gravity book scenery remains at canonical A8',()=>{for(const s of tutorialPages.filter(s=>s.board.gravity)){const t=s.board.tiles.find(t=>t.catalogId==='sign.gravity');assert.deepEqual([t.x,t.y],[0,7])}});
test('board delegates to canonical painter instead of atlas replacement',()=>{assert.match(source('render.mjs'),/from ['"]\.\.\/naopoyo-time-hand-chapter1\/draw.mjs/);assert.match(source('render.mjs'),/from ['"]\.\.\/naopoyo-rescue\/fixtures.mjs/)});

test('approved input, motion and renderer dependency pins (including opt-in gate A animation)',async()=>{
 const {createHash}=await import('node:crypto');
 const root=new URL('../../../',import.meta.url);
 const pins=JSON.parse(fs.readFileSync(new URL('../../../docs/naopoyo-100-v2/shared-source-sha256.json',import.meta.url)));
 for(const [path,hash] of Object.entries(pins))assert.equal(createHash('sha256').update(fs.readFileSync(new URL(path,root))).digest('hex'),hash,path);
});
