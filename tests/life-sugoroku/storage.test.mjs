import test from 'node:test';import assert from 'node:assert/strict';
let api={};try{api=await import('../../prototypes/life-sugoroku/storage.mjs');}catch{}
const memory=()=>{const values=new Map;return {getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,v)}};
test('stale tab is rejected before changing or overwriting the current match',()=>{assert.equal(typeof api.assertCurrentSave,'function');const s=memory();s.setItem('match','newer');assert.throws(()=>api.assertCurrentSave(s,'match','old'));assert.equal(s.getItem('match'),'newer');api.assertCurrentSave(s,'match','newer');});
test('corrupt primary falls back to validated backup without changing stored values',()=>{assert.equal(typeof api.readWithBackup,'function');const s=memory();s.setItem('match','{');s.setItem('match-backup','{"ok":true}');const r=api.readWithBackup(s,'match',JSON.parse);assert.deepEqual(r.value,{ok:true});assert.equal(r.recovered,true);assert.equal(s.getItem('match'),'{');});
