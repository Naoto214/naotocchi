// Fixed-position probe P1b (2026-10-30): the opponent's challenge is open and this seat holds a stat card that is
// usable on the opponent's turn (かくとうバトル G-street-fight / ビーチバレー G-beach-volley). Clone-only analysis:
//  - CPU choice of both difficulties at the actual time,
//  - if the card is unaffordable, the same position with the seat's time raised to exactly the card cost
//    ("had it kept that much time"), and
//  - a rollout of every candidate (pass and each variant) to the challenge comparison with the official engine
//    and two intermediate CPUs, giving the winner for each choice.
// Usage: node tools/probe-defense.mjs runs/T-manifest.json results/positions-defense.json [max]
import {readFileSync,writeFileSync} from 'node:fs';
import * as e from '../../engine.mjs';
import {observeCpu} from '../../cpu-observation.mjs';
import {chooseCpuAction,scoreCpuAction,timeOpportunity,legacySpend,PROFILES} from '../../cpu-policy.mjs';
import {advanceResponses} from '../../auto-progress.mjs';
import {play} from './audit-run.mjs';
const [manifestPath,out,max='30']=process.argv.slice(2);
const M=JSON.parse(readFileSync(manifestPath,'utf8')),r2=x=>Math.round(x*100)/100;
const cid=(s,id)=>s.cards[id]?.cardId,other=a=>a==='A'?'B':'A',DEF=new Set(['G-street-fight','G-beach-volley']);
const label=x=>({kind:x.kind,card:x.card?.cardId??null,variant:x.variant??null,cost:x.cost??0});
function rollout(s0,firstId,seeds){
 let s=e.act(s0,e.actor(s0),s0.revision,firstId);const before=s0.history.filter(h=>h.kind==='comparison').length,step={A:500,B:500};
 for(let n=0;n<400;n++){const r=advanceResponses(s);s=r.state;if(r.halted)return {error:r.reason};
  const comps=s.history.filter(h=>h.kind==='comparison');if(comps.length>before){const h=comps.at(-1);return {winner:h.winner??'draw',values:h.values};}
  if(s.phase==='finished'||!s.challenge)return {winner:'ended'};
  const a=e.actor(s),o=observeCpu(s,a),d=chooseCpuAction(o,{difficulty:'intermediate',seed:seeds[a],step:step[a]++});
  s=e.act(s,a,s.revision,e.legalActions(s)[o.actions.findIndex(x=>x.id===d.id)].id);}
 return {error:'limit'};
}
function examine(s,a,seeds){
 const o=observeCpu(s,a),raw=e.legalActions(s),res={};
 for(const diff of ['beginner','intermediate']){const prof=PROFILES[diff],t=timeOpportunity(o,prof),d=chooseCpuAction(o,{difficulty:diff,seed:seeds[a],step:0});
  res[diff]={choice:label(o.actions.find(x=>x.id===d.id)),scores:o.actions.map((x,i)=>({...label(x),score:r2(t?t[i]:scoreCpuAction(x,o,legacySpend,prof))}))};}
 res.rollouts=o.actions.map((x,i)=>({...label(x),result:rollout(s,raw[i].id,seeds)}));
 return res;
}
const P=[];
const pool=M.matches.filter(m=>(m.pair==='II'||m.pair==='BB')&&[m.deckA,m.deckB].some(d=>d==='challenge'||d==='companion'));
for(const m of pool){
 if(P.length>=Number(max))break;let n=0;
 const hook=(s,a,o,d,act)=>{
  if(n>=2||s.phase!=='response'||s.choice||s.turn===a||!s.challenge||s.challenge.completed)return;
  const p=s.players[a],held=p.hand.filter(id=>DEF.has(cid(s,id)));if(!held.length||!p.board.main)return;
  // first window of this challenge for this seat only
  const key=s.challenge.id??s.serial;if(hook.seen?.has(key))return;(hook.seen??=new Set()).add(key);n++;
  const k=s.challenge.parameter,margin=e.stats(s,a)[k]-e.stats(s,other(a))[k],cost=Math.min(...held.map(id=>e.CARDS[cid(s,id)].cost));
  const row={match:m.match,seat:a,deck:m['deck'+a],round:s.round,time:p.time,parameter:k,margin,held:held.map(id=>cid(s,id)),natural:{difficulty:m.difficulty[a],choice:label(o.actions.find(x=>x.id===d.id))},actual:examine(s,a,m.policySeed)};
  if(p.time<cost){const c=structuredClone(s);c.players[a].time=cost;row.withTime={time:cost,...examine(c,a,m.policySeed)};}
  P.push(row);
 };
 try{play(M,m,{onDecision:hook});}catch(err){process.stderr.write(m.match+' '+err.message+'\n');}
 process.stderr.write(`${m.match} ${P.length}\n`);
}
writeFileSync(out,JSON.stringify(P,null,1));
