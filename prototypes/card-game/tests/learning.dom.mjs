// DOM integration (not a rendering/WebKit test). npm install --prefix /tmp/mydeck-dom jsdom
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFileSync} from 'node:fs';
import {DEFAULT_DECK,CARDS,createGame,save,restore} from '../engine.mjs';
import {CpuSession,restoreMatch} from '../cpu-session.mjs';
import {MY_DECK_KEY,LEGACY_DECK_KEY} from '../my-decks.mjs';
const require=createRequire(import.meta.url),{JSDOM}=require(process.env.JSDOM_PATH??'/tmp/collection-dom/node_modules/jsdom');
const dom=new JSDOM(readFileSync(new URL('../index.html',import.meta.url),'utf8'),{url:'https://trial.example/',pretendToBeVisual:true});
const w=dom.window;for(const k of ['window','document','localStorage','HTMLElement','Element','Node','MutationObserver','AbortController','AbortSignal'])globalThis[k]=k==='window'?w:w[k];
document.fonts={ready:Promise.resolve()};globalThis.matchMedia=()=>({matches:true});
w.matchMedia=()=>({matches:true,addEventListener(){},removeEventListener(){}});globalThis.requestAnimationFrame=fn=>setTimeout(fn,0);globalThis.cancelAnimationFrame=clearTimeout;
const modalStack=[];w.HTMLDialogElement.prototype.showModal=function(){if(!this.open){this.open=true;modalStack.push(this);}};w.HTMLDialogElement.prototype.close=function(){if(!this.open)return;this.open=false;const i=modalStack.indexOf(this);if(i>=0)modalStack.splice(i,1);this.dispatchEvent(new w.Event('close'));};
const top=()=>modalStack.at(-1)?.id;
let consent=true;globalThis.confirm=()=>consent;
const $=id=>document.getElementById(id),click=id=>$(id).click(),input=(id,value,event='input')=>{$(id).value=value;$(id).dispatchEvent(new w.Event(event,{bubbles:true}));},data=()=>JSON.parse(localStorage.getItem(MY_DECK_KEY));
const legacy={A:[...DEFAULT_DECK],B:[...DEFAULT_DECK].reverse()},legacyRaw=JSON.stringify(legacy),match=save(createGame(29));
localStorage.setItem(LEGACY_DECK_KEY,legacyRaw);localStorage.setItem('naotocchi-hotseat-v1',match);
await import('../app.mjs');

assert.ok($('rulebook-open'),'rulebook entry');assert.ok($('tutorial-open'),'practice entry');
click('rulebook-open');assert.equal($('rulebook-dialog').open,true);assert.equal(document.querySelectorAll('[data-learn-chapter]').length,15);
for(let chapter=1;chapter<=15;chapter++){click('rulebook-toc');document.querySelector(`[data-learn-chapter="${chapter}"]`).click();assert.ok(document.querySelector('.learn-chapter h3').textContent);assert.ok(document.querySelector('.learn-sources'));}click('rulebook-toc');
input('rulebook-search','逆順');assert.ok($('rulebook-results').textContent.includes('逆順'));input('rulebook-search','');
document.querySelector('[data-learn-chapter="4"]').click();assert.equal(document.querySelectorAll('#rulebook-body .learn-board-cell').length,9);
click('rulebook-close');assert.equal($('rulebook-dialog').open,false);
// Nested help routes must present the requested modal, then return to their origin.
click('rulebook-open');document.querySelector('[data-learn-chapter="7"]').click();document.querySelector('[data-learn-example]').click();
assert.equal(top(),'learning-card-dialog');click('learning-card-rules');assert.equal(top(),'rulebook-dialog');click('rulebook-close');assert.equal(top(),'learning-card-dialog');click('learning-card-close');assert.equal(top(),'rulebook-dialog');
click('rulebook-collection');if(!$('collection-notice').hidden)click('collection-ack');click('collection-cover');document.querySelector('[data-collection-card="special-egg"]').click();click('collection-rulebook');assert.equal(top(),'rulebook-dialog');click('rulebook-close');assert.equal(top(),'collection-dialog');click('collection-close');assert.equal(top(),'rulebook-dialog');
click('rulebook-toc');document.querySelector('[data-learn-start]').click();document.querySelector('[data-learn-lesson="0"]').click();document.querySelector('[data-learn-rules]').click();assert.equal(top(),'rulebook-dialog');click('rulebook-close');assert.equal(top(),'tutorial-dialog');click('tutorial-close');assert.equal(top(),'rulebook-dialog');click('rulebook-close');
const protectedKeys=['naotocchi-hotseat-v1','naotocchi-cpu-match-v1',MY_DECK_KEY,LEGACY_DECK_KEY];const before=Object.fromEntries(protectedKeys.map(k=>[k,localStorage.getItem(k)]));
click('tutorial-open');
for(let lesson=0;lesson<9;lesson++){
 document.querySelector(`[data-learn-lesson="${lesson}"]`).click();
 let safety=0;
 while(!$('tutorial-finish') && safety++<70){
  const go=document.querySelector('[data-learn-continue]');if(go){go.click();continue;}
  if(document.querySelector('.learn-cpu-status')){await new Promise(r=>setTimeout(r,850));continue;}
  const target=document.querySelector('.learn-next-card[data-learn-card]');if(target){target.click();assert.equal($('learning-card-dialog').open,true);click('learning-card-confirm');continue;}
  const action=document.querySelector('#tutorial-match [data-learn-command]');if(action){action.click();continue;}
  assert.fail('step must expose a legal operation or CPU transition');
 }
 assert.ok(safety<70);assert.ok($('tutorial-finish'));
 click('tutorial-lessons');
}
for(const k of protectedKeys)assert.equal(localStorage.getItem(k),before[k],k+' unchanged');
assert.equal(JSON.parse(localStorage.getItem('naotocchi-learning-v1')).completed.length,9);
click('tutorial-close');click('tutorial-open');document.querySelector('[data-learn-lesson="3"]').click();const stepBefore=$('tutorial-progress').textContent;click('tutorial-close');click('tutorial-open');click('tutorial-resume');assert.equal($('tutorial-progress').textContent,stepBefore);click('tutorial-restart');assert.match($('tutorial-progress').textContent,/1 \/ 2/);click('tutorial-skip');assert.equal($('tutorial-lesson-list').hidden,false);click('tutorial-close');
// CPU and active match preservation: no engine commands while help is open.
click('new');const matchBefore=localStorage.getItem('naotocchi-cpu-match-v1'),gameBefore=$('game').innerHTML;
click('menu-rulebook-open');assert.equal($('rulebook-dialog').open,true);click('rulebook-close');assert.equal(localStorage.getItem('naotocchi-cpu-match-v1'),matchBefore);assert.equal($('game').innerHTML,gameBefore);
click('tutorial-open');document.querySelector('[data-learn-lesson="0"]').click();click('tutorial-close');assert.equal(localStorage.getItem('naotocchi-cpu-match-v1'),matchBefore);
click('collection-open');if(!$('collection-notice').hidden)click('collection-ack');click('collection-cover');document.querySelector('[data-collection-card="special-egg"]').click();assert.ok($('collection-rulebook'));click('collection-rulebook');assert.equal($('rulebook-dialog').open,true);assert.match($('rulebook-body').textContent,/たまご状態/);click('rulebook-close');assert.equal($('collection-dialog').open,true);click('collection-close');
click('collection-open');document.querySelector('[data-collection-card="special-egg"]').click();click('collection-rulebook');click('rulebook-toc');document.querySelector('[data-learn-start]').click();click('tutorial-cpu');assert.equal(document.querySelectorAll('dialog[open]').length,0);assert.equal(document.body.classList.contains('collection-open'),false);assert.equal($('cpu-level').value,'beginner');assert.equal($('welcome').hidden,false);assert.equal(localStorage.getItem('naotocchi-cpu-match-v1'),matchBefore);
// A pending CPU timer is cancelled by help and restarts only after returning.
input('human-seat','B','change');click('new');const waitingSave=localStorage.getItem('naotocchi-cpu-match-v1');click('menu-rulebook-open');await new Promise(r=>setTimeout(r,800));assert.equal(localStorage.getItem('naotocchi-cpu-match-v1'),waitingSave);click('rulebook-close');await new Promise(r=>setTimeout(r,800));assert.notEqual(localStorage.getItem('naotocchi-cpu-match-v1'),waitingSave);w.dispatchEvent(new w.Event('blur'));
console.log('Learning DOM PASS: 15 chapters, search/diagram, all nine lesson card taps, progress, resume/restart/skip, match/deck isolation, collection navigation, CPU beginner setup');w.close();process.exit(0);
