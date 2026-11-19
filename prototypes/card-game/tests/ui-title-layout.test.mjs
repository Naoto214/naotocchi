import test from 'node:test';
import assert from 'node:assert/strict';
import {CARDS} from '../engine.mjs';
import {cardMarkup} from '../ui-presentation.mjs';
// Shared contract for standalone names and approved V15, without changing either UI.
const title=(c,opts)=>{
 const html=cardMarkup(c,opts),single=html.includes('class="v8-title" data-fit');
 const markup=html.match(single?/<h3 class="v8-title" data-fit>([\s\S]*?)<\/h3>/:/<strong class="card-title">([\s\S]*?)<\/strong>/)[1];
 return {lines:[...markup.matchAll(/<span>([^<]*)<\/span>/g)].map(m=>m[1]),text:markup.replace(/<[^>]*>/g,''),single,font:single?'fit':html.match(/--title-size:([^";]+)/)[1]};
};
test('approved first starfish name stays complete at every face size',()=>{
 const c=CARDS['M-starfish-01'];assert.ok(['丸いあかちゃん','浮かぶあかちゃん'].includes(c.form));
 for(const opts of [{},{compact:true},{detail:true}]){
  const t=title(c,opts);assert.equal(t.text,c.form);
  assert.deepEqual(t.lines,t.single?[c.form]:[c.form==='浮かぶあかちゃん'?'浮かぶ':'丸い','あかちゃん']);
 }
});
test('all main names keep exact text and the active renderer line contract',()=>{
 const sizes=new Set();
 for(const c of Object.values(CARDS).filter(c=>c.type==='main')){
  const t=title(c);assert.equal(t.lines.join(''),c.form??c.name.replace(/[①-⑧]/g,''),c.id);
  if(t.single)assert.equal(t.lines.length,1,c.id);
  else{assert.ok(t.lines.length>=1&&t.lines.length<=2,c.id);assert.ok(t.lines.every(s=>[...s].length<=7),c.id);if(t.lines.length===2)assert.ok(t.lines.every(s=>[...s].length>=2),c.id);}
  sizes.add(t.font);
 }
 assert.equal(sizes.size,1);assert.equal(title(CARDS['M-turtle-03']).lines.length,1);
});
