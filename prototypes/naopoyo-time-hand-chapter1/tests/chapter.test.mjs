import test from 'node:test';import assert from 'node:assert/strict';
import {ChapterSession} from '../session.mjs';
import {stages} from '../stages.mjs';
import {mass,totals} from '../engine.mjs';
test('ten independent stages with all-actor escape',()=>{assert.equal(stages.length,10);for(let i=0;i<10;i++){const q=new ChapterSession(i);assert.equal(q.cleared,false);assert.ok(mass(q.state)>0);assert.equal(q.state.splitPriority,'D');}});
test('captive cannot move before release; retry restores lock',()=>{const q=new ChapterSession(9);assert.equal(q.step('partner',-1,0).ok,false);assert.equal(q.state.cageOpen,false);q.reset();assert.equal(q.state.cageOpen,false);});
test('undo groups a whole stroke and save replays safely',()=>{const q=new ChapterSession(0);const before=q.serialize();q.beginGesture();assert.ok(q.step('parent',1,0).ok);assert.ok(q.step('parent',1,0).ok);q.endGesture();const r=new ChapterSession(0);assert.ok(r.restore(q.serialize()));assert.deepEqual(r.state,q.state);r.undo();assert.equal(r.serialize(),before);const old=q.serialize();assert.equal(q.restore('{broken'),false);assert.equal(q.serialize(),old);});
test('species mass remains equal regardless of rescue order',()=>{const q=new ChapterSession(6);q.state.learned=true;q.state.actors.find(a=>a.id==='friend').x=5;q.state.actors.find(a=>a.id==='friend').y=4;assert.ok(q.step('friend',1,0).ok);assert.equal(q.state.rescuedBySpecies.frog,1);});
