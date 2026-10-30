// EXPERIMENT adapter (2026-10-30). Wraps the official ../../cpu-observation.mjs and adds hints used only by the
// B1/B2/B3 switches of ./policy-exp.mjs. Same trust boundary as the official adapter: the acting seat's own cards,
// public information (both discards, face-up field, counts) and static card rules. Never the opponent's hand or deck.
// With the switches off the policy ignores every added field, so choices equal the official CPU.
import {observeCpu} from '../../cpu-observation.mjs';
import {legalActions,CARDS} from '../../engine.mjs';
import {RULES} from '../../rules.mjs';
import {effectiveRule} from '../../ability-copy.mjs';
const other=a=>a==='A'?'B':'A',cid=(s,id)=>s.cards[id]?.cardId;
const ACTION=new Set(['play','item','event']);
// B1: copy `{variant:X}` guards of if-steps onto the hint tree (the official hint keeps string conditions only).
function variantConds(hint,rule){if(!hint||!rule)return;hint.forEach((h,i)=>{const r=rule[i];if(!r||r.op!==h.op)return;
 if(r.op==='if'&&r.condition&&typeof r.condition==='object'&&r.condition.variant!=null)h.variantCond=r.condition.variant;variantConds(h.steps,r.steps);});}
function ruleSteps(s,raw){const c=cid(s,raw.source);if(!c)return null;const r=effectiveRule(s,raw.source,RULES[c]);
 if(raw.kind==='programPlay')return r?.steps;if(raw.kind==='programAbility')return r?.active?.steps;
 if(raw.kind==='trigger')return s.pending.find(t=>t.source===raw.source&&t.index===raw.index)?.program?.steps;return null;}
// B2: remaining turn horizon of `seat` (A always moves first in a round).
function horizon(s,seat){if(s.round<10)return 'full';if(s.turn==='A')return seat==='B'?'full':'oppOnly';return 'none';}
const hasStat=st=>(st??[]).some(x=>['stat','chosenStat','battleStat'].includes(x.op)||hasStat(x.steps));
// A hand card that could still matter on the opponent's last turn: a quick card not limited to the own turn/own
// declaration that changes stats (challenge defence) or is a reaction card.
function oppUsable(cardId){const r=RULES[cardId];if(r?.mode!=='quick'&&!r?.reaction)return false;const c=JSON.stringify(r.condition??null);
 if(/ownTurn|baseball|noRoundChallenge/.test(c))return false;return Boolean(r.reaction)||hasStat(r.steps);}
// B3: chance that a trap fires before the game ends. Generic tiers by who drives the trigger:
//  timing (start/end) -> fires if such a timing remains; self-driven -> needs a later own turn when "setEarlier",
//  0.5 when it has another condition; opponent-driven -> per-turn rate from the opponent's PUBLIC action cards
//  matching the condition (Laplace-style prior 0.25/2.5), over the opponent turns left.
const OPP_MATCH={
 eventCheapActionTargetsOwn:c=>ACTION.has(c.type)&&(c.cost??0)<=2&&/^opponent/.test(RULES[c.id]?.target??''),
 eventCheapQuickPlay:c=>c.method==='すぐつかう'&&(c.cost??0)<=2,
 eventRemovesOwnPrepared:c=>/^opponent(Prepared|Trap)/.test(RULES[c.id]?.target??''),
 eventRemovesMain:c=>/^opponentMain/.test(RULES[c.id]?.target??''),
};
function trapChance(s,seat,cardId){
 const r=RULES[cardId],p=s.players[seat],o=s.players[other(seat)];if(!r?.triggers?.length)return 1;
 const ownLeft=10-s.round,oppLeft=seat==='A'?10-s.round+1:10-s.round,oppSeen=seat==='A'?s.round-1:s.round;
 const pub=[...o.discard,...o.board.prepared.filter(e=>!e.faceDown).map(e=>e.id)].map(id=>CARDS[cid(s,id)]).filter(Boolean);
 let best=0;
 for(const t of r.triggers){let q;
  if(t.when==='start'||t.when==='end'){q=t.opponent?(oppLeft>0?1:0):(t.when==='end'?1:ownLeft>0?1:0);if(t.condition)q*=.5;}
  else if(!t.opponent){const later=t.condition==='setEarlier';q=later?(ownLeft>0?1:0):t.condition?.5:1;}
  else{const m=OPP_MATCH[t.condition],hits=t.when==='trapActivation'?o.board.prepared.filter(e=>e.faceDown).length:m?pub.filter(m).length:0;
   const rate=Math.min(1,(hits+.25)/(oppSeen+2.5));q=1-Math.pow(1-rate,Math.max(0,oppLeft));}
  best=Math.max(best,q);}
 return Math.round(best*1000)/1000;
}
export function observeExp(s,seat){
 const o=structuredClone(observeCpu(s,seat)),raw=legalActions(s);
 o.horizon=horizon(s,seat);
 o.actions.forEach((a,i)=>{const x=raw[i];
  if(a.program?.steps)variantConds(a.program.steps,ruleSteps(s,x));
  const c=x.source?cid(s,x.source):null;
  if(c&&s.players[seat].hand.includes(x.source))a.oppUsable=oppUsable(c);
  if(x.kind==='place'&&x.trap)a.trapHint={p:trapChance(s,seat,c)};
 });
 return o;
}
export {trapChance,horizon};
