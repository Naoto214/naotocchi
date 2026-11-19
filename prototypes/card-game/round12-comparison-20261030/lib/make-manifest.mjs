// Fixes a comparison BEFORE it runs. Every variant shares the per-group order seed and the per-seat policy seeds
// (common random numbers), the same 7 official CPU decks, the same CPU difficulty, and both seat orders.
// Usage: node lib/make-manifest.mjs <name> <groupsPerPair> <variants,comma> [difficulty=intermediate] > runs/<name>-manifest.json
//   Pairs: all 21 unordered pairs of different decks + the 7 mirrors (28 pairs). Base labels do not depend on the variant.
import {CPU_DECKS} from '../../cpu-decks.mjs';
import {deriveSeed,sha,permutations,apply} from '../../balance-verification-20261020/lib.mjs';
const [name,groups,variantList,difficulty='intermediate']=process.argv.slice(2);
const variants=variantList.split(',');
const decks=Object.fromEntries(CPU_DECKS.map(d=>[d.id,{label:d.name,cards:d.cards,sha256:sha(d.cards)}]));
const ids=CPU_DECKS.map(d=>d.id),pairs=[];
for(let i=0;i<ids.length;i++)for(let j=i;j<ids.length;j++)pairs.push([ids[i],ids[j]]);
const G=[],M=[];
for(const v of variants)for(const [X,Y] of pairs)for(let g=1;g<=Number(groups);g++){
 const base=`R12C:${name}:${X}:${Y}:${String(g).padStart(3,'0')}`,group=`${base}:${v}`;
 const orderSeed=deriveSeed('order',base),perm=permutations(orderSeed);
 G.push({group,base,variant:v,X,Y,orderSeed,orderSha:{X:sha(apply(decks[X].cards,perm.A)),Y:sha(apply(decks[Y].cards,perm.B))}});
 for(const first of ['X','Y'])M.push({match:`${group}:${first}-first`,group,base,variant:v,first,deckA:first==='X'?X:Y,deckB:first==='X'?Y:X,xSeat:first==='X'?'A':'B',
  difficulty:{A:difficulty,B:difficulty},policySeed:{A:deriveSeed('policy',base,first,'A'),B:deriveSeed('policy',base,first,'B')}});
}
console.log(JSON.stringify({schema:'round12-comparison-manifest.v1',name,difficulty,groupsPerPair:Number(groups),variants,pairs,decks,groups:G,matches:M,counts:{groups:G.length,matches:M.length}},null,1));
