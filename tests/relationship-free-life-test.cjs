const test=require('node:test'), assert=require('node:assert/strict');
const fs=require('node:fs');
const file='relationship-life.js';
test('session module exists',()=>assert.ok(fs.existsSync(file),'relationship life module missing'));
if(fs.existsSync(file)) {
 const {createSession}=require('../relationship-life.js');
 test('shared cooldown, rolling caps and random encounter interval',()=>{
  const s=createSession({random:()=>0});
  assert.equal(s.attempt('greeting','a'),false);
  s.advance(180); assert.equal(s.attempt('greeting','a'),true);
  assert.equal(s.attempt('visit','b'),false);
  s.advance(180); assert.equal(s.attempt('greeting','b'),true);
  s.advance(180); assert.equal(s.attempt('greeting','c'),false);
  assert.equal(s.attempt('affection_interaction','p'),true);
  s.advance(180); assert.equal(s.attempt('affection_interaction','p'),false);
 });
 test('invitations are scarce and do not accumulate during inactivity',()=>{
  const s=createSession({random:()=>0});
  s.advance(1199); assert.equal(s.attempt('invitation','a'),false);
  s.advance(1); assert.equal(s.attempt('invitation','a'),true);
  s.advance(1199); assert.equal(s.attempt('invitation','b'),false);
  s.advance(1); assert.equal(s.attempt('invitation','b'),true);
  const n=s.now; for(const dt of [-1,NaN,Infinity])s.advance(dt); assert.equal(s.now,n);
 });
 test('event subscribers are isolated, removable and payloads immutable',()=>{
  const s=createSession(), got=[]; s.subscribe(()=>{throw Error('observer');});
  const off=s.subscribe(e=>got.push(e)); s.emit('reunion','partner:a',{context:'meguru',regionId:'home'});
  assert.equal(got.length,1); assert.equal(got[0].version,1); assert.ok(Object.isFrozen(got[0]));
  off(); s.emit('greeting','a'); assert.equal(got.length,1);
 });
}
test('Home visits are finite, one at a time, and preserve relation input',()=>{
 const L=require('../relationship-life.js'),s=L.createSession({random:()=>0});
 assert.equal(typeof L.createVisits,'function');
 const v=L.createVisits(s),r=[{key:'companion:a'},{key:'partner:p'}],before=JSON.stringify(r);
 assert.equal(v.update(0,r),null);s.advance(300);
 assert.equal(v.update(0,r).key,'companion:a');
 s.advance(61);assert.equal(v.update(0,r),null);assert.equal(JSON.stringify(r),before);
 s.advance(300);assert.ok(v.update(0,r)); assert.equal(v.update(0,[]),null);
});
test('listeners added during emission run only on the next emission',()=>{
 const s=require('../relationship-life.js').createSession();let n=0;
 s.subscribe(()=>s.subscribe(()=>n++));s.emit('greeting','a');assert.equal(n,0);
 s.emit('greeting','a');assert.equal(n,1);
});
test('partner visits remain possible in a crowded relationship roster',()=>{
 const L=require('../relationship-life.js'),s=L.createSession({random:()=>.99}),v=L.createVisits(s);
 const r=Array.from({length:26},(_,i)=>({key:'companion:'+i})).concat({key:'partner:p'});
 s.advance(300);assert.equal(v.update(0,r).key,'partner:p');
});
