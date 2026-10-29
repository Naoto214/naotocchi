import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';
import * as session from '../session.mjs';import {ForestProgress,allStages} from '../progress.mjs';import {stages} from '../stages.mjs';import {complete,mass} from '../../naopoyo-v2/engine.mjs';
import {screenshotBoard} from './overflow-contact-fixtures.mjs';
function harness(stage,storage=new Map()){const nodes=new Map();let closeExample;function get(id){if(!nodes.has(id)){const e={style:{},handlers:{},open:false,getBoundingClientRect:()=>({left:0,top:0,width:320,height:320}),addEventListener(k,f){this.handlers[k]=f},querySelectorAll:()=>[],setPointerCapture(){},releasePointerCapture(){},showModal(){this.open=true},close(){this.open=false;this.handlers.close?.()}};e.parentElement=e;nodes.set(id,e)}return nodes.get(id)}
const ctx={...session,WorldSession:session.ForestSession,ForestProgress,allStages,defaultStages:[stage],complete,mass,render(){},loadSprites:async()=>{},loadGuests:async()=>{},loadForest:async()=>{},eventCaption:()=>'',devicePixelRatio:1,innerWidth:390,innerHeight:664,requestAnimationFrame(){},document:{getElementById:get,hidden:false,addEventListener(){},documentElement:{scrollHeight:664}},window:{addEventListener(){}},sessionStorage:{getItem:()=> '1'},openExample:(s,close)=>{closeExample=close},localStorage:{getItem:k=>storage.get(k),setItem:(k,v)=>storage.set(k,v)}};
const code=fs.readFileSync(new URL('../app.mjs',import.meta.url),'utf8').replace(/^import .*;\n/gm,'').replace('export function mount','function mount');vm.runInNewContext(code+';globalThis.mountApp=mount',ctx);const app=ctx.mountApp({qa:true});get('close').onclick();return{get,app,storage,closeExample:()=>closeExample()};}
const a=(id,x)=>({id,species:'dog',level:8,x,y:3});
const event=(x,y=3.5)=>({clientX:x*40,clientY:y*40,pointerId:7,preventDefault(){}});
for(const id of ['four','eight'])for(const samples of [1,60])test(`screenshot pointer ${id}, ${samples} samples: merge, held ID, saved Undo`,()=>{
 const h=harness(screenshotBoard()),c=h.get('board'),q=h.app.session,before=structuredClone(q.state);
 const selected=q.state.actors.find(a=>a.id===id),x=selected.x+.5,dx=id==='four'?1:-1;
 c.handlers.pointerdown(event(x,7.5));
 for(let i=1;i<=samples;i++)c.handlers.pointermove(event(x+dx*i/samples,7.5));
 assert.equal(q.active.id,id);assert.equal(q.state.actors.find(a=>a.id===id).level,8);
 assert.equal(q.motion.length,1);assert.deepEqual(q.motion[0].events.map(e=>e.type),['merge']);
 c.handlers.pointerup(event(x+dx,7.5));assert.match(h.get('status').textContent,/合体して8/);assert.doesNotMatch(h.get('status').textContent,/交換/);
 assert.equal(q.history.length,1);const restored=new session.ForestSession(screenshotBoard(),q.serialize());assert.ok(restored.restored);assert.ok(restored.undo());assert.deepEqual(restored.state,before);
 h.get('undo').onclick();assert.deepEqual(q.state,before);
});
test('real pointer handlers accept regrab during swap and follow visible actor ID',()=>{
 const h=harness({...stages[0],gravity:false,walls:[],gates:[],exits:[],spikes:[],actors:[a('a',2),a('b',3)]}),canvas=h.get('board'),q=h.app.session;
 canvas.handlers.pointerdown(event(2.5));canvas.handlers.pointermove(event(3.5));canvas.handlers.pointerup(event(3.5));assert.equal(q.motion.length,1);assert.equal(q.state.actors.find(a=>a.id==='a').x,3);
 // At animation start A is still visibly at x=2, although its logical cell is 3.
 canvas.handlers.pointerdown(event(2.5));assert.equal(q.active?.id,'a');assert.equal(q.motion.length,0);canvas.handlers.pointermove(event(3.5));canvas.handlers.pointerup(event(3.5));assert.equal(q.state.actors.find(a=>a.id==='a').x,4);assert.equal(q.history.length,2);
});
test('real pointer fast/slow/coalesced swap sequences reach identical state',()=>{
 const run=mode=>{const h=harness({...stages[0],gravity:false,walls:[],gates:[],exits:[],spikes:[],actors:[a('a',1),a('b',2),a('c',3)]}),c=h.get('board');c.handlers.pointerdown(event(1.5));const points=Array.from({length:mode==='fast'?1:60},(_,i)=>event(1.5+3*(i+1)/(mode==='fast'?1:60)));if(mode==='coalesced')c.handlers.pointermove({...points.at(-1),getCoalescedEvents:()=>points});else points.forEach(p=>c.handlers.pointermove(p));c.handlers.pointerup(points.at(-1));return h.app.session.serialize();};assert.equal(run('fast'),run('slow'));assert.equal(run('fast'),run('coalesced'));
});

test('real pointer approach is pure, cancelled preview clears, committed result and Undo agree',()=>{
 const h=harness({...stages[0],walls:[[2,5]],gates:[],exits:[],spikes:[{x:3,y:4,power:3}],actors:[{id:'a',species:'dog',level:6,x:2,y:4}]}),c=h.get('board'),q=h.app.session;
 const before=structuredClone(q.state),raw=q.serialize(),saved=JSON.stringify([...h.storage]);
 c.handlers.pointerdown(event(2.5,4.5));c.handlers.pointermove(event(2.82,4.5));assert.ok(q.preview);assert.equal(q.serialize(),raw);assert.equal(JSON.stringify([...h.storage]),saved);
 c.handlers.pointercancel(event(2.82,4.5));assert.equal(q.preview,null);assert.deepEqual(q.state,before);
 c.handlers.pointerdown(event(2.5,4.5));c.handlers.pointermove(event(2.82,4.5));const prediction=structuredClone(q.preview.state);c.handlers.pointermove(event(3.1,4.5));assert.deepEqual(q.state,prediction);c.handlers.pointerup(event(3.1,4.5));assert.equal(q.preview,null);
 h.get('undo').onclick();assert.deepEqual(q.state,before);
});

test('Undo restores in place without pause overlay and accepts another move',()=>{
 const h=harness({...stages[0],gravity:false,walls:[],gates:[],exits:[],spikes:[],actors:[a('a',2),a('b',3)]}),c=h.get('board'),q=h.app.session;
 const before=structuredClone(q.state);
 c.handlers.pointerdown(event(2.5));c.handlers.pointermove(event(3.5));c.handlers.pointerup(event(3.5));
 h.get('undo').onclick();assert.deepEqual(q.state,before);assert.equal(q.paused,false);assert.equal(h.get('paused').hidden,true);assert.equal(h.get('dialog').open,false);assert.equal(q.motion.length,0);
 c.handlers.pointerdown(event(2.5));c.handlers.pointermove(event(3.5));c.handlers.pointerup(event(3.5));assert.equal(q.state.actors.find(a=>a.id==='a').x,3);
 h.get('undo').onclick();assert.deepEqual(q.state,before);
});

const moveStage=()=>({...stages[0],gravity:false,walls:[[0,3],[7,3]],gates:[],exits:[],spikes:[],actors:[a('a',1)]});
function stroke(h,points){const c=h.get('board'),q=h.app.session,actor=q.state.actors.find(a=>a.id==='a');q.motion=[];c.handlers.pointerdown(event(actor.x+.5));for(const x of points)c.handlers.pointermove(event(x+.5));c.handlers.pointerup(event(points.at(-1)+.5));}
test('move display: selection and blocked input cost zero, five cells cost five, retry zero',()=>{
 const h=harness(moveStage()),c=h.get('board');assert.equal(h.get('moves').textContent,'0手');
 c.handlers.pointerdown(event(1.5));c.handlers.pointerup(event(1.5));assert.equal(h.get('moves').textContent,'0手');
 stroke(h,[0]);assert.equal(h.get('moves').textContent,'0手');
 c.handlers.pointerdown(event(1.5));c.handlers.pointermove(event(6.5));assert.equal(h.get('moves').textContent,'5手');assert.ok(h.app.session.active);assert.equal(h.app.session.history.length,0);c.handlers.pointerup(event(6.5));assert.equal(h.app.session.state.moves,5);assert.equal(h.get('moves').textContent,'5手');assert.equal(h.app.session.history.length,1);
 stroke(h,[7]);assert.equal(h.get('moves').textContent,'5手');
 h.get('retry').onclick();assert.equal(h.get('moves').textContent,'0手');assert.equal(h.app.session.history.length,0);
});
test('42→47 counts cells while one stroke Undo restores42, previous stroke restores40; save/reload and example stay independent',()=>{
 const h=harness(moveStage());for(let i=0;i<21;i++)stroke(h,[2,1]);assert.equal(h.get('moves').textContent,'42手');
 stroke(h,[6]);assert.equal(h.get('moves').textContent,'47手');assert.equal(h.app.session.history.length,22);
 const restored=harness(moveStage(),h.storage);assert.ok(restored.app.session.restored);assert.equal(restored.get('moves').textContent,'47手');
 const before=restored.app.session.serialize(),saved=JSON.stringify([...restored.storage]);restored.get('example').onclick();restored.closeExample();assert.equal(restored.get('moves').textContent,'47手');assert.equal(restored.app.session.serialize(),before);assert.equal(JSON.stringify([...restored.storage]),saved);
 restored.get('undo').onclick();assert.equal(restored.get('moves').textContent,'42手');assert.equal(restored.get('paused').hidden,true);assert.equal(restored.get('dialog').open,false);assert.doesNotMatch(restored.get('status').textContent,/1手/);
 restored.get('undo').onclick();assert.equal(restored.get('moves').textContent,'40手');stroke(restored,[2]);assert.equal(restored.get('moves').textContent,'41手');
});
