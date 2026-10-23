import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
test('seven distinct 8x8 insight puzzles have three opt-in hints and replayable solutions', async()=>{
 const url=new URL('../stages.mjs',import.meta.url);
 assert.ok(fs.existsSync(url),'insight stage catalog is missing');
 const {stages}=await import(url);
 assert.equal(stages.length,7); assert.equal(new Set(stages.map(s=>s.id)).size,7);
 for(const s of stages){assert.equal(s.w,8);assert.equal(s.h,8);assert.equal(s.hints.length,3);assert.ok(s.difficulty>=1&&s.difficulty<=6);assert.ok(s.insight)}
 const {solve}=await import('../witness.mjs');
 for(const s of stages){const result=solve(s);assert.equal(result.complete,true,s.id);assert.ok(result.commands.length>0)}
});
