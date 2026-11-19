// EXPERIMENT ONLY. Not imported by the game. A copy of cpu-policy.mjs chooseCpuAction() whose only difference is the
// time opportunity cost (lib/counterfactual.mjs): `sameName` or `strictlyBetter`; or, for `variantAware`, the choice
// between modes of one card during a challenge (スキージャンプ power/wisdom, かくとうバトル パンチ/キック/ガード). Everything else (scores, difficulty
// profile, idle rule, cap, tie hash) is the official code path, so a match against the official CPU isolates the change.
import {scoreCpuAction,legacySpend,PROFILES,POLICY_VERSION} from '../../cpu-policy.mjs';
import {timeOpportunityCF} from './counterfactual.mjs';
import {RULES} from '../../rules.mjs';
// Same deterministic tie hash as cpu-policy.mjs (not exported there).
function tie(seed,step,index){let n=(seed^Math.imul(step+1,2654435761)^Math.imul(index+1,2246822519))>>>0;n=Math.imul(n^(n>>>16),2246822507);return ((n^(n>>>13))>>>0)/4294967296;}
// Gain of one mode in the compared stat, read from the card's rule: chosenStat (mode = stat) or if({variant}) -> stat.
function modeGain(cardId,mode,param){const r=RULES[cardId];if(!r)return null;
 const prog=[...(r.steps??[]),...(r.triggers??[]).flatMap(t=>t.steps??[])];let g=null;
 for(const st of prog){if(st.op==='chosenStat'&&(mode==='power'||mode==='wisdom'))g=(g??0)+(mode===param?st.n:0);
  if(st.op==='if'&&st.condition&&typeof st.condition==='object'&&st.condition.variant===mode)for(const x of st.steps??[])if(x.op==='stat')g=(g??0)+(x[param]??0);}
 return g;}
// Sibling modes of the same card: the mode adding less to the compared stat is lowered by 3 points per missing +1.
function variantAdjust(o,scores){if(!o.challenge)return scores;const p=o.challenge.parameter;
 const gains=o.actions.map(a=>a.card&&a.variant?modeGain(a.card.cardId,a.variant,p):null);
 return scores.map((v,i)=>{if(gains[i]===null)return v;const best=Math.max(...o.actions.map((b,j)=>b.card?.cardId===o.actions[i].card.cardId&&b.kind===o.actions[i].kind&&gains[j]!==null?gains[j]:-Infinity));return v-3*(best-gains[i]);});}
export function chooseCandidate(variant){
 const opt=variant==='sameName'?{sameName:true}:variant==='strictlyBetter'?{strictlyBetter:true}:{};
 return (observation,{difficulty='intermediate',seed=1,step=0}={})=>{
  const prof=PROFILES[difficulty],o=observation;let timed=timeOpportunityCF(o,prof,opt);
  if(variant==='variantAware')timed=variantAdjust(o,timed??o.actions.map(a=>scoreCpuAction(a,o,legacySpend,prof)));
  const idle=!prof.opponentTurn&&o.turn!==o.seat&&o.phase==='response';
  const ranked=o.actions.map((a,i)=>{let score=timed?timed[i]:scoreCpuAction(a,o,legacySpend,prof);if(idle&&a.kind!=='pass'&&!a.mandatory)score=Math.min(score,-1);if(prof.cap!==null&&score>0&&a.kind!=='choose')score=Math.min(score,prof.cap);return {id:a.id,score,tie:tie(seed,step,i)};}).sort((a,b)=>b.score-a.score||b.tie-a.tie);
  return {id:ranked[0].id,score:ranked[0].score,policy:POLICY_VERSION+'+'+(variant??'official')};
 };
}
