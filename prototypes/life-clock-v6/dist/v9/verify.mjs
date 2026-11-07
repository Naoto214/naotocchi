import assert from 'node:assert/strict';import fs from 'node:fs';
assert.ok(fs.existsSync(new URL('clock-v9.mjs',import.meta.url)),'V9 renderer required');
const {render,sample,romans}=await import('./clock-v9.mjs');const {render:old,overlapCases}=await import('../v8/clock-v8.mjs');
const norm=s=>s.replace(/v6-\d+/g,'ID');
const hand=(s,i)=>s.match(new RegExp(`<g data-hand="${i}"[\\s\\S]*?<\\/g>`))[0];
const group=(s,attr)=>{const start=s.indexOf('<g '+attr),tags=/<g\b[^>]*>|<\/g>/g;tags.lastIndex=start;let depth=0,m;while(m=tags.exec(s)){depth+=m[0].startsWith('</')?-1:1;if(!depth)return s.slice(start,tags.lastIndex)}throw Error(attr)};
let count=0;
for(const v of ['A','B','C'])for(const end of (v==='A'?[10,11,12]:Array.from({length:12},(_,i)=>i+1)))for(const crop of ['full','end','hands','first','second'])for(const c of overlapCases){const st={...sample,...c.state,end},a=render(st,{variant:v,crop}),b=old({...st,end:v==='A'?end:10},{variant:'C',crop});if(v==='A')assert.equal(norm(a),norm(b));else{
 for(const i of [0,1,2,3,4])assert.equal(norm(hand(a,i)),norm(hand(b,i)));
 for(const attr of ['data-subdial="0"','data-subdial="1"','data-v6-blue="true"','data-bezel-width="40"','data-main-ticks="60"'])assert.equal(norm(group(a,attr)),norm(group(b,attr)));
 const labels=[...a.matchAll(/data-end-number="([IVX]+)" data-angle="(\d+)"/g)];assert.deepEqual(labels.map(m=>m[1]),romans);assert.deepEqual(labels.map(m=>+m[2]),Array.from({length:12},(_,i)=>(i+1)*30%360));
 const h=hand(a,5);assert.ok(h.includes(`data-angle="${end*30%360}"`));assert.ok(h.includes(`transform="rotate(${end*30%360} 512 688)"`));assert.equal(h.match(/ d="[^"]+"/)[0],hand(b,5).match(/ d="[^"]+"/)[0]);
 for(let n=1;n<=12;n++){const g=group(a,`data-main-number="${n}"`);assert.ok(g.includes(`>${n}</text>`));assert.ok(g.includes('font-size="40"'));}
 assert.ok(!a.includes('data-marker='));assert.equal((a.match(/data-end-number=/g)||[]).length,12);
 }count++;}
for(const v of ['B','C'])for(const end of [0,13,1.5,NaN])assert.throws(()=>render({...sample,end},{variant:v}));assert.throws(()=>render({...sample,end:9},{variant:'A'}));
for(const v of ['B','C'])for(const growth of [0,100]){const s=render({...sample,firstGrowth:growth,secondGrowth:growth},{variant:v});assert.equal((s.match(/data-complete=/g)||[]).length,growth===100?2:0);}
const result={geometryAndAngleCases:count,endRange:'1–12 for B/C; 10–12 for exact A',pass:true};fs.writeFileSync(new URL('evidence/verification.json',import.meta.url),JSON.stringify(result,null,2));console.log(result);
