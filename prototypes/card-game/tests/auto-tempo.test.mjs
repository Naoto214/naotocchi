import test from 'node:test';import assert from 'node:assert/strict';import {writeFileSync} from 'node:fs';
import * as e from '../engine.mjs';import * as legacy from '../legacy-engine.mjs';import {HotseatSession} from '../ui-session.mjs';
function scenario(enabled){
 const x=new HotseatSession({autoAdvance:enabled});x.start(e.createGame(4));x.reveal();let operations=0,passes=0,handoffs=0;const trace=[];
 function snapshot(label){const s=e.restore(x.save());trace.push({label,revision:s.revision,turnOwner:s.turn,actingPlayer:e.actor(s),phase:s.phase,window:s.window,chain:s.chain.map(l=>({actor:l.actor,kind:l.kind,source:l.source})),choice:s.choice?.kind??null,players:Object.fromEntries(['A','B'].map(a=>[a,{time:s.players[a].time,hand:[...s.players[a].hand],deck:[...s.players[a].deck],main:s.players[a].board.main}]))});}
 snapshot('A start');
 for(let i=0;i<40;i++){
  const v=x.projection;if(v.turn==='B'&&v.phase==='normal')break;
  let a;if(v.phase==='response')a=v.actions.find(a=>a.kind==='pass');
  else if(v.choice?.kind==='egg_bottom')a=v.actions.find(a=>a.choiceCard?.includes('G-hit-blow'))??v.actions[0];
  else if(v.phase==='normal')a=v.actions.find(a=>a.kind==='place'&&a.source.includes('M-beetle-01'))??v.actions.find(a=>a.kind==='pass');
  else a=v.actions.find(a=>a.kind==='trigger')??v.actions[0];
  assert.ok(a);operations++;if(v.phase==='response'&&a.kind==='pass')passes++;
  if(x.commit(a.id,v.revision,x.viewer)){handoffs++;assert.equal(x.viewer,null);assert.deepEqual(x.projection.actions,[]);for(const p of Object.values(x.projection.players))assert.equal(p.hand,undefined);x.reveal();}
  assert.equal(x.automationStop,null);snapshot(a.label);
 }
 assert.equal(x.projection.turn,'B');assert.equal(x.projection.phase,'normal');return {operations,manualResponsePasses:passes,handoffs,automaticPasses:x.projection.autoLog.length,save:x.save(),trace};
}
test('same full first-turn commands, fewer human passes and handoffs, exact B normal state',()=>{
 const manual=scenario(false),automatic=scenario(true);assert.equal(automatic.save,manual.save);assert.equal(automatic.manualResponsePasses,0);assert.equal(automatic.automaticPasses,manual.manualResponsePasses);assert.equal(automatic.handoffs,1);assert.ok(manual.handoffs>automatic.handoffs);
 const report={seed:4,scenario:'Default decks; return hit-blow at A egg; birth beetle01 and use ability; explicitly end A; B egg to B normal',manual,automatic};if(process.env.QA6_TRACE)writeFileSync(process.env.QA6_TRACE,JSON.stringify(report,null,2)+'\n');
});
test('enabled UI completes R10 with active play, preserves replay, hidden handoff and restore history',()=>{
 const x=new HotseatSession({autoAdvance:true});x.start(e.createGame(719));x.reveal();const score={choose:100,trigger:95,place:80,relationship:75,challenge:70,ability:65,programAbility:65,programPlay:60,play:60,skip:1,pass:0};let count=0;
 for(;count<1800&&!x.finished;count++){const v=x.projection,a=[...v.actions].sort((a,b)=>(score[b.kind]??0)-(score[a.kind]??0))[0];assert.ok(a);x.commit(a.id,v.revision,x.viewer);assert.equal(x.automationStop,null);if(!x.viewer&&!x.finished){assert.deepEqual(x.projection.actions,[]);assert.equal(x.projection.players.A.hand,undefined);assert.equal(x.projection.players.B.hand,undefined);x.reveal();}}
 assert.ok(x.finished);assert.equal(x.projection.round,10);assert.ok(x.projection.autoLog.length>20);const before=x.save(),log=x.projection.autoLog;x.restore(before);assert.equal(x.viewer,null);assert.equal(x.save(),before);assert.deepEqual(x.projection.autoLog,log);assert.deepEqual(e.restore(before).result,x.projection.result);
});
test('legacy save keeps its official replay version through automatic response passes',()=>{
 let s=legacy.createGame(4);const a=legacy.legalActions(s)[0];s=legacy.act(s,legacy.actor(s),s.revision,a.id);const x=new HotseatSession({autoAdvance:true});x.restore(legacy.save(s));assert.equal(x.viewer,null);assert.equal(x.automationStop,null);assert.equal(JSON.parse(x.save()).version,legacy.VERSION);assert.deepEqual(e.restore(x.save()),legacy.restore(x.save()));const saved=x.save();x.restore(saved);assert.equal(x.save(),saved);
});
