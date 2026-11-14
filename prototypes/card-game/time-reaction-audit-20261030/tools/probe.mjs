// Fixed-position probes (2026-10-30). Positions are taken from the natural audit matches (same manifest/seeds),
// then examined on throw-away clones only:
//  - the CPU choice of both difficulties in the same position (same policy seed/step),
//  - counterfactual time for the acting seat (0..3 and the round value), observation re-built on the clone,
//  - for challenge reactions: a rollout of every candidate with the official engine and the two CPUs until the
//    challenge compares, to see which candidate actually changes the result.
// Nothing official is modified. Results are kept apart from the natural-match statistics.
// Usage: node tools/probe.mjs runs/T-manifest.json results/positions.json
import {readFileSync,writeFileSync} from 'node:fs';
import * as e from '../../engine.mjs';
import {RULES} from '../../rules.mjs';
import {observeCpu} from '../../cpu-observation.mjs';
import {chooseCpuAction,scoreCpuAction,timeOpportunity,legacySpend,PROFILES} from '../../cpu-policy.mjs';
import {advanceResponses} from '../../auto-progress.mjs';
import {play} from './audit-run.mjs';
const [manifestPath,out]=process.argv.slice(2);
const M=JSON.parse(readFileSync(manifestPath,'utf8'));
const cid=(s,id)=>s.cards[id]?.cardId,other=a=>a==='A'?'B':'A',r2=x=>Math.round(x*100)/100;
const STAT=new Set(['stat','chosenStat','battleStat']);
const hasStat=steps=>(steps??[]).some(x=>STAT.has(x.op)||hasStat(x.steps));
const statCard=id=>RULES[id]?.mode==='quick'&&hasStat(RULES[id].steps);
function scoresFor(o,diff){const prof=PROFILES[diff],t=timeOpportunity(o,prof);return o.actions.map((a,i)=>t?t[i]:scoreCpuAction(a,o,legacySpend,prof));}
function describe(s,a,o,diff,seed,step){
 const d=chooseCpuAction(o,{difficulty:diff,seed,step}),i=o.actions.findIndex(x=>x.id===d.id),sc=scoresFor(o,diff);
 return {choice:label(o.actions[i]),score:r2(d.score),candidates:o.actions.map((x,j)=>({...label(x),raw:r2(sc[j])})).sort((p,q)=>q.raw-p.raw).slice(0,6)};
}
const label=x=>({kind:x.kind,card:x.card?.cardId??null,variant:x.variant??null,cost:x.cost??0,trap:x.slot==='prepared'&&x.kind==='place'?true:undefined});
function withTime(s,a,t){const c=structuredClone(s);c.players[a].time=t;return c;}
// Roll the position forward with the official engine and both CPUs until the current challenge compares.
function rollout(s0,firstId,diffs,seeds){
 let s=e.act(s0,e.actor(s0),s0.revision,firstId);const before=s0.history.filter(h=>h.kind==='comparison').length,step={A:500,B:500};
 for(let n=0;n<400;n++){
  const r=advanceResponses(s);s=r.state;if(r.halted)return {error:r.reason};
  const comps=s.history.filter(h=>h.kind==='comparison');if(comps.length>before){const h=comps.at(-1);return {winner:h.winner??null,values:h.values};}
  if(s.phase==='finished'||!s.challenge)return {winner:'ended',values:null};
  const a=e.actor(s),o=observeCpu(s,a),d=chooseCpuAction(o,{difficulty:diffs[a],seed:seeds[a],step:step[a]++});
  s=e.act(s,a,s.revision,e.legalActions(s)[o.actions.findIndex(x=>x.id===d.id)].id);
 }
 return {error:'limit'};
}
const P={P1:[],P2:[],P3:[],P4:[],P5:[]},LIMIT={P1:24,P2:16,P3:12,P4:12,P5:12};
const full=()=>Object.keys(P).every(k=>P[k].length>=LIMIT[k]);
// Matches: II and BB pairs only (so both seats share a difficulty), spread across all deck pairs.
const pool=M.matches.filter(m=>m.pair==='II'||m.pair==='BB');
for(const m of pool){
 if(full())break;const seen=new Set();
 const hook=(s,a,o,d,act)=>{
  const p=s.players[a],tag=(k)=>{if(seen.has(k)||P[k].length>=LIMIT[k])return false;seen.add(k);return true;};
  const base={match:m.match,seat:a,deck:m['deck'+a],round:s.round,revision:s.revision,time:p.time,ownTurn:s.turn===a,natural:{difficulty:m.difficulty[a],choice:label(o.actions[o.actions.findIndex(x=>x.id===d.id)])}};
  const both=()=>({beginner:describe(s,a,o,'beginner',m.policySeed[a],0),intermediate:describe(s,a,o,'intermediate',m.policySeed[a],0)});
  const times=ts=>Object.fromEntries(ts.map(t=>{const c=withTime(s,a,t),oc=observeCpu(c,a);return [t,{beginner:label(oc.actions[oc.actions.findIndex(x=>x.id===chooseCpuAction(oc,{difficulty:'beginner',seed:m.policySeed[a],step:0}).id)]),intermediate:label(oc.actions[oc.actions.findIndex(x=>x.id===chooseCpuAction(oc,{difficulty:'intermediate',seed:m.policySeed[a],step:0}).id)])}];}));
  // P1: the opponent's challenge is open and this seat holds a stat-boosting すぐつかう card (usable or not)
  if(s.phase==='response'&&!s.choice&&s.turn!==a&&s.challenge&&!s.challenge.completed&&p.hand.some(id=>statCard(cid(s,id)))&&tag('P1')){
   const k=s.challenge.parameter,mine=e.stats(s,a)?.[k],theirs=e.stats(s,other(a))?.[k];
   const rolls=o.actions.map((x,i)=>({...label(x),result:rollout(s,e.legalActions(s)[i].id,{A:'intermediate',B:'intermediate'},m.policySeed)}));
   P.P1.push({...base,parameter:k,margin:mine-theirs,hand:p.hand.map(id=>cid(s,id)).filter(statCard),...both(),timeVariants:times([0,1,2,3]),rollouts:rolls});}
  // P2: own turn end request with time left and a usable すぐつかう card in hand
  if(s.phase==='normal'&&s.turn===a&&act.kind==='pass'&&p.time>0&&o.actions.some(x=>['play','programPlay'].includes(x.kind))&&tag('P2'))
   P.P2.push({...base,...both(),timeVariants:times([1,2,3,s.round])});
  // P3: preparation zone full while a すぐつかう card is legal (rule: quick play is still allowed)
  if(p.board.prepared.length>=3&&o.actions.some(x=>['play','programPlay'].includes(x.kind))&&tag('P3'))
   P.P3.push({...base,prepared:p.board.prepared.map(x=>cid(s,x.id)),...both()});
  // P4: a trap can be set now
  if(s.phase==='normal'&&s.turn===a&&o.actions.some(x=>x.kind==='place'&&x.slot==='prepared'&&e.legalActions(s)[o.actions.indexOf(x)]?.trap)&&tag('P4'))
   P.P4.push({...base,prepared:p.board.prepared.length,...both(),timeVariants:times([1,2,3,s.round])});
  // P5: a face-down trap may fire
  if(s.phase==='trigger'&&o.actions.some(x=>(x.kind==='trigger'||x.kind==='skip')&&p.board.prepared.some(e2=>e2.faceDown&&cid(s,e2.id)===x.card?.cardId))&&tag('P5'))
   P.P5.push({...base,...both()});
 };
 try{play(M,m,{onDecision:hook});}catch(err){process.stderr.write(m.match+' '+err.message+'\n');}
 process.stderr.write(`${m.match} ${Object.entries(P).map(([k,v])=>k+':'+v.length).join(' ')}\n`);
}
writeFileSync(out,JSON.stringify(P,null,1));
