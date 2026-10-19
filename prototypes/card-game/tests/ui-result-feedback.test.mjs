import test from 'node:test';import assert from 'node:assert/strict';import {ResultFeedback} from '../ui-result-feedback.mjs';
function setup(){const tasks=new Map();let id=0,shown=null;const flow=new ResultFeedback({paint:g=>shown=g,clear:()=>shown=null,schedule:f=>{tasks.set(++id,f);return id;},cancel:i=>tasks.delete(i)});return {flow,tasks,get shown(){return shown;},tick(){const [id,f]=tasks.entries().next().value;tasks.delete(id);f();}};}
const group=n=>({revision:n,rows:[{text:'private '+n}]});
test('CPU bursts and automatic-pass history keep the active notice and one four-second timer',()=>{
 let shown=null,paints=0,clears=0;const tasks=new Map();let id=0;
 const f=new ResultFeedback({paint:g=>{shown=g;paints++;},clear:()=>{shown=null;clears++;},schedule:(fn,ms)=>{assert.equal(ms,4000);tasks.set(++id,fn);return id;},cancel:i=>tasks.delete(i)});
 f.present([group(1)],'B',1,1);const originalTimer=id,initialClears=clears;
 for(let revision=2;revision<=6;revision++){
  const groups=[group(1),{...group(2),historyOnly:true},...Array.from({length:revision-2},(_,i)=>group(i+3))];
  f.present(groups,'B',1,1);assert.equal(shown.revision,1);assert.equal(paints,1);assert.equal(clears,initialClears);assert.equal(tasks.size,1);assert.ok(tasks.has(originalTimer));
 }
 const delivered=[];
 while(tasks.size){const [key,cb]=tasks.entries().next().value;tasks.delete(key);cb();if(shown)delivered.push(shown.revision);}
 assert.deepEqual(delivered,[3,4,5,6]);assert.equal(shown,null);
});
test('re-render after collapse keeps the result reopen control available',()=>{
 let dock=false;const f=new ResultFeedback({paint:()=>{},clear:()=>{},dock:b=>dock=b,schedule:()=>1,cancel:()=>{}});
 f.present([group(1)],'A',1,1);f.collapse();assert.equal(dock,true);
 dock=false;f.present([group(1)],'A',1,1);assert.equal(dock,true);
});
test('same batch plays in revision order without waiting for a game action or duplicating on render',()=>{const x=setup();x.flow.present([group(1),group(2)],'A',1,1);assert.equal(x.shown.revision,1);x.flow.present([group(1),group(2)],'A',1,1);assert.equal(x.tasks.size,1);x.tick();assert.equal(x.shown.revision,2);x.tick();assert.equal(x.shown,null);});
test('background/handoff drops queued private notices and stale callbacks cannot resurrect them',()=>{const x=setup();x.flow.present([group(1),group(2)],'A',1,1);const stale=[...x.tasks.values()][0];x.flow.hide();assert.equal(x.shown,null);assert.equal(x.tasks.size,0);x.flow.present([group(1),group(2)],'A',1,1);assert.equal(x.shown,null);stale();assert.equal(x.shown,null);x.flow.present([group(3)],'B',1,3);assert.equal(x.shown.revision,3);stale();assert.equal(x.shown.revision,3);});
test('restore history stays in history; a new command replaces outdated pending notices',()=>{const x=setup();x.flow.present([group(1),group(2)],'A',2,3);assert.equal(x.shown,null);x.flow.present([group(3),group(4)],'A',2,3);assert.equal(x.shown.revision,3);x.flow.present([group(3),group(4),group(5)],'A',2,5);assert.equal(x.shown.revision,5);x.tick();assert.equal(x.shown,null);});
test('notices use four-second timers; manual collapse and replay preserve order without game input',()=>{let dock=false,shown=null;const timers=[];const f=new ResultFeedback({paint:g=>shown=g,clear:()=>shown=null,dock:b=>dock=b,schedule:(cb,ms)=>{timers.push({cb,ms});return timers.length;},cancel:()=>{}});f.present([group(1),group(2)],'A',1,1);assert.equal(timers[0].ms,4000);f.collapse();assert.equal(shown,null);assert.equal(dock,true);timers[0].cb();assert.equal(shown,null);f.reopen();assert.equal(shown.revision,1);timers.at(-1).cb();assert.equal(shown.revision,2);timers.at(-1).cb();assert.equal(shown,null);assert.equal(dock,true);});
test('replay icon and retained private payload are erased on handoff/background/reset',()=>{const x=setup();x.flow.present([group(1)],'A',1,1);x.flow.collapse();x.flow.hide();x.flow.reopen();assert.equal(x.shown,null);x.flow.present([group(2)],'B',1,2);x.flow.collapse();x.flow.reopen();assert.equal(x.shown.revision,2);x.flow.reset();x.flow.reopen();assert.equal(x.shown,null);});
test('default browser timers retain Window receiver for schedule and cancellation',()=>{
 const originalSet=globalThis.setTimeout,originalClear=globalThis.clearTimeout;const tasks=new Map();let id=0,shown=null;
 globalThis.setTimeout=function(fn,ms){assert.equal(this,globalThis,'Window.setTimeout receiver');assert.equal(ms,4000);tasks.set(++id,fn);return id;};
 globalThis.clearTimeout=function(id){assert.equal(this,globalThis,'Window.clearTimeout receiver');tasks.delete(id);};
 try{const f=new ResultFeedback({paint:g=>shown=g,clear:()=>shown=null});f.present([group(1)],'A',1,1);assert.equal(tasks.size,1);f.collapse();assert.equal(tasks.size,0);f.reopen();const cb=[...tasks.values()][0];tasks.clear();cb();assert.equal(shown,null);f.present([group(2)],'A',1,2);f.hide();assert.equal(tasks.size,0);f.reset();}finally{globalThis.setTimeout=originalSet;globalThis.clearTimeout=originalClear;}
});
