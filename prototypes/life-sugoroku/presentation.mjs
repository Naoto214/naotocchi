// Pure presentation: no game state writes or randomness.
export const DIE_ROTATIONS={1:[0,0],2:[0,-90],3:[-90,0],4:[90,0],5:[0,90],6:[0,180]};
const PIPS={1:[5],2:[1,9],3:[1,5,9],4:[1,3,7,9],5:[1,3,5,7,9],6:[1,3,4,6,7,9]};
export function diceMarkup(value){
 const [x,y]=DIE_ROTATIONS[value];
 return `<div class="die-stage" role="img" aria-label="${value}の目" data-result="${value}"><div class="die-bounce"><div class="die-solid" style="--die-x:${x}deg;--die-y:${y}deg">${[1,2,3,4,5,6].map(n=>`<div class="die-face face-${n}" aria-hidden="true">${Array.from({length:9},(_,i)=>`<i class="${PIPS[n].includes(i+1)?'pip':''}"></i>`).join('')}</div>`).join('')}</div></div></div>`;
}
export const ITEM_IDS=['double','slow','charm','clock','seed','box'];
export function itemMarkup(id,name=''){return ITEM_IDS.includes(id)?`<img class="item-art" src="item-${id}.svg" alt="${name}">`:'';}
