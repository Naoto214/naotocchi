// EXPERIMENT ONLY. ぴょんぴょんジャンプ A/B comparison runner. Version A = official runtime (or the unpatched copy
// .variant-null for the isolation check), version B = .variant-B (see tools/make-variant.mjs).
// policy 'cpu'    : the test seat is the unchanged official CPU (intermediate).
// policy 'forced' : equal-opportunity comparison. In front of the official CPU, on the test seat only and only among
//                   legal actions: if ぴょんぴょんジャンプ can be played and a time-skip is still affordable after it, play
//                   it; while its first trigger is pending and a time-skip is affordable, keep only time-skip candidates
//                   (the official CPU picks which one); without such an opportunity it never plays the card (choosing
//                   not to play is always legal). Everything else is the official CPU.
// Usage: node run.mjs <manifest.json> <out.jsonl> [shard] [shards] [--null]
import {readFileSync,appendFileSync,existsSync} from 'node:fs';
import {chooseCpuAction} from '../cpu-policy.mjs';
import {permutations,inputFor,apply,sha} from '../balance-verification-20261020/lib.mjs';
import {STRATEGIES} from '../egg-wait-study-20261026/strategies.mjs';
const args=process.argv.slice(2),useNull=args.includes('--null'),[manifestPath,out,shard='0',shards='1']=args.filter(a=>a!=='--null');
const M=JSON.parse(readFileSync(manifestPath,'utf8')),G=Object.fromEntries(M.groups.map(g=>[g.group,g]));
const SRC={A:useNull?'./.variant-null':'..',B:'./.variant-B'};
const LIB={};for(const [k,dir] of Object.entries(SRC))LIB[k]={e:await import(dir+'/engine.mjs'),observeCpu:(await import(dir+'/cpu-observation.mjs')).observeCpu,advanceResponses:(await import(dir+'/auto-progress.mjs')).advanceResponses};
const done=new Set(existsSync(out)?readFileSync(out,'utf8').split('\n').filter(Boolean).map(l=>JSON.parse(l).match):[]);
const DJ='G-doodle-jump',STEP_LIMIT=6000,TURN_LIMIT=512;
function play(m){
 const {e,observeCpu,advanceResponses}=LIB[m.version],cid=(s,id)=>s.cards[id]?.cardId;
 const g=G[m.group],perm=permutations(g.orderSeed),order={X:apply(M.decks[g.X].cards,perm.A),Y:apply(M.decks[g.Y].cards,perm.B)};
 const seatOrder={A:m.first==='X'?order.X:order.Y,B:m.first==='X'?order.Y:order.X};
 const test=m.first==='X'?'A':'B',opp=test==='A'?'B':'A';
 let s=e.createGame(g.orderSeed,{A:inputFor(seatOrder.A,perm.A),B:inputFor(seatOrder.B,perm.B)});
 for(const a of ['A','B']){const got=[...s.players[a].hand,...s.players[a].deck].map(id=>cid(s,id));if(JSON.stringify(got)!==JSON.stringify(seatOrder[a]))throw Error('initial order mismatch '+a);}
 const seats=m.exp==='E2'?['A','B']:[test];// E2 is a mirror: both seats hold the card, record both
 const R={match:m.match,exp:m.exp,version:m.version,policy:m.policy,strategy:m.strategy??null,opponent:m.opponent,group:m.group,first:m.first,test,
  status:'running',error:null,opening:{mains:seatOrder[test].slice(0,5).filter(id=>e.CARDS[id].type==='main').length,dj:seatOrder[test].slice(0,5).filter(id=>id===DJ).length},
  dj:Object.fromEntries(seats.map(a=>[a,{drawn:0,plays:[],opportunityTurns:0,opportunityWithSingleStep:0,usedOnOpportunity:0,draws:0,plus5:0,expiredUnfired:0,expiredAfterDraw:0,fires:[]}])),
  moves:{A:[],B:[]},birth:{A:null,B:null},playedByTurn:{A:{},B:{}},growthByRound:{A:[],B:[]}};
 const step={A:0,B:0};let guard={turn:null,count:0,seen:{}},round=1,turnKey=null,opportunity={};
 const seen=new Set();
 const advance=()=>{const r=advanceResponses(s);s=r.state;if(r.halted)throw Error('auto-advance halted: '+r.reason);};
 const djRes=a=>Object.fromEntries(s.effects.filter(x=>x.kind==='reservation'&&x.actor===a&&cid(s,x.link.source)===DJ).map(x=>[x.link.source+'#'+x.link.createdRevision,x.index]));
 const markDrawn=()=>{for(const a of seats)for(const id of s.players[a].hand)if(cid(s,id)===DJ&&!seen.has(id)){seen.add(id);R.dj[a].drawn++;}};
 const djOpportunity=(o,acts)=>{const p=o.players[o.seat],djAct=acts.find(x=>['programPlay','play'].includes(x.kind)&&x.card?.cardId===DJ);if(!djAct)return null;
  const skip=acts.filter(x=>x.kind==='place'&&x.slot==='main'&&x.variant==='time_skip'&&x.cost+djAct.cost<=p.time);if(!skip.length)return null;
  return {act:djAct,single:skip.some(x=>(x.card?.stage??0)-(p.board.main?.stage??99)===1)};};
 try{
  advance();markDrawn();
  for(let n=0;s.phase!=='finished';n++){
   if(n>=STEP_LIMIT)throw Error('step limit');
   const a=e.actor(s),o=observeCpu(s,a),raw=e.legalActions(s);
   const turn=`${o.round}:${o.turn}`;if(turn!==guard.turn)guard={turn,count:0,seen:{}};
   const key=JSON.stringify({...o,revision:0,actions:o.actions.map(({id,...x})=>x)});
   if(guard.count>=TURN_LIMIT||(guard.seen[key]??0)>=3)throw Error('CPU repetition limit');
   let acts=o.actions;
   if(a===test&&m.strategy)acts=STRATEGIES[m.strategy].filter(o,acts);
   const isNormal=s.phase==='normal'&&s.turn===a&&!s.choice;
   if(seats.includes(a)&&isNormal){const opp1=djOpportunity(o,acts);if(opp1&&!opportunity[turn+a]){opportunity[turn+a]=true;R.dj[a].opportunityTurns++;if(opp1.single)R.dj[a].opportunityWithSingleStep++;}
    if(a===test&&m.policy==='forced'){
     const pending=Object.values(djRes(a)).some(i=>i===0);
     const noDJ=acts.filter(x=>!(['programPlay','play'].includes(x.kind)&&x.card?.cardId===DJ));
     if(pending){const skips=noDJ.filter(x=>x.kind==='place'&&x.slot==='main'&&x.variant==='time_skip'&&x.cost<=o.players[a].time);acts=skips.length?skips:noDJ;}
     else if(opp1)acts=[opp1.act];
     else acts=noDJ;
    }}
   // Equal-opportunity policy: outside its own normal-action opportunity (incl. response windows and the opponent's turn,
   // where a すぐつかう card is also legal) the test seat never plays the card.
   if(a===test&&m.policy==='forced'&&!(isNormal&&djOpportunity(o,o.actions)))acts=acts.filter(x=>!(['programPlay','play'].includes(x.kind)&&x.card?.cardId===DJ));
   if(!acts.length)throw Error('policy removed every candidate');
   const d=chooseCpuAction({...o,actions:acts},{difficulty:'intermediate',seed:m.policySeed[a],step:step[a]}),i=o.actions.findIndex(x=>x.id===d.id);
   if(i<0||raw.length!==o.actions.length)throw Error('Invalid CPU decision');
   const act=raw[i],src=act.source?cid(s,act.source):null;
   if(['programPlay','play','place'].includes(act.kind)&&src&&s.players[a].hand.includes(act.source)){(R.playedByTurn[a][turn]??=[]).push(src);
    if(src===DJ&&seats.includes(a)){R.dj[a].plays.push({round:s.round});if(opportunity[turn+a])R.dj[a].usedOnOpportunity++;}}
   let mv=null;if(act.kind==='place'&&act.slot==='main'){const c=e.CARDS[src],prev=s.players[a].board.main?e.CARDS[cid(s,s.players[a].board.main)]:null;
    mv={round:s.round,variant:act.variant,stage:c.stage,from:prev?.stage??0,cost:act.cost};R.moves[a].push(mv);if(act.variant==='birth'&&!R.birth[a])R.birth[a]=mv;}
   const before=Object.fromEntries(seats.map(x=>[x,djRes(x)])),growthBefore=Object.fromEntries(seats.map(x=>[x,s.players[x].growth])),turnBefore=turn;
   s=e.act(s,a,s.revision,act.id);step[a]++;guard.count++;guard.seen[key]=(guard.seen[key]??0)+1;
   advance();markDrawn();
   const turnAfter=s.phase==='finished'?'end':`${s.round}:${s.turn}`;
   for(const x of seats){const now=djRes(x);for(const [k,idx] of Object.entries(before[x])){
    const lastSkip=[...R.moves[x]].reverse().find(q=>q.variant==='time_skip'),jump=lastSkip?lastSkip.stage-lastSkip.from:null,dg=s.players[x].growth-growthBefore[x];
    if(k in now&&now[k]>idx){R.dj[x].draws++;R.dj[x].fires.push({round:lastSkip?.round,step:'draw',jump});}
    else if(!(k in now)){
     // A 'turn' reservation can only expire at the end-of-turn cleanup; a time-skip (normal action) never shares a step with it.
     if(turnAfter!==turnBefore){if(idx===0)R.dj[x].expiredUnfired++;else R.dj[x].expiredAfterDraw++;continue;}
     if(m.version==='A'){R.dj[x].plus5++;R.dj[x].fires.push({round:lastSkip?.round,step:'plus5',jump,dg});}
     else{R.dj[x].draws++;const p5=jump===1;if(p5)R.dj[x].plus5++;R.dj[x].fires.push({round:lastSkip?.round,step:p5?'draw+plus5':'draw',jump,dg});}
    }}}
   if(s.round!==round||s.phase==='finished'){for(const x of ['A','B'])R.growthByRound[x].push(s.players[x].growth);round=s.round;}
  }
  R.status='completed';
 }catch(err){R.status='abnormal';R.error=String(err.message).slice(0,300);}
 R.round=s.round;R.result=s.result;R.growth={A:s.players.A.growth,B:s.players.B.growth};
 R.challenges=s.history.filter(h=>h.kind==='comparison').length;
 if(R.status==='completed'){const saved=e.save(s);R.saveSha256=sha(saved);try{const back=e.restore(saved);R.replay=e.save(back)===saved&&JSON.stringify(back.result)===JSON.stringify(s.result)?'match':'mismatch';}catch(err){R.replay='error:'+err.message;}}
 const w=s.result?.winner;R.testScore=s.result?(w===null?0.5:w===test?1:0):null;
 return R;
}
const mine=M.matches.filter((m,i)=>i%Number(shards)===Number(shard)&&!done.has(m.match));
for(const m of mine){const t0=performance.now();const r=play(m);r.elapsedMs=Math.round(performance.now()-t0);appendFileSync(out,JSON.stringify(r)+'\n');process.stderr.write(`${r.match} ${r.status} ${r.testScore}\n`);}
