// Experiment decks (PLAN.md §2). Every list is an official CPU deck (cpu-decks.mjs, read-only) with exactly 2 slots
// replaced, so all conditions sacrifice the same cards and only the new card's effect differs.
// Slot rule (fixed before any run): among the deck's non-main cards, take the 2 card names with the most copies (ties:
// first listed in the deck), and replace the LAST copy of each, in place. In-place replacement keeps every other card
// at the same list index, so with the shared shuffle permutation each card is drawn at the same moment in every condition.
// The ⑧ deck 'main+8' is the PR #495 definition (round12-comparison-20261030/lib/decks-extra.mjs), repeated here so this
// experiment does not import from (or change) PR #495's files.
import {CPU_DECKS} from '../../cpu-decks.mjs';
const official=Object.fromEntries(CPU_DECKS.map(d=>[d.id,{label:d.name+'（公式CPU）',cards:[...d.cards]}]));
function swap(list,from,to,n){let left=n;const out=list.map(id=>id===from&&left>0?(left--,to):id);if(left)throw Error(`not enough ${from}`);return out;}
const base=id=>[...official[id].cards];
export const BASE_DECKS={
 ...official,
 'main+8':{label:'メイン成長＋⑧（PR #495 と同じ）',cards:swap(swap(swap(base('main'),'G-sugoroku-race','M-dog-07',1),'G-sugoroku-race','M-dog-08',1),'E-midlife-flower','M-beetle-08',1)},
};
export function slots(cards){
 const count={},order=[];for(const id of cards){if(id.startsWith('M-'))continue;if(!(id in count)){count[id]=0;order.push(id);}count[id]++;}
 const pick=[...order].sort((x,y)=>count[y]-count[x]||order.indexOf(x)-order.indexOf(y)).slice(0,2);
 return pick.map(id=>({id,index:cards.lastIndexOf(id)}));
}
// FILL: which experiment card goes into slot 1 and slot 2 for each variant (PLAN.md §2).
export const FILL={
 'L-A0':null,
 'L-X0':['X-blank','X-blank'],
 'L-A1':['X-life-extend','X-life-extend'],'L-A1a':['X-life-extend','X-life-extend'],'L-A1t':['X-life-extend','X-life-extend'],
 'L-A2':['X-cap-raise','X-cap-raise'],'L-A2s':['X-cap-raise','X-cap-raise'],
 'L-A3':['X-life-extend','X-cap-raise'],
 'L-A4':['X-life-both','X-life-both'],
 'L-A1c4':['X-life-extend','X-life-extend'],'L-A1n1':['X-life-extend','X-blank'],'L-A1t1':['X-life-extend','X-blank'],'L-A1aL':['X-life-extend','X-life-extend'],
};
export function deckFor(id,variant){
 const cards=[...BASE_DECKS[id].cards],fill=FILL[variant];if(fill===undefined)throw Error('unknown variant '+variant);if(!fill)return {cards,replaced:[]};
 const s=slots(BASE_DECKS[id].cards);s.forEach((x,k)=>{cards[x.index]=fill[k];});
 return {cards,replaced:s.map((x,k)=>({from:x.id,index:x.index,to:fill[k]}))};
}
