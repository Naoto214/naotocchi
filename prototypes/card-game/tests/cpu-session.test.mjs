import test from 'node:test';import assert from 'node:assert/strict';
import * as e from '../engine.mjs';import {CpuSession,restoreMatch} from '../cpu-session.mjs';import {chooseCpuAction} from '../cpu-policy.mjs';import {CpuScheduler} from '../cpu-scheduler.mjs';
function play(s,limit=2000){for(let i=0;i<limit&&!s.finished;i++){assert.equal(s.automationStop,null);if(s.cpuPending){s.stepCpu(s.projection.revision);}else{const o=s.decisionInput(),a=chooseCpuAction(o,{seed:8765,step:o.revision});s.commit(a.id,o.revision,o.seat);}}return s;}
test('CPU and human both seats complete ten rounds using real commands and hidden opponent hand',()=>{
 for(const humanSeat of ['A','B']){const s=new CpuSession({humanSeat,policySeed:803});s.start(e.createGame(9102));let decisions=0;for(let i=0;i<1600&&!s.finished;i++){const v=s.projection;assert.equal(s.viewer,humanSeat);assert.equal(v.players[humanSeat==='A'?'B':'A'].hand,undefined);if(s.cpuPending){assert.deepEqual(v.actions,[]);s.stepCpu(v.revision);decisions++;}else{const o=s.decisionInput(),a=chooseCpuAction(o,{seed:137});s.commit(a.id,o.revision,o.seat);}assert.equal(s.automationStop,null);}assert.ok(decisions>10);assert.equal(s.finished,true);assert.equal(s.projection.round,10);}
});
test('save during CPU choice resumes identically without duplicate and preserves history',()=>{
 const a=new CpuSession({humanSeat:'B',policySeed:991});a.start(e.createGame(20261025));const r=a.projection.revision;assert.equal(a.stepCpu(r),true);const after=a.save();assert.equal(a.stepCpu(r),false);assert.equal(a.save(),after);
 const b=restoreMatch(after);assert.equal(b.viewer,null);b.reveal();assert.deepEqual(b.projection.results,a.projection.results);play(a);play(b);assert.equal(a.save(),b.save());
});
test('hidden background session cannot execute and resume retains human viewpoint',()=>{const s=new CpuSession({humanSeat:'B'});s.start(e.createGame(9001));const before=s.save();s.hide();assert.equal(s.cpuPending,false);assert.equal(s.stepCpu(s.projection.revision),false);assert.equal(s.save(),before);s.reveal();assert.equal(s.viewer,'B');assert.equal(s.cpuPending,true);});
test('old hotseat save loads as unchanged hotseat and bad CPU envelope is rejected',()=>{const raw=e.save(e.createGame(420));const s=restoreMatch(raw);assert.equal(s.mode,undefined);assert.equal(s.save(),raw);const c=new CpuSession();c.start(e.createGame(12));const data=JSON.parse(c.save());data.humanSeat='Z';assert.throws(()=>restoreMatch(JSON.stringify(data)));});
test('unknown policy command stops safely and persisted diagnostic does not restart on restore',()=>{const s=new CpuSession({humanSeat:'B',policy:()=>({id:'forged',score:0})});s.start(e.createGame(42));const raw=s.engineSave;s.stepCpu(s.projection.revision);assert.ok(s.automationStop);assert.equal(s.engineSave,raw);const r=restoreMatch(s.save());r.reveal();assert.ok(r.automationStop);assert.equal(r.cpuPending,false);});
test('scheduler cancels stale callbacks, pauses in background, and performs one committed step per tick',()=>{
 let next=0,visible=true;const queued=new Map();const s=new CpuSession({humanSeat:'B'});s.start(e.createGame(51));const clock={setTimeout:f=>{queued.set(++next,f);return next;},clearTimeout:id=>queued.delete(id)};let painted=0;const scheduler=new CpuScheduler({getSession:()=>s,clock,canRun:()=>visible,onStep:()=>painted++});scheduler.schedule();const stale=queued.get(1);scheduler.cancel();stale();assert.equal(painted,0);scheduler.schedule();visible=false;queued.get(2)();assert.equal(painted,0);visible=true;scheduler.schedule();queued.get(3)();assert.equal(painted,1);scheduler.cancel();
});
test('long-press hand gesture pauses CPU from pointerdown through release',async()=>{
 const {mountHandDrag}=await import('../ui-drag.mjs');const handlers={},events=[],entry={dataset:{handEntry:'one'},classList:{remove(){}},getBoundingClientRect:()=>({left:0})},card={disabled:false,closest:()=>entry};
 const strip={querySelectorAll:()=>[entry],addEventListener:(n,f)=>handlers[n]=f,setPointerCapture(){},hasPointerCapture:()=>false,classList:{remove(){}}};
 const oldDoc=globalThis.document,oldCancel=globalThis.cancelAnimationFrame;globalThis.document={addEventListener(){}};globalThis.cancelAnimationFrame=()=>{};
 try{const clean=mountHandDrag(strip,{onTap(){},onReorder(){},onInteraction:v=>events.push(v)});handlers.pointerdown({button:0,isPrimary:true,pointerId:1,target:{closest:()=>card},clientX:0,clientY:0});assert.deepEqual(events,[true]);handlers.pointerup({pointerId:1,preventDefault(){}});assert.deepEqual(events,[true,false]);clean();}finally{globalThis.document=oldDoc;globalThis.cancelAnimationFrame=oldCancel;}
});
test('repeated cancelled activation stops at a bounded safe boundary without silent pass',()=>{
 const s=new CpuSession({humanSeat:'B',policy:o=>{const a=o.actions.find(a=>a.value==='cancel')??o.actions.find(a=>a.kind==='programPlay'&&a.program?.select?.length)??o.actions[0];return {id:a.id,score:1};}});
 const state=e.createGame(518);state.choice=null;state.pending=[];state.phase='normal';state.players.A.time=10;for(const id of ['G-falling-block-puzzle','C-box','W-deepsea','I-c_coin2']){const x=state.players.A.deck.shift();state.cards[x].cardId=id;state.players.A.hand.push(x);}s.start(state);
 for(let n=0;n<10&&!s.automationStop;n++)s.stepCpu(s.projection.revision);
 assert.equal(s.automationStop?.reason,'CPU repetition limit');assert.ok(s.projection.revision<=6);assert.equal(s.projection.players.A.time,10);
});
