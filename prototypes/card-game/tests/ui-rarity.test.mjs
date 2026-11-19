import test from 'node:test';
import assert from 'node:assert/strict';
import {CARDS} from '../engine.mjs';
import {cardMarkup,detailMarkup} from '../ui-presentation.mjs';
const signature=html=>html.match(/<footer class="v8-foot"><span>([^<]+)<\/span>/)?.[1];
const art=html=>html.match(/<img class="dedicated-art"[^>]+src="([^"]+)"/)?.[1];
test('every official card keeps NAOTOCCHI and independent rarity in full, detail and compact views',()=>{
 for(const c of Object.values(CARDS))for(const opts of [{},{detail:true},{compact:true}]){
  const html=cardMarkup(c,opts);assert.equal(signature(html),'NAOTOCCHI',c.id);
  assert.equal(html.includes('class="v8-rare"'),!!c.rare,c.id);assert.ok(!html.includes('RARE'),c.id);
 }
});
test('normal→rare and rare→normal change only rarity UI; art, name, numbers and signature stay identical',()=>{
 const snapshot=JSON.stringify(CARDS);
 for(const id of ['M-starfish-01','M-star-07']){
  const c=CARDS[id],normal=cardMarkup({...c,rare:false},{detail:true}),rare=cardMarkup({...c,rare:true},{detail:true});
  assert.ok(!normal.includes('class="v8-rare"'));assert.ok(rare.includes('class="v8-rare"'));
  assert.equal(art(normal),art(rare));assert.ok(art(normal));assert.equal(signature(normal),signature(rare));
  const n=detailMarkup({...c,rare:false},{catalog:true});
  const r=detailMarkup({...c,rare:true},{catalog:true});
  assert.match(n,/通常 · 同名3枚まで/);assert.match(r,/レア · 同名1枚まで/);
  assert.equal(normal.replace(/<span class="v8-rare"[^>]*>◆<\/span>/,''),rare.replace(/<span class="v8-rare"[^>]*>◆<\/span>/,''));
 }
 assert.equal(JSON.stringify(CARDS),snapshot);
});
test('hidden cards reveal no rarity or signature',()=>{
 const html=cardMarkup({hidden:true,rare:true,id:'M-star-07'});
 assert.ok(!html.includes('v8-rare'));assert.ok(!html.includes('NAOTOCCHI'));assert.ok(!html.includes('M-star-07'));
});
