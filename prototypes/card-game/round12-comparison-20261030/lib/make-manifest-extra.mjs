// Follow-up plan, fixed BEFORE it runs (PLAN-EXTRA.md). Same seed scheme as make-manifest.mjs: per-group order seed and
// per-seat policy seeds shared by R10 and R12, both seat orders, intermediate vs intermediate.
// Usage: node lib/make-manifest-extra.mjs <name> <E8|EL> <groupsPerPair> <variants,comma> > runs/<name>-manifest.json
import {DECKS,SETS} from './decks-extra.mjs';
import {deriveSeed,sha,permutations,apply} from '../../balance-verification-20261020/lib.mjs';
const [name,set,groups,variantList,difficulty='intermediate']=process.argv.slice(2);
const variants=variantList.split(','),pairs=SETS[set];if(!pairs)throw Error('unknown set '+set);
const used=new Set(),G=[],M=[];
// An optional third pair element S reuses the seed labels of set `seedSet` (default E8) for deck S, so the controls are paired.
const seedSet=process.argv[7]??'E8';
for(const v of variants)for(const [X,Y,S] of pairs)for(let g=1;g<=Number(groups);g++){
 const n=String(g).padStart(3,'0'),base=S?`R12C:${seedSet}:${S}:${Y}:${n}`:`R12C:${name}:${X}:${Y}:${n}`,group=S?`R12C:${name}:${X}:${Y}:${n}:${v}`:`${base}:${v}`;used.add(X);used.add(Y);
 const orderSeed=deriveSeed('order',base),perm=permutations(orderSeed);
 G.push({group,base,variant:v,X,Y,orderSeed,orderSha:{X:sha(apply(DECKS[X].cards,perm.A)),Y:sha(apply(DECKS[Y].cards,perm.B))}});
 for(const first of ['X','Y'])M.push({match:`${group}:${first}-first`,group,base,variant:v,first,deckA:first==='X'?X:Y,deckB:first==='X'?Y:X,xSeat:first==='X'?'A':'B',
  difficulty:{A:difficulty,B:difficulty},policySeed:{A:deriveSeed('policy',base,first,'A'),B:deriveSeed('policy',base,first,'B')}});
}
const decks=Object.fromEntries([...used].map(id=>[id,{...DECKS[id],sha256:sha(DECKS[id].cards)}]));
console.log(JSON.stringify({schema:'round12-comparison-manifest.v1',name,set,difficulty,groupsPerPair:Number(groups),variants,pairs,decks,groups:G,matches:M,counts:{groups:G.length,matches:M.length}},null,1));
