// G120 comparison plan (PLAN-G120.md), fixed BEFORE it runs.
// Seeds: the MAIN labels R12C:MAIN:<X>:<Y>:<nnn> (official 7 decks) or the E8 labels R12C:E8:<S>:<Y>:<nnn> (⑧ decks),
// so every condition shares shuffles and policy seeds with the earlier heuristic-1 runs (MAIN / E8 / C8 / C8b).
// Usage: node lib/make-manifest-g120.mjs <name> <official|eight> <fromGroup> <toGroup> <variants,comma> > runs/<name>-manifest.json
import {CPU_DECKS} from '../../cpu-decks.mjs';
import {DECKS} from './decks-extra.mjs';
import {deriveSeed,sha,permutations,apply} from '../../balance-verification-20261020/lib.mjs';
const [name,set,from,to,variantList]=process.argv.slice(2);
const variants=variantList.split(','),FINAL={'G-A':10,'G-C':10,'G-OFF':10,'G-B':12,'G-D':12,'G-D0':12},CAP={'G-A':100,'G-B':100,'G-OFF':100,'G-C':120,'G-D':120,'G-D0':120};
const ids=CPU_DECKS.map(d=>d.id),pairs=[];
if(set==='official'){for(let i=0;i<ids.length;i++)for(let j=i;j<ids.length;j++)pairs.push([ids[i],ids[j],null]);}
else if(set==='eight'){for(const [x,s] of [['main+8','main+8'],['main+8lite','main+8'],['main+dup','main+8']])for(const y of ids)pairs.push([x,y,s]);}
else throw Error('unknown set');
const used=new Set(),G=[],M=[];
for(const v of variants)for(const [X,Y,S] of pairs)for(let g=Number(from);g<=Number(to);g++){
 const n=String(g).padStart(3,'0'),base=S?`R12C:E8:${S}:${Y}:${n}`:`R12C:MAIN:${X}:${Y}:${n}`,group=`R12C:${name}:${X}:${Y}:${n}:${v}`;used.add(X);used.add(Y);
 const orderSeed=deriveSeed('order',base),perm=permutations(orderSeed);
 G.push({group,base,variant:v,X,Y,orderSeed,orderSha:{X:sha(apply(DECKS[X].cards,perm.A)),Y:sha(apply(DECKS[Y].cards,perm.B))}});
 for(const first of ['X','Y'])M.push({match:`${group}:${first}-first`,group,base,variant:v,final:FINAL[v],cap:CAP[v],first,deckA:first==='X'?X:Y,deckB:first==='X'?Y:X,xSeat:first==='X'?'A':'B',
  difficulty:{A:'intermediate',B:'intermediate'},policySeed:{A:deriveSeed('policy',base,first,'A'),B:deriveSeed('policy',base,first,'B')}});
}
const decks=Object.fromEntries([...used].map(id=>[id,{...DECKS[id],sha256:sha(DECKS[id].cards)}]));
console.log(JSON.stringify({schema:'round12-comparison-manifest.v1',name,set,difficulty:'intermediate',groups:[from,to],variants,pairs,decks,groups:G,matches:M,counts:{groups:G.length,matches:M.length}},null,1));
