import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createRequire} from 'node:module';
import {PlayerStore} from '../../growth-chain/player-store.mjs';
const {JSDOM}=createRequire(import.meta.url)(process.env.JSDOM_PATH||'/tmp/naopoyo-ui-deps/node_modules/jsdom');
const dom=new JSDOM(fs.readFileSync(new URL('../../naopoyo/index.html',import.meta.url),'utf8'),{url:'http://localhost/'});
for(const k of ['window','document','localStorage','location'])globalThis[k]=dom.window[k];
for (const [key, score, gaugeUnit] of [['naopoyo-player-v1',999,8],['naopoyo-growth-clear-phone-v1',123,2]]) {
 const s=new PlayerStore(localStorage,key);s.load();s.save(null,[{id:key,category:'clear',outcome:'clear',gaugeUnit,score,drops:12,deaths:1,maxChain:3}]);
}
const newStore=new PlayerStore(localStorage,'naopoyo-growth-clear-phone-v1');newStore.load();newStore.save(null,[{id:'comparison',category:'clear',outcome:'clear',gaugeUnit:8,score:456,drops:24,deaths:1,maxChain:5}]);
const before={...localStorage};
await import('../../naopoyo/series.mjs');
const $=id=>document.getElementById(id);
$('recordsButton').click();$('dropRecords').click();
assert.match($('summary').textContent,/2 \/ 6.*123点/);
assert.match($('summary').textContent,/開発比較 8 \/ 24.*456点/);
assert.doesNotMatch($('history').textContent,/999点/);
$('legacyDropRecords').click();assert.match($('history').textContent,/999点/);assert.doesNotMatch($('history').textContent,/123点|456点/);
$('slideRecords').click();assert.doesNotMatch($('history').textContent,/999点|123点|456点/);
assert.deepEqual({...localStorage},before);
console.log('PASS standard/comparison/legacy/slide records separated; no storage writes');
