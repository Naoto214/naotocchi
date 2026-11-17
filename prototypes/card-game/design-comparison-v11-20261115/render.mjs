import {renderCard as previous} from '../design-comparison-v10-20261115/render.mjs';
export const EGG_PRINTED_TEXT='自分のターン開始時、通常ドローの後にさらに1枚引き、手札1枚を山札の一番下に戻す。';
export function renderCard(card,options={}){
 const id=card?.cardId??card?.id;
 if(!options.egg&&!card?.hidden&&/^M-starfish-0[1-3]$/.test(id??'')){
  const image=new URL(`./starfish/originals/${id}-background-refined.png`,import.meta.url).href;
  card={...card,image,large:image};
  options={...options,art:'contain'};
 }
 const eggData=options.egg?{...options.eggData,rulesHTML:`<p class="v10-effect">${EGG_PRINTED_TEXT}</p>`}:options.eggData;
 return previous(card,{...options,eggData}).replace('v10-card v8-shell','v10-card v11-card v8-shell');
}
