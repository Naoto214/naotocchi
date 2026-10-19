import test from 'node:test';
import assert from 'node:assert/strict';
import {CARDS,createGame} from '../engine.mjs';
import {cardMarkup,detailMarkup,gameMarkup,resultHistoryMarkup,resultNoticeMarkup,zoneMarkup} from '../ui-presentation.mjs';
import {HotseatSession} from '../ui-session.mjs';
import {captureResult} from '../ui-results.mjs';

// Removing the shared dedicated-art renderer must break every catalog/surface assertion.
test('all 452 canonical cards use distinct dedicated thumbnails and high resolution detail art',()=>{
 const small=new Set(),large=new Set();
 for(const c of Object.values(CARDS)){
  const compact=cardMarkup(c,{compact:true}),detail=detailMarkup(c,{catalog:true});
  assert.match(compact,/class="dedicated-art"/);assert.doesNotMatch(compact,/仮イラスト|既存イラスト/);
  const s=compact.match(/src="([^"]+\.webp)"/)?.[1],l=detail.match(/src="([^"]+\.webp)"/)?.[1];
  assert.ok(s?.includes('/small/'),c.id);assert.ok(l?.includes('/large/'),c.id);small.add(s);large.add(l);
  assert.match(compact,/loading="lazy"/);assert.match(detail,/decoding="async"/);
  assert.ok(detail.includes(c.text.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;')));
 }
 assert.equal(small.size,452);assert.equal(large.size,452);
});
test('hidden identity is never read, embedded or requested by art rendering',()=>{
 const c={hidden:true,get cardId(){throw Error('private identity accessed');},get name(){throw Error('private name accessed');}};
 const html=cardMarkup(c);assert.match(html,/card-back-approved/);assert.doesNotMatch(html,/dedicated-art|\.webp|srcset/);
});
test('safe hand, both boards, discard and activation use shared dedicated thumbnails',()=>{
 const session=new HotseatSession();session.start(createGame(71));session.reveal();const v=session.projection,c=v.players.A.hand[0];
 v.players.A.board.main=c;v.players.B.board.main=c;v.players.A.discard=[c];v.chain=[{actor:'A',name:c.name}];v.effectQueue=[{card:c,ability:'効果'}];
 const html=gameMarkup(v,'A');assert.ok((html.match(/class="dedicated-art"/g)??[]).length>=v.players.A.hand.length+2);
 for(const zone of ['discard','activation'])assert.match(zoneMarkup(v,'A',zone),/class="dedicated-art"/);
 assert.doesNotMatch(zoneMarkup(v,'A','deck'),/dedicated-art|\.webp/);
 session.hide();assert.doesNotMatch(gameMarkup(session.projection,null),/dedicated-art|\.webp/);
});
test('private draws appear as images only in the owner result notice and history',()=>{
 const before=createGame(4),after=structuredClone(before),id=after.players.A.deck.shift();after.players.A.hand.push(id);after.revision++;
 const result=captureResult(before,after);
 for(const viewer of ['A','B','public']){
  const notice=resultNoticeMarkup(result[viewer]),history=resultHistoryMarkup({results:[result[viewer]]},viewer==='public'?null:viewer);
  if(viewer==='A'){assert.match(notice,/dedicated-art/);assert.match(history,/dedicated-art/);}
  else {assert.doesNotMatch(notice+history,/dedicated-art|\.webp/);assert.ok(!(notice+history).includes(after.cards[id].cardId));}
 }
});

// Detect a wrong palette or shape at the consumer, including light-background ink.
test('all card faces apply the approved fourteen classifications and approved SVG geometry',async()=>{
 const {marks}=await import('../art-pilot/symbols/attributes.mjs');
 const palette={'ひと':'#F17D9D','けもの':'#95603C','みずべ':'#27D3C5','うみ':'#2878E8','むし':'#F2D12E','くさ':'#269451','げんそう':'#B58BE3','ふしぎ':'#35316E',companion:'#C68A32',partner:'#C04479',world:'#568A9D',play:'#EF9860',item:'#B7A48C',event:'#9298A5'};
 const seen=new Set();
 for(const c of Object.values(CARDS)){
  const key=c.type==='main'?c.attribute:c.type,html=cardMarkup(c);seen.add(key);
  assert.ok(html.includes('--card-color:'+palette[key]),c.id);
  if(c.type==='main'){
   assert.ok(html.includes('d="'+marks[key][2]+'"'),c.id);
   const ink=['ひと','みずべ','むし','くさ','げんそう'].includes(key)?'#353024':'#FFFDF1';
   assert.ok(html.includes('--mark-ink:'+ink),c.id);
  }
 }
 assert.equal(seen.size,14);
});
test('image errors clear request attributes and preserve the existing card box',async()=>{
 const {hideFailedArt}=await import('../ui-art-loading.mjs');
 const attrs=new Map([['src','failed.webp'],['srcset','failed.webp 1x']]),classes=new Set();
 const img={classList:{contains:c=>c==='dedicated-art'},parentElement:{classList:{add:c=>classes.add(c)}},removeAttribute:key=>attrs.delete(key)};
 hideFailedArt(img);assert.equal(img.hidden,true);assert.equal(attrs.size,0);assert.ok(classes.has('art-unavailable'));
 hideFailedArt({classList:{contains:()=>false},get parentElement(){throw Error('unrelated image changed');}});
});

test('approved long-copy exceptions apply only to full detail faces',()=>{
 for(const id of ['M-cat-07','M-antlion-06','M-antlion-07']){
  assert.match(detailMarkup(CARDS[id],{catalog:true}),/class="card-copy" style="font-size:2.9cqw"/);
  assert.doesNotMatch(cardMarkup(CARDS[id],{compact:true}),/font-size:2.9cqw/);
 }
});
