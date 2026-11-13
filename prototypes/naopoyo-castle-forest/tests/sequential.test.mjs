import test from 'node:test';import assert from 'node:assert/strict';
globalThis.location={search:'?mode=sequential'};
const {ChapterProgress}=await import('../progress.mjs');const {STORAGE_KEY}=await import('../session.mjs');const {solutions}=await import('../solutions.mjs');
test('sequential mode unlocks one level at a time and keeps its own save key',()=>{assert(STORAGE_KEY.endsWith('.sequential'));const p=new ChapterProgress();assert(p.unlocked(0));assert(!p.unlocked(1));for(let i=0;i<10;i++){assert(p.unlocked(i));for(const a of solutions[i])p.sessions[i].step(...a);p.record();const copy=new ChapterProgress();assert(copy.restore(p.serialize()));assert(copy.completed[i]);assert(i===9||copy.unlocked(i+1));assert(i>=8||!copy.unlocked(i+2));}});
