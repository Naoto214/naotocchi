// EXPERIMENT ONLY. Fixes the ぴょんぴょんジャンプ A/B match set BEFORE any run (2026-10-27), following
// ../early-birth-value-20261027/EXPERIMENT-PLAN.md.
//  E1  : test deck (D1_main_growth) vs each official CPU deck, 20 groups, both seat orders, versions A/B, official CPU  (560)
//  E1F : same deals, equal-opportunity policy on the test seat                                                        (560)
//  E2  : test deck mirrored, 20 groups, both seat orders, strategies A_early / C_late7 on the test seat, versions A/B (160)
// Deals and policy seeds are shared by A and B (paired).  Usage: node make-manifest.mjs > runs/manifest.json
import {CPU_DECKS} from '../cpu-decks.mjs';import {DECKS} from '../balance-verification-20261020/decks.mjs';
import {deriveSeed,sha,permutations,apply} from '../balance-verification-20261020/lib.mjs';import * as e from '../engine.mjs';
const GROUPS=20,TEST='D1_main_growth';
const decks={[TEST]:{label:DECKS[TEST].label,cards:DECKS[TEST].cards,sha256:sha(DECKS[TEST].cards)}};
for(const d of CPU_DECKS)decks[d.id]={label:d.name,cards:d.cards,sha256:sha(d.cards)};
const groups=[],matches=[];
const group=(base,Y)=>{const orderSeed=deriveSeed('order',base),perm=permutations(orderSeed);
 groups.push({group:base,X:TEST,Y,orderSeed,orderSha:{X:sha(apply(decks[TEST].cards,perm.A)),Y:sha(apply(decks[Y].cards,perm.B))}});};
const pol=(base,first)=>({A:deriveSeed('policy',base,first,'A'),B:deriveSeed('policy',base,first,'B')});
for(const d of CPU_DECKS)for(let g=1;g<=GROUPS;g++){const base=`EARLYBIRTH:${d.id}:${String(g).padStart(3,'0')}`;group(base,d.id);
 for(const exp of ['E1','E1F'])for(const version of ['A','B'])for(const first of ['X','Y'])
  matches.push({match:`${base}:${exp}:${version}:${first}-first`,exp,version,policy:exp==='E1F'?'forced':'cpu',opponent:d.id,group:base,first,policySeed:pol(base,first)});}
for(let g=1;g<=GROUPS;g++){const base=`EARLYBIRTH:mirror:${String(g).padStart(3,'0')}`;group(base,TEST);
 for(const strategy of ['A_early','C_late7'])for(const version of ['A','B'])for(const first of ['X','Y'])
  matches.push({match:`${base}:E2:${strategy}:${version}:${first}-first`,exp:'E2',version,policy:'cpu',strategy,opponent:TEST,group:base,first,policySeed:pol(base,first)});}
console.log(JSON.stringify({schema:'doodle-jump-test-manifest.v1',experiment:'doodle-jump-test-20261027',master:'naotocchi-card-balance-20261020',
 engine:e.VERSION,policyVersion:(await import('../cpu-policy.mjs')).POLICY_VERSION,difficulty:'intermediate',testDeck:TEST,decks,groups,matches,
 counts:{groups:groups.length,matches:matches.length,E1:matches.filter(m=>m.exp==='E1').length,E1F:matches.filter(m=>m.exp==='E1F').length,E2:matches.filter(m=>m.exp==='E2').length}},null,1));
