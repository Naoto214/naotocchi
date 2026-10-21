import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFileSync} from 'node:fs';
const require=createRequire(import.meta.url),{JSDOM}=require(process.env.JSDOM_PATH??'/tmp/collection-dom/node_modules/jsdom');
const dom=new JSDOM(readFileSync(new URL('../index.html',import.meta.url),'utf8'),{url:'https://trial.example/',pretendToBeVisual:true}),w=dom.window;
for(const k of ['window','document','localStorage','HTMLElement','Element','Node','MutationObserver','AbortController','AbortSignal'])globalThis[k]=k==='window'?w:w[k];
document.fonts={ready:Promise.resolve()};globalThis.matchMedia=w.matchMedia=()=>({matches:true,addEventListener(){},removeEventListener(){}});globalThis.requestAnimationFrame=fn=>setTimeout(fn,0);globalThis.cancelAnimationFrame=clearTimeout;
w.HTMLDialogElement.prototype.showModal=function(){this.open=true;};w.HTMLDialogElement.prototype.close=function(){this.open=false;this.dispatchEvent(new w.Event('close'));};
const $=id=>document.getElementById(id),click=id=>$(id).click();
const protectedKeys=['naotocchi-hotseat-v1','naotocchi-cpu-match-v1'];for(const k of protectedKeys)localStorage.setItem(k,'SENTINEL');
await import('../app.mjs');click('tutorial-open');document.querySelector('[data-learn-lesson="2"]').click();
assert.equal(document.querySelectorAll('#tutorial-match .player-board').length,2,'same production board for both players');
assert.equal(document.querySelectorAll('#tutorial-match .slot').length,18);
assert.equal(document.querySelectorAll('#tutorial-match #hand').length,0,'no duplicate production IDs');
const hand=$('tutorial-hand'),toggle=hand.querySelector('[data-learn-hand-toggle]');toggle.click();assert.equal(hand.classList.contains('hand-collapsed'),true);toggle.click();assert.equal(hand.classList.contains('hand-collapsed'),false);assert.equal(hand.querySelector('[data-reorder],[data-learn-reorder]'),null);
// The guide must reopen a deliberately collapsed hand without issuing a command.
const guide=document.querySelector('[data-learn-target]');
assert.ok(guide,'offscreen operation has a reachable guide');
const explanation=$('tutorial-explanation');assert.ok(explanation);assert.equal(explanation.open,false);
explanation.open=true;const beforeGuide=localStorage.getItem('naotocchi-learning-v1');
toggle.click();guide.click();assert.equal(hand.classList.contains('hand-collapsed'),false,'guide exposes hidden hand');
assert.equal(toggle.getAttribute('aria-expanded'),'true');
assert.equal(localStorage.getItem('naotocchi-learning-v1'),beforeGuide,'guide cannot advance game');
const step=$('tutorial-progress').textContent;
document.querySelector('#tutorial-match [data-learn-egg]').click();assert.equal($('learning-card-dialog').open,true);click('learning-card-close');assert.equal($('tutorial-progress').textContent,step,'inspection cannot advance');
document.querySelector('#tutorial-match .hand-card.learn-next-card').click();
assert.ok(document.querySelector('#learning-card-dialog .detail-layout'),'production card detail');
assert.ok(document.querySelector('#learning-card-dialog [data-learn-command]'));document.querySelector('#learning-card-dialog [data-learn-command]').click();
assert.ok($('tutorial-finish'));assert.match($('tutorial-match').textContent,/時\s*0/);
// Closing during CPU animation cancels it; resuming replays only saved coordinates.
click('tutorial-lessons');document.querySelector('[data-learn-lesson="7"]').click();assert.ok(document.querySelector('.learn-cpu-status'));
const before=localStorage.getItem('naotocchi-learning-v1');click('tutorial-close');await new Promise(r=>setTimeout(r,1000));assert.equal(localStorage.getItem('naotocchi-learning-v1'),before);
click('tutorial-open');click('tutorial-resume');
for(let n=0;n<12&&!$('tutorial-finish');n++){
 if(document.querySelector('.learn-cpu-status')){await new Promise(r=>setTimeout(r,850));continue;}
 const target=document.querySelector('#tutorial-match .hand-card.learn-next-card');if(target){target.click();document.querySelector('#learning-card-dialog [data-learn-command]').click();continue;}
 const a=document.querySelector('#tutorial-match [data-learn-command]');assert.ok(a,'actionable user step');a.click();
}
assert.ok($('tutorial-finish'));assert.match($('tutorial-match').textContent,/そだち\s*30/);for(const k of protectedKeys)assert.equal(localStorage.getItem(k),'SENTINEL');
console.log('Tutorial shared board DOM PASS: 18 slots, production detail, wrong inspection, CPU lifecycle, reverse chain, save isolation');w.close();process.exit(0);
