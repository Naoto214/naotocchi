import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
const read=p=>{const u=new URL(p,import.meta.url);return JSON.parse(existsSync(u)?readFileSync(u):gunzipSync(readFileSync(new URL(p+'.gz',import.meta.url))));};
const data=JSON.parse(readFileSync(process.argv[2]||'/workspace/sites/card-design-v7/.sites-checkout/dist/v7/data.json'));
const cards=new Map(data.cards.map(c=>[c.id,c]));
const small=read('qa/v7-audit.json'),large=read('qa/v7-large-audit.json');
assert.equal(large.length,459);assert.equal(new Set(large.map(r=>r.id)).size,459);
assert.equal(read('qa/v7-interactions.json').length,28);assert.equal(read('qa/stat-ink-results.json').rows.length,22);
for(const width of [320,375,390,430]){const rows=small.filter(a=>a.width===width).flatMap(a=>a.rows);assert.equal(rows.length,459);assert.equal(new Set(rows.map(r=>r.id)).size,459);}
for(const row of [...small.flatMap(a=>a.rows),...large]){
 assert(row.titleOverflow<=.2,row.id);assert(row.contentBottomGap>=0,row.id);assert.equal(row.contentWidthOverflow,0,row.id);assert(row.auxArtGap===null||row.auxArtGap>0,row.id);assert(row.titleCostVerticalGap>0,row.id);
 assert.equal(row.costAligned,'metrics',row.id);
 if(row.cells.length){assert.equal(row.cells.length,2);assert(Math.abs(row.cells[0].width-row.cells[1].width)<=.02,row.id);assert.equal(Number(row.cells[0].value),cards.get(row.id).power);assert.equal(Number(row.cells[1].value),cards.get(row.id).wisdom);assert(row.cells.every(c=>c.aligned==='metrics'));}
 const c=cards.get(row.id);assert.equal(row.fullLength,Array.from(c.text+(c.married||'')).length);
 if(row.effect==='excerpt'){assert(row.visibleLength>0&&row.visibleLength<row.fullLength);const visible=row.excerpt.replace(/^こいびとのとき/,'').replace('♥ 結婚したら','').replace(/…$/,'');assert((c.text+(c.married||'')).startsWith(visible),row.id);}
 else assert.equal(row.visibleLength,row.fullLength);
}
for(const row of read('qa/v7-interactions.json')){assert.deepEqual(row.text,[cards.get(row.id).text]);assert.equal(row.font,'16px');}
for(const row of read('qa/stat-ink-results.json').rows){assert(Math.abs(row.inkOffset.x)<=1);assert(Math.abs(row.inkOffset.y)<=1);}
for(const a of read('qa/v7-cost-audit-320.json'))for(const r of a.rows)assert(r.costClearance>0,r.id);
console.log(JSON.stringify({viewportCardChecks:1836,largeCardChecks:459,modalExtraChecks:28,statInkGlyphChecks:22,canonicalPrefix:true,valuesUnchanged:true}));
