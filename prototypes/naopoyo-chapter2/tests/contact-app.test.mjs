import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';
import * as session from '../session.mjs';import {ForestProgress,allStages} from '../progress.mjs';import {stages} from '../stages.mjs';import {complete,mass} from '../../naopoyo-v2/engine.mjs';
function harness(stage){const nodes=new Map(),storage=new Map();function get(id){if(!nodes.has(id)){const e={style:{},handlers:{},open:false,getBoundingClientRect:()=>({left:0,top:0,width:320,height:320}),addEventListener(k,f){this.handlers[k]=f},querySelectorAll:()=>[],setPointerCapture(){},releasePointerCapture(){},showModal(){this.open=true},close(){this.open=false;this.handlers.close?.()}};e.parentElement=e;nodes.set(id,e)}return nodes.get(id)}
const ctx={...session,WorldSession:session.ForestSession,ForestProgress,allStages,defaultStages:[stage],complete,mass,render(){},loadSprites:async()=>{},loadGuests:async()=>{},loadForest:async()=>{},eventCaption:()=>'',devicePixelRatio:1,innerWidth:390,innerHeight:664,requestAnimationFrame(){},document:{getElementById:get,hidden:false,addEventListener(){},documentElement:{scrollHeight:664}},window:{addEventListener(){}},localStorage:{getItem:k=>storage.get(k),setItem:(k,v)=>storage.set(k,v)}};
const code=fs.readFileSync(new URL('../app.mjs',import.meta.url),'utf8').replace(/^import .*;\n/gm,'').replace('export function mount','function mount');vm.runInNewContext(code+';globalThis.mountApp=mount',ctx);const app=ctx.mountApp({qa:true});get('close').onclick();return{get,app};}
const a=(id,x)=>({id,species:'dog',level:8,x,y:3});
const event=(x,y=3.5)=>({clientX:x*40,clientY:y*40,pointerId:7,preventDefault(){}});
test('real pointer handlers accept regrab during swap and follow visible actor ID',()=>{
 const h=harness({...stages[0],gravity:false,walls:[],gates:[],exits:[],spikes:[],actors:[a('a',2),a('b',3)]}),canvas=h.get('board'),q=h.app.session;
 canvas.handlers.pointerdown(event(2.5));canvas.handlers.pointermove(event(3.5));canvas.handlers.pointerup(event(3.5));assert.equal(q.motion.length,1);assert.equal(q.state.actors.find(a=>a.id==='a').x,3);
 // At animation start A is still visibly at x=2, although its logical cell is 3.
 canvas.handlers.pointerdown(event(2.5));assert.equal(q.active?.id,'a');assert.equal(q.motion.length,0);canvas.handlers.pointermove(event(3.5));canvas.handlers.pointerup(event(3.5));assert.equal(q.state.actors.find(a=>a.id==='a').x,4);assert.equal(q.history.length,2);
});
test('real pointer fast/slow/coalesced swap sequences reach identical state',()=>{
 const run=mode=>{const h=harness({...stages[0],gravity:false,walls:[],gates:[],exits:[],spikes:[],actors:[a('a',1),a('b',2),a('c',3)]}),c=h.get('board');c.handlers.pointerdown(event(1.5));const points=Array.from({length:mode==='fast'?1:60},(_,i)=>event(1.5+3*(i+1)/(mode==='fast'?1:60)));if(mode==='coalesced')c.handlers.pointermove({...points.at(-1),getCoalescedEvents:()=>points});else points.forEach(p=>c.handlers.pointermove(p));c.handlers.pointerup(points.at(-1));return h.app.session.serialize();};assert.equal(run('fast'),run('slow'));assert.equal(run('fast'),run('coalesced'));
});
