import assert from 'node:assert/strict';import {createRequire} from 'node:module';import {readFileSync} from 'node:fs';
const {JSDOM}=createRequire(import.meta.url)(process.env.JSDOM_PATH);
const dom=new JSDOM(readFileSync(new URL('../index.html',import.meta.url),'utf8'),{url:'https://trial.example/',pretendToBeVisual:true});
const w=dom.window;for(const k of ['window','document','localStorage','HTMLElement','Element','Node','MutationObserver','AbortController','AbortSignal'])globalThis[k]=k==='window'?w:w[k];
globalThis.getComputedStyle=w.getComputedStyle.bind(w);document.fonts={ready:Promise.resolve()};w.matchMedia=globalThis.matchMedia=()=>({matches:true,addEventListener(){},removeEventListener(){}});globalThis.requestAnimationFrame=fn=>setTimeout(fn,0);globalThis.cancelAnimationFrame=clearTimeout;
w.HTMLCanvasElement.prototype.getContext=()=>({measureText:t=>({actualBoundingBoxLeft:0,actualBoundingBoxRight:t.length*26,actualBoundingBoxAscent:40,actualBoundingBoxDescent:0})});
w.HTMLDialogElement.prototype.showModal=function(){this.open=true;};w.HTMLDialogElement.prototype.close=function(){if(!this.open)return;this.open=false;this.dispatchEvent(new w.Event('close'));};
const $=id=>document.getElementById(id),sleep=ms=>new Promise(r=>setTimeout(r,ms)),snapshot=()=>JSON.stringify(Object.entries(localStorage).sort());
let t=0;function event(target,type,x=40,y=40,id=1){const e=new w.Event(type,{bubbles:true,cancelable:true});Object.defineProperties(e,{timeStamp:{value:t+=30},pointerId:{value:id},isPrimary:{value:id===1},button:{value:0},pointerType:{value:'touch'},clientX:{value:x},clientY:{value:y}});target.dispatchEvent(e);return e;}
const activate=target=>{event(target,'pointerdown');event(target,'pointerup');target.click();};
const tap=target=>{event(target,'pointerdown');event(target,'pointerup');};const double=target=>{tap(target);tap(target);};
await import('../app.mjs');$('solo-open').click();$('new').click();const before=snapshot();
async function clock(){document.querySelector('[data-life-clock]').click();for(let i=0;i<100&&$('life-clock-zoom').disabled;i++)await sleep(20);assert.equal($('life-clock-zoom').disabled,false);}
for(const [width,height] of [[320,568],[375,667],[390,844],[430,932],[568,320],[667,375],[844,390],[932,430]]){
 w.innerWidth=width;w.innerHeight=height;w.dispatchEvent(new w.Event('resize'));
 await clock();const scene=document.querySelector('.life-clock-scene'),z=$('life-clock-zoom'),face=$('life-clock-face'),angles=[...face.querySelectorAll('[data-hand]')].map(n=>n.dataset.angle);
 tap(scene);assert.equal(z.textContent,'拡大');t+=400;double(scene);assert.equal(z.textContent,'全体表示');assert.equal(z.getAttribute('aria-pressed'),'true');double(scene);assert.equal(z.textContent,'拡大');
 event(scene,'pointerdown');event(scene,'pointermove',140);event(scene,'pointerup',140);assert.equal(face.dataset.side,'back');assert.equal(z.textContent,'拡大');
 z.click();assert.equal(z.textContent,'全体表示');event(scene,'pointerdown');event(scene,'pointermove',140);event(scene,'pointerup',140);assert.equal(face.dataset.side,'back','expanded swipe pans');$('life-clock-flip').click();assert.equal(face.dataset.side,'front');
 w.dispatchEvent(new w.Event('resize'));assert.equal(z.textContent,'全体表示');assert.deepEqual([...face.querySelectorAll('[data-hand]')].map(n=>n.dataset.angle),angles);$('life-clock-close').click();assert.equal($('life-clock-dialog').open,false);assert.equal(snapshot(),before);
 const origin=document.querySelector('#hand [data-inspect]');assert.ok(origin);origin.click();const d=$('card-dialog'),card=d.querySelector('.stage-card'),button=d.querySelector('button[data-stage-zoom]');assert.ok(card);assert.equal(button.textContent,'拡大');assert.equal(button.hidden,false);
 double(card);assert.equal(d.dataset.stageZoom,'1');assert.equal(button.textContent,'全体表示');double(card);assert.notEqual(d.dataset.stageZoom,'1');button.click();assert.equal(d.dataset.stageZoom,'1');w.dispatchEvent(new w.Event('resize'));assert.equal(button.textContent,'全体表示');assert.equal(d.querySelector('[data-close]').textContent,'閉じる ×');d.querySelector('[data-close]').click();assert.equal(d.open,false);assert.equal(snapshot(),before,'inspection never commits a mandatory egg choice');
}
// Closing during a real-duration zoom must settle it before the card DOM is removed.
let animation;w.matchMedia=globalThis.matchMedia=()=>({matches:false});w.HTMLElement.prototype.animate=function(){animation={cancel(){},onfinish:null};return animation;};
document.querySelector('#hand [data-inspect]').click();$('card-dialog').querySelector('.stage-card').getBoundingClientRect=()=>({left:0,top:0,width:$('card-dialog').dataset.stageZoom==='1'?150:100,height:150});$('card-dialog').querySelector('button[data-stage-zoom]').click();$('card-dialog').querySelector('[data-close]').click();assert.doesNotThrow(()=>animation.onfinish?.());
assert.equal(snapshot(),before);
// Non-reduced clock animation uses a uniform transform and closes cleanly mid-flight.
let frames;w.HTMLElement.prototype.animate=function(keyframes){frames=keyframes;animation={cancel(){},onfinish:null};return animation;};
await clock();$('life-clock-zoom').click();assert.match(frames[1].transform,/scale\([^,]+\)$/);$('life-clock-close').click();assert.doesNotThrow(()=>animation.onfinish?.());assert.equal(snapshot(),before);
// A mandatory selection still requires its original game action, and cancel leaves it pending.
w.matchMedia=globalThis.matchMedia=()=>({matches:true});
document.querySelector('#hand [data-inspect]').click();activate($('card-dialog').querySelector('button[data-action]'));
if($('confirm-dialog').open){assert.equal(snapshot(),before);$('confirm-dialog').querySelector('[data-cancel]').click();assert.equal(snapshot(),before);activate($('card-dialog').querySelector('button[data-action]'));activate($('confirm-dialog').querySelector('[data-confirm]'));}
assert.notEqual(snapshot(),before,'explicit game action commits the mandatory choice');
console.log('V20 DOM PASS: 8 viewport states, clock/card double tap/buttons/close, swipe vs pan, resize, 6 hand angles and mandatory selection preservation, close during zoom');w.close();process.exit(0);
