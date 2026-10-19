import assert from 'node:assert/strict';
import fs from 'node:fs';
import {CATALOG} from '../full-catalog.mjs';
import {CARD_ART} from '../ui-art.mjs';
import {cardMarkup} from '../ui-presentation.mjs';
import {cardArtColors,ATTRIBUTE_COLORS,CATEGORY_COLORS} from '../art-pilot/approved-colors.mjs';
import {sampleCards,variants,classification,studyMarkup} from './study.mjs';
const expected=['#F17D9D','#95603C','#27D3C5','#2878E8','#F2D12E','#269451','#B58BE3','#35316E','#C68A32','#C04479','#568A9D','#EF9860','#B7A48C','#9298A5'];
assert.deepEqual([...Object.values(ATTRIBUTE_COLORS),...Object.values(CATEGORY_COLORS)],expected);
const cards=sampleCards();assert.equal(cards.length,14);assert.equal(new Set(cards.map(classification)).size,14);
let count=0;
for(const c of Object.values(CATALOG)){
 assert.ok(expected.includes(cardArtColors(c).color));assert.ok(CARD_ART[c.id]);
 for(const compact of [false,true]){
  const baseline=cardMarkup(c,{compact,detail:!compact});
  assert.equal(studyMarkup(c,'current',compact),baseline);
  for(const v of variants.slice(1)){
   const result=studyMarkup(c,v,compact);
   const restored=result.replace(/data-study-variant="[^"]+" /,'').replace(/--band-ink:#[0-9A-F]+;/,'');
   assert.equal(restored,baseline,`${c.id}/${v}: content, art, mark or geometry changed`);count++;
  }
 }
}
const report={scope:'Structural checks only; not browser or visual QA',classifications:14,catalog:452,unchangedMarkupComparisons:count,baselineExact:true,pngRendered:false,browserQA:false,physicalIPhoneQA:false};
fs.writeFileSync(new URL('./verification.json',import.meta.url),JSON.stringify(report,null,2)+'\n');
console.log(report);
