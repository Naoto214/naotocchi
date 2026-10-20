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
w.HTMLDialogElement.prototype.showModal=function(){this.open=true;};w.HTMLDialogElement.prototype.close=function(){this.open=false;};
let consent=true;globalThis.confirm=()=>consent;
const $=id=>document.getElementById(id),click=id=>$(id).click(),input=(id,value,event='input')=>{$(id).value=value;$(id).dispatchEvent(new w.Event(event,{bubbles:true}));},data=()=>JSON.parse(localStorage.getItem(MY_DECK_KEY));
const legacy={A:[...DEFAULT_DECK],B:[...DEFAULT_DECK].reverse()},legacyRaw=JSON.stringify(legacy),match=save(createGame(29));
localStorage.setItem(LEGACY_DECK_KEY,legacyRaw);localStorage.setItem('naotocchi-hotseat-v1',match);
await import('../app.mjs');
assert.equal(data().decks.length,2);assert.equal($('catalog-list').children.length,0,'closed editor must request zero catalog images');
$('deck-editor').open=true;$('deck-editor').dispatchEvent(new w.Event('toggle'));
assert.equal(document.querySelectorAll('.catalog-card').length,452);assert.equal(document.querySelectorAll('.catalog-card .dedicated-art[loading="lazy"]').length,452);
click('deck-create');assert.equal(data().decks.length,3);input('deck-name','好きなカード');const deckButton=document.querySelector('.my-deck-open');input('deck-name','好きなカード','change');assert.equal(document.querySelector('.my-deck-open'),deckButton,'rename blur must not detach the next click target');assert.equal(data().decks[2].name,'好きなカード');
input('select-deck-A',data().decks[2].id,'change');assert.equal($('new').disabled,true);
const c=Object.values(CARDS).find(c=>c.type==='main'&&!c.rare),r=Object.values(CARDS).find(c=>c.rare);
input('card-search',c.id);assert.equal(document.querySelectorAll('.catalog-card').length,1);
assert.match(document.querySelector('.catalog-card').textContent,/通常 · 同名3枚まで/);assert.equal(document.querySelectorAll('.catalog-card .card-rarity').length,0);
const first=document.querySelector('[data-add]'),row=first.closest('article');$('catalog-list').scrollTop=80;
for(let i=0;i<3;i++)first.click();assert.equal(first.disabled,true);assert.equal(first.closest('article'),row,'add must not reconstruct catalog');assert.equal($('catalog-list').scrollTop,80);
document.querySelector('[data-remove]').click();assert.equal(first.disabled,false);
input('card-search',r.id);document.querySelector(`[data-add="${r.id}"]`).click();assert.equal(document.querySelector(`[data-add="${r.id}"]`).disabled,true);
assert.match(document.querySelector('.catalog-card').textContent,/レア · 同名1枚まで/);assert.equal(document.querySelectorAll('.catalog-card .card-rarity').length,1);
document.querySelector('.catalog-preview').click();assert.equal($('card-dialog').open,true);assert.ok($('card-dialog').querySelector('.dedicated-art[src*="/large/"]'));$('card-dialog').close();
click('filter-reset');input('card-species',c.species,'change');assert.equal(document.querySelectorAll('.catalog-card').length,8);input('card-stage','3','change');assert.equal(document.querySelectorAll('.catalog-card').length,1);input('card-attribute',c.attribute,'change');assert.equal(document.querySelectorAll('.catalog-card').length,1);click('filter-reset');input('card-type','item','change');assert.ok([...document.querySelectorAll('.catalog-card')].every(n=>CARDS[n.dataset.cardId].type==='item'));
click('deck-duplicate');assert.equal(data().decks.length,4);consent=false;click('deck-delete');assert.equal(data().decks.length,4);consent=true;click('deck-delete');assert.equal(data().decks.length,3);
// The selected draft still blocks play; restore it to the canonical standard deck through UI.
[...document.querySelectorAll('.my-deck-open')].find(b=>b.textContent==='好きなカード').click();click('deck-default');assert.equal($('new').disabled,false);
assert.equal(localStorage.getItem(LEGACY_DECK_KEY),legacyRaw);assert.equal(localStorage.getItem('naotocchi-hotseat-v1'),match);
// Start through the production handler in each mode; separate fresh process per mode.
const mode=process.env.TEST_MATCH_MODE??'cpu';input('match-mode',mode,'change');input('human-seat','A','change');click('new');assert.equal($('welcome').hidden,true);
if(mode==='cpu'){
 assert.ok(document.querySelector('#hand'));assert.ok(localStorage.getItem('naotocchi-cpu-match-v1'),$('status').textContent);const cpu=restoreMatch(localStorage.getItem('naotocchi-cpu-match-v1'));assert.equal(cpu.mode,'cpu');assert.equal(localStorage.getItem('naotocchi-hotseat-v1'),match);
}else{assert.equal($('curtain').hidden,false);assert.equal(document.querySelector('#hand'),null);click('reveal');assert.ok(document.querySelector('#hand'));assert.ok(restore(localStorage.getItem('naotocchi-hotseat-v1')));}
click('hide');assert.equal(document.querySelector('#hand'),null);click('restore');assert.equal(document.querySelector('#hand'),null);click('reveal');assert.ok(document.querySelector('#hand'));click('hide');
assert.equal(JSON.parse(localStorage.getItem(MY_DECK_KEY)).decks.length,3);
console.log(JSON.stringify({catalog:452,lazyImages:452,closedCatalogImages:0,createRenameCloneDelete:true,filters:true,copyLimits:true,catalogDOMStable:true,scrollPreserved:true,legacyUnchanged:true,matchMode:mode,startAndRestore:true,handoffPrivacy:true,rendering:'unverified: DOM test only'}));
w.close();process.exit(0);
