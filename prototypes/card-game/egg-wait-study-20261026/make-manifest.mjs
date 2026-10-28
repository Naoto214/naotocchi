// EXPERIMENT ONLY. Fixes the egg-wait study's planned match set BEFORE any run (2026-10-26).
// 7 official CPU decks, each mirrored (study seat and official-CPU seat use the same list), 20 order seeds per deck,
// both seat orders, 4 strategies x 2 rules. Seeds and initial orders are identical across strategies and rules,
// so every comparison is paired on the same deal.  Usage: node make-manifest.mjs > runs/manifest.json
import {CPU_DECKS} from '../cpu-decks.mjs';
import {deriveSeed,sha,permutations,apply} from '../balance-verification-20261020/lib.mjs';
import {STRATEGY_IDS} from './strategies.mjs';import * as e from '../engine.mjs';
const GROUPS=20,RULES=['current','egg00'];
const decks=Object.fromEntries(CPU_DECKS.map(d=>[d.id,{label:d.name,cards:d.cards,sha256:sha(d.cards)}]));
const groups=[],matches=[];
for(const d of CPU_DECKS)for(let g=1;g<=GROUPS;g++){
 const base=`EGGWAIT:${d.id}:${String(g).padStart(3,'0')}`,orderSeed=deriveSeed('order',base),perm=permutations(orderSeed);
 groups.push({group:base,X:d.id,Y:d.id,orderSeed,orderSha:{X:sha(apply(decks[d.id].cards,perm.A)),Y:sha(apply(decks[d.id].cards,perm.B))}});
 for(const rule of RULES)for(const strategy of STRATEGY_IDS)for(const first of ['X','Y'])
  matches.push({match:`${base}:${rule}:${strategy}:${first}-first`,group:base,rule,strategy,deck:d.id,first,
   policySeed:{A:deriveSeed('policy',base,first,'A'),B:deriveSeed('policy',base,first,'B')}});
}
console.log(JSON.stringify({schema:'egg-wait-study-manifest.v1',experiment:'egg-wait-study-20261026',master:'naotocchi-card-balance-20261020',
 engine:e.VERSION,policyVersion:(await import('../cpu-policy.mjs')).POLICY_VERSION,difficulty:'intermediate',decks,groups,matches,
 counts:{groups:groups.length,matches:matches.length}},null,1));
