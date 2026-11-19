import assert from 'node:assert/strict';import fs from 'node:fs';
assert.ok(fs.existsSync(new URL('clock-v12.mjs',import.meta.url)),'V12 renderer required');
const {render,sample,studies,overlapCases}=await import('./clock-v12.mjs');
const {render:old}=await import('../v11/clock-v11.mjs');
const norm=s=>s.replace(/v6-\d+/g,'ID');
const strip=s=>norm(s.replace(/<g data-(?:main|growth|end)-number="[^"]+"[\s\S]*?<\/g>/g,''));let count=0;
for(const opts of Object.values(studies).flat())for(let end=1;end<=12;end++)for(const c of overlapCases)for(const growth of [0,50,100]){
 const state={...sample,...c.state,end,firstGrowth:growth,secondGrowth:100-growth};const s=render(state,opts),base=old(state,{variant:'E'});
 assert.equal(strip(s),strip(base),'all non-numeral artwork and hands must match V11 E');
 assert.equal([...s.matchAll(/data-main-number=/g)].length,12);assert.equal([...s.matchAll(/data-end-number=/g)].length,12);assert.equal([...s.matchAll(/data-growth-number=/g)].length,20);
 const nums=[...s.matchAll(/data-main-number="(\d+)"><text([^>]*)>(\d+)</g)];
 for(const m of nums){assert.equal(m[1],m[3]);assert.equal(+m[2].match(/font-size="([^"]+)/)[1],opts.main||52);}
 const growthSizes=[...s.matchAll(/data-growth-number="\d+"><text[^>]*font-size="([^"]+)/g)].map(m=>+m[1]);assert.ok(growthSizes.every(x=>Math.abs(x-15*(opts.growth||1))<1e-8));
 count++;
}
console.log(JSON.stringify({pass:true,cases:count,nonNumeralSvgIdentical:true}));
assert.equal(norm(render(sample,{reference:true})),norm(old(sample,{variant:'E'})),'Reference must be exact V11 E');
for(const o of studies.main){const s=render(sample,o);for(const m of s.matchAll(/data-main-number="(\d+)"><text([^>]*)>/g)){const x=+m[2].match(/ x="([^"]+)/)[1],y=+m[2].match(/ y="([^"]+)/)[1],angle=(Math.atan2(x-512,500-y)*180/Math.PI+360)%360;assert.ok(Math.abs(angle-(+m[1]*30%360))<1e-6);}}
for(const o of studies.growth){const s=render(sample,o),g=[...s.matchAll(/data-growth-number="(\d+)"><text([^>]*)>/g)];for(let i=0;i<10;i++){const x=m=>+m[2].match(/x="([^"]+)/)[1],y=m=>+m[2].match(/y="([^"]+)/)[1];assert.ok(Math.abs(x(g[i+10])-x(g[i])-372)<1e-8);assert.equal(y(g[i]),y(g[i+10]));}}
console.log(JSON.stringify({referenceExact:true,mainThirtyDegrees:true,growthSymmetry:true}));
