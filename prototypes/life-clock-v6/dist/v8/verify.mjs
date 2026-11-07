import assert from 'node:assert/strict';
import fs from 'node:fs';
assert.ok(fs.existsSync(new URL('clock-v8.mjs',import.meta.url)), 'V8 material renderer must exist');
const {render,variants,sample,overlapCases}=await import('./clock-v8.mjs');
const {render:old}=await import('../v7/clock-v7.mjs');
const normalize=s=>s.replace(/v6-\d+/g,'ID');
const geometry=s=>[...s.matchAll(/<g data-hand="[\s\S]*?<\/g>/g)].map(m=>({group:m[0].match(/^<g[^>]+>/)[0],outline:m[0].match(/ d="[^"]+"/)[0]}));
const labels=s=>[...s.matchAll(/<text[^>]*>[\s\S]*?<\/text>/g)].map(m=>m[0].replace(/fill="[^"]+"/g,''));
const fragments=s=>[s.match(/viewBox="[^"]+"/)[0],...s.matchAll(/<g data-main-ticks=[\s\S]*?<\/g>|<g data-v6-blue=[\s\S]*?<\/g>|<g data-bezel-width=[\s\S]*?<\/g>|<linearGradient data-narrow-light=[\s\S]*?<\/linearGradient>/g)].map(m=>normalize(typeof m==='string'?m:m[0]));
function check(st,v,crop='full') { const a=render(st,{variant:v,crop}),b=old(st,{variant:'soft',crop});assert.deepEqual(geometry(a),geometry(b));assert.deepEqual(labels(a),labels(b));assert.deepEqual(fragments(a),fragments(b));if(v==='reference')assert.equal(normalize(a),normalize(b));else {assert.equal((a.match(/data-sunray=/g)||[]).length,3);assert.equal((a.match(/data-metal-hand=/g)||[]).length,6);assert.ok(!a.includes('data-fine-metal'));} }
let count=0;for(const v of Object.keys(variants))for(const[k,max,step,min]of [['round',12,1,0],['firstTime',12,1,0],['secondTime',12,1,0],['firstGrowth',100,5,0],['secondGrowth',100,5,0],['end',12,1,10]])for(let n=min;n<=max;n+=step){check({...sample,[k]:n},v);count++;}
for(const v of Object.keys(variants))for(const c of overlapCases)for(const crop of ['full','hands','first','second','end'])check({...sample,...c.state},v,crop);
const result={validValueCases:count,overlapCropCases:4*6*5,pass:true};fs.writeFileSync(new URL('evidence/verification.json',import.meta.url),JSON.stringify(result,null,2));console.log(result);
