// EXPERIMENT ONLY, fixed before running: candidate time opportunity cost vs the official intermediate CPU.
//  AB: 7 decks mirrored x 20 groups x 2 seat orders x candidate seat A/B x 2 variants (sameName, strictlyBetter)
//      = 1,120 matches, intermediate x intermediate. Seeds are independent of TR (base label 'AB').
//  AB2 (added after the variant audit, fixed before running): variantAware, decks with スキージャンプ/かくとうバトル
//      (challenge, item, balance) x 20 groups x 2 orders x candidate seat A/B = 240 matches (same AB seeds).
// Usage: node lib/ab-make-manifest.mjs > runs/AB-manifest.json ; node lib/ab-make-manifest.mjs AB2 > runs/AB2-manifest.json
import {CPU_DECKS,cpuDeck} from '../../cpu-decks.mjs';
import {deriveSeed,sha,permutations,apply} from '../../balance-verification-20261020/lib.mjs';
import * as e from '../../engine.mjs';
const decks=Object.fromEntries(CPU_DECKS.map(d=>[d.id,{label:d.name,theme:d.id,cards:d.cards,sha256:sha(d.cards)}]));
const groups=[],matches=[];
const AB2=process.argv[2]==='AB2',VARIANTS=AB2?['variantAware']:['sameName','strictlyBetter'];
for(const d of CPU_DECKS.filter(d=>!AB2||['challenge','item','balance'].includes(d.id)))for(let g=1;g<=20;g++){
 const base=`AB:${d.id}:${String(g).padStart(3,'0')}`,orderSeed=deriveSeed('order',base),perm=permutations(orderSeed),group=base+':mirror';
 groups.push({group,base,X:d.id,Y:d.id,orderSeed,orderSha:{X:sha(apply(decks[d.id].cards,perm.A)),Y:sha(apply(decks[d.id].cards,perm.B))}});
 for(const variant of VARIANTS)for(const first of ['X','Y'])for(const cand of ['A','B'])
  matches.push({match:`${group}:${variant}:${first}-first:cand${cand}`,group,first,deckA:d.id,deckB:d.id,variant,
   policy:{A:cand==='A'?variant:'official',B:cand==='B'?variant:'official'},difficulty:{A:'intermediate',B:'intermediate'},
   policySeed:{A:deriveSeed('policy',base,first,'A'),B:deriveSeed('policy',base,first,'B')}});
}
console.log(JSON.stringify({schema:'card-balance-manifest.v1',experiment:'time-reaction-study-20261030-'+(AB2?'ab2':'ab'),master:'naotocchi-card-balance-20261020',engine:e.VERSION,
 policyVersion:(await import('../../cpu-policy.mjs')).POLICY_VERSION,partnerVersion:cpuDeck('partner').version,decks,groups,matches,counts:{groups:groups.length,matches:matches.length}},null,1));
