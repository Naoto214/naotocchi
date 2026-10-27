// EXPERIMENT ONLY. Egg-wait study runner: the "study seat" uses a strategy filter in front of the official CPU,
// the other seat is the unchanged official CPU. Rule 'current' = official engine; rule 'egg00' = proposal B in the
// generated isolated copy (.variant-egg00/, see tools/make-variant.mjs).
// Usage: node run.mjs <manifest.json> <out.jsonl> [shard] [shards]
import {readFileSync,appendFileSync,existsSync} from 'node:fs';
import {chooseCpuAction} from '../cpu-policy.mjs';
import {permutations,inputFor,apply,sha} from '../balance-verification-20261020/lib.mjs';
import {STRATEGIES} from './strategies.mjs';
const [manifestPath,out,shard='0',shards='1']=process.argv.slice(2);
const M=JSON.parse(readFileSync(manifestPath,'utf8')),G=Object.fromEntries(M.groups.map(g=>[g.group,g]));
const RULESETS={current:{engine:'../engine.mjs',obs:'../cpu-observation.mjs',auto:'../auto-progress.mjs'},
 egg00:{engine:'./.variant-egg00/engine.mjs',obs:'./.variant-egg00/cpu-observation.mjs',auto:'./.variant-egg00/auto-progress.mjs'}};
const LIB={};for(const [k,v] of Object.entries(RULESETS))LIB[k]={e:await import(v.engine),observeCpu:(await import(v.obs)).observeCpu,advanceResponses:(await import(v.auto)).advanceResponses};
const done=new Set(existsSync(out)?readFileSync(out,'utf8').split('\n').filter(Boolean).map(l=>JSON.parse(l).match):[]);
const STEP_LIMIT=6000,TURN_LIMIT=512;
function play(m){
 const {e,observeCpu,advanceResponses}=LIB[m.rule],cid=(s,id)=>s.cards[id]?.cardId;
 const g=G[m.group],perm=permutations(g.orderSeed),order={X:apply(M.decks[g.X].cards,perm.A),Y:apply(M.decks[g.Y].cards,perm.B)};
 const seatOrder={A:m.first==='X'?order.X:order.Y,B:m.first==='X'?order.Y:order.X};
 const study=m.first==='X'?'A':'B',opp=study==='A'?'B':'A';
 let s=e.createGame(g.orderSeed,{A:inputFor(seatOrder.A,perm.A),B:inputFor(seatOrder.B,perm.B)});
 for(const a of ['A','B']){const got=[...s.players[a].hand,...s.players[a].deck].map(id=>cid(s,id));if(JSON.stringify(got)!==JSON.stringify(seatOrder[a]))throw Error('initial order mismatch '+a);}
 const openMains=seatOrder[study].slice(0,5).map(id=>e.CARDS[id]).filter(c=>c.type==='main');
 const R={match:m.match,group:m.group,rule:m.rule,strategy:m.strategy,deck:m.deck,study,first:m.first,status:'running',error:null,
  opening:{mains:openMains.length,minStage:openMains.length?Math.min(...openMains.map(c=>c.stage)):null},
  birth:{[study]:null,[opp]:null},moves:{A:[],B:[]},eggTurns:{A:0,B:0},growthByRound:{A:[],B:[]},handByTurn:{A:[],B:[]},
  timeLeft:{A:0,B:0},timeAvail:{A:0,B:0},mainAbility:{A:0,B:0},relationship:{A:{start:null,max:-1,marriedRound:null},B:{start:null,max:-1,marriedRound:null}},
  blockedChallenge:{A:0,B:0},eggChallenged:{A:0,B:0}};
 const step={A:0,B:0};let guard={turn:null,count:0,seen:{}},lastTurn=null;
 const advance=()=>{const r=advanceResponses(s);s=r.state;if(r.halted)throw Error('auto-advance halted: '+r.reason);};
 const turnMark=()=>{const k=`${s.round}:${s.turn}`;if(k===lastTurn||s.phase==='finished')return;lastTurn=k;const a=s.turn,p=s.players[a];
  if(!p.board.main)R.eggTurns[a]++;R.timeAvail[a]+=s.round;R.handByTurn[a].push(p.hand.length);
  // Opponent of an egg: it had a main and a challenge it could not declare because of the egg.
  const o=s.players[a==='A'?'B':'A'];if(p.board.main&&!o.board.main)R.blockedChallenge[a]++;};
 let round=1;
 try{
  advance();turnMark();
  for(let n=0;s.phase!=='finished';n++){
   if(n>=STEP_LIMIT)throw Error('step limit');
   const a=e.actor(s),o=observeCpu(s,a),raw=e.legalActions(s);
   const turn=`${o.round}:${o.turn}`;if(turn!==guard.turn)guard={turn,count:0,seen:{}};
   const key=JSON.stringify({...o,revision:0,actions:o.actions.map(({id,...x})=>x)});
   if(guard.count>=TURN_LIMIT||(guard.seen[key]??0)>=3)throw Error('CPU repetition limit');
   const view=a===study?{...o,actions:STRATEGIES[m.strategy].filter(o,o.actions)}:o;
   if(!view.actions.length)throw Error('strategy removed every candidate');
   const d=chooseCpuAction(view,{difficulty:'intermediate',seed:m.policySeed[a],step:step[a]}),i=o.actions.findIndex(x=>x.id===d.id);
   if(i<0||raw.length!==o.actions.length)throw Error('Invalid CPU decision');
   const act=raw[i],p=s.players[a];
   if(s.phase==='normal'&&act.kind==='pass')R.timeLeft[a]+=p.time;
   if(act.kind==='place'&&act.slot==='main'){const c=e.CARDS[cid(s,act.source)];const mv={round:s.round,variant:act.variant,stage:c.stage,cost:act.cost};R.moves[a].push(mv);if(act.variant==='birth'&&!R.birth[a])R.birth[a]=mv;}
   if(['programAbility','trigger'].includes(act.kind)&&act.source===p.board.main)R.mainAbility[a]++;
   if(act.kind==='challenge'&&!s.players[a==='A'?'B':'A'].board.main)R.eggChallenged[a==='A'?'B':'A']++;
   s=e.act(s,a,s.revision,act.id);step[a]++;guard.count++;guard.seen[key]=(guard.seen[key]??0)+1;
   for(const x of ['A','B']){const r=s.players[x].relationship,q=R.relationship[x];if(r!==null){if(q.start===null)q.start=s.round;q.max=Math.max(q.max,r);if(r===4&&q.marriedRound===null)q.marriedRound=s.round;}}
   advance();
   if(s.round!==round||s.phase==='finished'){for(const x of ['A','B'])R.growthByRound[x].push(s.players[x].growth);round=s.round;}
   turnMark();
  }
  R.status='completed';
 }catch(err){R.status='abnormal';R.error=String(err.message).slice(0,300);}
 R.round=s.round;R.result=s.result;R.growth={A:s.players.A.growth,B:s.players.B.growth};
 R.challenges=s.history.filter(h=>h.kind==='comparison').map(h=>({round:h.round,actor:h.actor,parameter:h.parameter,winner:h.winner,values:h.values,egg:Object.fromEntries(['A','B'].map(x=>[x,h.participants?.[x]==null]))}));
 R.growthEvents=s.history.filter(h=>h.kind==='growth').map(h=>({actor:h.actor,delta:h.delta,serial:h.serial}));
 if(R.status==='completed'){const saved=e.save(s);R.saveSha256=sha(saved);try{const back=e.restore(saved);R.replay=e.save(back)===saved&&JSON.stringify(back.result)===JSON.stringify(s.result)?'match':'mismatch';}catch(err){R.replay='error:'+err.message;}}
 const w=s.result?.winner;R.studyScore=s.result?(w===null?0.5:w===study?1:0):null;
 return R;
}
const mine=M.matches.filter((m,i)=>i%Number(shards)===Number(shard)&&!done.has(m.match));
for(const m of mine){const t0=performance.now();const r=play(m);r.elapsedMs=Math.round(performance.now()-t0);appendFileSync(out,JSON.stringify(r)+'\n');process.stderr.write(`${r.match} ${r.status} ${r.studyScore} R${r.round}\n`);}
