import * as minis from '../../prototypes/life-sugoroku/tournament-v4.mjs';
import * as events from '../../prototypes/life-sugoroku/events-v4.mjs';
import * as tiles from '../../prototypes/life-sugoroku/tiles-v4.mjs';
import * as relations from '../../prototypes/life-sugoroku/relationships.mjs';
import * as canonical from '../../prototypes/life-sugoroku/canonical.mjs';
import * as boardArt from '../../prototypes/life-sugoroku/board-art.mjs';
import * as presentation from '../../prototypes/life-sugoroku/presentation-v4.mjs';
import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';
import * as engine from '../../prototypes/life-sugoroku/engine-v4.mjs';import * as data from '../../prototypes/life-sugoroku/data.mjs';import * as adapter from '../../prototypes/life-sugoroku/adapter.mjs';import * as storage from '../../prototypes/life-sugoroku/storage.mjs';import * as actions from '../../prototypes/life-sugoroku/actions.mjs';
// These render-only DOMs do not navigate. The browser suite exercises the real home link and save guard.
const guardHomeReturn = () => {};
function ui(mountOfficialFrame=()=>new Promise(()=>{})){const elements=new Map;const el=key=>{const id=key.startsWith('#')?key:'#'+key;if(!elements.has(id))elements.set(id,{innerHTML:'',textContent:'',style:{},dataset:{},value:'',classList:{add(){},contains(){return false}},listeners:{},addEventListener(type,fn){(this.listeners[type]??=[]).push(fn)},click(){for(const fn of this.listeners.click||[])fn({target:this});this.onclick?.({target:this});},querySelectorAll(){return []},querySelector(sel){return el(sel)},append(){},remove(){},clientWidth:320,clientHeight:245});return elements.get(id)};const saved=new Map;const context=vm.createContext({guardHomeReturn,mountOfficialFrame,...boardArt,...presentation,...minis,...tiles,...relations,...canonical,...engine,...data,...tiles,...events,...adapter,...storage,...actions,console,URLSearchParams,structuredClone,performance,crypto,Uint32Array,setTimeout:()=>0,clearTimeout(){},location:{search:''},navigator:{},localStorage:{getItem:k=>saved.get(k)??null,setItem:(k,v)=>saved.set(k,v)},document:{hidden:false,querySelector:el,getElementById:el,querySelectorAll:()=>[],createElement:()=>el('modal'),body:{append(){}},listeners:{},addEventListener(type,fn){this.listeners[type]=fn}},window:{addEventListener(){}}});vm.runInContext(fs.readFileSync(new URL('../../character-world-master.v1.js',import.meta.url),'utf8'),context);const source=fs.readFileSync(new URL('../../prototypes/life-sugoroku/main-v4.mjs',import.meta.url),'utf8').replace(/^import .*;\n/gm,'');vm.runInContext(source,context);return {context,elements};}

test('V4 title and selection remove affinity settings and expose two to four seats',()=>{const {context,elements}=ui();assert.match(elements.get('#app').innerHTML,/VERSION 6/);assert.match(elements.get('#app').innerHTML,/seat-count/);vm.runInContext("screen='select';seatCount=2;render()",context);const h=elements.get('#app').innerHTML;assert.match(h,/この2人で/);assert.doesNotMatch(h,/profile-gender|profile-orientation|恋愛タイプ/);});
test('V4 core controls render real states, official results and no independent game UI',()=>{
 const {context,elements}=ui();vm.runInContext("state=createGame({seed:405,rounds:20,players:seats.map(character=>({character,human:true}))});screen='game'",context);const views=new Set();
 for(let n=0;n<2000;n++){
  const phase=vm.runInContext('state.phase',context);views.add(phase);
  const html=phase==='done'?vm.runInContext('JSON.stringify(album(state))',context):vm.runInContext('controls()',context);assert.doesNotMatch(html,/undefined|NaN/);assert.doesNotMatch(html,/data-pair|mini-start|data-short-light/);
  if(phase==='done')break;
  if(phase==='official')vm.runInContext("{const m=state.pending;state=dispatch(state,{type:'official-checkpoint',revision:state.revision,requestId:m.requestId,seat:m.seat,snapshot:{gameId:m.gameId,seed:m.seed,cpu:false,difficulty:'normal',frame:600,inputs:[],done:true,score:50,summary:'test fixture'}})}",context);
  else vm.runInContext('state=dispatch(state,cpuAction(state))',context);
 }
 for(const phase of ['turn','dice','branch','event','v4-choice','result','shop','reroll','official','official-result','done'])assert.ok(views.has(phase),phase);
});
test('V4 board has48 tiles, no normal numbers and inventory cannot open a shop',()=>{const {context,elements}=ui();vm.runInContext("state=createGame({seed:405,players:seats.map(character=>({character,human:true}))});screen='game';render()",context);const h=elements.get('#app').innerHTML;assert.equal((h.match(/data-node=/g)||[]).length,48);assert.doesNotMatch(h,/tile-number/);assert.doesNotMatch(vm.runInContext('inventory(state.players[0])',context),/data-buy|id="shop"/);});

const flush=async()=>{for(let i=0;i<12;i++)await Promise.resolve();};
function officialFixture(context){vm.runInContext("state=createGame({seed:405,rounds:20,players:seats.map(character=>({character,human:true}))});screen='game';while(state.phase!=='official')state=dispatch(state,cpuAction(state));persist();render()",context);}
function fakeHost(){const calls={start:0,pause:0,resume:0,destroy:0,snapshot:0};return {calls,ready:Promise.resolve(),start:async()=>{calls.start++},pause:()=>calls.pause++,resume:()=>calls.resume++,destroy:()=>calls.destroy++,snapshot:()=>calls.snapshot++,speed(){}};}
for(const reason of ['pause','hidden'])test(`official mount deferred by ${reason} starts only after resume`,async()=>{
 let resolve;const pending=new Promise(r=>resolve=r),host=fakeHost();const {context,elements}=ui(()=>pending);officialFixture(context);elements.get('#official-start').click();
 if(reason==='pause')elements.get('#menu').click();else vm.runInContext("document.hidden=true;document.listeners.visibilitychange()",context);
 resolve(host);await flush();assert.equal(host.calls.start,0);
 if(reason==='pause')elements.get('#unpause').click();else vm.runInContext("document.hidden=false;document.listeners.visibilitychange()",context);
 await flush();assert.equal(host.calls.start,1);assert.equal(host.calls.destroy,0);
});
test('bound official inventory and players work after checkpoints without replacing host or journal',async()=>{
 const host=fakeHost();let callbacks;const {context,elements}=ui(async(parent,options)=>{callbacks=options;return host});officialFixture(context);elements.get('#official-start').click();await flush();
 const snapshot=vm.runInContext("({gameId:state.pending.gameId,seed:state.pending.seed,cpu:false,difficulty:'normal',frame:12,inputs:[{frame:3,type:'pointerdown',x:80,y:90}],done:false})",context);callbacks.onSnapshot(snapshot);
 const before=vm.runInContext('JSON.stringify(state.pending.attempt)',context),revision=vm.runInContext('state.revision',context);assert.ok(before);assert.equal(JSON.parse(before).inputs.length,1);
 for(const id of ['inventory','players']){elements.get('#'+id).click();assert.equal(vm.runInContext('paused',context),true);assert.match(elements.get('#modal').innerHTML,id==='inventory'?/出発前のもちもの/:/みんな/);elements.get('#close-official-info').click();assert.equal(vm.runInContext('paused',context),false);}
 assert.equal(host.calls.start,1);assert.equal(host.calls.destroy,0);assert.equal(host.calls.resume,2);assert.equal(host.calls.snapshot,2);assert.equal(vm.runInContext('state.revision',context),revision);assert.equal(vm.runInContext('JSON.stringify(state.pending.attempt)',context),before);
});

test('official readiness resolving during pause also defers the first start',async()=>{
 const host=fakeHost();let ready;host.ready=new Promise(r=>ready=r);const {context,elements}=ui(async()=>host);officialFixture(context);elements.get('#official-start').click();await flush();elements.get('#menu').click();ready();await flush();assert.equal(host.calls.start,0);elements.get('#unpause').click();await flush();assert.equal(host.calls.start,1);assert.equal(host.calls.destroy,0);
});

test('CPU official seat mounts and starts automatically without a start button',async()=>{
 const host=fakeHost();let mounts=0;const {context}=ui(async()=>{mounts++;return host});
 vm.runInContext("state=createGame({seed:405,rounds:20,players:seats.map(character=>({character,human:false}))});screen='game';while(state.phase!=='official')state=dispatch(state,cpuAction(state));persist();render()",context);
 await flush();assert.equal(mounts,1);assert.equal(host.calls.start,1);
});

test('transformation presentation names the selected species at the retained stage',()=>{
 const {context,elements}=ui();vm.runInContext("transition={character:seats[0],nextCharacter:seats[1],before:1,after:1,human:true};evolutionModal()",context);
 const expected=vm.runInContext('seats[1].stages[0]',context);assert.ok(elements.get('#modal').innerHTML.includes('<p>'+expected+'</p>'));
});

test('CPU skip during iframe readiness waits until the formal game starts',async()=>{
 const host=fakeHost(),speeds=[];let ready;host.ready=new Promise(r=>ready=r);host.speed=n=>speeds.push(n);
 const {context}=ui(async()=>host);
 vm.runInContext("state=createGame({seed:405,players:seats.map(character=>({character,human:false}))});screen='game';while(state.phase!=='official')state=dispatch(state,cpuAction(state));persist();render()",context);
 await flush();vm.runInContext("go({type:'skip-cpu'})",context);assert.deepEqual(speeds,[],'no speed message before start');
 ready();await flush();assert.equal(host.calls.start,1);assert.equal(speeds.at(-1),60,'queued skip applies after start');
});
