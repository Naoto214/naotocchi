// Fixes the planned match set BEFORE any run: decks, groups, seeds, difficulties, mirror pairs.
// Usage: node make-manifest.mjs <experiment> <groupsPerPairing> <diffA-first-deck> <diffOther> > manifest
import {DECKS} from './decks.mjs';import {deriveSeed,sha,permutations,apply} from './lib.mjs';import * as e from '../engine.mjs';
const [experiment,perPair,diffX='intermediate',diffY='intermediate',scope='all']=process.argv.slice(2);
const ids=Object.keys(DECKS);const pairings=[];
for(let i=0;i<ids.length;i++)for(let j=i;j<ids.length;j++){if(scope.startsWith('mirror')&&i!==j)continue;pairings.push([ids[i],ids[j]]);}
const groups=[],matches=[];
for(const [X,Y] of pairings)for(let g=1;g<=Number(perPair);g++){
 const group=`${experiment}:${X}~${Y}:${String(g).padStart(3,'0')}`,orderSeed=deriveSeed('order',group);
 // Fixed per-group initial orders: X takes the A-stream, Y the B-stream of orderSeed (both games keep these exact orders).
 const perm=permutations(orderSeed),order={[`X`]:apply(DECKS[X].cards,perm.A),Y:apply(DECKS[Y].cards,perm.B)};
 groups.push({group,X,Y,orderSeed,orderSha:{X:sha(order.X),Y:sha(order.Y)}});
 for(const first of ['X','Y'])matches.push({match:`${group}:${first}-first`,group,first,deckA:first==='X'?X:Y,deckB:first==='X'?Y:X,
  difficulty:{A:first==='X'?diffX:diffY,B:first==='X'?diffY:diffX},
  policySeed:{A:deriveSeed('policy',group,first,'A'),B:deriveSeed('policy',group,first,'B')}});
}
// 'swap': replay every match with X/Y difficulties exchanged (same orders and policy seeds) to cancel order luck.
if(scope.includes('swap'))for(const m of [...matches])matches.push({...m,match:m.match+':swap',difficulty:{A:m.difficulty.A===diffX?diffY:diffX,B:m.difficulty.B===diffX?diffY:diffX}});
const decks=Object.fromEntries(ids.map(k=>[k,{...DECKS[k],sha256:sha(DECKS[k].cards)}]));
console.log(JSON.stringify({schema:'card-balance-manifest.v1',experiment,master:'naotocchi-card-balance-20261020',engine:e.VERSION,
 policyVersion:(await import('../cpu-policy.mjs')).POLICY_VERSION,difficulty:{X:diffX,Y:diffY},groupsPerPairing:Number(perPair),
 decks,groups,matches,counts:{groups:groups.length,matches:matches.length}},null,1));
