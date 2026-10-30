// Fixes the additional small-scale audit matches BEFORE any run (2026-10-30). Read-only use of the current CPU decks.
// 28 deck pairs (21 cross + 7 mirror) x 4 seed groups x first X/Y x difficulty {II,BB,BI,IB} = 896 matches.
// Same orderSeed per group across all four difficulty pairs and both seat orders (paired comparison).
// Usage: node tools/make-manifest.mjs > runs/T-manifest.json
import {CPU_DECKS} from '../../cpu-decks.mjs';
import {deriveSeed,sha,permutations,apply} from '../../balance-verification-20261020/lib.mjs';
const BASE='time-reaction-audit-20261030',SEEDS=4;
const decks=Object.fromEntries(CPU_DECKS.map(d=>[d.id,{label:d.name,cards:d.cards,sha256:sha(d.cards)}]));
const ids=CPU_DECKS.map(d=>d.id),groups=[],matches=[];
const D={I:'intermediate',B:'beginner'};
for(let i=0;i<ids.length;i++)for(let j=i;j<ids.length;j++)for(let k=1;k<=SEEDS;k++){
 const X=ids[i],Y=ids[j],group=`T:${X}~${Y}:${k}`,orderSeed=deriveSeed(BASE,'order',group),perm=permutations(orderSeed);
 groups.push({group,X,Y,orderSeed,orderSha:{X:sha(apply(decks[X].cards,perm.A)),Y:sha(apply(decks[Y].cards,perm.B))}});
 for(const first of ['X','Y'])for(const dd of ['II','BB','BI','IB']){const dx=D[dd[0]],dy=D[dd[1]];
  matches.push({match:`${group}:${dd}:${first}-first`,group,first,pair:dd,deckA:first==='X'?X:Y,deckB:first==='X'?Y:X,
   difficulty:{A:first==='X'?dx:dy,B:first==='X'?dy:dx},policySeed:{A:deriveSeed(BASE,'policy',group,first,'A'),B:deriveSeed(BASE,'policy',group,first,'B')}});}}
console.log(JSON.stringify({schema:'card-time-reaction-audit.v1',experiment:BASE,policyVersion:'heuristic-1',decks,groups,matches},null,1));
