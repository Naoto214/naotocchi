// Read-only counterfactual of cpu-policy.mjs timeOpportunity(). NOT used by the official CPU.
// sameName=false reproduces the official function exactly (asserted by the runner on every decision).
// sameName=true additionally ignores alternatives that are another copy of the same card doing the same kind of
// action (e.g. two hand copies of M-cat-01 both offered as birth): paying for one copy does not "lose" the other,
// because the CPU only ever wants one of them now.
import {scoreCpuAction,PROFILES} from '../../cpu-policy.mjs';
export function timeOpportunityCF(o,prof=PROFILES.intermediate,{sameName=false}={}){
 const own=o.turn===o.seat;if(prof.time!=='opportunity'||!(own&&o.phase==='normal')&&own)return null;
 const t=o.players[o.seat].time??0,base=o.actions.map(a=>scoreCpuAction(a,o,()=>0,prof));
 const twin=(a,b)=>sameName&&a.card&&b.card&&a.card.cardId===b.card.cardId&&a.kind===b.kind&&a.slot===b.slot&&a.variant===b.variant;
 return o.actions.map((a,i)=>{const c=a.cost??0;if(c<=0)return base[i];const left=t-c;
  const keptSkip=b=>a.timeSkipAfter?.length&&b.kind==='place'&&b.variant==='time_skip'&&o.actions.some(x=>x.kind==='place'&&x.variant==='time_skip'&&x.card?.id===b.card?.id&&(x.cost??0)<=left);
  let alt=0;o.actions.forEach((b,j)=>{if(j!==i&&(b.cost??0)>left&&(b.cost??0)>0&&!(a.card&&b.card?.id===a.card.id)&&!twin(a,b)&&!['pass','choose','skip'].includes(b.kind)&&!keptSkip(b))alt=Math.max(alt,base[j]);});
  const reserve=own&&(o.reactive??[]).some(r=>r.id!==a.card?.id&&r.cost<=t&&r.cost>left)?3:0;
  return base[i]-Math.max(alt,reserve);});
}
