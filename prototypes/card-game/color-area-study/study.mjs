import {CATALOG} from '../full-catalog.mjs';
import {cardMarkup} from '../ui-presentation.mjs';
import {cardArtColors} from '../art-pilot/approved-colors.mjs';
export const variants=['current','a','b','ab','ab-soft'];
export const labels={current:'現行',a:'A・外周',b:'B・上下',ab:'A＋B', 'ab-soft':'A＋B・控えめ'};
export const representatives=['M-man-05','M-cat-05','M-frog-05','M-clownfish-05','M-beetle-05','M-dandelion-05','M-dragon-05','M-unknown-05','C-cat_friend','P-sea_mermaid','W-forest','G-area-claim','I-bowtie','E-new-encounter'];
export const similarOrder=[0,9,1,8,11,4,12,13,10,2,5,3,6,7];
export const classification=c=>c.type==='main'?c.attribute:({companion:'なかま',partner:'こいびと',world:'セカイ',play:'あそび',item:'あいてむ',event:'できごと'}[c.type]);
export function sampleCards(){return representatives.map(id=>{if(!CATALOG[id])throw Error('Missing representative '+id);return CATALOG[id];});}
export function studyMarkup(c,variant='current',compact=false){
 if(!variants.includes(variant))throw Error('Unknown variant');
 const html=cardMarkup(c,{compact,detail:!compact});
 if(variant==='current')return html;
 const color=cardArtColors(c).color;
 const rgb=color.slice(1).match(/../g).map(v=>parseInt(v,16)*.8+255*.2);
 const lin=rgb.map(v=>(v/=255)<=.04045?v/12.92:((v+.055)/1.055)**2.4);
 const l=lin[0]*.2126+lin[1]*.7152+lin[2]*.0722;
 const ink=(l+.05)/.05 >= 1.05/(l+.05)?'#000000':'#FFFFFF';
 return html.replace('class="card-face',`data-study-variant="${variant}" class="card-face`).replace('style="',`style="--band-ink:${ink};`);
}
