// Instrumented, read-only CPU-vs-CPU runner for the time / reaction audit (2026-10-30).
// Uses the official engine, CPU observation, CPU policy and auto-pass exactly as the earlier runner
// (../../balance-verification-20261020/run.mjs). Nothing official is modified; the only extra work is
// observation on throw-away clones (a "what if time were 99" legalActions call to tell time shortage from
// unmet conditions). Does not touch the fixed-400 population, its seeds or evidence.
// Usage: node tools/audit-run.mjs <manifest.json> <out.jsonl> [shard] [shards]
import {readFileSync,appendFileSync,existsSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import * as e from '../../engine.mjs';
import {RULES} from '../../rules.mjs';
import {observeCpu} from '../../cpu-observation.mjs';
import {chooseCpuAction,scoreCpuAction,timeOpportunity,legacySpend,PROFILES} from '../../cpu-policy.mjs';
import {advanceResponses} from '../../auto-progress.mjs';
import {permutations,inputFor,apply,sha} from '../../balance-verification-20261020/lib.mjs';
const STEP_LIMIT=6000,TURN_LIMIT=512,SAMPLE_LIMIT=6;
const cid=(s,id)=>s.cards[id]?.cardId,other=a=>a==='A'?'B':'A';
const method=id=>e.CARDS[id]?.method??null;
const PLAY_KINDS=new Set(['play','programPlay']);
// Hand cards that the actor could play "すぐつかう" from the given legal list.
const quickSources=(s,a,acts)=>new Set(acts.filter(x=>PLAY_KINDS.has(x.kind)&&s.players[a].hand.includes(x.source)).map(x=>x.source));
// Same state with the actor's time raised to 99, on a clone only: what becomes legal is time-limited, not condition-limited.
function hypothetical(s,a){const c=structuredClone(s);c.players[a].time=99;try{return e.legalActions(c);}catch{return [];}}
// Classifies the hand's すぐつかう cards in this window: usable / time short / condition not met.
function classify(s,a,real){
 const p=s.players[a],hyp=hypothetical(s,a),ok=quickSources(s,a,real),hq=quickSources(s,a,hyp);
 const hand=p.hand.filter(id=>method(cid(s,id))==='すぐつかう');
 const usable=hand.filter(id=>ok.has(id)),short=hand.filter(id=>!ok.has(id)&&hq.has(id)),cond=hand.filter(id=>!ok.has(id)&&!hq.has(id));
 const abilities=real.filter(x=>x.kind==='programAbility'||x.kind==='ability').length;
 const nonPassShort=new Set(hyp.filter(x=>x.kind!=='pass'&&x.kind!=='choose'&&x.source).map(x=>x.source));
 for(const x of real)nonPassShort.delete(x.source);
 return {hand:hand.length,usable,short,cond,abilities,shortAny:[...nonPassShort]};
}
// Raw evaluation of each candidate under the actor's profile (before the beginner opponent-turn mask and cap).
function scores(o,diff){const prof=PROFILES[diff],t=timeOpportunity(o,prof);return o.actions.map((a,i)=>t?t[i]:scoreCpuAction(a,o,legacySpend,prof));}
export function play(M,m,hooks={}){
 const G=Object.fromEntries(M.groups.map(g=>[g.group,g])),g=G[m.group],perm=permutations(g.orderSeed);
 const order={X:apply(M.decks[g.X].cards,perm.A),Y:apply(M.decks[g.Y].cards,perm.B)};
 const seatOrder={A:m.first==='X'?order.X:order.Y,B:m.first==='X'?order.Y:order.X};
 const decks={A:inputFor(seatOrder.A,perm.A),B:inputFor(seatOrder.B,perm.B)};
 const t0=performance.now();let s=e.createGame(g.orderSeed,decks);
 for(const a of ['A','B']){const got=[...s.players[a].hand,...s.players[a].deck].map(id=>cid(s,id));if(JSON.stringify(got)!==JSON.stringify(seatOrder[a]))throw Error('initial order mismatch '+a);}
 const blankSeat=()=>({
  // opponent-turn response windows (priority given to this seat while the other seat owns the turn)
  opp:{windows:0,auto:0,decided:0,withUsable:0,used:0,declined:0,timeShortOnly:0,condOnly:0,noQuickInHand:0,challengeWindows:0,challengeUsed:0,usedCards:{},declinedCards:{},timeShortCards:{},usedCost:0,usedAbility:0,usedQuick:0},
  own:{windows:0,decided:0,withUsable:0,used:0,usedCards:{}},
  turns:[], // per own turn: {round,start,spentOwn,end,endUsable,endScoreMax,spentOpp,lost,gain,shortAtEnd}
  traps:{set:{},fired:{},skipped:{},leftAtEnd:{},blockedFull:0,heldPlaceable:0,setTurns:0},
  quickWhileFull:0,quickPlays:{own:0,opp:0},equips:0,declineSamples:[],shortSamples:[],endSamples:[]});
 const R={match:m.match,group:m.group,pair:m.pair,first:m.first,deck:{A:m.deckA,B:m.deckB},difficulty:m.difficulty,orderSeed:g.orderSeed,
  initialOrderSha:{A:sha(seatOrder.A),B:sha(seatOrder.B)},status:'running',error:null,seat:{A:blankSeat(),B:blankSeat()}};
 const inc=(o,k,n=1)=>{o[k]=(o[k]??0)+n;};
 const cur={A:null,B:null}; // current own-turn record per seat
 let lastTime={A:s.players.A.time,B:s.players.B.time},lastTurn=null,lastRound=null;
 // Time bookkeeping after every accepted transition (CPU or auto-pass).
 function account(prev,next){
  const turnChanged=next.turn!==prev.turn||next.round!==prev.round;
  for(const a of ['A','B']){const before=prev.players[a].time,after=next.players[a].time;
   if(turnChanged&&next.turn===a){
    // ending seat (other) closes its own-turn end value at the moment the turn passed
    const rec={round:next.round,start:after,spentOwn:0,end:null,endUsable:0,endScoreMax:null,spentOpp:0,lost:null,gain:0,shortAtEnd:0};
    const last=R.seat[a].turns.at(-1);if(last)last.lost=before; // time left when this seat's own next turn resets it
    R.seat[a].turns.push(rec);cur[a]=rec;continue;}
   const d=after-before;if(!cur[a]||!d)continue;
   if(d<0){if(prev.turn===a)cur[a].spentOwn-=d;else cur[a].spentOpp-=d;}else cur[a].gain+=d;
  }
  if(turnChanged){const ended=prev.turn;if(cur[ended]&&cur[ended].end===null)cur[ended].end=prev.players[ended].time;}
 }
 function window(prev,a,real,decision,chosen,o){
  // decision === null: auto-passed (only "pass" was legal)
  const S=R.seat[a],own=prev.turn===a,k=classify(prev,a,real),W=own?S.own:S.opp;
  W.windows++;if(decision)W.decided++;
  const T=!own?cur[a]:null; // opponent-turn windows belong to this seat's latest own turn (whose leftover time is at stake)
  if(T){T.oppWindows=(T.oppWindows??0)+1;if(k.usable.length)T.oppUsable=(T.oppUsable??0)+1;if(k.short.length)T.oppShort=(T.oppShort??0)+1;if(chosen&&chosen.kind!=='pass')T.oppUsed=(T.oppUsed??0)+1;}
  if(!own){if(!decision)S.opp.auto++;if(prev.challenge&&!prev.challenge.completed)S.opp.challengeWindows++;
   if(!k.hand)S.opp.noQuickInHand++;else if(!k.usable.length){if(k.short.length)S.opp.timeShortOnly++;else S.opp.condOnly++;}
   for(const id of k.short)inc(S.opp.timeShortCards,cid(prev,id));
   if(k.short.length&&S.shortSamples.length<SAMPLE_LIMIT)S.shortSamples.push({rev:prev.revision,round:prev.round,time:prev.players[a].time,ownEnd:cur[a]?.end??null,cards:k.short.map(id=>cid(prev,id)),challenge:Boolean(prev.challenge)});}
  if(k.usable.length){W.withUsable++;
   const used=chosen&&chosen.kind!=='pass';
   if(used){W.used++;const src=cid(prev,chosen.source);inc(W.usedCards,src??chosen.kind);
    if(!own){if(prev.challenge&&!prev.challenge.completed)S.opp.challengeUsed++;S.opp.usedCost+=chosen.cost??0;if(PLAY_KINDS.has(chosen.kind))S.opp.usedQuick++;else S.opp.usedAbility++;}}
   else if(!own){S.opp.declined++;for(const id of k.usable)inc(S.opp.declinedCards,cid(prev,id));
    if(S.declineSamples.length<SAMPLE_LIMIT&&o){const sc=scores(o,R.difficulty[a]);const best=o.actions.map((x,i)=>({x,i,s:sc[i]})).filter(z=>z.x.kind!=='pass').sort((p,q)=>q.s-p.s)[0];
     S.declineSamples.push({rev:prev.revision,round:prev.round,time:prev.players[a].time,growth:{me:prev.players[a].growth,op:prev.players[other(a)].growth},usable:k.usable.map(id=>cid(prev,id)),chain:prev.chain.map(l=>cid(prev,l.source)),challenge:Boolean(prev.challenge),best:best?{kind:best.x.kind,card:best.x.card?.cardId??null,cost:best.x.cost,score:Math.round(best.s*100)/100}:null});}}
  }else if(chosen&&chosen.kind!=='pass'){W.used++;inc(W.usedCards,cid(prev,chosen.source)??chosen.kind);if(!own){S.opp.usedCost+=chosen.cost??0;if(PLAY_KINDS.has(chosen.kind))S.opp.usedQuick++;else S.opp.usedAbility++;}}
 }
 const step={A:0,B:0};let guard={turn:null,count:0,seen:{}};
 const advance=()=>{const r=advanceResponses(s,{onTransition:(prev,next)=>{const a=e.actor(prev);if(prev.phase==='response'&&!prev.choice){window(prev,a,e.legalActions(prev),null,{kind:'pass'},null);if(hooks.onDecision){const o=observeCpu(prev,a);hooks.onDecision(prev,a,o,{id:o.actions[0].id,auto:true},e.legalActions(prev)[0]);}}account(prev,next);}});s=r.state;if(r.halted)throw Error('auto-advance halted: '+r.reason);};
 try{
  // createGame already ran the first beginTurn: open A's first own-turn record.
  for(const a of ['A','B'])if(s.turn===a){cur[a]={round:s.round,start:s.players[a].time,spentOwn:0,end:null,endUsable:0,endScoreMax:null,spentOpp:0,lost:null,gain:0,shortAtEnd:0};R.seat[a].turns.push(cur[a]);}
  advance();
  for(let n=0;s.phase!=='finished';n++){
   if(n>=STEP_LIMIT)throw Error('step limit');
   const a=e.actor(s),o=observeCpu(s,a),raw=e.legalActions(s),S=R.seat[a],p=s.players[a];
   const turn=`${o.round}:${o.turn}`;if(turn!==guard.turn)guard={turn,count:0,seen:{}};
   const key=JSON.stringify({...o,revision:0,actions:o.actions.map(({id,...x})=>x)});
   if(guard.count>=TURN_LIMIT||(guard.seen[key]??0)>=3)throw Error('CPU repetition limit');
   const d=chooseCpuAction(o,{difficulty:m.difficulty[a],seed:m.policySeed[a],step:step[a]}),i=o.actions.findIndex(x=>x.id===d.id);
   if(i<0||raw.length!==o.actions.length)throw Error('Invalid CPU decision');
   const act=raw[i],src=act.source?cid(s,act.source):null;
   hooks.onDecision?.(s,a,o,d,act);
   if(s.phase==='response'&&!s.choice)window(s,a,raw,d,act,o);
   // own normal phase: turn-end request and the hand situation at that moment
   if(s.phase==='normal'&&s.turn===a&&act.kind==='pass'&&cur[a]){
    const k=classify(s,a,raw),sc=scores(o,m.difficulty[a]),nonPass=o.actions.map((x,j)=>({x,s:sc[j]})).filter(z=>z.x.kind!=='pass');
    cur[a].endUsable=k.usable.length;cur[a].endScoreMax=nonPass.length?Math.round(Math.max(...nonPass.map(z=>z.s))*100)/100:null;cur[a].shortAtEnd=k.shortAny.length;
    const traps=p.hand.filter(id=>RULES[cid(s,id)]?.mode==='trap');
    if(traps.length){if(p.board.prepared.length>=3)S.traps.blockedFull++;else if(raw.some(x=>x.kind==='place'&&x.trap))S.traps.heldPlaceable++;}
    if(p.time>0&&S.endSamples.length<SAMPLE_LIMIT)S.endSamples.push({rev:s.revision,round:s.round,time:p.time,usable:k.usable.map(id=>cid(s,id)),short:k.shortAny.map(id=>cid(s,id)),best:nonPass.sort((x,y)=>y.s-x.s).slice(0,2).map(z=>({kind:z.x.kind,card:z.x.card?.cardId??null,cost:z.x.cost,score:Math.round(z.s*100)/100}))});
   }
   if(act.kind==='place'&&act.trap){inc(S.traps.set,src);}
   if(act.kind==='place'&&act.slot==='prepared'&&!act.trap)S.equips++;
   if(PLAY_KINDS.has(act.kind)&&p.hand.includes(act.source)){if(p.board.prepared.length>=3)S.quickWhileFull++;S.quickPlays[s.turn===a?'own':'opp']++;}
   if(s.phase==='trigger'&&(act.kind==='trigger'||act.kind==='skip')&&p.board.prepared.some(x=>x.id===act.source&&x.faceDown))inc(act.kind==='trigger'?S.traps.fired:S.traps.skipped,src);
   const prev=s;s=e.act(s,a,s.revision,act.id);step[a]++;guard.count++;guard.seen[key]=(guard.seen[key]??0)+1;
   account(prev,s);
   if(hooks.stopAt&&hooks.stopAt(s))return {R,state:s};
   advance();
  }
  R.status='completed';
 }catch(err){R.status='abnormal';R.error=String(err.message).slice(0,300);}
 for(const a of ['A','B']){const S=R.seat[a],last=S.turns.at(-1);if(last){if(last.end===null)last.end=s.players[a].time;if(last.lost===null)last.finalLeft=s.players[a].time;}
  for(const x of s.players[a].board.prepared)if(x.faceDown)inc(S.traps.leftAtEnd,cid(s,x.id));}
 R.elapsedMs=Math.round(performance.now()-t0);R.round=s.round;R.result=s.result;R.revision=s.revision;R.growth={A:s.players.A.growth,B:s.players.B.growth};
 R.saveSha256=sha(e.save(s));
 return {R,state:s};
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 const [manifestPath,out,shard='0',shards='1']=process.argv.slice(2);
 const M=JSON.parse(readFileSync(manifestPath,'utf8'));
 const done=new Set(existsSync(out)?readFileSync(out,'utf8').split('\n').filter(Boolean).map(l=>JSON.parse(l).match):[]);
 const mine=M.matches.filter((m,i)=>i%Number(shards)===Number(shard)&&!done.has(m.match));
 for(const m of mine){const {R}=play(M,m);appendFileSync(out,JSON.stringify(R)+'\n');process.stderr.write(`${R.match} ${R.status} ${R.result?.winner??'-'} R${R.round} ${R.elapsedMs}ms${R.error?' '+R.error:''}\n`);}
}
