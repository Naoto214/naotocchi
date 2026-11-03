// Isolated CPU-vs-CPU runner for the breakup-penalty comparison (based on ../../balance-verification-20261020/run.mjs).
// Each match loads the engine, CPU observation/policy and auto-pass from build/<variant>/ (copies made by
// build-variants.mjs). The official modules are never imported for play.
// Usage: node lib/run.mjs <manifest.json> <out.jsonl> [shard] [shards]
//
// Experiment-only decision rules layered on top of the unchanged CPU policy (documented in REPORT §3):
//  * 円満な別れ (C, C2): played only as an answer to the opponent's すれちがい that targets the own lover,
//    when no らぶれたー is attached (the CPU never plays it otherwise). In Cx the control card is never played.
//  * Forced runs: the scripted seat may play すれちがい only while the opponent's lover is at the scripted stage
//    (0..3, 4 = married); otherwise すれちがい candidates are hidden from the CPU. Everything else is the CPU.
import {readFileSync,appendFileSync,existsSync} from 'node:fs';
import {dirname,join} from 'node:path';import {fileURLToPath,pathToFileURL} from 'node:url';
import {permutations,inputFor,apply,sha} from '../../balance-verification-20261020/lib.mjs';
const HERE=dirname(fileURLToPath(import.meta.url)),BUILD=join(HERE,'..','build');
const [manifestPath,out,shard='0',shards='1']=process.argv.slice(2);
const M=JSON.parse(readFileSync(manifestPath,'utf8')),G=Object.fromEntries(M.groups.map(g=>[g.group,g]));
const done=new Set(existsSync(out)?readFileSync(out,'utf8').split('\n').filter(Boolean).map(l=>JSON.parse(l).match):[]);
const MODS={};
async function mods(v){if(MODS[v])return MODS[v];const u=f=>pathToFileURL(join(BUILD,v,f)).href;
 const [e,o,p,ap]=await Promise.all([import(u('engine.mjs')),import(u('cpu-observation.mjs')),import(u('cpu-policy.mjs')),import(u('auto-progress.mjs'))]);
 return MODS[v]={e,observeCpu:o.observeCpu,chooseCpuAction:p.chooseCpuAction,advanceResponses:ap.advanceResponses};}
const STEP_LIMIT=6000,TURN_LIMIT=512,S='E-misunderstanding',AM='E-amicable-breakup';
const other=a=>a==='A'?'B':'A';
const TRACK=[S,AM,'E-first-date','E-reconciliation','E-wedding-anniversary','I-c_match','E-new-encounter','I-partner1','G-connect-four'];
async function play(m){
 const {e,observeCpu,chooseCpuAction,advanceResponses}=await mods(m.variant);
 const g=G[m.group],perm=permutations(g.orderSeed),order={X:apply(M.decks[g.X].cards,perm.A),Y:apply(M.decks[g.Y].cards,perm.B)};
 const seatOrder={A:m.first==='X'?order.X:order.Y,B:m.first==='X'?order.Y:order.X};
 const decks={A:inputFor(seatOrder.A,perm.A),B:inputFor(seatOrder.B,perm.B)};
 const t0=performance.now();let s=e.createGame(g.orderSeed,decks);
 const cid=id=>s.cards[id]?.cardId;
 for(const a of ['A','B']){const got=[...s.players[a].hand,...s.players[a].deck].map(cid);if(JSON.stringify(got)!==JSON.stringify(seatOrder[a]))throw Error('initial order mismatch '+a);}
 const log=[];globalThis.__bpLog=x=>log.push(x);
 const seat=()=>({turns:0,decisions:0,placements:[],leaves:[],marriage:null,plays:{},equips:{},triggers:{},replacements:{},amicableResponses:0,misSeen:0,
  opener:null,handEnd:{lovers:0,lovers_ids:[]},deckEnd:{lovers:0},growth:0,result:null,firstSeat:false});
 const R={match:m.match,group:m.group,variant:m.variant,arm:m.arm??m.variant,first:m.first,xSeat:m.xSeat,deck:{A:m.deckA,B:m.deckB},difficulty:m.difficulty,policySeed:m.policySeed,orderSeed:g.orderSeed,
  script:m.script,stage:g.stage,initialOrderSha:{A:sha(seatOrder.A),B:sha(seatOrder.B)},status:'running',error:null,autoPass:0,seat:{A:seat(),B:seat()}};
 R.seat[m.first==='X'?m.xSeat:other(m.xSeat)].firstSeat=true;
 for(const a of ['A','B']){const h=s.players[a].hand.map(cid);R.seat[a].opener={lovers:h.filter(x=>x.startsWith('P-')).length,misunderstanding:h.filter(x=>x===S).length,amicable:h.filter(x=>x===AM).length,lovePaper:h.filter(x=>x==='I-partner1').length};}
 const step={A:0,B:0};let guard={turn:null,count:0,seen:{}},turnFirst=null;
 const snap=()=>Object.fromEntries(['A','B'].map(a=>[a,{partner:s.players[a].board.partner,rel:s.players[a].relationship}]));
 let prev=snap();
 const diff=()=>{const now=snap();for(const a of ['A','B']){const x=R.seat[a],p0=prev[a],p1=now[a];
   if(p1.partner&&p1.partner!==p0.partner){const sameInst=x.placements.some(q=>q.inst===p1.partner),sameCard=x.placements.some(q=>q.cardId===cid(p1.partner));
    x.placements.push({cardId:cid(p1.partner),inst:p1.partner,round:s.round,turn:x.turns,sameInstance:sameInst,sameCard,afterLeave:x.leaves.length>0});}
   if(p1.rel===4&&p0.rel!==4&&p1.partner){const pl=x.placements.at(-1);x.marriage={round:s.round,turn:x.turns,turnsFromPlacement:x.turns-(pl?.turn??0),cardId:cid(p1.partner)};}
  }prev=now;};
 const flushLog=()=>{for(const l of log.splice(0)){const x=R.seat[l.actor];if(l.kind==='leave'){const pl=x.placements.at(-1);x.leaves.push({...l,turn:x.turns,residence:x.turns-(pl?.turn??0),byOpponent:l.effectActor&&l.effectActor!==l.actor,byOwnAmicable:false});}
  else if(l.kind==='replacement')x.replacements[l.cardId]=(x.replacements[l.cardId]??0)+1;}};
 const advance=()=>{const r=advanceResponses(s);R.autoPass+=r.steps.length;s=r.state;if(r.halted)throw Error('auto-advance halted: '+r.reason);};
 // Injection runs (F2): the first time the scripted seat starts acting in its own normal phase with time >= 2 while the
 // opponent's lover is at the scripted stage, record the point; in 'inject' arms turn the last card of its hand into
 // すれちがい (a test-fixture style substitution, hence no save replay) and play it at once.
 function injectPoint(a){const sc=m.script;if(sc?.injectAtStage==null||R.injectPoint||a!==sc.seat||s.phase!=='normal'||s.turn!==a||s.choice||s.chain.length)return;
  const p=s.players[a],opp=s.players[other(a)];if(p.time<2||!opp.board.partner||opp.relationship!==sc.injectAtStage)return;
  R.injectPoint={round:s.round,stage:opp.relationship,lover:cid(opp.board.partner),xGrowth:opp.growth,yGrowth:p.growth};
  if(sc.inject&&p.hand.length){const id=p.hand.at(-1);R.injectPoint.replacedCard=cid(id);s.cards[id].cardId=S;R.pendingInject=true;}}
 // Experiment decision layer (see header). Returns the id to play, or null to defer to the CPU on a filtered list.
 function decide(a,o,raw){
  const isCard=(x,id)=>x.source&&s.cards[x.source]&&cid(x.source)===id&&['programPlay','play'].includes(x.kind);
  let hide=new Set();
  const am=raw.filter(x=>isCard(x,AM));
  if(am.length&&!m.script?.amicableLoop){const b=s.players[a].board,threatened=s.chain.some(l=>l.actor!==a&&s.cards[l.source]&&cid(l.source)===S&&l.target===b.partner);
   const paper=b.prepared.some(q=>!q.faceDown&&cid(q.id)==='I-partner1'&&(q.target===b.partner||q.target===b.main));
   if(['C','C2'].includes(m.variant)&&threatened&&!paper){R.seat[a].amicableResponses++;return {pick:am[0].id};}
   for(const x of am)hide.add(x.id);}
  // Probe arm 'loop': return the own ねこ社長 with 円満な別れ whenever it can be re-placed (C: own normal phase with the
  // placement still unused; C2: the opponent's turn, re-placed on the next own turn).
  if(m.script?.amicableLoop&&m.script.seat===a&&am.length){const p=s.players[a],b=p.board,onCeo=b.partner&&cid(b.partner)==='P-cat_ceo';
   const ok=m.variant==='C'?s.turn===a&&s.phase==='normal'&&!p.personUsed:s.turn!==a;
   if(onCeo&&ok){R.seat[a].loopPlays=(R.seat[a].loopPlays??0)+1;return {pick:am[0].id};}}
  if(m.script?.playMisunderstandingAtStage!=null&&m.script.seat===a){const opp=s.players[other(a)];const ok=opp.board.partner&&opp.relationship===m.script.playMisunderstandingAtStage;
   for(const x of raw)if(isCard(x,S)){if(ok)return {pick:x.id};hide.add(x.id);}}
  if(m.script?.injectAtStage!=null&&m.script.seat===a)for(const x of raw)if(isCard(x,S)){if(R.pendingInject){R.pendingInject=false;R.injectPoint.played=true;return {pick:x.id};}hide.add(x.id);}
  if(m.script?.amicableLoop!=null)for(const x of am)hide.add(x.id);
  return {hide};
 }
 try{
  advance();diff();
  for(let n=0;s.phase!=='finished';n++){
   if(n>=STEP_LIMIT)throw Error('step limit');
   injectPoint(e.actor(s));
   const a=e.actor(s),o=observeCpu(s,a),raw=e.legalActions(s);
   if(raw.length!==o.actions.length)throw Error('observation mismatch');
   const turn=`${o.round}:${o.turn}`;if(turn!==guard.turn)guard={turn,count:0,seen:{}};
   const key=JSON.stringify({...o,revision:0,actions:o.actions.map(({id,...x})=>x)});
   if(guard.count>=TURN_LIMIT||(guard.seen[key]??0)>=3)throw Error('CPU repetition limit');
   const dl=decide(a,o,raw);let i;
   if(dl.pick)i=raw.findIndex(x=>x.id===dl.pick);
   else{const keep=o.actions.filter((x,j)=>!dl.hide.has(raw[j].id));const d=chooseCpuAction(dl.hide.size?{...o,actions:keep}:o,{difficulty:m.difficulty[a],seed:m.policySeed[a],step:step[a]});i=o.actions.findIndex(x=>x.id===d.id);}
   if(i<0)throw Error('Invalid decision');
   const act=raw[i],p=s.players[a],x=R.seat[a];x.decisions++;
   if(s.phase==='normal'&&s.turn===a&&turnFirst!==turn){turnFirst=turn;x.turns++;}
   const src=act.source&&s.cards[act.source]?cid(act.source):null;
   if(src&&TRACK.includes(src)&&['play','programPlay'].includes(act.kind)&&p.hand.includes(act.source))x.plays[src]=(x.plays[src]??0)+1;
   if(src&&TRACK.includes(src)&&act.kind==='place'&&act.slot==='prepared')x.equips[src]=(x.equips[src]??0)+1;
   if(src&&src.startsWith('P-')&&['trigger','programAbility','ability'].includes(act.kind))x.triggers[src]=(x.triggers[src]??0)+1;
   if(src===S&&['play','programPlay'].includes(act.kind)&&p.hand.includes(act.source))R.seat[other(a)].misSeen++;
   const amicableNow=src===AM&&['play','programPlay'].includes(act.kind);
   s=e.act(s,a,s.revision,act.id);step[a]++;guard.count++;guard.seen[key]=(guard.seen[key]??0)+1;
   advance();flushLog();diff();
   if(amicableNow)R.seat[a].amicablePlayed=(R.seat[a].amicablePlayed??0)+1;
  }
  R.status='completed';
 }catch(err){R.status='abnormal';R.error=String(err.message).slice(0,300);}
 flushLog();
 // Attribute own-card departures: an own-effect departure with noPenalty (C/C2) is the trial card.
 for(const a of ['A','B'])for(const l of R.seat[a].leaves)l.byOwnAmicable=l.noPenalty;
 R.elapsedMs=Math.round(performance.now()-t0);R.round=s.round;R.result=s.result;R.revision=s.revision;
 for(const a of ['A','B']){const x=R.seat[a],p=s.players[a];x.growth=p.growth;x.result=s.result?.winner===a?'win':s.result?.winner==='draw'||!s.result?.winner?'draw':'loss';
  x.handEnd={lovers:p.hand.filter(id=>cid(id).startsWith('P-')).length};x.deckEnd={lovers:p.deck.filter(id=>cid(id).startsWith('P-')).length};
  x.partnerAtEnd=p.board.partner?{cardId:cid(p.board.partner),stage:p.relationship,residence:x.turns-(x.placements.at(-1)?.turn??0)}:null;
  x.loversInDeck=seatOrder[a].filter(id=>id.startsWith('P-')).length;}
 if(R.status==='completed'&&R.injectPoint?.replacedCard){R.replay='not-applicable (injected card)';}
 else if(R.status==='completed'){const saved=e.save(s);R.saveSha256=sha(saved);
  try{const back=e.restore(saved);R.replay=JSON.stringify(back.result)===JSON.stringify(s.result)&&e.save(back)===saved?'match':'mismatch';}catch(err){R.replay='error:'+err.message;}}
 delete globalThis.__bpLog;return R;
}
const mine=M.matches.filter((m,i)=>i%Number(shards)===Number(shard)&&!done.has(m.match));
for(const m of mine){const r=await play(m);appendFileSync(out,JSON.stringify(r)+'\n');process.stderr.write(`${r.match} ${r.status} ${r.result?.winner??'-'} R${r.round} ${r.elapsedMs}ms ${r.error??''}\n`);}
