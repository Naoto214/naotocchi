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
 'L-A1c4':['X-life-extend','X-life-extend'],'L-A1n1':['X-life-extend','X-blank'],'L-A1t1':['X-life-extend','X-blank'],
 'W-A':['X-XI-A','X-XII-A'],'W-B':['X-XI-B','X-XII-B'],'W-C':['X-XI-C','X-XII-C'],'W-XI1':['X-XI-B','X-blank'],
 'W-A3':['X-XI-A','X-XII-A'],'W-B3':['X-XI-B','X-XII-B'],'W-C3':['X-XI-C','X-XII-C'],'W-Bk':['X-XI-B','X-XII-B'],'W-BL':['X-XI-BL','X-XII-BL'],'L-A1aL':['X-life-extend','X-life-extend'],
};
// k > 2 slots (time cards, PLAN-TIME.md): repeatedly take one copy from the non-main card name with the most copies left (ties:
// first listed), always the last remaining copy of that name. For k <= 2 the original rule above is used unchanged.
export function slotsK(cards,k){
 const left={},order=[];for(const id of cards){if(id.startsWith('M-'))continue;if(!(id in left)){left[id]=0;order.push(id);}left[id]++;}
 const idx=[...cards.keys()],out=[];for(let n=0;n<k;n++){const id=[...order].sort((x,y)=>left[y]-left[x]||order.indexOf(x)-order.indexOf(y))[0];
  const index=idx.filter(i=>cards[i]===id&&!out.some(o=>o.index===i)).pop();out.push({id,index});left[id]--;}
 return out;
}
const T4=['X-T-IX','X-T-X','X-T-XI','X-T-XII'];
Object.assign(FILL,{'T-X4':['X-blank','X-blank-2','X-blank','X-blank-2'],'T-X8':['X-blank','X-blank-2','X-blank-3','X-blank','X-blank-2','X-blank-3','X-blank','X-blank-2'],'T-2s':T4,'T-2f':T4,'T-3s':T4,'T-2n':T4,'T-8s':[...T4,...T4]});
export function deckFor(id,variant){
 const cards=[...BASE_DECKS[id].cards],fill=FILL[variant];if(fill===undefined)throw Error('unknown variant '+variant);if(!fill)return {cards,replaced:[]};
 const s=fill.length>2?slotsK(BASE_DECKS[id].cards,fill.length):slots(BASE_DECKS[id].cards);s.forEach((x,k)=>{cards[x.index]=fill[k];});
 return {cards,replaced:s.map((x,k)=>({from:x.id,index:x.index,to:fill[k]}))};
}
// ---- VERSION 2 (PLAN-V2.md): per-deck time-card configurations. Same slot rule (slotsK), so a configuration with k cards
// replaces the same first k slots as every other k-card configuration of that deck. Names: N = number of each card.
FILL['T-2v']=T4;
const rep=(id,n)=>Array(n).fill(id);
export const CONFIGS={
 B4:{label:'各1（VERSION 1）',fill:T4},
 S2:{label:'IX×2（短縮）',fill:rep('X-T-IX',2)},
 S3:{label:'IX×2・X×1（短縮）',fill:[...rep('X-T-IX',2),'X-T-X']},
 L2:{label:'XII×2（延長）',fill:rep('X-T-XII',2)},
 L3:{label:'XI×1・XII×2（延長）',fill:['X-T-XII','X-T-XI','X-T-XII']},
 SL2:{label:'IX×1・XII×1（両方）',fill:['X-T-IX','X-T-XII']},
 H8:{label:'各2（8枚）',fill:[...T4,...T4]},
 H12:{label:'各3（12枚・上限まで）',fill:[...T4,...T4,...T4]},
};
export function deckForConfig(id,config){
 if(config==='N0')return {cards:[...BASE_DECKS[id].cards],replaced:[]};
 const fill=CONFIGS[config]?.fill;if(!fill)throw Error('unknown config '+config);const cards=[...BASE_DECKS[id].cards];
 const s=fill.length>2?slotsK(BASE_DECKS[id].cards,fill.length):slots(BASE_DECKS[id].cards);s.forEach((x,k)=>{cards[x.index]=fill[k];});
 return {cards,replaced:s.map((x,k)=>({from:x.id,index:x.index,to:fill[k]}))};
}
// ---- VERSION 4 (PLAN-V4.md): every configuration starts with the B4 slots (IX・X・XI・XII 各1), so the first four replaced
// slots are identical to B4 and each new card only replaces the next slots (paired with V2C / V2S B4 runs).
const NN=n=>'X-N-'+n;
Object.assign(CONFIGS,{
 N_haya:{label:'各1＋はやじまい×2',fill:[...T4,NN('hayajimai'),NN('hayajimai')]},
 N_naga:{label:'各1＋ながいきのひけつ×2',fill:[...T4,NN('nagaiki'),NN('nagaiki')]},
 N_tsuru:{label:'各1＋おいわいのつる×2',fill:[...T4,NN('tsuru'),NN('tsuru')]},
 N_photo:{label:'各1＋おもいでのしゃしん×2',fill:[...T4,NN('photo'),NN('photo')]},
 N_machi:{label:'各1＋まちぶせどけい×2',fill:[...T4,NN('machibuse'),NN('machibuse')]},
 N_omiya:{label:'各1＋いなかのおみやげ×2',fill:[...T4,NN('omiyage'),NN('omiyage')]},
 N_chotto:{label:'各1＋ちょっとまった×2',fill:[...T4,NN('chotto'),NN('chotto')]},
 C_haya:{label:'はやじまい×2＋IX（IX×2）',fill:[...T4,NN('hayajimai'),NN('hayajimai'),'X-T-IX']},
 C_naga:{label:'ながいきのひけつ×2＋XI・XII（各2）',fill:[...T4,NN('nagaiki'),NN('nagaiki'),'X-T-XI','X-T-XII']},
 C_tsuru:{label:'おいわいのつる×2＋XII（XII×2）',fill:[...T4,NN('tsuru'),NN('tsuru'),'X-T-XII']},
 C_photo:{label:'おもいでのしゃしん×2＋おいわいのつる（なかま）',fill:[...T4,NN('photo'),NN('photo'),NN('tsuru')]},
 C_machi:{label:'まちぶせどけい×2＋XI・XII（各2）',fill:[...T4,NN('machibuse'),NN('machibuse'),'X-T-XI','X-T-XII']},
 C_omiya:{label:'いなかのおみやげ×2＋IX（IX×2）',fill:[...T4,NN('omiyage'),NN('omiyage'),'X-T-IX']},
 C_chotto:{label:'ちょっとまった×2＋IX（IX×2）',fill:[...T4,NN('chotto'),NN('chotto'),'X-T-IX']},
});
Object.assign(CONFIGS,{MULTI:{label:'有望カード（はやじまい・ながいき・しゃしん・おみやげ・ちょっとまった 各1）＋IX・XII',fill:[...T4,NN('hayajimai'),NN('nagaiki'),NN('photo'),NN('omiyage'),NN('chotto'),'X-T-IX','X-T-XII']}});
