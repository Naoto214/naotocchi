import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
const read=p=>{const u=new URL('qa/'+p,import.meta.url);return JSON.parse(existsSync(u)?readFileSync(u):gunzipSync(readFileSync(new URL('qa/'+p+'.gz',import.meta.url))));};
const data=JSON.parse(readFileSync(process.argv[2]||'/workspace/sites/card-design-v8/.sites-checkout/dist/v8/data.json')),cards=new Map(data.cards.map(c=>[c.id,c]));
const audit=read('card-audit.json');
for(const w of [320,375,390,430])for(const surface of ['collection','hand','board']){const rows=audit.filter(a=>a.width===w&&a.surface===surface).flatMap(a=>a.rows);assert.equal(rows.length,460);assert.equal(new Set(rows.map(r=>r.id)).size,460);assert.equal(rows.filter(r=>r.rare).length,76);}
for(const r of audit.flatMap(a=>a.rows)){
 assert(r.titleOverflow<=.2,r.id);assert.equal(r.nowrap,'nowrap');assert.equal(r.ruby,0);assert.equal(r.bodyCount,0);assert(r.auxArtGap===null||r.auxArtGap>=0);assert(r.costGap===null||r.costGap>=0);assert(r.costRight===null||r.costRight>0);
 if(r.id==='egg'){assert.equal(r.cells.length,0);assert.equal(r.rare,false);continue;}
 const c=cards.get(r.id);assert.equal(r.title,c.title);assert.equal(r.rare,c.rare);assert.equal(r.costAlign,'metrics');
 if(c.type==='main'){assert.equal(r.cells.length,2);assert(Math.abs(r.cells[0].width-r.cells[1].width)<=.02);assert.equal(Number(r.cells[0].value),c.power);assert.equal(Number(r.cells[1].value),c.wisdom);assert(r.cells.every(c=>c.align==='metrics'));}else assert.equal(r.cells.length,0);
}
const large=read('large-audit.json');assert.equal(large.length,460);assert.equal(new Set(large.map(x=>x.id)).size,460);for(const r of large){assert(r.titleOverflow<=.2);assert(r.costGap===null||r.costGap>=0);assert(r.auxArtGap===null||r.auxArtGap>=0);}
const interactions=read('interactions.json');assert.equal(interactions.length,48);
for(const r of interactions){if(r.id==='egg'){assert(r.eggText.includes('たんじょう'));continue;}const c=cards.get(r.id);assert.deepEqual(r.texts,c.married?[c.text,c.married]:[c.text]);for(const l of r.layout)assert(l.titleOverflow<=.2);}
const battle=read('battle-final.json');assert.equal(battle.length,4);
for(const a of battle){assert.equal(a.legacy,0);for(const r of a.rows){assert(r.titleOverflow<=.2);assert(r.costGap===null||r.costGap>=0);assert.equal(r.bodyCount,0);}assert(a.labels.every(l=>l.labelGap>=0));}
for(const a of read('palette-final.json')){assert.equal(a.labels.length,15);assert(a.labels.every(l=>l.labelGap>=0));assert(a.outside.every(l=>l.overflow<=.2));}
assert(read('battle-checks.json').some(x=>x.check==='declaration-cancel-repeat-commit'));
console.log(JSON.stringify({viewportCards:5520,largeCards:460,canonicalDetails:48,battleWidths:4,paletteAndEggHeaders:60,overlapFailures:0,normalBodyCount:0}));

const delivery=read('image-delivery.json');assert.equal(delivery.length,460);assert.equal(delivery.filter(r=>r.src.startsWith('https://')).length,418);assert(delivery.every(r=>r.complete&&r.width>=890&&r.height>=680));console.log(JSON.stringify({largeImageLoads:460,officialPublishedLoads:418,failedImages:0}));
