// Independent CPU-vs-CPU runner. Read-only use of the official engine, CPU observation/policy and auto-pass.
// Does NOT import or touch the fixed-400 Python population, its seeds, manifests or evidence.
// Usage: node run.mjs <manifest.json> <out.jsonl> [shard] [shards]
import {readFileSync,appendFileSync,existsSync,readFileSync as rf} from 'node:fs';
import * as e from '../engine.mjs';import {observeCpu} from '../cpu-observation.mjs';import {chooseCpuAction} from '../cpu-policy.mjs';
import {advanceResponses} from '../auto-progress.mjs';import {permutations,inputFor,apply,sha} from './lib.mjs';
const [manifestPath,out,shard='0',shards='1']=process.argv.slice(2);
const M=JSON.parse(readFileSync(manifestPath,'utf8')),G=Object.fromEntries(M.groups.map(g=>[g.group,g]));
const done=new Set(existsSync(out)?rf(out,'utf8').split('\n').filter(Boolean).map(l=>JSON.parse(l).match):[]);
const STEP_LIMIT=6000,TURN_LIMIT=512;
const cid=(s,id)=>s.cards[id]?.cardId;
function play(m){
 const g=G[m.group],perm=permutations(g.orderSeed),order={X:apply(M.decks[g.X].cards,perm.A),Y:apply(M.decks[g.Y].cards,perm.B)};
 const seatOrder={A:m.first==='X'?order.X:order.Y,B:m.first==='X'?order.Y:order.X};
 const decks={A:inputFor(seatOrder.A,perm.A),B:inputFor(seatOrder.B,perm.B)};
 const t0=performance.now();let s=e.createGame(g.orderSeed,decks);
 for(const a of ['A','B']){const got=[...s.players[a].hand,...s.players[a].deck].map(id=>cid(s,id));if(JSON.stringify(got)!==JSON.stringify(seatOrder[a]))throw Error('initial order mismatch '+a);}
 const R={match:m.match,group:m.group,first:m.first,deck:{A:m.deckA,B:m.deckB},difficulty:m.difficulty,policySeed:m.policySeed,orderSeed:g.orderSeed,
  initialOrderSha:{A:sha(seatOrder.A),B:sha(seatOrder.B)},status:'running',error:null,
  decisions:{A:0,B:0},autoPass:0,kinds:{A:{},B:{}},responseDecisions:{A:0,B:0},responsesUsed:{A:0,B:0},maxChain:0,chainLinks:0,
  noActionTurns:{A:0,B:0},turns:{A:0,B:0},timeLeft:{A:0,B:0},unaffordable:{A:0,B:0},growthByRound:{A:[],B:[]},reached100:{A:false,B:false},cards:{A:{},B:{}}};
 const C=(a,id)=>R.cards[a][id]??={deck:0,drawn:0,played:0,activated:0,handEnd:0};
 for(const a of ['A','B'])for(const id of seatOrder[a])C(a,id).deck++;
 const seen=new Set();const markHands=()=>{for(const a of ['A','B'])for(const id of s.players[a].hand)if(!seen.has(id)){seen.add(id);C(a,cid(s,id)).drawn++;}};
 const step={A:0,B:0};let guard={turn:null,count:0,seen:{}},turnFirst=null,lastRound=1;
 const advance=()=>{const r=advanceResponses(s);R.autoPass+=r.steps.length;s=r.state;if(r.halted)throw Error('auto-advance halted: '+r.reason);};
 const roundMark=()=>{for(const a of ['A','B']){if(s.players[a].growth>=100)R.reached100[a]=true;}if(s.round!==lastRound||s.phase==='finished'){for(const a of ['A','B'])R.growthByRound[a].push(s.players[a].growth);lastRound=s.round;}};
 try{
  advance();markHands();
  for(let n=0;s.phase!=='finished';n++){
   if(n>=STEP_LIMIT)throw Error('step limit');
   const a=e.actor(s),o=observeCpu(s,a),raw=e.legalActions(s);
   const turn=`${o.round}:${o.turn}`;if(turn!==guard.turn)guard={turn,count:0,seen:{}};
   const key=JSON.stringify({...o,revision:0,actions:o.actions.map(({id,...x})=>x)});
   if(guard.count>=TURN_LIMIT||(guard.seen[key]??0)>=3)throw Error('CPU repetition limit');
   const d=chooseCpuAction(o,{difficulty:m.difficulty[a],seed:m.policySeed[a],step:step[a]}),i=o.actions.findIndex(x=>x.id===d.id);
   if(i<0||raw.length!==o.actions.length)throw Error('Invalid CPU decision');
   const act=raw[i],p=s.players[a];
   R.decisions[a]++;R.kinds[a][act.kind]=(R.kinds[a][act.kind]??0)+1;
   if(s.phase==='normal'&&s.turn===a&&turnFirst!==turn){turnFirst=turn;R.turns[a]++;if(raw.every(x=>x.kind==='pass'))R.noActionTurns[a]++;}
   if(s.phase==='normal'&&act.kind==='pass'){R.timeLeft[a]+=p.time;R.unaffordable[a]+=p.hand.filter(id=>{const c=e.CARDS[cid(s,id)];const cost=c.type==='main'?e.mainCost(p.board.main?cid(s,p.board.main):null,c.id):c.cost;return cost!=null&&cost>p.time;}).length;}
   if(s.phase==='response'&&!s.choice){R.responseDecisions[a]++;if(act.kind!=='pass')R.responsesUsed[a]++;}
   const src=act.source&&s.cards[act.source]?cid(s,act.source):null;
   if(src&&['place','play','programPlay'].includes(act.kind)&&p.hand.includes(act.source))C(a,src).played++;
   if(src&&['ability','programAbility','trigger','play','programPlay'].includes(act.kind))C(a,src).activated++;
   s=e.act(s,a,s.revision,act.id);step[a]++;guard.count++;guard.seen[key]=(guard.seen[key]??0)+1;
   R.maxChain=Math.max(R.maxChain,s.chain.length);if(s.chain.length>=2&&act.kind!=='pass')R.chainLinks++;
   advance();markHands();roundMark();
  }
  R.status='completed';
 }catch(err){R.status='abnormal';R.error=String(err.message).slice(0,300);}
 R.elapsedMs=Math.round(performance.now()-t0);
 for(const a of ['A','B']){for(const id of s.players[a].hand)C(a,cid(s,id)).handEnd++;}
 R.round=s.round;R.result=s.result;R.revision=s.revision;R.growth={A:s.players.A.growth,B:s.players.B.growth};
 R.challenges=s.history.filter(h=>h.kind==='comparison').map(h=>({round:h.round,actor:h.actor,parameter:h.parameter,winner:h.winner,values:h.values}));
 if(R.status==='completed'){
  const saved=e.save(s);R.saveSha256=sha(saved);
  try{const back=e.restore(saved);R.replay=JSON.stringify(back.result)===JSON.stringify(s.result)&&e.save(back)===saved&&JSON.stringify(back.players)===JSON.stringify(s.players)?'match':'mismatch';}catch(err){R.replay='error:'+err.message;}
 }
 R.winnerDeck=s.result?.winner?R.deck[s.result.winner]:null;
 return R;
}
const mine=M.matches.filter((m,i)=>i%Number(shards)===Number(shard)&&!done.has(m.match));
for(const m of mine){const r=play(m);appendFileSync(out,JSON.stringify(r)+'\n');process.stderr.write(`${r.match} ${r.status} ${r.result?.winner??'-'} R${r.round} ${r.elapsedMs}ms\n`);}
