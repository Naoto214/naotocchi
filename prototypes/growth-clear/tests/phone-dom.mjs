import assert from 'node:assert/strict';import fs from 'node:fs';import {createRequire} from 'node:module';
import {Player} from '../player-model.mjs';import {createSession} from '../session.mjs';import {PlayerStore} from '../../growth-chain/player-store.mjs';
const require=createRequire(import.meta.url),{JSDOM}=require(process.env.JSDOM_PATH||'/tmp/naopoyo-ui-deps/node_modules/jsdom');
const dom=new JSDOM(fs.readFileSync(new URL('../player.html',import.meta.url),'utf8'),{url:'http://localhost/prototypes/growth-clear/player.html',pretendToBeVisual:true});
for(const k of ['window','document','Option','localStorage'])globalThis[k]=dom.window[k];
Object.defineProperty(globalThis,'navigator',{value:dom.window.navigator,configurable:true});
dom.window.HTMLDialogElement.prototype.showModal=function(){this.open=true};dom.window.HTMLDialogElement.prototype.close=function(){this.open=false};
let callback;globalThis.requestAnimationFrame=fn=>callback=fn;globalThis.fetch=async url=>({ok:true,json:async()=>JSON.parse(fs.readFileSync(new URL('../'+url.replace('./',''),import.meta.url)))});
const state=createSession(42,{gaugeUnit:2},{gauge:24,eggs:[3,2,1,1]});state.board[13][0]={id:100,k:0,s:2};state.nextId=101;
const p=new Player(state),store=new PlayerStore(localStorage,'naopoyo-growth-clear-phone-v1');store.load();store.save(p.snapshot());localStorage.setItem('naotocchi-save-v1','PROTECTED');
await import('../phone.mjs');const $=id=>document.getElementById(id);$('resume').click();
assert.equal(document.querySelectorAll('.cell').length,72);assert.equal($('next').children.length,3);assert.match($('cost-label').textContent,/2 \/ 6/);assert.equal(document.querySelectorAll('#choices button').length,0);
// Tool flow completes on third tap; no confirm step.
$('transform').click();document.querySelector('[data-x="0"][data-y="13"]').click();assert.equal($('choices').querySelectorAll('button').length,5);$('choices').querySelectorAll('button')[1].click();assert.equal($('gauge').textContent,'22');
$('pause').click();assert.equal(JSON.parse(localStorage.getItem('naopoyo-growth-clear-phone-v1')).snapshot.state.gauge,22);$('resume').click();
// Explicit cancel is free.
$('bulk').click();$('choices').querySelectorAll('button')[1].click();$('cancel').click();assert.equal($('gauge').textContent,'22');
$('bulk').click();$('choices').querySelectorAll('button')[1].click();$('choices').querySelectorAll('button')[2].click();assert.equal($('gauge').textContent,'16');
$('eggs').children[0].click();$('choices').querySelector('button').click();document.querySelector('[data-x="5"][data-y="13"]').click();assert.match($('eggs').children[0].textContent,/2$/);assert.equal($('drop').disabled,true);
let now=performance.now();for(let i=0;i<60;i++)callback(now+=100);assert.equal($('drop').disabled,false);
// Tool selection does not freeze the active pair.
$('eggs').children[0].click();const before=document.querySelector('.active')?.dataset.y;for(let i=0;i<16;i++)callback(now+=100);const after=document.querySelector('.active')?.dataset.y;assert.notEqual(before,after);$('cancel').click();
// Pointer gesture drops, button moves work.
const board=$('board');function pointer(type,x,y){const e=new dom.window.Event(type,{bubbles:true,cancelable:true});Object.assign(e,{pointerId:1,clientX:x,clientY:y});document.querySelector('.cell').dispatchEvent(e);}
pointer('pointerdown',20,20);pointer('pointerup',20,100);assert.match($('score').textContent,/1組/);
for(let i=0;i<80;i++)callback(now+=100);$('pause').click();$('example').value='chain10';await $('replay').onclick();let saw10=false;for(let i=0;i<70;i++){callback(now+=100);saw10 ||= $('celebrate').textContent.includes('10連鎖');}assert.ok(saw10);assert.equal(localStorage.getItem('naotocchi-save-v1'),'PROTECTED');
console.log('Phone DOM PASS:3tap egg/transform/bulk,cancel,auto gravity during selection,pointer drop,NEXT3,10chain,protected save. Layout/Safari not emulated.');
