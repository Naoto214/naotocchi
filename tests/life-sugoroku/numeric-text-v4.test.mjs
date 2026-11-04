import test from 'node:test';import assert from 'node:assert/strict';
let M={};try{M=await import('../../prototypes/life-sugoroku/numeric-text-v4.mjs');}catch(e){if(e.code!=='ERR_MODULE_NOT_FOUND')throw e;}
test('60 authored numeric texts: 15 per effect with regional coverage',()=>{
 assert.equal(typeof M.chooseText,'function');assert.equal(Object.keys(M.TEXTS).length,4);
 for(const rows of Object.values(M.TEXTS)){assert.equal(rows.length,15);assert.equal(new Set(rows.map(r=>r.text)).size,15);assert.ok(rows.every(r=>r.text.length>10&&r.text.length<100));for(const region of ['home','forest','river_lake','mountain','countryside','city','sea'])assert.ok(rows.some(r=>r.regions.includes(region)));}
});
test('text choice uses supplied RNG, region and saved history, excluding immediate repeat',()=>{
 const history={};for(const type of Object.keys(M.TEXTS))for(const region of ['home','forest','river_lake','mountain','countryside','city','sea']){
 let last;for(let i=0;i<4;i++){const row=M.chooseText(type,region,history,()=>0);assert.notEqual(row.id,last);assert.ok(row.regions.includes(region));last=row.id;}
 const copy=JSON.parse(JSON.stringify(history));assert.deepEqual(M.chooseText(type,region,history,()=>0),M.chooseText(type,region,copy,()=>0));
 }
});
