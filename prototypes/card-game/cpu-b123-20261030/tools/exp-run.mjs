// Isolated A/B runner (2026-10-30). Official engine + auto-pass; the CPU is the EXPERIMENT copy
// (lib/policy-exp.mjs + lib/observe-exp.mjs) with per-arm switches. With arm "base" (all switches off) the
// choices must equal the official CPU: tools/equivalence.mjs compares save sha256 with PR #489's records.
// Usage: node tools/exp-run.mjs <manifest> <arm> <out.jsonl> [shard] [shards]
import {readFileSync,appendFileSync,existsSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import * as e from '../../engine.mjs';
import {RULES} from '../../rules.mjs';
import {advanceResponses} from '../../auto-progress.mjs';
import {permutations,inputFor,apply,sha} from '../../balance-verification-20261020/lib.mjs';
import {chooseCpuAction} from '../lib/policy-exp.mjs';
import {observeExp} from '../lib/observe-exp.mjs';
import {ARMS} from '../lib/arms.mjs';
const STAT={power:'power',wisdom:'wisdom','パンチ':'power','キック':'power','ガード':'wisdom'};
const cid=(s,id)=>s.cards[id]?.cardId,inc=(o,k,n=1)=>{o[k]=(o[k]??0)+n;};
export function play(M,m,armName,hooks={}){
 const arm=ARMS[armName],G=Object.fromEntries(M.groups.map(g=>[g.group,g])),g=G[m.group],perm=permutations(g.orderSeed);
 const order={X:apply(M.decks[g.X].cards,perm.A),Y:apply(M.decks[g.Y].cards,perm.B)};
 const seatOrder={A:m.first==='X'?order.X:order.Y,B:m.first==='X'?order.Y:order.X};
 let s=e.createGame(g.orderSeed,{A:inputFor(seatOrder.A,perm.A),B:inputFor(seatOrder.B,perm.B)});
 const seat=()=>({decisions:0,ms:0,statChoice:{},challenge:{declared:0,declaredWon:0,declaredDraw:0,defended:0,defendedWon:0,defendedDraw:0},
  traps:{set:{},fired:{},leftAtEnd:{},delay:0,blockedFull:0},r10:{plays:0,spent:0},quick:{}});
 const R={match:m.match,group:m.group,pair:m.pair,first:m.first,arm:armName,deck:{A:m.deckA,B:m.deckB},difficulty:m.difficulty,status:'running',error:null,seat:{A:seat(),B:seat()}};
 const setRound={},step={A:0,B:0};
 const advance=()=>{const r=advanceResponses(s);s=r.state;if(r.halted)throw Error('auto-advance halted: '+r.reason);};
 try{
  advance();
  for(let n=0;s.phase!=='finished';n++){
   if(n>=6000)throw Error('step limit');
   const a=e.actor(s),S=R.seat[a],p=s.players[a],prof=arm[m.difficulty[a]]??{};
   const t0=performance.now(),o=observeExp(s,a),d=chooseCpuAction(o,{difficulty:m.difficulty[a],seed:m.policySeed[a],step:step[a],profile:prof});
   S.ms+=performance.now()-t0;S.decisions++;
   const raw=e.legalActions(s),i=o.actions.findIndex(x=>x.id===d.id);if(i<0||raw.length!==o.actions.length)throw Error('Invalid CPU decision');
   const act=raw[i],src=act.source?cid(s,act.source):null;hooks.onDecision?.(s,a,o,d,act);
   if(s.challenge&&!s.challenge.completed&&act.variant in STAT&&src){const c=S.statChoice[src]??={match:0,mismatch:0};c[STAT[act.variant]===s.challenge.parameter?'match':'mismatch']++;}
   if(act.kind==='place'&&act.trap){inc(S.traps.set,src);setRound[act.source]=s.round;}
   if(s.phase==='trigger'&&act.kind==='trigger'&&p.board.prepared.some(x=>x.id===act.source&&x.faceDown)){inc(S.traps.fired,src);S.traps.delay+=s.round-(setRound[act.source]??s.round);}
   if(s.phase==='normal'&&s.turn===a&&act.kind==='pass'&&p.board.prepared.length>=3&&p.hand.some(id=>RULES[cid(s,id)]?.mode==='trap'))S.traps.blockedFull++;
   if(['play','programPlay'].includes(act.kind)&&p.hand.includes(act.source)){inc(S.quick,src);if(s.round===10&&s.turn===a){S.r10.plays++;S.r10.spent+=act.cost??0;}}
   s=e.act(s,a,s.revision,act.id);step[a]++;advance();
  }
  R.status='completed';
 }catch(err){R.status='abnormal';R.error=String(err.message).slice(0,300);}
 for(const a of ['A','B']){for(const x of s.players[a].board.prepared)if(x.faceDown)inc(R.seat[a].traps.leftAtEnd,cid(s,x.id));R.seat[a].ms=Math.round(R.seat[a].ms);}
 for(const h of s.history.filter(h=>h.kind==='comparison')){const def=h.actor==='A'?'B':'A',C=R.seat;
  C[h.actor].challenge.declared++;C[def].challenge.defended++;
  if(h.winner===h.actor)C[h.actor].challenge.declaredWon++;else if(h.winner===def)C[def].challenge.defendedWon++;else{C[h.actor].challenge.declaredDraw++;C[def].challenge.defendedDraw++;}}
 R.round=s.round;R.result=s.result;R.growth={A:s.players.A.growth,B:s.players.B.growth};R.saveSha256=sha(e.save(s));
 return R;
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 const [manifestPath,armName,out,shard='0',shards='1']=process.argv.slice(2);
 if(!ARMS[armName])throw Error('unknown arm '+armName);
 const M=JSON.parse(readFileSync(manifestPath,'utf8')),arm=ARMS[armName];
 const done=new Set(existsSync(out)?readFileSync(out,'utf8').split('\n').filter(Boolean).map(l=>JSON.parse(l).match):[]);
 const mine=M.matches.filter(m=>!arm.pairs||arm.pairs.includes(m.pair)).filter((m,i)=>i%Number(shards)===Number(shard)&&!done.has(m.match));
 for(const m of mine){const R=play(M,m,armName);appendFileSync(out,JSON.stringify(R)+'\n');process.stderr.write(`${armName} ${R.match} ${R.status} ${R.result?.winner??'-'}${R.error?' '+R.error:''}\n`);}
}
