import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {ExampleReplay} from '../example-replay.mjs';
import {playbackClock} from '../example-clock.mjs';
import {stages} from '../stages.mjs';
import {mass} from '../../naopoyo-v2/engine.mjs';

// Exercise the actual UI handlers/RAF callback with a minimal DOM boundary.
// The replay, clock, ForestSession and physics remain real. This is not browser QA.
async function ui(reduced=true){
 const stage=stages.find(s=>s.number===20);
 const data=JSON.parse(fs.readFileSync(new URL('../examples/20.json',import.meta.url)));
 const nodes=new Map(),frames=[];let replay,lastRenderedMotion;
 const ctx=new Proxy({}, {get:()=>()=>{}});
 const node=selector=>{
  if(!nodes.has(selector))nodes.set(selector,{textContent:'',disabled:false,getBoundingClientRect:()=>({width:320}),getContext:()=>ctx,width:320});
  return nodes.get(selector);
 };
 const controls=['[data-prev]','[data-next]','[data-play]','[data-reset]'].map(node);
 const dialog={querySelector:node,querySelectorAll:()=>controls,showModal(){},addEventListener(){},remove(){}};
 const document={body:{append(){}},createElement:()=>dialog};
 class ObservedReplay extends ExampleReplay{constructor(...args){super(...args);replay=this;}}
 const url=new URL('../example-ui.mjs',import.meta.url);
 const source=fs.readFileSync(url,'utf8').replace(/^import .*;\n/gm,'').replace('export function openExample','function openExample').replaceAll('import.meta.url',JSON.stringify(url.href));
 const open=new Function('ExampleReplay','playbackClock','render','mass','document','requestAnimationFrame','fetch','devicePixelRatio','globalThis',source+'; return openExample;')(ObservedReplay,playbackClock,(_c,q)=>{lastRenderedMotion=q.motion.length;},mass,document,cb=>frames.push(cb),async()=>({ok:true,json:async()=>data}),1,{matchMedia:()=>({matches:reduced})});
 open(stage,()=>{});await new Promise(resolve=>setImmediate(resolve));
 return {node,get replay(){return replay;},frame(now){frames.shift()(now);},get renderedMotion(){return lastRenderedMotion;}};
}
test('reduced motion: Next presents the settled board without actor tweening',async()=>{
 const h=await ui();h.frame(1);h.node('[data-next]').onclick();h.frame(17);
 assert.equal(h.replay.index,1);assert.equal(h.renderedMotion,0,'reduced-motion must not render moving actors');
 assert.equal(h.replay.session.state.rescued,0);
});
test('reduced motion: automatic playback reaches 156/156 and 16/16 and stops',async()=>{
 const h=await ui();h.frame(1);h.node('[data-play]').onclick();let now=1;
 for(let i=0;i<156;i++){now+=1700;h.frame(now);h.frame(++now);assert.equal(h.renderedMotion,0);}
 assert.equal(h.replay.index,156);assert.equal(h.replay.session.state.rescued,16);
 assert.equal(h.node('[data-play]').disabled,true);assert.match(h.node('.example-info').textContent,/おてほん おわり/);
 h.frame(now+5000);assert.equal(h.replay.index,156);
});
test('ordinary motion remains animated and automatic moves do not overlap',async()=>{
 const h=await ui(false);h.frame(1);h.node('[data-play]').onclick();h.frame(1701);assert.equal(h.replay.index,1);
 h.frame(3401);assert.equal(h.replay.index,1);assert.equal(h.renderedMotion,1);
});
