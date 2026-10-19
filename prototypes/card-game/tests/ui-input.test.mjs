import test from 'node:test';
import assert from 'node:assert/strict';
import * as input from '../ui-render.mjs';
import {createGame} from '../engine.mjs';
import {HotseatSession} from '../ui-session.mjs';
import {CpuSession,restoreMatch} from '../cpu-session.mjs';
import {compactOperationMarkup} from '../ui-presentation.mjs';

function setup(session=new HotseatSession({autoAdvance:true})){
 assert.equal(typeof input.ActionInputGuard,'function','UI must bind input to the rendered state');
 session.start(createGame(4));session.reveal();
 let current=session;
 const guard=new input.ActionInputGuard(()=>({session:current,revision:current.projection.revision,viewer:current.viewer}));
 const node=()=>({isConnected:true,disabled:false,dataset:{}});
 const stamp=n=>guard.stamp([n]);
 const click=(n,detail=1)=>guard.accept(n,{detail});
 return {session,guard,node,stamp,click,replace:s=>current=s};
}
test('old response taps cannot execute after a state transition in CPU or hotseat',()=>{
 for(const session of [new HotseatSession({autoAdvance:true}),new CpuSession()]){
  const x=setup(session),v=session.projection;
  session.commit(v.actions.find(a=>a.kind==='choose'&&!a.choiceCard.includes('M-beetle-01')).id,v.revision,'A');
  const response=session.projection;assert.equal(response.phase,'response');
  const old=x.node();x.stamp(old);x.guard.begin(old);assert.equal(x.click(old),true);
  session.commit(response.actions.find(a=>a.kind==='pass').id,response.revision,'A');
  assert.equal(session.projection.phase,'normal');const revision=session.projection.revision;
  for(let i=0;i<20;i++){x.guard.begin(old);assert.equal(x.click(old),false);}
  assert.equal(session.projection.revision,revision);assert.equal(session.projection.turn,'A');
  const fresh=x.node();x.stamp(fresh);x.guard.begin(fresh);assert.equal(x.click(fresh),true);
  const normal=session.projection;session.commit(normal.actions.find(a=>a.kind==='pass').id,normal.revision,'A');
  assert.ok(session.projection.revision>revision,'intentional end turn still works immediately');
 }
});
test('a gesture cannot be replayed, retargeted, or survive a render',()=>{
 const x=setup(),a=x.node(),b=x.node();x.stamp(a);x.stamp(b);
 x.guard.begin(a);assert.equal(x.click(b),false);assert.equal(x.click(a),false);
 x.guard.begin(a);assert.equal(x.click(a),true);assert.equal(x.click(a),false);
 x.guard.begin(a);x.guard.invalidate();x.stamp(b);assert.equal(x.click(b),false);
 x.guard.begin(b);assert.equal(x.click(b),true);
 b.isConnected=false;x.guard.begin(b);assert.equal(x.click(b),false);
});
test('restore to the same revision, hide, and fresh accessibility activation',()=>{
 const x=setup(),a=x.node();x.stamp(a);x.guard.begin(a);
 const restored=restoreMatch(x.session.save());restored.reveal();x.replace(restored);
 assert.equal(x.click(a),false);
 const b=x.node();x.stamp(b);assert.equal(x.click(b,0),true);
 restored.hide();assert.equal(x.click(b,0),false);
});
test('held keyboard and browser multi-click cannot end a newly displayed turn',()=>{
 const x=setup(),a=x.node();a.dataset.passIntent='end-turn';x.stamp(a);
 x.guard.begin(a);assert.equal(x.click(a,2),false);
 x.guard.begin(a);x.guard.invalidate();x.stamp(a);assert.equal(x.click(a,0),false);
 x.guard.begin(a);assert.equal(x.click(a,0),true);
});
test('response and end-turn have distinct permanent slots and labels',()=>{
 const x=new HotseatSession({autoAdvance:true});x.start(createGame(4));x.reveal();
 let v=x.projection;x.commit(v.actions.find(a=>a.kind==='choose'&&!a.choiceCard.includes('M-beetle-01')).id,v.revision,'A');
 v=x.projection;const response=compactOperationMarkup(v,'A');
 assert.match(response,/data-pass-slot="response"[^>]*>[\s\S]*data-pass-intent="response"/);
 assert.match(response,/data-pass-slot="end-turn"><\/span>/);
 x.commit(v.actions.find(a=>a.kind==='pass').id,v.revision,'A');
 const normal=compactOperationMarkup(x.projection,'A');
 assert.match(normal,/data-pass-slot="response"><\/span>/);
 assert.match(normal,/data-pass-slot="end-turn"[^>]*>[\s\S]*data-pass-intent="end-turn"/);
 assert.match(normal,/ターン終了/);assert.match(response,/応答しない/);
});
