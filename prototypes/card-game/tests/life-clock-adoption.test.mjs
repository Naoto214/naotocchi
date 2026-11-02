import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {renderClock,renderBack} from '../life-clock-render.mjs';
import {render,renderBack as adoptedBack} from '../life-clock/v23/clock-v23.mjs';
import {sample,overlapCases} from '../life-clock/clock.mjs';
const norm=s=>s.replace(/v6-\d+/g,'v6-ID').replace(/(?:file|https?):[^"<>]*\/life-clock\/v16\//g,'../v16/');
test('actual CARD GAME equals adopted V23 in all overlap conditions, including bearing and back',()=>{
 for(const c of overlapCases){const state={...sample,...c.state};const actual=renderClock(state);assert.equal(norm(actual),norm(render(state)));assert.deepEqual([...actual.matchAll(/<g data-hand="([012])"/g)].map(m=>+m[1]),[2,1,0]);assert.doesNotMatch(actual,/data-v24/);}
 assert.equal(norm(renderBack()),norm(adoptedBack()));
});
test('canonical adoption and archived comparison cannot follow a rejected renderer',()=>{
 const m=JSON.parse(fs.readFileSync(new URL('../life-clock/provenance.json',import.meta.url)));
 assert.equal(m.adoption.design,'V23');assert.equal(m.adoption.renderer,'v23/clock-v23.mjs');assert.equal(m.adoption.baselineCommit,'0ac97d1681c117dc1ceb1744172418bb9d5f412f');assert.equal(m.history.find(h=>h.version==='V24').status,'rejected');
 const compare=fs.readFileSync(new URL('../life-clock/v24/compare.html',import.meta.url),'utf8');assert.match(compare,/v24\/clock-v24.mjs/);assert.doesNotMatch(compare,/from '\/prototypes\/card-game\/life-clock-render.mjs'/);
});
