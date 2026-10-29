// Fixes a comparison BEFORE it runs. All variants share the per-group order seed and the per-seat policy
// seeds (common random numbers), and every group is played with both seat orders.
// Usage: node lib/make-manifest.mjs <name> <natural|forced> <groups> <difficulty> <variants,comma> > runs/<name>-manifest.json
//   natural: X in {partner,balance} x Y in {challenge+S,growth+S,item+S,partner+S}; the CPU plays both seats.
//   probe  : X = abuse (ねこ社長 lover deck), Y = challenge+S; arm 'loop' scripts X to re-place its lover with 円満な別れ.
//   forced : X = partner, Y = challenge+S3 scripted to play すれちがい only when X's lover is at stage k (k=0..3, 4 = married).
import {DECKS,xDeck} from './decks.mjs';
import {deriveSeed,sha,permutations,apply} from '../../balance-verification-20261020/lib.mjs';
const [name,kind,groups,difficulty,variantList]=process.argv.slice(2);
// A variant may carry an arm label after a colon (probe only): C:loop, C:noloop, C2:loop.
const arms=variantList.split(',');
const pairs=kind==='probe'?[{x:'abuse',y:'challenge+S',stage:null}]:kind==='forced'?[0,1,2,3,4].map(k=>({x:'partner',y:'challenge+S3',stage:k})):
 ['partner','balance'].flatMap(x=>['challenge+S','growth+S','item+S','partner+S'].map(y=>({x,y,stage:null})));
const used=new Set(),G=[],M=[];
for(const arm of arms)for(const p of pairs)for(let g=1;g<=Number(groups);g++){
 const base=`BP:${kind}:${p.x}:${p.y}:${p.stage??'-'}:${String(g).padStart(3,'0')}`,[v,armTag]=arm.split(':'),X=xDeck(p.x,v),Y=p.y,group=`${base}:${arm}`;
 used.add(X);used.add(Y);
 const orderSeed=deriveSeed('order',base),perm=permutations(orderSeed);
 G.push({group,base,variant:v,arm,X,Y,xBase:p.x,stage:p.stage,orderSeed,orderSha:{X:sha(apply(DECKS[X].cards,perm.A)),Y:sha(apply(DECKS[Y].cards,perm.B))}});
 for(const first of ['X','Y'])M.push({match:`${group}:${first}-first`,group,variant:v,arm,first,deckA:first==='X'?X:Y,deckB:first==='X'?Y:X,
  xSeat:first==='X'?'A':'B',difficulty:{A:difficulty,B:difficulty},policySeed:{A:deriveSeed('policy',base,first,'A'),B:deriveSeed('policy',base,first,'B')},
  script:kind==='forced'?{seat:first==='X'?'B':'A',playMisunderstandingAtStage:p.stage}:kind==='probe'?{seat:first==='X'?'A':'B',amicableLoop:armTag==='loop'}:null});
}
const decks=Object.fromEntries([...used].map(id=>[id,{...DECKS[id],sha256:sha(DECKS[id].cards)}]));
console.log(JSON.stringify({schema:'breakup-penalty-manifest.v1',name,kind,difficulty,groupsPerPair:Number(groups),arms,pairs,decks,groups:G,matches:M,
 counts:{groups:G.length,matches:M.length}},null,1));
