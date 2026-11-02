import test from 'node:test';import assert from 'node:assert/strict';
import {ChapterSession,STORAGE_KEY} from '../session.mjs';
import {ChapterProgress} from '../progress.mjs';
import {ChapterSession as LegacySession} from '../archive/v5/session.mjs';
import {ChapterProgress as LegacyProgress} from '../archive/v5/progress.mjs';
import {solutionKey} from '../replay.mjs';
import {stages} from '../stages.mjs';
test('V6 namespace and strict definition identity prevent legacy actions/progress replay',()=>{
 assert.match(STORAGE_KEY,/\.v6$/);const q=new ChapterSession(0),initial=q.serialize();
 assert.equal(q.restore(new LegacySession(0).serialize()),false);assert.equal(q.serialize(),initial);
 const p=new ChapterProgress();assert.equal(p.restore(new LegacyProgress().serialize()),false);assert.equal(p.index,0);assert.equal(p.unlocked(1),false);
 const raw=JSON.parse(q.serialize());raw.definition='other-board';assert.equal(q.restore(raw),false);
 assert.ok(new ChapterSession(0).restore(initial));assert.ok(new ChapterProgress().restore(p.serialize()));
});
test('example identity changes when board/rules change, even for same witness',()=>{
 const key=solutionKey(0);const old=stages[0].board.id;stages[0].board.id+='-changed';try{assert.notEqual(solutionKey(0),key);}finally{stages[0].board.id=old;}
});
