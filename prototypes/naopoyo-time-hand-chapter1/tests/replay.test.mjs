import test from 'node:test';import assert from 'node:assert/strict';
import {ChapterSession} from '../session.mjs';import {ExampleReplay,solutionKey} from '../replay.mjs';import {solutions} from '../solutions.mjs';import {mass,totals} from '../engine.mjs';
for(let i=0;i<10;i++)test(`stage ${i+1}: witness, mass, save, undo, retry and independent demo`,()=>{
 const live=new ChapterSession(i),before=live.serialize(),q=new ChapterSession(i),initial=totals(q.state);
 for(const step of solutions[i]){const old=q.serialize();assert.ok(q.step(...step).ok);assert.deepEqual(totals(q.state),initial);const restored=new ChapterSession(i);assert.ok(restored.restore(q.serialize()));assert.deepEqual(restored.state,q.state);assert.ok(restored.undo());assert.equal(restored.serialize(),old);}
 assert.ok(q.cleared);assert.equal(q.state.actors.length,0);const demo=new ExampleReplay(i);while(demo.next()){}assert.ok(demo.session.cleared);assert.equal(demo.index,solutions[i].length);demo.previous();assert.equal(demo.index,solutions[i].length-1);demo.reset();assert.equal(demo.index,0);assert.equal(live.serialize(),before);q.reset();assert.equal(q.serialize(),before);
});
test('partner rescue remains ordinary all-actor escape',()=>{const q=new ChapterSession(9);for(const a of solutions[9])assert.ok(q.step(...a).ok);assert.ok(q.cleared);assert.ok(q.undo());assert.equal(q.cleared,false);});
test('solution fingerprint changes with path; malformed/incomplete demo fails',()=>{assert.notEqual(solutionKey(0),solutionKey(0,[]));assert.throws(()=>new ExampleReplay(0,[]));assert.throws(()=>new ExampleReplay(0,[['parent',7,0]]));});
