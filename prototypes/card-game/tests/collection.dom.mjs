// DOM integration (not a rendering/WebKit test). npm install --prefix /tmp/mydeck-dom jsdom
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFileSync} from 'node:fs';
import {DEFAULT_DECK,CARDS,createGame,save,restore} from '../engine.mjs';
import {CpuSession,restoreMatch} from '../cpu-session.mjs';
import {MY_DECK_KEY,LEGACY_DECK_KEY} from '../my-decks.mjs';
const require=createRequire(import.meta.url),{JSDOM}=require(process.env.JSDOM_PATH??'/tmp/mydeck-dom/node_modules/jsdom');
const dom=new JSDOM(readFileSync(new URL('../index.html',import.meta.url),'utf8'),{url:'https://trial.example/',pretendToBeVisual:true});
const w=dom.window;for(const k of ['window','document','localStorage','HTMLElement','Element','Node','MutationObserver','AbortController','AbortSignal'])globalThis[k]=k==='window'?w:w[k];
document.fonts={ready:Promise.resolve()};globalThis.matchMedia=()=>({matches:true});
w.matchMedia=()=>({matches:true,addEventListener(){},removeEventListener(){}});globalThis.requestAnimationFrame=fn=>setTimeout(fn,0);globalThis.cancelAnimationFrame=clearTimeout;
w.HTMLDialogElement.prototype.showModal=function(){this.open=true;};w.HTMLDialogElement.prototype.close=function(){this.open=false;this.dispatchEvent(new w.Event('close'));};
let consent=true;globalThis.confirm=()=>consent;
const $=id=>document.getElementById(id),click=id=>$(id).click(),input=(id,value,event='input')=>{$(id).value=value;$(id).dispatchEvent(new w.Event(event,{bubbles:true}));},data=()=>JSON.parse(localStorage.getItem(MY_DECK_KEY));
const legacy={A:[...DEFAULT_DECK],B:[...DEFAULT_DECK].reverse()},legacyRaw=JSON.stringify(legacy),match=save(createGame(29));
localStorage.setItem(LEGACY_DECK_KEY,legacyRaw);localStorage.setItem('naotocchi-hotseat-v1',match);
await import('../app.mjs');
assert.ok($('collection-open'),'collection menu exists');
click('collection-open');assert.equal($('collection-dialog').open,true);assert.equal($('collection-notice').hidden,false);click('collection-ack');assert.equal($('collection-notice').hidden,true);click('collection-cover');assert.equal(document.querySelectorAll('.collection-pocket').length,9);assert.match($('collection-page').textContent,/1 \/ 51/);assert.equal(document.querySelectorAll('#collection-grid img').length,9);
click('collection-next');assert.match($('collection-page').textContent,/2 \/ 51/);input('collection-query','no-such-card-zz');assert.equal(document.querySelectorAll('[data-collection-card]').length,0);click('collection-reset');assert.match($('collection-page').textContent,/2 \/ 51/);click('collection-prev');
document.querySelector('[data-collection-card="special-egg"]').click();assert.equal($('collection-add').disabled,true);click('collection-flip');assert.equal($('collection-flipper').dataset.side,'back');assert.equal($('collection-flipper').querySelector('.collection-back img').getAttribute('src'),'ui-assets/card-back-approved.png');click('collection-favorite');assert.equal($('collection-favorite').getAttribute('aria-pressed'),'true');click('collection-detail-close');assert.equal(document.querySelector('[data-collection-favorite="special-egg"]').getAttribute('aria-pressed'),'true');
click('collection-close');$('deck-editor').open=true;$('deck-editor').dispatchEvent(new w.Event('toggle'));click('deck-create');const id=data().decks.at(-1).id;click('deck-collection-open');assert.equal($('catalog-list').children.length,0,'editor releases 452 thumbnails while binder opens');
input('collection-query','M-dog-01');document.querySelector('[data-collection-card="M-dog-01"]').click();assert.match($('collection-card-meta').textContent,/通常 · 同名3枚まで/);assert.equal(document.querySelectorAll('.collection-front .card-rarity').length,0);click('collection-add');assert.equal($('collection-deck-target').value,id);click('collection-add-confirm');assert.equal(data().decks.at(-1).cards[0],'M-dog-01');assert.match($('collection-detail-status').textContent,/1\/40/);click('collection-add-confirm');click('collection-add-confirm');click('collection-add-confirm');assert.equal(data().decks.at(-1).cards.length,3);assert.match($('collection-detail-status').textContent,/上限/);
click('collection-detail-close');input('collection-query','M-star-07');document.querySelector('[data-collection-card="M-star-07"]').click();assert.match($('collection-card-meta').textContent,/レア · 同名1枚まで/);assert.equal(document.querySelectorAll('.collection-front .card-rarity').length,1);assert.equal(document.querySelector('.collection-front .card-footer').textContent,'NAOTOCCHI');
// Swipes must suppress the following synthetic click and only move one card.
const swipe=(el,dx,dy=0)=>{for(const [type,x,y] of [['pointerdown',200,100],['pointerup',200+dx,100+dy]]){const e=new w.Event(type,{bubbles:true,cancelable:true});Object.assign(e,{clientX:x,clientY:y,pointerId:1,isPrimary:true,button:0});el.dispatchEvent(e);}};
click('collection-detail-close');click('collection-reset');const grid=$('collection-grid');swipe(grid,-100);assert.match($('collection-page').textContent,/2 \/ 51/);document.querySelector('[data-collection-card]').click();assert.equal($('collection-detail').hidden,true,'swipe click suppressed');
click('collection-close');assert.equal($('deck-editor').open,true);assert.match($('deck-count').textContent,/3 \/ 40/);assert.equal(localStorage.getItem(LEGACY_DECK_KEY),legacyRaw);assert.equal(localStorage.getItem('naotocchi-hotseat-v1'),match);
click('collection-open');assert.equal($('collection-notice').hidden,true);click('collection-close');
click('deck-create');const newer=data().decks.at(-1).id;click('deck-collection-open');input('collection-query','M-cat-01');document.querySelector('[data-collection-card="M-cat-01"]').click();click('collection-add');assert.equal($('collection-deck-target').value,newer,'editor origin must reset destination to newly edited deck');click('collection-close');
// Real match route: collection stays catalog-only and closing it keeps released editor images absent.
click('new');const gameBefore=$('game').innerHTML;click('menu-collection-open');assert.equal($('collection-dialog').open,true);assert.equal($('catalog-list').children.length,0);click('collection-close');assert.equal($('catalog-list').children.length,0,'do not repopulate hidden editor during a match');assert.equal($('game').innerHTML,gameBefore);click('hide');assert.equal(document.querySelector('#hand'),null);
console.log('Collection DOM: menu, once-only notice, nine pockets, filter/page restore, flip, egg exclusion, favorites, shared editor addition/limits, swipe suppression, save preservation PASS');w.close();process.exit(0);
