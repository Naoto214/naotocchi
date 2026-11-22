import {abilityName} from '../display-catalog.mjs';
import {normalCard} from './face.mjs';
import {escapeHTML as h} from './escape.mjs';
// Catalog supplies art only. Safe projected engine data always wins for text/stats.
export function renderCard(card,{detail=false,egg=false,catalog={},eggData={},art='cover'}={}){
 if(!egg&&(!card||card.hidden))return `<div class="card-back" role="img" aria-label="非公開のカード"><img src="${new URL('../ui-assets/card-back-approved.png',import.meta.url).href}" alt="" draggable="false"></div>`;
 const id=card?.cardId??card?.id,c=egg?eggData:{...catalog[id],...card};
 if(c.legacyRules)c.married=null;
 if(!egg)c.title=c.type==='main'?(c.form??c.name.replace(/[①-⑧]/g,'')):c.name;
 let face=normalCard(c,{egg,large:detail,art:art==='cover'?'cover':'contain'});
 face=face.replace('class="v8-shell"',`class="${egg?'egg-card':'card-face'} v10-card v11-card v8-shell${detail?' v10-detail':''}"`).replace('data-normal="true"',`data-normal="${!detail}"`).replace(' loading="lazy"',' loading="'+(detail?'eager':'lazy')+'"');
 if(detail){const ability=abilityName(c);const copy=egg?eggData.rulesHTML:`${ability?'<strong class="v10-ability">'+h(ability)+'</strong>':''}${c.married?'<strong>こいびとのとき</strong>':''}<p class="v10-effect">${h(c.text??'')}</p>${c.married?'<strong>♥ 結婚したら</strong><p class="v10-effect">'+h(c.married)+'</p>':''}`;
 face=face.replace('<footer class="v8-foot">',`<section class="v10-copy${egg?' v10-egg-copy':''}" aria-label="正式な効果全文">${copy}</section><footer class="v8-foot">`);}
 return face;
}
