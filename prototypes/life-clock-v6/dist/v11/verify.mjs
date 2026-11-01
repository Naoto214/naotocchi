import assert from 'node:assert/strict';import fs from 'node:fs';
assert.ok(fs.existsSync(new URL('clock-v11.mjs',import.meta.url)),'V11 renderer required');
const {render,sample,overlapCases}=await import('./clock-v11.mjs');
const {render:old}=await import('../v10/clock-v10.mjs');
const norm=s=>s.replace(/v6-\d+/g,'ID');
const strip=s=>norm(s.replace(/<g data-main-number="\d+"[\s\S]*?<\/g>/g,''));let count=0;
for(const variant of ['A','B','C','D','E'])for(let end=1;end<=12;end++)for(const c of overlapCases)for(const growth of [0,50,100]){
 const st={...sample,...c.state,end,firstGrowth:growth,secondGrowth:100-growth};
 const s=render(st,{variant}),base=old(st,{variant:'C'});
 assert.equal(strip(s),strip(base),'Only main numerals may change');
 if(variant==='A')assert.equal(norm(s),norm(base),'A must exactly preserve V10 C');
 const nums=[...s.matchAll(/<g data-main-number="(\d+)"[^>]*><text([^>]*)>(\d+)<\/text><\/g>/g)];assert.equal(nums.length,12);
 for(const m of nums){assert.equal(m[1],m[3]);assert.equal(+m[2].match(/font-size="([^"]+)/)[1],{A:46,B:46,C:48,D:50,E:52}[variant]);
  if(variant!=='A'){const x=+m[2].match(/ x="([^"]+)/)[1],y=+m[2].match(/ y="([^"]+)/)[1];const a=(Math.atan2(x-512,500-y)*180/Math.PI+360)%360;assert.ok(Math.abs(a-(+m[1]*30%360))<.001);}
 }count++;
}
assert.throws(()=>render(sample,{variant:'invalid'}));
const result={cases:count,AexactV10C:true,nonNumeralSvgIdentical:true,pass:true};fs.writeFileSync(new URL('evidence/verification.json',import.meta.url),JSON.stringify(result,null,2));console.log(result);
