import test from 'node:test';import assert from 'node:assert/strict';
import {createGame} from '../engine.mjs';import {HotseatSession} from '../ui-session.mjs';
test('handoff erases private projection on response actor change, and saved restore starts hidden',()=>{
 const session=new HotseatSession();session.start(createGame(719));
 assert.equal(session.projection.players.A.hand,undefined);session.reveal();
 let changes=0;
 for(let i=0;i<60&&!session.finished;i++){
  const v=session.projection,who=session.viewer,a=v.actions.find(a=>a.kind!=='pass'&&a.kind!=='skip')??v.actions[0];
  const handoff=session.commit(a.id,v.revision,who);
  if(handoff){changes++;assert.equal(session.viewer,null);assert.equal(session.projection.players.A.hand,undefined);assert.equal(session.projection.players.B.hand,undefined);assert.deepEqual(session.projection.actions,[]);session.reveal();}
 }
 assert.ok(changes>2);const raw=session.save(),other=new HotseatSession();other.restore(raw);
 assert.equal(other.viewer,null);assert.equal(other.save(),raw);assert.equal(other.projection.players.A.hand,undefined);
});
test('a queued second click and action from a hidden seat cannot mutate the saved game',()=>{
 const session=new HotseatSession();session.start(createGame(719));session.reveal();
 const v=session.projection,a=v.actions[0],who=session.viewer;session.commit(a.id,v.revision,who);const after=session.save();
 assert.throws(()=>session.commit(a.id,v.revision,who));assert.equal(session.save(),after);
 session.hide();assert.throws(()=>session.commit(a.id,v.revision,who));assert.equal(session.save(),after);
});
