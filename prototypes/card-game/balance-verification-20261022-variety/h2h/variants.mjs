// Feature ablation: current policy with profile override X vs current policy with profile override Y, same matches, seats swapped.
// Usage: node variants.mjs <manifest> <out.jsonl> <shard> <shards> '<jsonX>' '<jsonY>'
import {readFileSync,appendFileSync} from 'node:fs';
import * as e from '../../engine.mjs';import {advanceResponses} from '../../auto-progress.mjs';
import {observeCpu} from '../../cpu-observation.mjs';import {chooseCpuAction} from '../../cpu-policy.mjs';
import {permutations,inputFor,apply} from '../../balance-verification-20261020/lib.mjs';
const [manifestPath,out,shard,shards,px,py]=process.argv.slice(2),P={X:JSON.parse(px),Y:JSON.parse(py)};
const M=JSON.parse(readFileSync(manifestPath,'utf8')),G=Object.fromEntries(M.groups.map(g=>[g.group,g]));
for(const [mi,m] of M.matches.entries()){if(mi%Number(shards)!==Number(shard))continue;
 for(const xSeat of ['A','B']){const g=G[m.group],perm=permutations(g.orderSeed),order={X:apply(M.decks[g.X].cards,perm.A),Y:apply(M.decks[g.Y].cards,perm.B)};
  const so={A:m.first==='X'?order.X:order.Y,B:m.first==='X'?order.Y:order.X},prof={A:xSeat==='A'?P.X:P.Y,B:xSeat==='B'?P.X:P.Y};
  let s=advanceResponses(e.createGame(g.orderSeed,{A:inputFor(so.A,perm.A),B:inputFor(so.B,perm.B)})).state;const step={A:0,B:0};let err=null;
  try{for(let n=0;s.phase!=='finished';n++){if(n>6000)throw Error('step limit');const a=e.actor(s),o=observeCpu(s,a),d=chooseCpuAction(o,{difficulty:m.difficulty[a],seed:m.policySeed[a],step:step[a],profile:prof[a]}),i=o.actions.findIndex(x=>x.id===d.id);s=advanceResponses(e.act(s,a,s.revision,e.legalActions(s)[i].id)).state;step[a]++;}}catch(x){err=String(x.message);}
  appendFileSync(out,JSON.stringify({match:m.match,newSeat:xSeat,deck:{A:m.deckA,B:m.deckB},status:err?'abnormal':'completed',error:err,result:s.result,challenges:s.history.filter(h=>h.kind==='comparison').map(h=>({actor:h.actor,winner:h.winner}))})+'\n');}
}
