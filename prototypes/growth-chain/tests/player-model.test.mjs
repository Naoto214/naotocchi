import test from 'node:test';
import assert from 'node:assert/strict';
import {Player, fallInterval, directPreview} from '../player-model.mjs';
import {createSession, stateHash, landing} from '../session.mjs';
import {standardRules} from '../rules.mjs';
import {board} from '../engine.mjs';
import {chainFixture} from '../fixtures.mjs';
const session=()=>createSession(17,standardRules());
test('fall acceleration and 600ms grounded lock are elapsed-time based',()=>{
 assert.equal(fallInterval(0),1500); assert.equal(fallInterval(200),800); assert.equal(fallInterval(500),800);
 const p=new Player(session());p.resume();p.advance(1499);assert.equal(p.pose.y,2);p.advance(1);assert.equal(p.pose.y,3);
 p.pose=landing(p.state.board,p.pose);p.rebase();p.advance(599);assert.equal(p.state.drops,0);p.advance(1);assert.equal(p.state.drops,1);
});
test('only valid grounded moves reset lock, at most10; pause freezes all clocks',()=>{
 const p=new Player(session());p.resume();p.pose=landing(p.state.board,p.pose);p.rebase();
 for(let i=0;i<10;i++){p.advance(100);assert.ok(p.motion(i%2?'right':'left'));assert.equal(p.lockMs,0)}
 p.advance(100);p.motion('left');assert.equal(p.resets,10);assert.equal(p.lockMs,100);
 p.pause();let snap=JSON.stringify(p.snapshot());p.advance(99999);assert.equal(JSON.stringify(p.snapshot()),snap);
 p.resume();p.advance(500);assert.equal(p.state.drops,1);
});
test('counterclockwise rotates once and keeps legal replay path',()=>{const p=new Player(session());p.resume();assert.ok(p.motion('ccw'));assert.equal(p.pose.rot,3);assert.doesNotThrow(()=>p.drop());});
test('tool is preview-only until commit; stale revision rejected without resource loss',()=>{
 const b=board(standardRules());b[13][0]={id:1,k:0,s:3};const p=new Player(createSession(1,standardRules(),{board:b,eggs:[0,0,1,0]}));p.resume();
 const a={type:'egg',rank:2,k:0,x:1}; const t=p.preview(a);assert.equal(p.state.eggs[2],1); assert.ok(t.direct.cells.length>=2);
 p.motion('left');assert.throws(()=>p.use(t),/変わ/);assert.equal(p.state.eggs[2],1);
 p.use(p.preview(a));assert.equal(p.state.eggs[2],0);assert.equal(p.state.eggs[0],1);
});
test('preview shows direct group only, not future gravity chains',()=>{const f=chainFixture(5); const d=directPreview(f.state,f.action);assert.ok(d.cells.length);assert.ok(d.cells.length<f.state.board.flat().filter(Boolean).length);assert.equal(d.board.length,14);});
test('clear beats simultaneous game over, freezes clear record and continues same board',()=>{
 const b=board(standardRules());b[13][0]={id:1,k:0,s:8};b[13][1]={id:2,k:1,s:8};
 const p=new Player(createSession(1,standardRules(),{board:b,gauge:24}));p.resume();p.use(p.preview({type:'transform',x:1,y:13,to:0}));
 assert.equal(p.phase,'animating');assert.equal(p.snapshot(),null);p.settle();assert.equal(p.phase,'won');
 const record=structuredClone(p.records[0]),hash=stateHash(p.state);p.continueEndless();assert.equal(stateHash(p.state),hash);assert.equal(p.category,'post-clear');assert.deepEqual(p.records[0],record);
});
test('animation pauses safely, restored games require manual resume; practice never records',()=>{
 const f=chainFixture(3),p=new Player(f.state,{practice:true});p.resume();p.use(p.preview(f.action));p.pause();assert.equal(p.snapshot(),null);p.advance(10000);assert.equal(p.phase,'paused');p.resume();p.settle();
 assert.equal(p.records.length,0);p.pause();const q=Player.restore(p.snapshot());assert.equal(q.phase,'paused');assert.equal(stateHash(q.state),stateHash(p.state));
});
