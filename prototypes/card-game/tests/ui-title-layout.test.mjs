import test from 'node:test';
import assert from 'node:assert/strict';
import {CARDS} from '../engine.mjs';
import {cardMarkup} from '../ui-presentation.mjs';
// These assertions inspect generated markup only; no optional DOM dependency.
const title=(c,opts)=>{
 const html=cardMarkup(c,opts),markup=html.match(/<strong class="card-title">([\s\S]*?)<\/strong>/)[1];
 return {lines:[...markup.matchAll(/<span>([^<]*)<\/span>/g)].map(m=>m[1]),text:markup.replace(/<[^>]*>/g,''),font:html.match(/--title-size:([^";]+)/)[1]};
};
test('round baby uses the approved two semantic lines in every face size',()=>{
 for(const opts of [{},{compact:true},{detail:true}]){
  const t=title(CARDS['M-starfish-01'],opts);
  assert.deepEqual(t.lines,['丸い','あかちゃん']);
  assert.equal(t.text,'丸いあかちゃん');
 }
});
test('all main titles retain exact text with one or two non-orphan lines and a uniform font token',()=>{
 const sizes=new Set();
 for(const c of Object.values(CARDS).filter(c=>c.type==='main')){
  const t=title(c),lines=t.lines;
  assert.ok(lines.length>=1&&lines.length<=2,c.id);
  assert.equal(lines.join(''),c.form??c.name.replace(/[①-⑧]/g,''),c.id);
  assert.ok(lines.every(s=>[...s].length<=7),c.id+' line too long');
  if(lines.length===2)assert.ok(lines.every(s=>[...s].length>=2),c.id+' orphan');
  sizes.add(t.font);
 }
 assert.equal(sizes.size,1);
 assert.equal(title(CARDS['M-turtle-03']).lines.length,1);
});
