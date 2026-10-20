// Head-to-head: current CPU vs the PR #406 CPU (dda7c9d, restored verbatim except import paths), same manifest matches.
// Each match is played twice: new CPU in seat A, then in seat B. Usage: node h2h.mjs <manifest> <out.jsonl> [shard] [shards]
import {readFileSync,appendFileSync} from 'node:fs';
import * as e from '../../engine.mjs';import {advanceResponses} from '../../auto-progress.mjs';
import * as newObs from '../../cpu-observation.mjs';import * as newPol from '../../cpu-policy.mjs';
import * as oldObs from './pr406-cpu-observation.mjs';import * as oldPol from './pr406-cpu-policy.mjs';
import {permutations,inputFor,apply,sha} from '../../balance-verification-20261020/lib.mjs';
const [manifestPath,out,shard='0',shards='1']=process.argv.slice(2);
const M=JSON.parse(readFileSync(manifestPath,'utf8')),G=Object.fromEntries(M.groups.map(g=>[g.group,g]));
const CPU={new:[newObs.observeCpu,newPol.chooseCpuAction],pr406:[oldObs.observeCpu,oldPol.chooseCpuAction]};
for(const [mi,m] of M.matches.entries()){if(mi%Number(shards)!==Number(shard))continue;
 for(const newSeat of ['A','B']){
  const g=G[m.group],perm=permutations(g.orderSeed),order={X:apply(M.decks[g.X].cards,perm.A),Y:apply(M.decks[g.Y].cards,perm.B)};
  const so={A:m.first==='X'?order.X:order.Y,B:m.first==='X'?order.Y:order.X},who={A:newSeat==='A'?'new':'pr406',B:newSeat==='B'?'new':'pr406'};
  let s=advanceResponses(e.createGame(g.orderSeed,{A:inputFor(so.A,perm.A),B:inputFor(so.B,perm.B)})).state;const step={A:0,B:0};let err=null;
  try{for(let n=0;s.phase!=='finished';n++){if(n>6000)throw Error('step limit');const a=e.actor(s),[obs,choose]=CPU[who[a]],o=obs(s,a),d=choose(o,{difficulty:m.difficulty[a],seed:m.policySeed[a],step:step[a]}),i=o.actions.findIndex(x=>x.id===d.id);
   if(i<0)throw Error('invalid decision');s=advanceResponses(e.act(s,a,s.revision,e.legalActions(s)[i].id)).state;step[a]++;}}catch(x){err=String(x.message);}
  const saved=err?null:e.save(s),replay=saved&&JSON.stringify(e.restore(saved).result)===JSON.stringify(s.result)?'match':'mismatch';
  appendFileSync(out,JSON.stringify({match:m.match,newSeat,deck:{A:m.deckA,B:m.deckB},status:err?'abnormal':'completed',error:err,result:s.result,growth:{A:s.players.A.growth,B:s.players.B.growth},replay,saveSha256:saved&&sha(saved)})+'\n');
 }
}
