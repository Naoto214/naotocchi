// Fixes the extra checks BEFORE any run (2026-10-25):
//  X1: the adopted partner list vs the other six decks on seeds independent of the partner-deck comparison
//      (base label 'PX'), 30 groups each, both seat orders, intermediate vs intermediate (360 matches).
//  X2: the adopted partner list mirrored, beginner vs intermediate, both seat orders and difficulties
//      swapped, 30 groups (120 matches), as V2 did for every deck in stage 4.
// Usage: node make-manifest.mjs > runs/X-manifest.json
import {CPU_DECKS,cpuDeck} from '../cpu-decks.mjs';
import {deriveSeed,sha,permutations,apply} from '../balance-verification-20261020/lib.mjs';import * as e from '../engine.mjs';
const decks=Object.fromEntries(CPU_DECKS.map(d=>[d.id,{label:d.name,theme:d.id,cards:d.cards,sha256:sha(d.cards)}]));
const groups=[],matches=[];
const add=(group,base,X,Y,diffX,diffY,swap)=>{const orderSeed=deriveSeed('order',base),perm=permutations(orderSeed);
 groups.push({group,base,X,Y,orderSeed,orderSha:{X:sha(apply(decks[X].cards,perm.A)),Y:sha(apply(decks[Y].cards,perm.B))}});
 for(const first of ['X','Y'])for(const s of swap?[false,true]:[false]){const dx=s?diffY:diffX,dy=s?diffX:diffY;
  matches.push({match:`${group}:${first}-first${s?':swap':''}`,group,first,deckA:first==='X'?X:Y,deckB:first==='X'?Y:X,
   difficulty:{A:first==='X'?dx:dy,B:first==='X'?dy:dx},policySeed:{A:deriveSeed('policy',base,first,'A'),B:deriveSeed('policy',base,first,'B')}});}};
for(const o of CPU_DECKS.filter(d=>d.id!=='partner'))for(let g=1;g<=30;g++){const base=`PX:${o.id}:${String(g).padStart(3,'0')}`;add(base+':X1',base,'partner',o.id,'intermediate','intermediate',false);}
for(let g=1;g<=30;g++){const base=`PX:partner-mirror:${String(g).padStart(3,'0')}`;add(base+':X2',base,'partner','partner','beginner','intermediate',true);}
console.log(JSON.stringify({schema:'card-balance-manifest.v1',experiment:'deck-balance-20261025',master:'naotocchi-card-balance-20261020',engine:e.VERSION,
 policyVersion:(await import('../cpu-policy.mjs')).POLICY_VERSION,partnerVersion:cpuDeck('partner').version,decks,groups,matches,
 counts:{groups:groups.length,matches:matches.length,X1:matches.filter(m=>m.group.endsWith(':X1')).length,X2:matches.filter(m=>m.group.endsWith(':X2')).length}},null,1));
