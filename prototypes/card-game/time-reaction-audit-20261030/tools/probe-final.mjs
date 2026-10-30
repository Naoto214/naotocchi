// Fixed-position probe P6 (2026-10-30): the seat's LAST own turn (R10) end request, and the last opponent turn.
// Cards kept in hand have no value after R10, yet the CPU keeps a flat "one card = 3" play penalty.
// For every captured position (clone only) each legal paid candidate and "pass" are rolled out to the end of the
// game with the official engine and the same two CPUs; the final growth difference shows whether ending the turn
// with that time unused cost growth. Nothing official is modified. Kept apart from the natural statistics.
// Usage: node tools/probe-final.mjs runs/T-manifest.json results/positions-final.json [maxPositions]
import {readFileSync,writeFileSync} from 'node:fs';
import * as e from '../../engine.mjs';
import {observeCpu} from '../../cpu-observation.mjs';
import {chooseCpuAction,scoreCpuAction,timeOpportunity,legacySpend,PROFILES} from '../../cpu-policy.mjs';
import {advanceResponses} from '../../auto-progress.mjs';
import {play} from './audit-run.mjs';
const [manifestPath,out,max='60']=process.argv.slice(2);
const M=JSON.parse(readFileSync(manifestPath,'utf8')),r2=x=>Math.round(x*100)/100;
const label=x=>({kind:x.kind,card:x.card?.cardId??null,variant:x.variant??null,cost:x.cost??0});
function finish(s0,firstId,diffs,seeds){
 let s=e.act(s0,e.actor(s0),s0.revision,firstId);const step={A:900,B:900};
 for(let n=0;n<3000;n++){const r=advanceResponses(s);s=r.state;if(r.halted)return null;if(s.phase==='finished')return s.result;
  const a=e.actor(s),o=observeCpu(s,a),d=chooseCpuAction(o,{difficulty:diffs[a],seed:seeds[a],step:step[a]++});
  s=e.act(s,a,s.revision,e.legalActions(s)[o.actions.findIndex(x=>x.id===d.id)].id);}
 return null;
}
const P=[];
for(const m of M.matches.filter(m=>m.pair==='II'||m.pair==='BB')){
 if(P.length>=Number(max))break;let taken=false;
 const hook=(s,a,o,d,act)=>{
  if(taken||s.round!==10||s.phase!=='normal'||s.turn!==a||act.kind!=='pass')return;
  const paid=o.actions.map((x,i)=>({x,i})).filter(z=>['play','programPlay'].includes(z.x.kind)&&(z.x.cost??0)>0);if(!paid.length)return;
  taken=true;const prof=PROFILES[m.difficulty[a]],t=timeOpportunity(o,prof),raw=e.legalActions(s);
  const sc=o.actions.map((x,i)=>t?t[i]:scoreCpuAction(x,o,legacySpend,prof));
  const passId=raw.find(x=>x.kind==='pass').id,base=finish(s,passId,m.difficulty,m.policySeed);
  const rows=paid.map(z=>{const r=finish(s,raw[z.i].id,m.difficulty,m.policySeed);return {...label(z.x),score:r2(sc[z.i]),effectOnly:r2(scoreCpuAction(z.x,o,()=>0,prof)+3),finalGrowth:r?.growth?.[a]??null,winner:r?r.winner:null};});
  P.push({match:m.match,seat:a,deck:m['deck'+a],difficulty:m.difficulty[a],time:s.players[a].time,growth:s.players[a].growth,pass:{finalGrowth:base?.growth?.[a]??null,winner:base?base.winner:null},candidates:rows});
 };
 try{play(M,m,{onDecision:hook});}catch(err){process.stderr.write(m.match+' '+err.message+'\n');}
 process.stderr.write(`${m.match} ${P.length}\n`);
}
writeFileSync(out,JSON.stringify(P,null,1));
