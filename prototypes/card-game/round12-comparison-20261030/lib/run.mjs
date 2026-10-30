// Isolated CPU-vs-CPU runner for the 10-round / 12-round comparison (structure from ../../breakup-penalty-20261029/lib/run.mjs).
// Every match loads engine, CPU observation/policy and auto-pass from build/<variant>/ (copies made by build-variants.mjs).
// The official modules are never imported for play. The CPU is never overridden: every decision is chooseCpuAction.
// Usage: node lib/run.mjs <manifest.json> <out.jsonl> [shard] [shards]
import {readFileSync,appendFileSync,existsSync} from 'node:fs';
import {dirname,join} from 'node:path';import {fileURLToPath,pathToFileURL} from 'node:url';
import {permutations,inputFor,apply,sha} from '../../balance-verification-20261020/lib.mjs';
const HERE=dirname(fileURLToPath(import.meta.url)),BUILD=join(HERE,'..','build');
const [manifestPath,out,shard='0',shards='1']=process.argv.slice(2);
const M=JSON.parse(readFileSync(manifestPath,'utf8')),G=Object.fromEntries(M.groups.map(g=>[g.group,g]));
const done=new Set(existsSync(out)?readFileSync(out,'utf8').split('\n').filter(Boolean).map(l=>JSON.parse(l).match):[]);
const MODS={};
// 'OFFICIAL' loads the unmodified official modules (read-only) for the R10 equivalence check only.
async function mods(v){if(MODS[v])return MODS[v];const u=f=>pathToFileURL(v==='OFFICIAL'?join(HERE,'..','..',f):join(BUILD,v,f)).href;
 const [e,o,p,ap,cat,rules]=await Promise.all([import(u('engine.mjs')),import(u('cpu-observation.mjs')),import(u('cpu-policy.mjs')),import(u('auto-progress.mjs')),import(u('full-catalog.mjs')),import(u('rules.mjs'))]);
 return MODS[v]={e,observeCpu:o.observeCpu,chooseCpuAction:p.chooseCpuAction,policy:p.POLICY_VERSION,advanceResponses:ap.advanceResponses,CATALOG:cat.CATALOG,RULES:rules.RULES};}
const STEP_LIMIT=8000,TURN_LIMIT=512;
const other=a=>a==='A'?'B':'A';
// Round-dependent cards whose text names a fixed round (kept literally in R12; usage is recorded).
const ROUND_CARDS=['E-final-time','E-midlife-50th','I-naoto_charm'];
async function play(m){
 const {e,observeCpu,chooseCpuAction,policy,advanceResponses,CATALOG,RULES}=await mods(m.variant);
 const FINAL=['R10','OFFICIAL'].includes(m.variant)?10:12;
 const g=G[m.group],perm=permutations(g.orderSeed),order={X:apply(M.decks[g.X].cards,perm.A),Y:apply(M.decks[g.Y].cards,perm.B)};
 const seatOrder={A:m.first==='X'?order.X:order.Y,B:m.first==='X'?order.Y:order.X};
 const decks={A:inputFor(seatOrder.A,perm.A),B:inputFor(seatOrder.B,perm.B)};
 const t0=performance.now();let s=e.createGame(g.orderSeed,decks);
 const cid=id=>s.cards[id]?.cardId,C=id=>CATALOG[cid(id)];
 for(const a of ['A','B']){const got=[...s.players[a].hand,...s.players[a].deck].map(cid);if(JSON.stringify(got)!==JSON.stringify(seatOrder[a]))throw Error('initial order mismatch '+a);}
 const log=[];globalThis.__rLog=x=>log.push(x);
 const R1=FINAL+1,arr=()=>Array(R1+1).fill(0);
 const seat=()=>({decisions:arr(),nonPass:arr(),granted:arr(),expired:arr(),spentOwn:arr(),spentOpp:arr(),payEvents:arr(),growthEnd:arr(),stageEnd:arr(),handStart:arr(),deckStart:arr(),
  turns:[],births:[],timeSkips:arr(),transforms:arr(),challenges:arr(),partnerPlace:[],relAdvance:arr(),leaves:[],marriage:null,maxRel:null,
  trapSet:arr(),trapFire:arr(),companionAbil:arr(),partnerAbil:arr(),companionPlace:arr(),worldPlace:arr(),actionPlays:arr(),roundCards:{},reached8:null,maxStage:0,
  actsAfter8:0,turnsAfter8:0,passOnlyTurnsAfter8:0,result:null,firstSeat:false,deck:null});
 const R={match:m.match,group:m.group,variant:m.variant,final:FINAL,first:m.first,xSeat:m.xSeat,deck:{A:m.deckA,B:m.deckB},difficulty:m.difficulty,policy,policySeed:m.policySeed,orderSeed:g.orderSeed,
  initialOrderSha:{A:sha(seatOrder.A),B:sha(seatOrder.B)},status:'running',error:null,autoPass:0,seat:{A:seat(),B:seat()},leadByRound:[]};
 R.seat.A.firstSeat=true;R.seat.A.deck=m.deckA;R.seat.B.deck=m.deckB;
 const step={A:0,B:0};let guard={turn:null,count:0,seen:{}},cur=null;
 const stage=a=>{const b=s.players[a].board.main;return b?C(b).stage??0:0;};
 const snapRound=(r,last=false)=>{for(const a of ['A','B']){if(last)R.seat[a].growthEnd[r]=s.players[a].growth;R.seat[a].stageEnd[r]=stage(a);}};
 let lastRound=1;
 const flush=()=>{for(const l of log.splice(0)){const x=R.seat[l.actor];
   if(l.kind==='reset'){if(l.actor==='A'&&l.round>1)for(const b of ['A','B'])R.seat[b].growthEnd[l.round-1]=l.growth[b];/* end of the previous round, before any start-of-turn effect */x.expired[l.round-1]+=l.expired;/* time left from the seat's previous own turn (round-1); index 0 = before the first turn */x.granted[l.round]+=l.granted;}
   else if(l.kind==='leave')x.leaves.push({stage:l.stage,round:l.round,byOpponent:!!l.effectActor&&l.effectActor!==l.actor,cause:l.cause});}};
 const advance=()=>{const r=advanceResponses(s);R.autoPass+=r.steps.length;s=r.state;if(r.halted)throw Error('auto-advance halted: '+r.reason);};
 const closeTurn=()=>{if(!cur)return;const x=R.seat[cur.a];cur.growthDelta=s.players[cur.a].growth-cur.g0;cur.oppDelta=s.players[other(cur.a)].growth-cur.o0;
   if(cur.after8){x.turnsAfter8++;if(!cur.nonPass)x.passOnlyTurnsAfter8++;}delete cur.g0;delete cur.o0;delete cur.a;x.turns.push(cur);cur=null;};
 try{
  advance();flush();
  for(let n=0;s.phase!=='finished';n++){
   if(n>=STEP_LIMIT)throw Error('step limit');
   if(s.round!==lastRound){snapRound(lastRound);lastRound=s.round;}
   const a=e.actor(s),o=observeCpu(s,a),raw=e.legalActions(s);
   if(raw.length!==o.actions.length)throw Error('observation mismatch');
   const turn=`${o.round}:${o.turn}`;if(turn!==guard.turn)guard={turn,count:0,seen:{}};
   const key=JSON.stringify({...o,revision:0,actions:o.actions.map(({id,...x})=>x)});
   if(guard.count>=TURN_LIMIT||(guard.seen[key]??0)>=3)throw Error('CPU repetition limit');
   const d=chooseCpuAction(o,{difficulty:m.difficulty[a],seed:m.policySeed[a],step:step[a]});const i=o.actions.findIndex(x=>x.id===d.id);
   if(i<0)throw Error('Invalid decision');
   const act=raw[i],p=s.players[a],x=R.seat[a],r=s.round;
   const own=s.phase==='normal'&&s.turn===a;
   if(own&&(!cur||cur.key!==turn)){closeTurn();const nonPassOpts=raw.filter(q=>q.kind!=='pass').length;
    cur={key:turn,a,round:r,options:nonPassOpts,nonPass:0,decisions:0,hand:p.hand.length,deck:p.deck.length,time:p.time,stage:stage(a),after8:stage(a)===8,g0:p.growth,o0:s.players[other(a)].growth};
    x.handStart[r]=p.hand.length;x.deckStart[r]=p.deck.length;}
   x.decisions[r]++;if(act.kind!=='pass'&&act.kind!=='skip'){x.nonPass[r]++;if(own&&cur){cur.nonPass++;}if(stage(a)===8)x.actsAfter8++;}
   if(own&&cur)cur.decisions++;
   const src=act.source&&s.cards[act.source]?act.source:null,c=src?C(src):null,cardId=src?cid(src):null;
   if(act.kind==='place'&&act.slot==='main'){const v=act.variant;if(v==='birth')x.births.push(r);else if(v==='time_skip')x.timeSkips[r]++;else x.transforms[r]++;}
   if(act.kind==='challenge')x.challenges[r]++;
   if(act.kind==='place'&&act.slot==='partner')x.partnerPlace.push(r);
   if(act.kind==='place'&&act.slot==='companions')x.companionPlace[r]++;
   if(act.kind==='place'&&act.slot==='world')x.worldPlace[r]++;
   if(act.kind==='relationship')x.relAdvance[r]++;
   if(act.kind==='place'&&act.slot==='prepared'&&act.trap)x.trapSet[r]++;
   const wasFaceDown=src&&p.board.prepared.some(q=>q.id===src&&q.faceDown);
   if(act.kind==='trigger'&&wasFaceDown)x.trapFire[r]++;
   if(['trigger','programAbility','ability'].includes(act.kind)&&c&&!wasFaceDown){if(c.type==='companion')x.companionAbil[r]++;if(c.type==='partner')x.partnerAbil[r]++;}
   if(['play','programPlay'].includes(act.kind)&&src&&p.hand.includes(src))x.actionPlays[r]++;
   if(cardId&&ROUND_CARDS.includes(cardId)&&(['play','programPlay'].includes(act.kind)||(act.kind==='place'&&act.slot==='prepared'))){(x.roundCards[cardId]??=[]).push(r);}
   const tA=s.players.A.time,tB=s.players.B.time,before={A:tA,B:tB},rev=s.round,trn=s.turn;
   s=e.act(s,a,s.revision,act.id);step[a]++;guard.count++;guard.seen[key]=(guard.seen[key]??0)+1;
   advance();
   // Time spent: decrease of a seat's time inside this step when no reset of that seat happened.
   const resets=new Set(log.filter(l=>l.kind==='reset').map(l=>l.actor));
   for(const b of ['A','B'])if(!resets.has(b)){const dt=before[b]-s.players[b].time;if(dt>0){R.seat[b].payEvents[rev]++;if(trn===b)R.seat[b].spentOwn[rev]+=dt;else R.seat[b].spentOpp[rev]+=dt;}}
   flush();
   for(const b of ['A','B']){const st=stage(b);if(st>R.seat[b].maxStage)R.seat[b].maxStage=st;if(st===8&&R.seat[b].reached8===null)R.seat[b].reached8=s.round;
    const rel=s.players[b].relationship;if(rel!==null&&(R.seat[b].maxRel===null||rel>R.seat[b].maxRel))R.seat[b].maxRel=rel;
    if(rel===4&&!R.seat[b].marriage)R.seat[b].marriage=s.round;}
  }
  R.status='completed';
 }catch(err){R.status='abnormal';R.error=String(err.message).slice(0,300);}
 closeTurn();flush();snapRound(s.round,true);
 // Time left when the game ends is also unused.
 for(const a of ['A','B'])R.seat[a].expiredAtEnd=s.players[a].time;
 R.elapsedMs=Math.round(performance.now()-t0);R.round=s.round;R.result=s.result;R.revision=s.revision;
 for(const a of ['A','B']){const x=R.seat[a],p=s.players[a];x.growth=p.growth;x.result=s.result?.winner===a?'win':!s.result?.winner?'draw':'loss';x.handEnd=p.hand.length;x.deckEnd=p.deck.length;
  x.relEnd=p.board.partner?p.relationship:null;x.stageEnd=x.stageEnd;}
 if(R.status==='completed'){const saved=e.save(s);R.saveSha256=sha(saved);
  try{const back=e.restore(saved);R.replay=JSON.stringify(back.result)===JSON.stringify(s.result)&&e.save(back)===saved?'match':'mismatch';}catch(err){R.replay='error:'+err.message;}}
 delete globalThis.__rLog;return R;
}
const mine=M.matches.filter((m,i)=>i%Number(shards)===Number(shard)&&!done.has(m.match));
for(const m of mine){const r=await play(m);appendFileSync(out,JSON.stringify(r)+'\n');process.stderr.write(`${r.match} ${r.status} ${r.result?.winner??'-'} R${r.round} ${r.elapsedMs}ms ${r.error??''}\n`);}
