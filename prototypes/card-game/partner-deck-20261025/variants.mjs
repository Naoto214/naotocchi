// Candidate lists for the CPU 'partner' (こいびと・交際) deck. Only lover counts and the freed slots change;
// the 30 non-lover cards of the current deck stay. Freed slots are filled in a fixed order with cards that
// fit the dating/marriage plan, so a smaller lover count always contains the previous candidate's additions.
import {validateDeck} from '../engine.mjs';
import {CPU_DECK_HISTORY} from '../cpu-decks.mjs';
const x=spec=>Object.entries(spec).flatMap(([id,n])=>Array(n).fill(id));
// The list in use when the comparison was planned (now kept as the deck's earlier version).
const CURRENT=[...CPU_DECK_HISTORY.partner.find(v=>v.version==='2026-10-22').cards];
const BASE=CURRENT.filter(id=>!id.startsWith('P-'));
// Fill order: lover search first (more useful with fewer lovers), then a board-completion reward that
// needs main+companion+lover+face-up item, an item that can sit on the lover, a companion, a higher cat.
export const FILL=['I-c_match','E-new-encounter','G-connect-four','G-connect-four','I-bowtie','I-bowtie','C-chicken','M-cat-06'];
const build=(lovers,fill)=>[...BASE,...x(lovers),...FILL.slice(0,fill)];
export const VARIANTS=Object.freeze({
 L10:{lovers:{'P-grove_deer':3,'P-high_eagle':3,'P-robot_neighbor':2,'P-cat_ceo':2},note:'現行（4種10枚）',cards:CURRENT},
 L8:{lovers:{'P-grove_deer':3,'P-high_eagle':3,'P-robot_neighbor':2},note:'3種8枚',cards:build({'P-grove_deer':3,'P-high_eagle':3,'P-robot_neighbor':2},2)},
 L6:{lovers:{'P-grove_deer':3,'P-high_eagle':3},note:'2種6枚',cards:build({'P-grove_deer':3,'P-high_eagle':3},4)},
 L6k4:{lovers:{'P-grove_deer':2,'P-high_eagle':2,'P-robot_neighbor':1,'P-cat_ceo':1},note:'4種6枚（種類数の比較用）',cards:build({'P-grove_deer':2,'P-high_eagle':2,'P-robot_neighbor':1,'P-cat_ceo':1},4)},
 L4:{lovers:{'P-grove_deer':2,'P-high_eagle':2},note:'2種4枚',cards:build({'P-grove_deer':2,'P-high_eagle':2},6)},
 L2:{lovers:{'P-grove_deer':1,'P-high_eagle':1},note:'2種2枚',cards:build({'P-grove_deer':1,'P-high_eagle':1},8)},
});
// Second round (after the first results): separate the lover count from G-connect-four, and drop the
// third I-c_match that the CPU almost never plays (0.01-0.16 per game in the first round).
const custom=(lovers,extra)=>[...BASE,...x(lovers),...x(extra)];
export const CONTROLS=Object.freeze({
 L8cf:{lovers:{'P-grove_deer':3,'P-high_eagle':3,'P-robot_neighbor':2},note:'3種8枚＋コネクトフォー2（コネクトフォーだけの効果）',cards:custom({'P-grove_deer':3,'P-high_eagle':3,'P-robot_neighbor':2},{'G-connect-four':2})},
 L6n:{lovers:{'P-grove_deer':3,'P-high_eagle':3},note:'2種6枚、コネクトフォーなし（枚数だけの効果）',cards:custom({'P-grove_deer':3,'P-high_eagle':3},{'E-new-encounter':1,'I-bowtie':2,'C-chicken':1})},
 L6cf:{lovers:{'P-grove_deer':3,'P-high_eagle':3},note:'2種6枚＋であい1・コネクトフォー2・おべんとう1',cards:custom({'P-grove_deer':3,'P-high_eagle':3},{'E-new-encounter':1,'G-connect-four':2,'I-bowtie':1})},
 L4cf:{lovers:{'P-grove_deer':2,'P-high_eagle':2},note:'2種4枚＋であい1・コネクトフォー2・おべんとう2・ニワトリ1',cards:custom({'P-grove_deer':2,'P-high_eagle':2},{'E-new-encounter':1,'G-connect-four':2,'I-bowtie':2,'C-chicken':1})},
});
for(const [k,v] of Object.entries(CONTROLS)){validateDeck(v.cards);const n=v.cards.filter(c=>c.startsWith('P-')).length,want=Object.values(v.lovers).reduce((a,b)=>a+b,0);if(n!==want||v.cards.length!==40)throw Error('variant '+k);}
for(const [k,v] of Object.entries(VARIANTS)){validateDeck(v.cards);const n=v.cards.filter(c=>c.startsWith('P-')).length,want=Object.values(v.lovers).reduce((a,b)=>a+b,0);if(n!==want||v.cards.length!==40)throw Error('variant '+k);}
export const ALL_VARIANTS=Object.freeze({...VARIANTS,...CONTROLS});
