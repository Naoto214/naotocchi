import assert from 'node:assert/strict';import fs from 'node:fs';
assert.ok(fs.existsSync(new URL('clock-v10.mjs',import.meta.url)),'V10 renderer required');
const {render,sample,overlapCases}=await import('./clock-v10.mjs');
const {render:old}=await import('../v9/clock-v9.mjs');
const norm=s=>s.replace(/v6-\d+/g,'ID');let count=0;
for(const variant of ['A','B','C'])for(let end=1;end<=12;end++)for(const c of overlapCases)for(const growth of [0,50,100]){
 const st={...sample,...c.state,end,firstGrowth:growth,secondGrowth:100-growth};
 const s=render(st,{variant}),base=old(st,{variant:'B'});
 const nums=[...s.matchAll(/<g data-main-number="(\d+)"><text[^>]*font-size="([^"]+)"[^>]*>(\d+)<\/text><\/g>/g)];
 assert.equal(nums.length,12);nums.forEach((m,i)=>{assert.equal(+m[1],i+1);assert.equal(+m[3],i+1);assert.equal(+m[2],{A:40,B:44,C:46}[variant]);});
 const reset=s.replace(/(<g data-main-number="\d+"><text[^>]*font-size=")[^"]+/g,(_,prefix)=>prefix+'40');
 assert.equal(norm(reset),norm(base),'Only main numeral font-size may change');count++;
}
assert.throws(()=>render(sample,{variant:'invalid'}));
const result={cases:count,onlyMainFontSizeChanged:true,pass:true};fs.writeFileSync(new URL('evidence/verification.json',import.meta.url),JSON.stringify(result,null,2));console.log(result);
