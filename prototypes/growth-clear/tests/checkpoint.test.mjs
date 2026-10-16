import test from 'node:test';
import assert from 'node:assert/strict';
import {Player} from '../player-model.mjs';
import {createSession,stateHash} from '../session.mjs';
test('paused animation checkpoint preserves the accepted action without changing live phase',()=>{
 const p=new Player(createSession(214,{gaugeUnit:2}));p.resume();p.drop();assert.equal(p.phase,'animating');p.pause();
 const before=structuredClone(p),snap=p.checkpoint();
 assert.equal(snap.state.drops,1);assert.equal(p.snapshot(),null);assert.deepEqual(structuredClone(p),before);
 const restored=Player.restore(snap);assert.equal(stateHash(restored.state),stateHash(p.state));assert.equal(restored.state.drops,1);assert.equal(restored.phase,'paused');
});
test('checkpoint of lifetime animation retains terminal result and deduplicated record',()=>{
 const s=createSession(9,{gaugeUnit:2},{gauge:6});s.board[13][0]={id:100,k:0,s:8};s.board[13][1]={id:101,k:1,s:8};s.nextId=102;
 const p=new Player(s);p.resume();p.use(p.preview({type:'transform',x:1,y:13,to:0}));p.pause();
 const snap=p.checkpoint(),restored=Player.restore(snap);assert.equal(restored.phase,'won');assert.equal(snap.records.length,1);assert.equal(p.records.length,0);
 p.resume();p.settle();assert.deepEqual(p.records.map(r=>r.id),snap.records.map(r=>r.id));
});
