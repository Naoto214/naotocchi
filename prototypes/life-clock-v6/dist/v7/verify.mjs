import assert from 'node:assert/strict';import fs from 'node:fs';
assert.ok(fs.existsSync(new URL('clock-v7.mjs',import.meta.url)),'V7 renderer exists');
const {render,variants,sample,overlapCases}=await import('./clock-v7.mjs');
const {render:old}=await import('../v6/clock-v6.mjs');
const tail=s=>s.slice(s.indexOf('<g data-hand='));let count=0;
for(const v of Object.keys(variants))for(const [k,max,step,min] of [['round',12,1,0],['firstTime',12,1,0],['secondTime',12,1,0],['firstGrowth',100,5,0],['secondGrowth',100,5,0],['end',12,1,10]])for(let n=min;n<=max;n+=step){const st={...sample,[k]:n},a=render(st,{variant:v}),b=old(st,{variant:'metalB',sameScale:true});assert.equal(tail(a),tail(b));assert.deepEqual([...a.matchAll(/<text [^>]*>[^<]*<\/text>/g)].map(m=>m[0]),[...b.matchAll(/<text [^>]*>[^<]*<\/text>/g)].map(m=>m[0]));assert.equal(a.match(/viewBox="[^"]*"/)[0],b.match(/viewBox="[^"]*"/)[0]);count++;}
for(const v of Object.keys(variants))for(const c of overlapCases){const st={...sample,...c.state};assert.equal(tail(render(st,{variant:v})),tail(old(st,{variant:'metalB',sameScale:true})));}
assert.ok(render().includes('data-bezel-width="40"'));assert.ok(render().includes('data-fine-metal="true"'));assert.ok(render().includes('data-narrow-light="true"'));
for(const crop of ['first','second','end'])assert.equal(tail(render(sample,{crop})),tail(old(sample,{variant:'metalB',crop,sameScale:true})));
for(const variant of ['light','soft','candidate']){const svg=render(sample,{variant});for(const fragment of ['r="493" fill="none"','r="513" fill="none"','r="510.5" fill="none"','stroke-width="40"'])assert.ok(svg.includes(fragment));if(variant!=='light')assert.equal((svg.match(/stroke-width=".3"/g)||[]).length,312);}
const result={validValueCases:count,overlapCases:Object.keys(variants).length*6,pass:true};fs.writeFileSync(new URL('evidence/verification.json',import.meta.url),JSON.stringify(result,null,2));console.log(result);
