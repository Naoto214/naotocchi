import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {CATALOG} from '../full-catalog.mjs';
import {CARD_ART} from '../ui-art.mjs';
import {cardMarkup} from '../ui-presentation.mjs';
import {cardArtColors} from '../art-pilot/approved-colors.mjs';
const css=readFileSync(new URL('../style.css',import.meta.url),'utf8');
const approved=['#F17D9D','#95603C','#27D3C5','#2878E8','#F2D12E','#269451','#B58BE3','#35316E','#C68A32','#C04479','#568A9D','#EF9860','#B7A48C','#9298A5'];
function auditAdoptedDesign(source){
 // Explicit paired boundaries own only the approved front design. Subsequent
 // shared slot sizing may legitimately address both front and back surfaces.
 const start='/* Adopted AB-soft: PR #397 0f6f9bcb, approved 2026-10-19. */';
 const end='/* End adopted AB-soft. */';
 assert.equal(source.split(start).length,2,'one adopted design start');
 assert.equal(source.split(end).length,2,'one adopted design end');
 assert.ok(source.indexOf(end)>source.indexOf(start),'ordered design boundaries');
 const adopted=source.slice(source.indexOf(start)+start.length,source.indexOf(end));
 const selectors=[...adopted.matchAll(/([^{}]+)\{[^{}]*\}/g)].map(m=>m[1].trim());
 assert.deepEqual(selectors,['.card-face','.card-face::before','.card-face .card-heading','.card-face .card-stats>span','.card-face::after']);
 assert.match(adopted,/\.card-face\s*\{--study-frame:1\.4cqw;--study-band:55%;--band-ink:#211d18/);
 for(const s of ['.card-face::before','.card-face .card-heading','.card-face .card-stats>span','.card-face::after'])assert.ok(adopted.includes(s));
 assert.ok(!adopted.includes('data-study-variant'));assert.ok(!adopted.includes('.card-back'));
}
test('approved soft design is global for every face, not a study opt-in',()=>{
 auditAdoptedDesign(css);
});
test('design audit permits shared layout but detects back styling, opt-in, lost rules and boundaries',()=>{
 auditAdoptedDesign(css+'\n.card-back{width:100%;height:100%}');
 const start=css.indexOf('/* Adopted AB-soft:');
 const before=css.slice(0,start),design=css.slice(start);
 for(const changed of [
  design.replace('.card-face{','.card-face,.card-back{'),
  design.replace('.card-face{','[data-study-variant="soft"] .card-face{'),
  design.replace('.card-face::before{','.card-face::missing{'),
  design.replace('--study-band:55%','--study-band:0%'),
  design.replace('/* End adopted AB-soft. */',''),
 ]) assert.throws(()=>auditAdoptedDesign(before+changed));
});
test('cost ink cannot inherit a white heading color',()=>{
 assert.match(css,/\.card-face \.card-cost\s*\{color:#211d18\}/);
});
test('all 452 faces preserve formal colors, marks, and unique dedicated art at both resolutions',()=>{
 const colors=new Set(),hashes={small:new Set(),large:new Set()};
 assert.equal(Object.keys(CATALOG).length,452);
 for(const c of Object.values(CATALOG)){
  const color=cardArtColors(c).color;colors.add(color);assert.ok(approved.includes(color));
  for(const compact of [false,true]){
   const html=cardMarkup(c,{compact,detail:!compact});assert.ok(html.includes('class="card-face'));assert.ok(html.includes('--card-color:'+color));assert.ok(html.includes('class="botanical"'));assert.ok(html.includes('class="card-cost"'));assert.ok(!html.includes('data-study-variant'));
  }
  for(const size of ['small','large']){
   const data=readFileSync(new URL('../'+CARD_ART[c.id][size],import.meta.url));const hash=createHash('sha256').update(data).digest('hex');assert.ok(!hashes[size].has(hash),c.id);hashes[size].add(hash);
  }
 }
 assert.equal(colors.size,14);assert.equal(hashes.small.size,452);assert.equal(hashes.large.size,452);
});
test('hidden cards retain the blue-silver back without front content',()=>{
 const html=cardMarkup({...CATALOG['M-unknown-05'],hidden:true});assert.ok(html.includes('card-back-approved.png'));assert.ok(!html.includes('card-face'));assert.ok(!html.includes('card-cost'));assert.ok(!html.includes('専用イラスト'));
});
