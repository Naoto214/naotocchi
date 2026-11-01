import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mountClockTurn} from '../life-clock-turn.mjs';
const {JSDOM}=createRequire(import.meta.url)(process.env.JSDOM_PATH);
const dom=new JSDOM('<button id="flip"></button><div id="scene"><div id="rotor"><div data-clock-front></div><div data-clock-back></div></div></div><p id="hint"></p>',{pretendToBeVisual:true});
const d=dom.window.document,scene=d.querySelector('#scene'),rotor=d.querySelector('#rotor'),button=d.querySelector('#flip'),hint=d.querySelector('#hint');
let reduced=true;dom.window.matchMedia=()=>({matches:reduced});
const turn=mountClockTurn({scene,rotor,button,hint});
function event(type,x,y,id=1,primary=true){const e=new dom.window.Event(type,{bubbles:true,cancelable:true});Object.assign(e,{clientX:x,clientY:y,pointerId:id,isPrimary:primary,button:0});scene.dispatchEvent(e);}
function swipe(dx,dy=0){event('pointerdown',150,150);event('pointermove',150+dx,150+dy);event('pointerup',150+dx,150+dy);}
turn.reset();swipe(90);assert.equal(rotor.dataset.side,'front','loading cannot flip');turn.setEnabled(true);
swipe(-90);assert.equal(rotor.dataset.side,'back');assert.equal(rotor.style.transform,'rotateY(-180deg)');assert.equal(button.textContent,'表へ');
swipe(90);assert.equal(rotor.dataset.side,'front');assert.equal(rotor.style.transform,'rotateY(0deg)');
swipe(20);assert.equal(rotor.dataset.side,'front','tap/jitter');swipe(60,90);assert.equal(rotor.dataset.side,'front','vertical scrolling');
event('pointerdown',150,150);event('pointermove',50,150);event('pointercancel',50,150);event('pointerup',50,150);assert.equal(rotor.dataset.side,'front','cancel');
event('pointerdown',150,150);event('pointerdown',170,150,2,false);event('pointerup',40,150);event('pointerup',70,150,2,false);assert.equal(rotor.dataset.side,'front','multi touch');
event('pointerdown',150,150);const second=new dom.window.Event('pointerdown',{bubbles:true});Object.assign(second,{pointerId:2,isPrimary:false,button:0});d.body.dispatchEvent(second);event('pointerup',40,150);assert.equal(rotor.dataset.side,'front','second finger outside clock cancels swipe');const secondUp=new dom.window.Event('pointerup',{bubbles:true});Object.assign(secondUp,{pointerId:2});d.body.dispatchEvent(secondUp);
const realNow=Date.now;let now=0;Date.now=()=>now;event('pointerdown',150,150);now=9000;event('pointerup',60,150);Date.now=realNow;assert.equal(rotor.dataset.side,'back','deliberate slow drag also flips');button.click();
turn.setZoom(true);swipe(100);assert.equal(rotor.dataset.side,'front','zoom pans');button.click();assert.equal(rotor.dataset.side,'back','zoom button flips');assert.match(hint.textContent,/スクロール/);
turn.setZoom(false);button.click();assert.equal(rotor.dataset.side,'front');
reduced=false;button.click();assert.equal(button.disabled,true,'rotation lock');swipe(100);assert.equal(rotor.dataset.side,'back');
rotor.dispatchEvent(Object.assign(new dom.window.Event('transitionend'),{propertyName:'transform'}));assert.equal(button.disabled,false);
turn.reset();assert.equal(rotor.dataset.side,'front');assert.equal(button.disabled,true);assert.equal(rotor.style.transform,'rotateY(0deg)');
turn.setEnabled(true);button.click();turn.destroy();assert.equal(button.disabled,true);dom.window.close();
console.log('V18 turn PASS: both directions, jitter, vertical, cancel, multitouch, zoom, reduced motion, lock, reset, destroy');
