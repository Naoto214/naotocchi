// Instrumented CPU-vs-CPU replay for the time & reaction study (read-only).
// Same decision loop as ../../balance-verification-20261020/run.mjs (official engine, observeCpu, chooseCpuAction,
// advanceResponses). Instrumentation only READS states; every probe works on structuredClone copies, so the match
// itself is unchanged (checked against the stored saveSha256 of the deck-balance-20261025 X records).
// Does NOT import or touch the fixed-400 population, its seeds, manifests or evidence.
// Usage: node lib/run.mjs <manifest.json> <out.jsonl> [shard] [shards]
import {readFileSync,appendFileSync,existsSync} from 'node:fs';
import * as e from '../../engine.mjs';
import {observeCpu} from '../../cpu-observation.mjs';
import {chooseCpuAction,timeOpportunity,scoreCpuAction,legacySpend,PROFILES} from '../../cpu-policy.mjs';
import {RULES} from '../../rules.mjs';
import {advanceResponses} from '../../auto-progress.mjs';
import {timeOpportunityCF} from './counterfactual.mjs';
import {permutations,inputFor,apply,sha} from '../../balance-verification-20261020/lib.mjs';
const [manifestPath,out,shard='0',shards='1']=process.argv.slice(2);
const M=JSON.parse(readFileSync(manifestPath,'utf8')),G=Object.fromEntries(M.groups.map(g=>[g.group,g]));
const done=new Set(existsSync(out)?readFileSync(out,'utf8').split('\n').filter(Boolean).map(l=>JSON.parse(l).match):[]);
const STEP_LIMIT=6000,TURN_LIMIT=512,other=a=>a==='A'?'B':'A';
const cid=(s,id)=>s.cards[id]?.cardId;
const isQuick=c=>c&&c.method==='すぐつかう';
const isTrap=c=>c&&c.method==='しかける';
const PLAY=new Set(['play','programPlay']);
// Legal quick plays from hand for seat a in state s (s must have a as actor).
const quickSources=(s,raw)=>new Set(raw.filter(x=>PLAY.has(x.kind)&&s.players[e.actor(s)].hand.includes(x.source)).map(x=>x.source));
// Same state, own time raised to 10: what becomes legal only because of time.
function withTime(s,a){const w=structuredClone(s);w.players[a].time=10;return e.legalActions(w);}
// Classify every すぐつかう card in the actor's hand: legal now / blocked only by time / blocked by condition or timing.
function classifyQuick(s,a,raw){
 const p=s.players[a],legal=quickSources(s,raw),quick=p.hand.filter(id=>isQuick(e.CARDS[cid(s,id)]));
 if(!quick.length)return {legal:[],time:[],cond:[]};
 const rich=quick.some(id=>!legal.has(id))?quickSources(s,withTime(s,a)):legal;
 const out={legal:[],time:[],cond:[]};
 for(const id of quick)(legal.has(id)?out.legal:rich.has(id)?out.time:out.cond).push(cid(s,id));
 return out;
}
// Ranking exactly as chooseCpuAction (without the tie hash): used to read the score of every candidate.
function scores(o,diff){const prof=PROFILES[diff],timed=timeOpportunity(o,prof),idle=!prof.opponentTurn&&o.turn!==o.seat&&o.phase==='response';
 return o.actions.map((a,i)=>{let v=timed?timed[i]:scoreCpuAction(a,o,legacySpend,prof);if(idle&&a.kind!=='pass'&&!a.mandatory)v=Math.min(v,-1);if(prof.cap!==null&&v>0&&a.kind!=='choose')v=Math.min(v,prof.cap);return v;});}
const r2=x=>Math.round(x*100)/100;
function play(m){
 const g=G[m.group],perm=permutations(g.orderSeed),order={X:apply(M.decks[g.X].cards,perm.A),Y:apply(M.decks[g.Y].cards,perm.B)};
 const seatOrder={A:m.first==='X'?order.X:order.Y,B:m.first==='X'?order.Y:order.X};
 const decks={A:inputFor(seatOrder.A,perm.A),B:inputFor(seatOrder.B,perm.B)};
 const t0=performance.now();let s=e.createGame(g.orderSeed,decks);
 for(const a of ['A','B']){const got=[...s.players[a].hand,...s.players[a].deck].map(id=>cid(s,id));if(JSON.stringify(got)!==JSON.stringify(seatOrder[a]))throw Error('initial order mismatch '+a);}
 const R={match:m.match,group:m.group,first:m.first,deck:{A:m.deckA,B:m.deckB},difficulty:m.difficulty,policySeed:m.policySeed,orderSeed:g.orderSeed,status:'running',error:null,
  // windows: [seat, round, ctx(own|opp), auto(1 = auto-passed, no non-pass action), window, time, legalQuick[], timeShortQuick[], condQuick[],
  //           chosenKind, chosenCard, chosenScore, bestQuickScore, bestQuickCard, turnKey, preparedFull, challenge]
  windows:[],
  // turns: per own turn of a seat: {seat, round, start, ownSpent, end, oppSpent, lost, gain, endHand:{legalQuick,timeShort}, timeShortActions[]}
  turns:[],
  traps:[],cf:[],cfCheck:{ok:0,bad:0},slotBlocked:[],quickWhileFull:{A:0,B:0},decisions:{A:0,B:0},policyCheck:{ok:0,bad:0}};
 const turnRec={A:null,B:null};const trapMap=new Map();
 const openTurn=(st,a)=>{const t={seat:a,round:st.round,start:st.players[a].time,ownSpent:0,end:null,oppSpent:0,lost:null,gain:0,endHand:null,timeShortActions:[]};R.turns.push(t);turnRec[a]=t;};
 // Attribute time movement between two consecutive states to the current turn record of each seat.
 const observe=(prev,next)=>{
  for(const a of ['A','B']){
   const before=prev.players[a].time,after=next.players[a].time,switchedIn=next.turn===a&&prev.turn!==a;
   if(switchedIn){ // own turn began inside this transition: time was reset to the round value
    if(turnRec[a]){turnRec[a].lost=before;}openTurn(next,a);continue;}
   const t=turnRec[a];if(!t)continue;const d=after-before;
   if(d<0){if(next.turn===a&&prev.turn===a)t.ownSpent-=d;else t.oppSpent-=d;}else if(d>0)t.gain+=d;
   if(prev.turn===a&&next.turn!==a)t.end=after;
  }
  // Traps: track each set instance until it leaves the prepared zone.
  for(const a of ['A','B'])for(const ent of prev.players[a].board.prepared)if(ent.faceDown&&trapMap.has(ent.id)){const tr=trapMap.get(ent.id);if(tr.fate)continue;
   const still=next.players[a].board.prepared.some(x=>x.id===ent.id&&x.faceDown);
   if(!still){const inChain=next.chain.some(l=>l.source===ent.id)||next.history.slice(prev.history.length).some(h=>h.source===ent.id&&['activation','play','ability'].includes(h.kind));
    tr.fate=inChain?'activated':'removed';tr.leftRound=next.round;tr.leftCtx=next.turn===a?'own':'opp';}}
 };
 const step={A:0,B:0};let guard={turn:null,count:0,seen:{}};
 const advance=()=>{const r=advanceResponses(s,{onTransition:(prev,next)=>{
   // auto-passed window: the actor had only "pass"
   const a=e.actor(prev);if(prev.phase==='response'&&!prev.choice){const raw=e.legalActions(prev),q=classifyQuick(prev,a,raw);
    R.windows.push([a,prev.round,prev.turn===a?'own':'opp',1,prev.window,prev.players[a].time,q.legal,q.time,q.cond,'pass',null,0,null,null,`${prev.round}:${prev.turn}`,prev.players[a].board.prepared.length===3?1:0,prev.challenge?1:0]);}
   observe(prev,next);}});s=r.state;if(r.halted)throw Error('auto-advance halted: '+r.reason);};
 try{
  openTurn(s,s.turn);
  advance();
  for(let n=0;s.phase!=='finished';n++){
   if(n>=STEP_LIMIT)throw Error('step limit');
   const a=e.actor(s),o=observeCpu(s,a),raw=e.legalActions(s);
   const turn=`${o.round}:${o.turn}`;if(turn!==guard.turn)guard={turn,count:0,seen:{}};
   const key=JSON.stringify({...o,revision:0,actions:o.actions.map(({id,...x})=>x)});
   if(guard.count>=TURN_LIMIT||(guard.seen[key]??0)>=3)throw Error('CPU repetition limit');
   const d=chooseCpuAction(o,{difficulty:m.difficulty[a],seed:m.policySeed[a],step:step[a]}),i=o.actions.findIndex(x=>x.id===d.id);
   if(i<0||raw.length!==o.actions.length)throw Error('Invalid CPU decision');
   const act=raw[i],p=s.players[a],sc=scores(o,m.difficulty[a]);
   if(Math.abs(Math.max(...sc)-d.score)<1e-9&&Math.abs(sc[i]-d.score)<1e-9)R.policyCheck.ok++;else R.policyCheck.bad++;
   R.decisions[a]++;
   { // counterfactual: same-name copies do not count as a lost alternative (read-only, never played)
    const prof=PROFILES[m.difficulty[a]],off=timeOpportunityCF(o,prof),off2=timeOpportunity(o,prof);
    if(JSON.stringify(off)===JSON.stringify(off2))R.cfCheck.ok++;else R.cfCheck.bad++;
    if(off){const on=timeOpportunityCF(o,prof,{sameName:true});let k=0;on.forEach((v,j)=>{if(v>on[k])k=j;});
     const sig=x=>[x.kind,x.card?.cardId??null,x.slot,x.variant].join('|');
     if(on[k]>0&&sig(o.actions[k])!==sig(o.actions[i]))R.cf.push([a,s.round,s.turn===a?'own':'opp',s.phase,p.time,o.actions[i].kind,o.actions[i].card?.cardId??null,r2(sc[i]),o.actions[k].kind,o.actions[k].card?.cardId??null,o.actions[k].slot??o.actions[k].variant??null,r2(on[k]),r2(scoreCpuAction(o.actions[k],o,()=>0,prof))]);}
   }
   const src=act.source&&s.cards[act.source]?cid(s,act.source):null;
   if(s.phase==='response'&&!s.choice){
    const q=classifyQuick(s,a,raw);let bq=null,bqc=null;
    raw.forEach((x,j)=>{if(PLAY.has(x.kind)&&p.hand.includes(x.source)&&(bq===null||sc[j]>bq)){bq=sc[j];bqc=cid(s,x.source);}});
    R.windows.push([a,s.round,s.turn===a?'own':'opp',0,s.window,p.time,q.legal,q.time,q.cond,act.kind,src,r2(sc[i]),bq===null?null:r2(bq),bqc,turn,p.board.prepared.length===3?1:0,s.challenge?1:0]);
    if(p.board.prepared.length===3&&q.legal.length)R.quickWhileFull[a]++;
   }
   if(s.phase==='normal'&&s.turn===a){
    if(p.board.prepared.length===3){const q=classifyQuick(s,a,raw);if(q.legal.length)R.quickWhileFull[a]++;
     for(const id of p.hand){const c=e.CARDS[cid(s,id)];if((isTrap(c)||c.method==='みにつける')&&(c.cost??0)<=p.time)R.slotBlocked.push([a,s.round,c.id,c.method,p.time]);}}
    if(act.kind==='pass'&&turnRec[a]){ // own turn end requested: what stayed in hand, what only time prevented
     const q=classifyQuick(s,a,raw),rich=withTime(s,a),have=new Set(raw.map(x=>x.id));
     turnRec[a].endHand={time:p.time,legalQuick:q.legal,timeShortQuick:q.time,condQuick:q.cond};
     turnRec[a].timeShortActions=rich.filter(x=>!have.has(x.id)&&x.kind!=='pass').map(x=>[x.kind,x.source?cid(s,x.source):null,x.slot??x.variant??null,x.cost??null]);
     // own-turn candidates the CPU declined at the end (score <= 0)
     turnRec[a].declined=raw.map((x,j)=>[x,sc[j],j]).filter(([x])=>x.kind!=='pass').map(([x,v,j])=>[x.kind,x.source?cid(s,x.source):null,x.cost??0,r2(v),r2(scoreCpuAction(o.actions[j],o,()=>0,PROFILES[m.difficulty[a]])),x.slot??x.variant??null]);
    }
   }
   if(act.kind==='place'&&act.slot==='prepared'&&act.trap){const rec={seat:a,card:src,setRound:s.round,cost:act.cost,fate:null,leftRound:null,leftCtx:null};R.traps.push(rec);trapMap.set(act.source,rec);}
   if((act.kind==='trigger'||act.kind==='skip')&&trapMap.has(act.source)){const tr=trapMap.get(act.source);(tr.offers??=[]).push([s.round,s.turn===a?'own':'opp',act.kind]);}
   const prev=s;s=e.act(s,a,s.revision,act.id);step[a]++;guard.count++;guard.seen[key]=(guard.seen[key]??0)+1;
   observe(prev,s);
   advance();
  }
  R.status='completed';
 }catch(err){R.status='abnormal';R.error=String(err.message).slice(0,300);}
 for(const a of ['A','B'])if(turnRec[a]&&turnRec[a].lost===null)turnRec[a].finalLeft=s.players[a].time;
 for(const tr of R.traps)if(!tr.fate)tr.fate='faceDownAtEnd';
 R.elapsedMs=Math.round(performance.now()-t0);R.round=s.round;R.result=s.result;R.growth={A:s.players.A.growth,B:s.players.B.growth};
 R.challenges=s.history.filter(h=>h.kind==='comparison').map(h=>({round:h.round,actor:h.actor,parameter:h.parameter,winner:h.winner}));
 if(R.status==='completed')R.saveSha256=sha(e.save(s));
 return R;
}
const mine=M.matches.filter((m,i)=>i%Number(shards)===Number(shard)&&!done.has(m.match));
for(const m of mine){const r=play(m);appendFileSync(out,JSON.stringify(r)+'\n');process.stderr.write(`${r.match} ${r.status} ${r.result?.winner??'-'} R${r.round} ${r.elapsedMs}ms\n`);}
