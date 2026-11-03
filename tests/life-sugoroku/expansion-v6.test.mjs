import test from 'node:test';
import assert from 'node:assert/strict';
import {createNodeOfficialRuntime,OFFICIAL_IDS} from '../../prototypes/life-sugoroku/official-runtime-v4.mjs';
import {POOLS} from '../../prototypes/life-sugoroku/tournament-v4.mjs';
import * as T from '../../prototypes/life-sugoroku/tournament-v4.mjs';
import * as E from '../../prototypes/life-sugoroku/engine-v4.mjs';
import fs from 'node:fs';
test('formal touch pad function bodies are directly reused',()=>{
 const source=fs.readFileSync(new URL('../../script.js',import.meta.url),'utf8');
 const code=fs.readFileSync(new URL('../../prototypes/life-sugoroku/official/controls.js',import.meta.url),'utf8');
 assert.ok(code.includes(source.slice(source.indexOf('  function createTouchPad('),source.indexOf('  function bindHeldButton('))));
});
test('unknown pointer targets are rejected and target history cannot be rewritten',async()=>{
 const r=await createNodeOfficialRuntime();r.start({gameId:'snake-classic',seed:3});
 assert.throws(()=>r.input({type:'pointerdown',x:1,y:2,target:'script'}));
 const s=E.createGame({seed:3,rounds:10,players:['dog','cat','frog','penguin'].map(id=>({character:{id},human:true}))});
 const m=T.openTournament(s,'game',()=>0);m.gameId='snake-classic';
 const a={gameId:m.gameId,seed:m.seed,difficulty:s.players[0].difficulty,cpu:false,frame:30,done:false,inputs:[{frame:29,type:'pointerdown',x:160,y:40,target:'pad'}],pendingInputs:[]};
 T.checkpoint(s,m,a);assert.throws(()=>T.checkpoint(s,m,{...a,inputs:[{...a.inputs[0],target:undefined}]}));
 assert.equal(T.validAttempt({...a,inputs:[{...a.inputs[0],target:'script'}]},m,s.players[0]),false);
});
const candidates=['stack-themed','stack-snowman','stack-harvest','stack-acorn','stack-sakura','stack-leaves','fruit-slice','sushi-belt','line-trace','memory-cards','air-hockey','breakout-classic','snake-classic'];
test('formal touch pad input moves the snake and survives held-pointer restore',async()=>{
 const a=await createNodeOfficialRuntime();a.start({gameId:'snake-classic',seed:3});a.step(35);
 a.input({type:'pointerdown',x:160,y:40,target:'pad'});a.step(1);
 a.input({type:'pointermove',x:160,y:10,target:'pad'});const save=a.step(1);
 assert.equal(save.inputs[0].target,'pad');
 const b=await createNodeOfficialRuntime();assert.deepEqual(b.start(save),save);
 for(const r of [a,b])r.input({type:'pointerup',x:160,y:10,target:'pad'});
 assert.deepEqual(a.step(3600),b.step(3600));
 const idle=await createNodeOfficialRuntime();idle.start({gameId:'snake-classic',seed:3});
 assert.notEqual(a.snapshot().frame,idle.step(3600).frame);
});
for(const gameId of candidates)test(gameId+' formal CPU callback, idle timeout and exact mid-input restore',async()=>{
 assert.ok(OFFICIAL_IDS.includes(gameId),'runtime admits candidate');
 assert.ok(POOLS.game.includes(gameId),'draw pool admits candidate');
 for(const difficulty of ['easy','normal']){
  const a=await createNodeOfficialRuntime();a.start({gameId,seed:3,cpuSeed:29,cpu:true,difficulty});
  const saved=a.step(333),b=await createNodeOfficialRuntime();assert.deepEqual(b.start(saved),saved);
  const done=a.step(3600);assert.equal(done.done,true);assert.ok(done.frame<=3600);assert.ok(done.inputs.length>0);assert.ok(Number.isInteger(done.score));
  assert.deepEqual(b.step(3600),done);
  const human=await createNodeOfficialRuntime();human.start({...saved,cpu:false});
  assert.deepEqual(human.snapshot().inputs,saved.inputs);
 }
 const idle=await createNodeOfficialRuntime();idle.start({gameId,seed:3});assert.equal(idle.step(3600).done,true);
});
for(const gameId of candidates)test(gameId+' four seats keep seed, resume each boundary, award exactly once',async()=>{
 let s=E.createGame({seed:27,rounds:10,players:['dog','cat','frog','penguin'].map((id,i)=>({character:{id},human:false,difficulty:i%2?'easy':'normal'}))});
 s.players[0].pos=9;s.players[0].walkPath=[9];s.phase='official';s.pending=T.openTournament(s,'game',()=>0);s.pending.gameId=gameId;
 s=E.restore(E.serialize(s));const initialSeed=s.pending.seed;
 for(let seat=0;seat<4;seat++){
  const m=s.pending,r=await createNodeOfficialRuntime();r.start({gameId,seed:m.seed,cpuSeed:100+seat,cpu:true,difficulty:s.players[seat].difficulty});
  const checkpoint=snapshot=>({type:'official-checkpoint',revision:s.revision,requestId:s.pending.requestId,seat,snapshot});
  s=E.dispatch(s,checkpoint(r.step(333)));s=E.restore(E.serialize(s));
  const b=await createNodeOfficialRuntime();b.start(s.pending.attempt);
  const result=r.step(3600);assert.deepEqual(b.step(3600),result);
  const command=checkpoint(result);s=E.dispatch(s,command);s=E.restore(E.serialize(s));
  assert.throws(()=>E.dispatch(s,command));assert.equal(s.pending.seed,initialSeed);
 }
 assert.equal(s.miniHistory.length,1);assert.equal(s.phase,'official-result');
 const results=s.pending.results;
 for(const row of results){assert.equal(row.rank,1+results.filter(q=>q.score>row.score).length);assert.equal(row.reward,20-row.rank*5);assert.equal(s.players[row.id].sodachi,20+row.reward);assert.equal(s.players[row.id].money,20);}
 const done=E.restore(E.serialize(s));assert.deepEqual(done,s);
});
test('trusted pointer capture precedes official document release handlers',()=>{
 const host=fs.readFileSync(new URL('../../prototypes/life-sugoroku/official-host-v4.js',import.meta.url),'utf8');
 assert.match(host,/window\.addEventListener\('pointerup',capture,true\)/);
});
test('new normal renderer includes canonical artwork and atlas',()=>{
 const host=fs.readFileSync(new URL('../../prototypes/life-sugoroku/official-host-v4.js',import.meta.url),'utf8');
 assert.ok(host.includes('official/art-v6.js'));assert.ok(host.includes('official/canvas-illustrations.js'));
});
test('normal snake CPU has a nonconstant official score distribution',async()=>{
 const scores=[];for(let seed=1;seed<=8;seed++){const r=await createNodeOfficialRuntime();r.start({gameId:'snake-classic',seed,cpu:true,difficulty:'normal'});scores.push(r.step(3600).score);}assert.ok(new Set(scores).size>1);
});
test('canonical illustration engine bytes and resolved assets are available',()=>{
 assert.equal(fs.readFileSync(new URL('../../canvas-illustrations.js',import.meta.url),'utf8'),fs.readFileSync(new URL('../../prototypes/life-sugoroku/official/canvas-illustrations.js',import.meta.url),'utf8'));
 const assets=JSON.parse(fs.readFileSync(new URL('../../prototypes/life-sugoroku/official/art-assets-v6.json',import.meta.url),'utf8'));for(const asset of assets)assert.ok(fs.existsSync(new URL('../../'+asset,import.meta.url)),asset);
});
test('batched native pad move/up replays exactly despite document capture release',async()=>{
 const vm=await import('node:vm');
 const controls=fs.readFileSync(new URL('../../prototypes/life-sugoroku/official/controls.js',import.meta.url),'utf8');
 const hostSource=fs.readFileSync(new URL('../../prototypes/life-sugoroku/official-host-v4.js',import.meta.url),'utf8');
 function run(intercept){
  const windowHandlers={},docHandlers={},queue=[];let distance=0,pad;
  const element=()=>({style:{setProperty(){}},classList:{add(){},remove(){},contains:()=>true},querySelector:()=>({style:{}}),querySelectorAll:()=>[],handlers:{},addEventListener(t,f){(this.handlers[t]??=[]).push(f);},getBoundingClientRect:()=>({left:0,top:0,width:320,height:92}),setPointerCapture(){},closest(){return this;}});
  const realm=vm.createContext({document:{createElement:element,addEventListener(t,f){(docHandlers[t]??=[]).push(f);}},performance:{now:()=>100},setTimeout:()=>0,clearTimeout(){},window:{addEventListener(t,f){(windowHandlers[t]??=[]).push(f);}},box:{querySelector:()=>pad},runtime:{snapshot:()=>({cpu:false}),input:e=>queue.push(e)},dirty:false});
  vm.runInContext(controls,realm);realm.installNaokoroControls().createTouchPad({appendChild:e=>pad=e},{mode:'delta',glide:false,gainX:1.15,onDelta:dx=>distance+=dx});
  if(intercept)vm.runInContext(hostSource.match(/ function capture\(e\)\{[^\n]+/)[0]+'\n'+hostSource.match(/ window\.addEventListener\('pointerdown'[^\n]+/)[0],realm);
  function dispatch(type,x,trusted){const e={type,clientX:x,clientY:40,pointerId:1,isTrusted:trusted,target:pad,preventDefault(){},stopImmediatePropagation(){this.stopped=true;}};for(const f of windowHandlers[type]||[])f(e);if(!e.stopped){for(const f of docHandlers[type]||[])f(e);for(const f of pad.handlers[type]||[])f(e);}}
  function flush(){for(const e of queue.splice(0))dispatch(e.type,e.x,false);}
  dispatch('pointerdown',160,true);flush();
  dispatch('pointermove',200,true);dispatch('pointerup',200,true);flush();
  return distance;
 }
 assert.equal(run(true),46);
});
