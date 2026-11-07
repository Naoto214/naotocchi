import {CPU_DECKS} from '../../cpu-decks.mjs';
import {deriveSeed,sha,permutations,apply} from '../../balance-verification-20261020/lib.mjs';
const [groups,diff,arms]=process.argv.slice(2);const D=Object.fromEntries(CPU_DECKS.map(d=>[d.id,{label:d.name,cards:[...d.cards]}]));
const Ys=CPU_DECKS.map(d=>d.id).filter(id=>id!=='partner'),G=[],M=[];
for(const v of arms.split(','))for(const y of Ys)for(let g=1;g<=+groups;g++){const base=`MP:partner:${y}:${String(g).padStart(3,'0')}`,group=base+':'+v,orderSeed=deriveSeed('order',base);
 G.push({group,base,variant:v,arm:v,X:'partner',Y:y,xBase:'partner',stage:null,orderSeed});
 for(const first of ['X','Y'])M.push({match:`${group}:${first}-first`,group,variant:v,arm:v,first,deckA:first==='X'?'partner':y,deckB:first==='X'?y:'partner',xSeat:first==='X'?'A':'B',difficulty:{A:diff,B:diff},policySeed:{A:deriveSeed('policy',base,first,'A'),B:deriveSeed('policy',base,first,'B')},script:null});}
console.log(JSON.stringify({groups:G,matches:M,decks:D}));
