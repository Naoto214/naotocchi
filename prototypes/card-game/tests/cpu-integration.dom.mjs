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
const {CPU_DECKS,pickCpuDeck}=await import('../cpu-decks.mjs');


assert.equal($('cpu-deck-type').options.length,7);
assert.equal($('cpu-deck-type-wrap').hidden,true);
click('hotseat-open');assert.ok([...document.querySelectorAll('[data-cpu-setting]')].every(n=>n.hidden));assert.equal($('select-deck-B').disabled,false);
click('solo-open');assert.equal($('cpu-deck-type-wrap').hidden,true);assert.equal($('solo-open').getAttribute('aria-pressed'),'true');
input('cpu-deck-mode','mydeck','change');assert.match($('mode-guide').textContent,/マイデッキ/);assert.equal($('select-deck-B').disabled,false);
input('cpu-deck-mode','choose','change');assert.equal($('cpu-deck-type-wrap').hidden,false);
const key='naotocchi-cpu-match-v1';
for(const level of ['beginner','intermediate'])for(const d of CPU_DECKS){
 input('cpu-level',level,'change');input('cpu-deck-type',d.id,'change');click('new');
 const raw=localStorage.getItem(key),saved=JSON.parse(raw),restored=restoreMatch(raw);
 assert.equal(saved.difficulty,level);assert.equal(saved.cpuDeck.id,d.id);assert.deepEqual(saved.game.decks.B,d.cards);
 assert.equal(restored.viewer,null);restored.reveal();assert.equal(restored.projection.cpuDeckName,null);
 assert.doesNotMatch($('game').textContent,/CPUのデッキ：/);
 click('hide');click('restore');click('reveal');assert.equal(JSON.parse(localStorage.getItem(key)).cpuDeck.id,d.id);
}
input('cpu-deck-mode','fixed','change');for(let i=0;i<2;i++){click('new');assert.equal(JSON.parse(localStorage.getItem(key)).cpuDeck.id,'balance');}
input('cpu-deck-mode','auto','change');const seeds=[];for(let i=0;i<3;i++){click('new');const d=JSON.parse(localStorage.getItem(key)).cpuDeck;seeds.push(d.seed);assert.equal(d.id,pickCpuDeck(d.seed));}assert.equal(new Set(seeds).size,3);
input('human-seat','B','change');assert.equal($('select-deck-A').disabled,true);assert.equal($('select-deck-B').disabled,false);
click('new');assert.deepEqual(JSON.parse(localStorage.getItem(key)).game.decks.A,CPU_DECKS.find(d=>d.id===JSON.parse(localStorage.getItem(key)).cpuDeck.id).cards);
input('cpu-deck-mode','mydeck','change');click('new');assert.equal(JSON.parse(localStorage.getItem(key)).cpuDeck,undefined);assert.deepEqual(JSON.parse(localStorage.getItem(key)).game.decks.B,legacy.B);
const before=localStorage.getItem(key);click('menu-rulebook-open');assert.equal($('rulebook-dialog').open,true);click('rulebook-close');click('menu-tutorial-open');assert.equal($('tutorial-dialog').open,true);click('tutorial-close');assert.equal(localStorage.getItem(key),before);
console.log('CPU integration DOM PASS: 14 starts, 7 decks, 2 levels, auto seeds, fixed, human B, mydeck, restore, privacy, menu, learning coexistence');w.close();process.exit(0);
