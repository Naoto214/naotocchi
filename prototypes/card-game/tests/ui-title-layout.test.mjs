import test from 'node:test';
import assert from 'node:assert/strict';
import {CARDS} from '../engine.mjs';
import {cardMarkup} from '../ui-presentation.mjs';
// These assertions inspect generated markup only; no optional DOM dependency.
const title=(c,opts)=>{
 const html=cardMarkup(c,opts),markup=html.match(/<h3 class="v8-title" data-fit>([\s\S]*?)<\/h3>/)[1];
 return {lines:[...markup.matchAll(/<span>([^<]*)<\/span>/g)].map(m=>m[1]),text:markup.replace(/<[^>]*>/g,''),fit:html.includes('class="v8-title" data-fit')};
};
test('round baby uses the approved single line in every face size',()=>{
 for(const opts of [{},{compact:true},{detail:true}]){
  const t=title(CARDS['M-starfish-01'],opts);
  assert.deepEqual(t.lines,['丸いあかちゃん']);
  assert.equal(t.text,'丸いあかちゃん');
 }
});
test('all main titles retain exact text with one line with fit enabled',()=>{
 const sizes=new Set();
 for(const c of Object.values(CARDS).filter(c=>c.type==='main')){
  const t=title(c),lines=t.lines;
  assert.equal(lines.length,1,c.id);
  assert.equal(lines.join(''),c.form??c.name.replace(/[①-⑧]/g,''),c.id);
  assert.equal(t.fit,true,c.id);
  sizes.add(t.fit);
 }
 assert.equal(sizes.size,1);
 assert.equal(title(CARDS['M-turtle-03']).lines.length,1);
});
