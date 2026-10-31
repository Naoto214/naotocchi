// Fixes a run BEFORE it starts (PLAN.md §3). Seeds reuse the PR #495 labels R12C:MAIN:<X>:<Y>:<nnn> (official decks) and
// R12C:E8:main+8:<Y>:<nnn> (⑧ deck), so every condition shares shuffles and CPU policy seeds with the PR #495 G120 runs
// (A0 = G-A, A5 = G-D) and with each other (common random numbers). Both seat orders are played.
// Usage: node lib/make-manifest-life.mjs <name> <official|eight> <fromGroup> <toGroup> <variants,comma> > runs/<name>-manifest.json
import {CPU_DECKS} from '../../cpu-decks.mjs';
import {BASE_DECKS,deckFor} from './decks-life.mjs';
import {deriveSeed,sha,permutations,apply} from '../../balance-verification-20261020/lib.mjs';
const [name,set,from,to,variantList]=process.argv.slice(2);
const variants=variantList.split(','),ids=CPU_DECKS.map(d=>d.id),pairs=[];
if(set==='official'){for(let i=0;i<ids.length;i++)for(let j=i;j<ids.length;j++)pairs.push([ids[i],ids[j],null]);}
else if(set==='eight'){for(const y of ids)pairs.push(['main+8',y,'main+8']);}
else throw Error('unknown set');
const decks={},G=[],M=[];
const deckKey=(id,v)=>{const k=`${id}@${v}`;if(!decks[k]){const d=deckFor(id,v);decks[k]={label:BASE_DECKS[id].label,base:id,variant:v,cards:d.cards,replaced:d.replaced,sha256:sha(d.cards)};}return k;};
for(const v of variants)for(const [X,Y,S] of pairs)for(let g=Number(from);g<=Number(to);g++){
 const n=String(g).padStart(3,'0'),base=S?`R12C:E8:${S}:${Y}:${n}`:`R12C:MAIN:${X}:${Y}:${n}`,group=`VL:${name}:${X}:${Y}:${n}:${v}`;
 const kx=deckKey(X,v),ky=deckKey(Y,v),orderSeed=deriveSeed('order',base),perm=permutations(orderSeed);
 G.push({group,base,variant:v,X:kx,Y:ky,orderSeed,orderSha:{X:sha(apply(decks[kx].cards,perm.A)),Y:sha(apply(decks[ky].cards,perm.B))}});
 for(const first of ['X','Y'])M.push({match:`${group}:${first}-first`,group,base,variant:v,first,deckA:first==='X'?X:Y,deckB:first==='X'?Y:X,xSeat:first==='X'?'A':'B',
  difficulty:{A:'intermediate',B:'intermediate'},policySeed:{A:deriveSeed('policy',base,first,'A'),B:deriveSeed('policy',base,first,'B')}});
}
console.log(JSON.stringify({schema:'variable-life-manifest.v1',name,set,difficulty:'intermediate',range:[from,to],variants,pairs,decks,groups:G,matches:M,counts:{groups:G.length,matches:M.length}},null,1));
