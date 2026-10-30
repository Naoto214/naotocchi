// EXPERIMENT ONLY: the official decision loop (../../balance-verification-20261020/run.mjs) with a per-seat policy:
// 'official' = cpu-policy.mjs chooseCpuAction, otherwise lib/candidate-policy.mjs. Records result, first birth round,
// time lost at own turn starts and the number of decisions where the two policies would differ.
// Usage: node lib/ab-run.mjs <manifest.json> <out.jsonl> [shard] [shards]
import {readFileSync,appendFileSync,existsSync} from 'node:fs';
import * as e from '../../engine.mjs';
import {observeCpu} from '../../cpu-observation.mjs';
import {chooseCpuAction} from '../../cpu-policy.mjs';
import {advanceResponses} from '../../auto-progress.mjs';
import {permutations,inputFor,apply,sha} from '../../balance-verification-20261020/lib.mjs';
import {chooseCandidate} from './candidate-policy.mjs';
const [manifestPath,out,shard='0',shards='1']=process.argv.slice(2);
const M=JSON.parse(readFileSync(manifestPath,'utf8')),G=Object.fromEntries(M.groups.map(g=>[g.group,g]));
const done=new Set(existsSync(out)?readFileSync(out,'utf8').split('\n').filter(Boolean).map(l=>JSON.parse(l).match):[]);
const POL={official:chooseCpuAction,sameName:chooseCandidate('sameName'),strictlyBetter:chooseCandidate('strictlyBetter'),variantAware:chooseCandidate('variantAware')};
const cid=(s,id)=>s.cards[id]?.cardId;
function play(m){
 const g=G[m.group],perm=permutations(g.orderSeed),order={X:apply(M.decks[g.X].cards,perm.A),Y:apply(M.decks[g.Y].cards,perm.B)};
 const seatOrder={A:m.first==='X'?order.X:order.Y,B:m.first==='X'?order.Y:order.X};
 let s=e.createGame(g.orderSeed,{A:inputFor(seatOrder.A,perm.A),B:inputFor(seatOrder.B,perm.B)});
 const R={match:m.match,group:m.group,variant:m.variant,policy:m.policy,deck:{A:m.deckA,B:m.deckB},status:'running',error:null,
  firstBirth:{A:null,B:null},lost:{A:0,B:0},differs:{A:0,B:0},decisions:{A:0,B:0}};
 const step={A:0,B:0};let guard={turn:null,count:0,seen:{}};
 const watch=(prev,next)=>{for(const a of ['A','B']){if(next.turn===a&&prev.turn!==a)R.lost[a]+=prev.players[a].time;if(R.firstBirth[a]===null&&next.players[a].board.main)R.firstBirth[a]=next.round;}};
 const advance=()=>{const r=advanceResponses(s,{onTransition:watch});s=r.state;if(r.halted)throw Error('auto-advance halted: '+r.reason);};
 try{
  advance();
  for(let n=0;s.phase!=='finished';n++){
   if(n>=6000)throw Error('step limit');
   const a=e.actor(s),o=observeCpu(s,a),raw=e.legalActions(s);
   const turn=`${o.round}:${o.turn}`;if(turn!==guard.turn)guard={turn,count:0,seen:{}};
   const key=JSON.stringify({...o,revision:0,actions:o.actions.map(({id,...x})=>x)});
   if(guard.count>=512||(guard.seen[key]??0)>=3)throw Error('CPU repetition limit');
   const args={difficulty:m.difficulty[a],seed:m.policySeed[a],step:step[a]},d=POL[m.policy[a]](o,args);
   const other=POL[m.policy[a]===m.variant?'official':m.variant](o,args);if(other.id!==d.id)R.differs[a]++;
   const i=o.actions.findIndex(x=>x.id===d.id);if(i<0||raw.length!==o.actions.length)throw Error('Invalid CPU decision');
   R.decisions[a]++;const prev=s;s=e.act(s,a,s.revision,raw[i].id);step[a]++;guard.count++;guard.seen[key]=(guard.seen[key]??0)+1;watch(prev,s);
   advance();
  }
  R.status='completed';
 }catch(err){R.status='abnormal';R.error=String(err.message).slice(0,300);}
 R.round=s.round;R.result=s.result;R.growth={A:s.players.A.growth,B:s.players.B.growth};
 if(R.status==='completed')R.saveSha256=sha(e.save(s));
 return R;
}
const mine=M.matches.filter((m,i)=>i%Number(shards)===Number(shard)&&!done.has(m.match));
for(const m of mine){const r=play(m);appendFileSync(out,JSON.stringify(r)+'\n');process.stderr.write(`${r.match} ${r.status} ${r.result?.winner??'-'} R${r.round}\n`);}
