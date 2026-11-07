// Fixes the additional small run BEFORE it is executed (2026-10-30, time & reaction study).
//  TR: every CPU strategy deck mirrored (same 40 cards on both seats, so deck strength cancels out),
//      10 groups per deck, both seat orders, and three difficulty pairings:
//      intermediate x intermediate, beginner x intermediate (difficulties swapped), beginner x beginner.
//      7 decks x 10 groups x 2 orders x 4 = 560 matches.
// The existing deck-balance-20261025 X manifest (480 matches) is replayed unchanged as the reproduction anchor.
// Usage: node lib/make-manifest.mjs > runs/TR-manifest.json
import {CPU_DECKS,cpuDeck} from '../../cpu-decks.mjs';
import {deriveSeed,sha,permutations,apply} from '../../balance-verification-20261020/lib.mjs';
import * as e from '../../engine.mjs';
const decks=Object.fromEntries(CPU_DECKS.map(d=>[d.id,{label:d.name,theme:d.id,cards:d.cards,sha256:sha(d.cards)}]));
const groups=[],matches=[];
const PAIRS=[['intermediate','intermediate','II'],['beginner','intermediate','BI'],['intermediate','beginner','IB'],['beginner','beginner','BB']];
for(const d of CPU_DECKS)for(let g=1;g<=10;g++){
 const base=`TR:${d.id}:${String(g).padStart(3,'0')}`,orderSeed=deriveSeed('order',base),perm=permutations(orderSeed),group=base+':mirror';
 groups.push({group,base,X:d.id,Y:d.id,orderSeed,orderSha:{X:sha(apply(decks[d.id].cards,perm.A)),Y:sha(apply(decks[d.id].cards,perm.B))}});
 for(const first of ['X','Y'])for(const [dx,dy,tag] of PAIRS)
  matches.push({match:`${group}:${first}-first:${tag}`,group,first,deckA:d.id,deckB:d.id,
   difficulty:{A:first==='X'?dx:dy,B:first==='X'?dy:dx},xSeat:first==='X'?'A':'B',policySeed:{A:deriveSeed('policy',base,first,'A'),B:deriveSeed('policy',base,first,'B')}});
}
console.log(JSON.stringify({schema:'card-balance-manifest.v1',experiment:'time-reaction-study-20261030',master:'naotocchi-card-balance-20261020',engine:e.VERSION,
 policyVersion:(await import('../../cpu-policy.mjs')).POLICY_VERSION,partnerVersion:cpuDeck('partner').version,decks,groups,matches,
 counts:{groups:groups.length,matches:matches.length}},null,1));
