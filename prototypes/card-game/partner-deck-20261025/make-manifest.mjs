// Fixes the comparison BEFORE any run. Each partner-deck variant plays the same opponents with the same
// per-group order seed and policy seeds (common seeds across variants), both seat orders.
// Usage: node make-manifest.mjs <groupsPerOpponent> [difficulty] > manifest.json
import {CPU_DECKS} from '../cpu-decks.mjs';import {VARIANTS} from './variants.mjs';
import {deriveSeed,sha,permutations,apply} from '../balance-verification-20261020/lib.mjs';import * as e from '../engine.mjs';
const [perOpp,diff='intermediate']=process.argv.slice(2);
const opponents=CPU_DECKS.filter(d=>d.id!=='partner');
const decks={};
for(const [k,v] of Object.entries(VARIANTS))decks['partner@'+k]={label:'こいびと・交際 '+k,theme:'partner',note:v.note,cards:v.cards,sha256:sha(v.cards)};
for(const d of opponents)decks[d.id]={label:d.name,theme:d.id,cards:d.cards,sha256:sha(d.cards)};
const groups=[],matches=[];
for(const v of Object.keys(VARIANTS))for(const o of opponents)for(let g=1;g<=Number(perOpp);g++){
 const base=`PD:${o.id}:${String(g).padStart(3,'0')}`,group=`${base}:${v}`,X='partner@'+v,Y=o.id;
 const orderSeed=deriveSeed('order',base),perm=permutations(orderSeed);
 groups.push({group,base,variant:v,X,Y,orderSeed,orderSha:{X:sha(apply(decks[X].cards,perm.A)),Y:sha(apply(decks[Y].cards,perm.B))}});
 for(const first of ['X','Y'])matches.push({match:`${group}:${first}-first`,group,first,deckA:first==='X'?X:Y,deckB:first==='X'?Y:X,
  difficulty:{A:diff,B:diff},policySeed:{A:deriveSeed('policy',base,first,'A'),B:deriveSeed('policy',base,first,'B')}});
}
console.log(JSON.stringify({schema:'card-balance-manifest.v1',experiment:'partner-deck-20261025',master:'naotocchi-card-balance-20261020',engine:e.VERSION,
 policyVersion:(await import('../cpu-policy.mjs')).POLICY_VERSION,difficulty:{X:diff,Y:diff},groupsPerOpponent:Number(perOpp),
 decks,groups,matches,counts:{variants:Object.keys(VARIANTS).length,opponents:opponents.length,groups:groups.length,matches:matches.length}},null,1));
