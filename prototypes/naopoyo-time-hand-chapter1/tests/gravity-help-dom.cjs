// DOM/event integration only: jsdom + canvas/Image/dimensions stubs, not Safari QA.
const {JSDOM}=require(process.env.NAOPOYO_JSDOM||'jsdom');const fs=require('node:fs');const path=require('node:path');const assert=require('node:assert/strict');const {pathToFileURL}=require('node:url');
(async()=>{
 const dir=path.join(process.cwd(),'prototypes/naopoyo-time-hand-chapter1');
 const dom=new JSDOM(fs.readFileSync(path.join(dir,'index.html'),'utf8'),{url:'https://qa.invalid/',pretendToBeVisual:true}),w=dom.window;
 for(const k of ['window','document','localStorage'])global[k]=k==='window'?w:w[k];
 let reduced=true,hidden=false;global.matchMedia=()=>({matches:reduced});Object.defineProperty(document,'hidden',{get:()=>hidden});
 global.ResizeObserver=class{observe(){}};const frames=new Map();let fid=0;global.requestAnimationFrame=f=>{frames.set(++fid,f);return fid};global.cancelAnimationFrame=id=>frames.delete(id);
 const advance=()=>{let now=performance.now();for(let i=0;i<12;i++){now+=100;const batch=[...frames.values()];frames.clear();for(const f of batch)f(now);}};
 global.Image=class{set src(v){queueMicrotask(()=>this.onload())}};
 w.HTMLDialogElement.prototype.showModal=function(){this.open=true};w.HTMLDialogElement.prototype.close=function(){this.open=false};
 const ctx=new Proxy({font:'12px system-ui',createRadialGradient:()=>({addColorStop(){}}),createLinearGradient:()=>({addColorStop(){}})},{get:(o,k)=>k in o?o[k]:(()=>{}),set:(o,k,v)=>(o[k]=v,true)});
 w.HTMLCanvasElement.prototype.getContext=()=>ctx;w.HTMLElement.prototype.getBoundingClientRect=()=>({x:0,y:0,left:0,top:0,width:320,height:320,bottom:320});
 w.HTMLCanvasElement.prototype.setPointerCapture=()=>{};
 const load=f=>import(pathToFileURL(path.join(dir,f)));
 const {ChapterProgress}=await load('progress.mjs'),{ChapterSession,STORAGE_KEY}=await load('session.mjs'),{solutions}=await load('solutions.mjs'),{stages}=await load('stages.mjs');
 const {ChapterProgress:LegacyProgress}=await load('archive/v5/progress.mjs');const legacyKey='naopoyo.time-hand-dungeon.20261102.v5',legacy=new LegacyProgress().serialize();localStorage.setItem(legacyKey,legacy);localStorage.setItem(legacyKey+'.examples','[[0,{"index":2,"key":"old"}]]');
 localStorage.setItem('naopoyo.time-hand-dungeon.20261102.v6','V6 retained');
 const p=new ChapterProgress();for(const a of solutions[0])p.sessions[0].step(...a);p.record();const saved=p.serialize();localStorage.setItem(STORAGE_KEY,saved);
 await load('app.mjs');const $=id=>document.getElementById(id),board=$('board');
 const move=(q,step,id=1)=>{const [who,dx,dy]=step,a=q.state.actors.find(a=>a.id===who);const e={pointerId:id,isPrimary:true,clientX:(a.x+.5)*40,clientY:(a.y+.5)*40,preventDefault(){}};board.onpointerdown(e);board.onpointerup({...e,clientX:e.clientX+dx*40,clientY:e.clientY+dy*40});assert.ok(q.step(...step).ok);};
 assert.equal($('moves').textContent,solutions[0].length+' 手');assert.deepEqual(JSON.parse(localStorage.getItem(STORAGE_KEY)),JSON.parse(saved));$('undo').click();assert.equal($('moves').textContent,(solutions[0].length-1)+' 手');
 const restored=new ChapterSession(0);for(const a of solutions[0].slice(0,-1))restored.step(...a);move(restored,solutions[0].at(-1));assert.ok($('dialog').open);w.dispatchEvent(new w.Event('resize'));$('nextStage').click();assert.equal($('number').textContent,'02');
 $('select').click();assert.equal(document.querySelectorAll('.level:disabled').length,8);document.querySelector('[data-stage="0"]').click();assert.equal($('moves').textContent,'0 手');assert.equal(JSON.parse(localStorage.getItem(STORAGE_KEY)).completed[0],true);
 // Full stroke Undo and exact save history in the new board.
 const q=new ChapterSession(0),a=q.state.actors[0];board.onpointerdown({pointerId:8,isPrimary:true,clientX:(a.x+.5)*40,clientY:(a.y+.5)*40,preventDefault(){}});board.onpointerup({pointerId:8,clientX:(a.x+2.5)*40,clientY:(a.y+.5)*40,preventDefault(){}});assert.equal($('moves').textContent,'2 手');$('undo').click();assert.equal($('moves').textContent,'0 手');
 for(const interruption of ['rotate-key','background-example']){
  $('retry').click();reduced=false;const live=new ChapterSession(0);
  for(const [i,step]of solutions[0].entries()){move(live,step,i+20);if(i<solutions[0].length-1)advance();}
  assert.equal($('dialog').open,false);
  if(interruption==='rotate-key'){w.dispatchEvent(new w.KeyboardEvent('keydown',{key:'ArrowRight',bubbles:true}));w.dispatchEvent(new w.Event('resize'));}
  else {hidden=true;document.dispatchEvent(new w.Event('visibilitychange'));hidden=false;document.dispatchEvent(new w.Event('visibilitychange'));$('example').click();$('return').click();}
  advance();assert.equal($('dialog').open,true,interruption);$('close').click();reduced=true;
 }
 $('hint').click();assert.ok($('details').open);$('details-close').click();
 const beforeDemo=localStorage.getItem(STORAGE_KEY);$('example').click();assert.equal(document.querySelector('dialog.example').open,true);
 for(let i=0;i<10;i++){
  $('example-stage').value=i;$('example-stage').onchange();assert.equal(document.querySelector('.gravity-sign').hidden,!stages[i].board.gravity);if(stages[i].board.gravity){const st=document.querySelector('.gravity-sign').style;assert.equal(parseFloat(st.left),0);assert.equal(parseFloat(st.top),280);}assert.equal(document.querySelector('.gravity-sign').parentElement,board.parentElement);assert.equal($('gravity').textContent,stages[i].board.gravity?'重力 ↓ ・ 支えがないと落ちる':'ひかりの牢屋');assert.equal($('lesson-text').textContent,stages[i].text);assert.equal($('lesson-goal').textContent,stages[i].goal);$('restart').click();for(let j=0;j<solutions[i].length;j++)$('forward').click();assert.equal($('replay-position').textContent,solutions[i].length+' / '+solutions[i].length+' 手');
  $('back').click();const old=$('replay-position').textContent;$('return').click();$('example').click();$('example-stage').value=i;$('example-stage').onchange();assert.equal($('replay-position').textContent,old);
 }
 assert.equal(localStorage.getItem(STORAGE_KEY),beforeDemo);assert.equal(localStorage.getItem(legacyKey),legacy);assert.equal(localStorage.getItem(legacyKey+'.examples'),'[[0,{"index":2,"key":"old"}]]');
 assert.equal(localStorage.getItem('naopoyo.time-hand-dungeon.20261102.v6'),'V6 retained');
 $('return').click();const originalSet=w.Storage.prototype.setItem;w.Storage.prototype.setItem=function(){throw new Error('quota')};$('retry').click();assert.match($('saved').textContent,/保存できません/);assert.equal($('saved').hidden,false);w.Storage.prototype.setItem=originalSet;
 $('select').click();document.querySelector('[data-stage="0"]').click();$('retry').click();
 const a8=new ChapterSession(0),actor=a8.state.actors[0].id;
 for(let n=0;n<2;n++)move(a8,[actor,-1,0]);for(let n=0;n<5;n++)move(a8,[actor,0,1]);
 assert.equal(a8.state.actors[0].x,0);assert.equal(a8.state.actors[0].y,7);
 const tap=(x,y)=>{const e={pointerId:7,isPrimary:true,clientX:(x+.5)*40,clientY:(y+.5)*40,preventDefault(){}};board.onpointerdown(e);board.onpointerup(e);};
 tap(0,7);tap(0,6);assert.ok(a8.step(actor,0,-1).ok);assert.equal($('moves').textContent,a8.state.moves+' 手');move(a8,[actor,0,1]);assert.equal($('moves').textContent,a8.state.moves+' 手');
 // Exercise the actual app handlers across all stages, including help-only taps.
 for(let i=0;i<10;i++){
  $('select').click();document.querySelector(`[data-stage="${i}"]`).click();$('retry').click();
  const live=new ChapterSession(i);
  assert.equal($('gravity').hidden,!!live.state.gravity);assert.equal($('gravity-help').hidden,true);
  if(live.state.gravity){
   assert.match($('gravity-help').textContent,/この部屋には重力があります。/);assert.match($('gravity-help').textContent,/足元に支えがないと、キャラクターは下へ落ちます。/);
   const before=localStorage.getItem(STORAGE_KEY),moves=$('moves').textContent;
   tap(0,7);assert.equal($('gravity-help').hidden,false);assert.equal($('gravity').hidden,true);tap(0,7);assert.equal($('gravity-help').hidden,true);assert.equal($('gravity').hidden,true);
   const e={pointerId:91,isPrimary:true,clientX:20,clientY:300,preventDefault(){}};
   board.onpointerdown(e);board.onpointercancel(e);board.onpointerup(e);assert.equal($('gravity').hidden,true);
   board.onpointerdown(e);board.onpointermove({...e,clientX:60});board.onpointerup(e);assert.equal($('gravity').hidden,true);
   tap(0,7);w.dispatchEvent(new w.Event('resize'));assert.equal($('gravity-help').hidden,false);assert.equal($('gravity').hidden,true);tap(0,7);
   assert.equal($('moves').textContent,moves);assert.equal(localStorage.getItem(STORAGE_KEY),before);
  }
  for(const step of solutions[i])move(live,step);
  assert.ok($('dialog').open,`stage ${i+1} still clears`);$('close').click();
 }
 console.log('PASS: actual app sign show/hide, canceled/dragged pointer, resize, unchanged saves/moves, all10 live solutions plus existing all10 replay/save/Undo/A8 regressions.');
})();
