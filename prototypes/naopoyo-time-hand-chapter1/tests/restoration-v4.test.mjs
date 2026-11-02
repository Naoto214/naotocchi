import test from 'node:test';import assert from 'node:assert/strict';
import {render,sampleEffects,drawActors} from '../../naopoyo-chapter1/render.mjs';
import {render as original} from './fixtures/formal-chapter1-render.mjs';
import {ForestSession,motionFrame,visualActors} from '../../naopoyo-chapter2/session.mjs';
import {GateEffects} from '../../naopoyo-chapter2/gate-effects.mjs';
import {createState,clone} from '../engine.mjs';
import {ExampleReplay} from '../replay.mjs';
import {ChapterSession} from '../session.mjs';
import {solutions} from '../solutions.mjs';
import {loadSprites} from '../../naopoyo-rescue/sprites.mjs';
const board={w:8,h:8,actors:[{id:'a',species:'dog',level:2,x:2,y:4}],walls:[[0,7]],gates:[],spikes:[],exits:[],movementRules:'contact-v2'};
function recording(){const calls=[],stack=[];const state={font:'12px system-ui'};const c=new Proxy(state,{get:(o,k)=>{if(k in o)return o[k];if(k==='createLinearGradient'||k==='createRadialGradient')return (...v)=>{calls.push([k,...v]);return {addColorStop(...v){calls.push(['addColorStop',...v]);}}};return (...args)=>{calls.push([k,...args.map(v=>v?.src||v)]);if(k==='save')stack.push({...o});if(k==='restore')Object.assign(o,stack.pop());};},set:(o,k,v)=>{calls.push(['set',k,v]);o[k]=v;return true;}});return {calls,c,canvas:{getBoundingClientRect:()=>({width:320}),getContext:()=>c}};}
test('formal chapter1 refactor has identical canvas commands: selection/release/move/merge/split/rescue/reduced',async()=>{
 const oldImage=global.Image,oldPerf=global.performance,oldMedia=global.matchMedia;let now=100;
 global.Image=class{set src(v){this._src=v;queueMicrotask(()=>this.onload())}get src(){return this._src}};await loadSprites();global.performance={now:()=>now};
 try{for(const reduced of [false,true]){global.matchMedia=()=>({matches:reduced});const q={state:createState(board),active:null},p={state:clone(q.state),active:null};
 const states=[()=>{},q=>q.active={id:'a'},q=>q.active=null,q=>{q.state.moves++;q.state.actors[0].x++;},q=>{q.state.moves++;q.state.actors[0].level++;},()=>{},q=>{q.state.moves++;q.state.actors.push({id:'child',species:'dog',level:1,x:4,y:4});},q=>{q.state.moves++;q.state.actors=[];q.state.rescued=4;}];
 for(const change of states){change(q);p.state=clone(q.state);p.active=clone(q.active);const a=recording(),b=recording();render(a.canvas,q,{dpr:2});original(b.canvas,p,{dpr:2});assert.deepEqual(JSON.parse(JSON.stringify(a.calls)),JSON.parse(JSON.stringify(b.calls)));now+=210;}
 }}finally{global.Image=oldImage;global.performance=oldPerf;global.matchMedia=oldMedia;}
});
test('formal lift is 420 ms state-change effect, not a selection bounce',()=>{const q={state:createState(board),active:null};assert.equal(sampleEffects(q,0).items.length,0);q.active={id:'a'};assert.equal(sampleEffects(q,10).items.length,0);q.active=null;assert.equal(sampleEffects(q,20).items.length,0);q.state.moves++;q.state.actors[0].level++;const fx=sampleEffects(q,30);assert.equal(fx.items[0].kind,'merge');const a=recording(),b=recording();drawActors(a.c,q.state,null,40,320,fx.items,240,false,false);drawActors(b.c,q.state,null,40,320,[],240,false,false);const ai=a.calls.find(c=>c[0]==='drawImage'),bi=b.calls.find(c=>c[0]==='drawImage');assert.ok(Math.abs(bi[7]-ai[7]-3.6)<1e-8);assert.equal(sampleEffects(q,450).items.length,0);});
test('single shared formal timing covers overflow/swap/fall/split without replay loss',()=>{for(const [types,overflow,duration]of [[[],0,110],[['merge'],0,180],[['merge'],2,240],[['swap'],0,180],[['swap','fall'],0,420],[['fall'],0,340],[['split','fall'],0,340]]){const s=createState(board),r={events:types.map(type=>({type})),overflow};assert.equal(motionFrame(s,s,r,'a',1,0).duration,duration);}});
test('all ten replay results retain live outcome and exact formal frame duration',()=>{for(let i=0;i<10;i++){const q=new ChapterSession(i),replay=new ExampleReplay(i);for(const [j,step]of solutions[i].entries()){const before=clone(q.state),r=q.step(...step);assert.deepEqual(replay.results[j+1],r);replay.next();assert.deepEqual(replay.session.state,q.state);assert.deepEqual(motionFrame(before,q.state,r,...step),motionFrame(before,replay.session.state,replay.results[j+1],...step));}assert.ok(q.cleared);}});
test('formal contact-v2 has no landing squash to invent; idle actors still occupy gates',()=>{const q=new ForestSession({...board,actors:[{id:'a',species:'dog',level:2,x:2,y:4}],gates:[{x:2,y:4,exact:2}]});const actors=visualActors(q);assert.equal(actors[0].landing,0);assert.equal(actors[0].opacity,1);assert.equal(new GateEffects().sample(q,actors,0)[0].occupied,true);});
