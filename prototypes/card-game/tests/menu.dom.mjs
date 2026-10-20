// Main-menu routing integration; use JSDOM_PATH to select an existing jsdom install.
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFileSync} from 'node:fs';
import {DEFAULT_DECK,createGame,save} from '../engine.mjs';
import {MY_DECK_KEY,LEGACY_DECK_KEY} from '../my-decks.mjs';
const require=createRequire(import.meta.url),{JSDOM}=require(process.env.JSDOM_PATH??'/tmp/collection-dom/node_modules/jsdom');
const dom=new JSDOM(readFileSync(new URL('../index.html',import.meta.url),'utf8'),{url:'https://trial.example/',pretendToBeVisual:true});
const w=dom.window;for(const k of ['window','document','localStorage','HTMLElement','Element','Node','MutationObserver','AbortController','AbortSignal'])globalThis[k]=k==='window'?w:w[k];
document.fonts={ready:Promise.resolve()};globalThis.matchMedia=()=>({matches:true});
w.matchMedia=()=>({matches:true,addEventListener(){},removeEventListener(){}});globalThis.requestAnimationFrame=fn=>setTimeout(fn,0);globalThis.cancelAnimationFrame=clearTimeout;
const modalStack=[];w.HTMLDialogElement.prototype.showModal=function(){if(!this.open){this.open=true;modalStack.push(this);}};w.HTMLDialogElement.prototype.close=function(){if(!this.open)return;this.open=false;const i=modalStack.indexOf(this);if(i>=0)modalStack.splice(i,1);this.dispatchEvent(new w.Event('close'));};
const top=()=>modalStack.at(-1)?.id;
globalThis.confirm=()=>true;
const $=id=>document.getElementById(id),click=id=>$(id).click();
const legacy={A:[...DEFAULT_DECK],B:[...DEFAULT_DECK].reverse()},legacyRaw=JSON.stringify(legacy),match=save(createGame(29));
localStorage.setItem(LEGACY_DECK_KEY,legacyRaw);localStorage.setItem('naotocchi-hotseat-v1',match);
await import('../app.mjs');

const before=Object.fromEntries(['naotocchi-hotseat-v1','naotocchi-cpu-match-v1',MY_DECK_KEY,LEGACY_DECK_KEY].map(k=>[k,localStorage.getItem(k)]));
assert.equal(document.title,'なおとっち CARD GAME');
// Hidden replay must not leave an invisible header slot; its visible state stays usable.
const replayDOM=new JSDOM('<style>'+readFileSync(new URL('../style.css',import.meta.url),'utf8')+'</style><header class="table-top"><button class="result-reopen" hidden>結果</button></header>');
const replay=replayDOM.window.document.querySelector('button');assert.equal(replayDOM.window.getComputedStyle(replay).display,'none');replay.hidden=false;assert.notEqual(replayDOM.window.getComputedStyle(replay).display,'none');replayDOM.window.close();
assert.deepEqual([...document.querySelectorAll('.main-menu button')].map(n=>n.textContent),['ひとりであそぶ','ふたりであそぶ','マイデッキ','カードコレクション','あそびかたを覚える','ルールブック']);
click('hotseat-open');assert.equal($('match-mode').value,'hotseat');assert.equal($('hotseat-open').getAttribute('aria-pressed'),'true');assert.ok([...document.querySelectorAll('[data-cpu-setting]')].every(n=>n.hidden));assert.equal(document.activeElement.id,'new');
click('solo-open');assert.equal($('match-mode').value,'cpu');assert.equal($('solo-open').getAttribute('aria-pressed'),'true');assert.ok([...document.querySelectorAll('[data-cpu-setting]')].every(n=>n.id==='cpu-deck-type-wrap'?n.hidden:!n.hidden));
click('my-decks-open');assert.equal($('deck-editor').open,true);assert.ok($('catalog-list').children.length);assert.equal(document.activeElement,$('deck-editor').querySelector('summary'));
click('collection-open');assert.equal(top(),'collection-dialog');click('collection-close');
click('tutorial-open');assert.equal(top(),'tutorial-dialog');click('tutorial-close');
click('rulebook-open');assert.equal(top(),'rulebook-dialog');click('rulebook-close');
assert.match($('coverage').textContent,/453種類/);
for(const [k,value] of Object.entries(before))assert.equal(localStorage.getItem(k),value,k+' preserved by menu routing');
click('hotseat-open');click('new');assert.equal($('welcome').hidden,true);assert.equal($('curtain').hidden,false);const hotseatSave=localStorage.getItem('naotocchi-hotseat-v1');assert.ok(hotseatSave);click('restore');assert.equal(localStorage.getItem('naotocchi-hotseat-v1'),hotseatSave);click('reveal');assert.ok($('hand'));
w.dispatchEvent(new w.Event('blur'));w.close();console.log('Menu DOM PASS: six entries, mode/focus routing, deck editor, help dialogs, 453-card count, save isolation, start and restore');process.exit(0);
