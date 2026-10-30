// EXPERIMENT COPY (2026-10-30) of ../../cpu-policy.mjs — not the official CPU. Isolated B1/B2/B3 switches,
// all OFF by default; with every switch off this file chooses exactly like the official policy (checked by
// tools/equivalence.mjs). Switches are passed through the existing `profile` override: {b1,b2,b3}.
//  b1: stat choices follow the open challenge's parameter (variant-bearing stat actions).
//  b2: on the seat's last turn horizon, cards/time with no later use are not held back.
//  b3: a trap is valued by its chance to fire (self-driven vs opponent-driven triggers).
// Needs the extra hints added by ./observe-exp.mjs (variantCond, statVariant, oppUsable, trapHint, horizon).
// Pure replaceable decision policy. No engine import, transition, random source or hidden state.
export const POLICY_VERSION='heuristic-1';
export const DIFFICULTIES=['beginner','intermediate'];
// Difficulty = judgment quality, not injected randomness. Beginner keeps the earlier, simpler evaluations:
// flat time penalty, flat search value, declares a challenge only when already ahead, and does not react on the
// opponent's turn unless required.
export const PROFILES={
 intermediate:{time:'opportunity',search:'deck',challenge:'expected',opponentTurn:true,cap:null},
 beginner:{time:'flat',search:'flat',challenge:'simple',opponentTurn:false,cap:12},
};
const other=a=>a==='A'?'B':'A';
function tie(seed,step,index){let n=(seed^Math.imul(step+1,2654435761)^Math.imul(index+1,2246822519))>>>0;n=Math.imul(n^(n>>>16),2246822507);return ((n^(n>>>13))>>>0)/4294967296;}
function cardValue(c,o){
 if(!c)return 0;const p=o.players[o.seat],b=p.board;
 if(c.type==='main'){const cost=!b.main?c.stage:b.main.species===c.species?c.stage-b.main.stage:c.stage;if(cost<=0)return 1;return (!b.main?16:4)+(cost<=Math.max(p.time,Math.min(10,o.round+1))?8:-3)+(b.main?.species===c.species?4:0)+Math.max(c.power??0,c.wisdom??0)*.3-cost*.6;}
 if(c.type==='partner')return b.partner?2:12;
 if(c.type==='companion')return b.companions.length<3?10:4;
 if(c.type==='world')return b.world?.cardId===c.cardId?1:b.world?3:8;
 return 5-Math.min(5,c.cost??0)*.4+(c.rare?1:0);
}
// Draw-equivalent scale: a random draw is worth 3, so a known/selected card is worth 3 x (its value / own deck mean).
function deckMean(o){let n=0,t=0;for(const c of o.deck??[]){t+=Math.max(0,cardValue(c,o))*c.count;n+=c.count;}return n?Math.max(1,t/n):null;}
const choose=(n,k)=>{if(k<0||k>n)return 0;let r=1;for(let i=1;i<=k;i++)r=r*(n-k+i)/i;return r;};
// E[min(X,max)] for X ~ Hypergeometric(N deck, K matching, n looked at).
function expectedHits(N,K,n,max){n=Math.min(n,N);if(!N||!K||!n)return 0;let e=0;const all=choose(N,n);for(let x=1;x<=Math.min(K,n);x++)e+=Math.min(x,max)*choose(K,x)*choose(N-K,n-x)/all;return e;}
function searchValue(s,o,prof){if(prof.search!=='deck')return null;const mean=deckMean(o);if(!s.hit||!mean)return null;const K=s.hit.matches.reduce((n,c)=>n+c.count,0);if(!K)return 0;
 const best=Math.max(0,...s.hit.matches.map(c=>cardValue(c,o)));return 3*expectedHits(s.hit.N,K,s.n,s.max??1)*best/mean;}
const growthMult=o=>o.round>=8?2.2:1.6;
// Growth-point value of a challenge result from the seat's view: +5 for the winner (capped at 100), draw 0.
function outcomeValue(sign,o){const me=o.players[o.seat],op=o.players[other(o.seat)];return sign>0?Math.min(5,100-me.growth)*growthMult(o):sign<0?-Math.min(5,100-op.growth)*growthMult(o):0;}
// Public-information estimate that the opponent answers a challenge with a 2-point swing (assumption: each face-down
// card 20%, a playable hand 15%). Uses counts only, never the opponent's card identities.
function opponentSwingChance(o){const x=o.challengeKit?.opponent??{faceDown:0,hand:0,time:0};return 1-Math.pow(.8,x.faceDown)*(x.time>0&&x.hand>0?.85:1);}
const STATS=new Set(['power','wisdom']);
const live=o=>Boolean(o.challenge&&!o.challenge.completed);
function betterStat(o){const me=o.players[o.seat].stats,op=o.players[other(o.seat)].stats;if(!me||!op)return null;const dp=me.power-op.power,dw=me.wisdom-op.wisdom;return dp===dw?null:dp>dw?'power':'wisdom';}
// b2: value of keeping one hand card. 'none' = no later turn of either seat in which this seat can act;
// 'oppOnly' = only the opponent's last turn remains (keep cards that are usable there, e.g. challenge stat cards).
// A card with no estimated effect must still rank below passing, hence a token 0.05 instead of 0.
const holdValue=(a,o,prof)=>!prof.b2||!o.horizon||o.horizon==='full'?3:o.horizon==='oppOnly'&&a.oppUsable?3:.05;
function stepValue(steps,o,a,prof=PROFILES.intermediate){
 const p=o.players[o.seat],opp=o.players[other(o.seat)],targetSign=a.targetSeat&&a.targetSeat!==o.seat?-1:1;
 return steps.reduce((total,s)=>{let n=Number(s.n??1),v=0;
 switch(s.op){
 case 'growth':v=(s.to==='opponent'?-1:1)*Math.min(Math.abs(n),n<0?(s.to==='opponent'?opp.growth:p.growth):100-(s.to==='opponent'?opp.growth:p.growth))*(n<0?-1:1)*(o.round>=8?2.2:1.6);break;
 case 'draw':v=(s.to==='opponent'?-1:1)*Math.min(n,p.deckCount)*3;break;
 case 'search':v=searchValue(s,o,prof)??(p.deckCount?5:0);break;
 case 'chooseTop':case 'revealTopType':case 'deepseaFishing':v=p.deckCount?5:0;break;
 case 'stat':if(prof.b1&&live(o)){const k=o.challenge.parameter,on=(k==='power'?s.power:s.wisdom)??0,off=(k==='power'?s.wisdom:s.power)??0;v=targetSign*(on*2.4+(s.duration==='turn'?off*.2:0));break;}
  v=targetSign*((s.power??0)+(s.wisdom??0))*(o.challenge?2.4:s.duration==='turn'&&o.turn!==o.seat?.2:1.1);break;
 case 'chosenStat':case 'battleStat':if(prof.b1&&s.op==='chosenStat'&&STATS.has(a.variant)){
   // The variant fixes which stat rises. In an open challenge only the compared stat matters; a turn-long boost of the
   // other stat keeps a small value (a later own challenge this turn). Outside a challenge prefer the larger own margin.
   if(live(o))v=a.variant===o.challenge.parameter?n*2:(s.duration==='turn'?n*.2:0);else v=n+(a.variant===betterStat(o)?.3:0);break;}
  v=n*(o.challenge?2:1);break;
 case 'move':case 'selectedMove':{const mean=deckMean(o);v=a.targetSeat===o.seat?(s.destination==='hand'?(a.targetZone==='ownDiscard'&&a.target&&!a.target.hidden&&mean?3*Math.max(0,cardValue(a.target,o))/mean:3):-6):a.targetSeat?7:2;break;}
 case 'negate':v=o.chain.some(l=>l.actor!==o.seat)?12:0;break;
 case 'discount':v=o.turn===o.seat?n*2:0.5;break;
 case 'handBottom':case 'handTop':v=-3;break;
 case 'schedule':v=stepValue(s.steps,o,a,prof)*(o.round===10?.1:.65);break;
 // targetPresent re-checks the action's own target, which is on the field whenever the action is offered.
 // b1: a branch guarded by the chosen variant applies exactly when that variant is the action's variant.
 case 'if':if(prof.b1&&s.variantCond!=null){v=a.variant===s.variantCond?stepValue(s.steps,o,a,prof):0;break;}
  v=stepValue(s.steps,o,a,prof)*(s.condition==='targetPresent'&&a.target?1:s.condition==='singleStageTimeSkip'?(a.timeSkipAfter?.includes(1)?1:0):.45);break;
 // A reserved time-skip effect is only worth something when a time-skip is still affordable this turn after paying for it.
 case 'reserve':v=s.when==='time_skip'?(a.timeSkipAfter?.length?stepValue(s.steps,o,a,prof):-20):s.steps?.length?stepValue(s.steps,o,a,prof)*.5:1;break;
 case 'chance':v=stepValue(s.steps,o,a,prof)*Math.max(0,Math.min(1,Number(s.p)||0));break;
 case 'coin':v=5;break;
 case 'growthVariant':v=Math.min(5,a.variant==='opponent'?opp.growth:100-p.growth)*(o.round>=8?2.2:1.6);break;
 case 'look':v=p.deckCount?1.5:0;break;
 default:v=s.steps?.length?stepValue(s.steps,o,a,prof)*.5:1;
 }return total+v;},0);
}
function choiceScore(a,o){
 const q=o.choice,c=a.choiceCard,p=o.players[o.seat],worth=cardValue(c,o);
 if(a.value==='cancel')return -10000;
 if(a.value==='done')return q?.selection?.cost?4:0;
 if(a.value==='decline')return -1;
 if(a.value==='power'||a.value==='wisdom'){const key=a.value;return o.challenge?.parameter===key?20:(p.stats?.[key]??0)-(o.players[other(o.seat)].stats?.[key]??0);}
 if(a.value==='bottom'||a.value==='top'||a.value==='keep'){const card=Array.isArray(q?.peek)?q.peek[0]:q?.peek;const good=cardValue(card,o)>=7;return (a.value==='bottom'?!good:good)?8:0;}
 if(c){const discard=/bottom|handTop|handBottom/.test(q?.kind??'')||q?.selection?.cost||q?.selection?.destination==='discard'||q?.destination==='discard';const enemy=a.targetSeat&&a.targetSeat!==o.seat;return (discard?-1:1)*worth*(enemy?-1:1);}
 return 2; // Legal opaque alternatives (orders/declarations/replacements); deterministic tie break.
}
// Previous flat time penalty. Still used where later normal actions compete for the same time (own-turn response/choice).
export const legacySpend=(a,o)=>(a.cost??0)*(o.round<4?2.6:1.25);
// b2: time left after the last turn horizon is worthless, so the flat penalty does not apply there.
const spendB2=(base,prof)=>prof.b2?(a,o)=>o.horizon==='none'?0:base(a,o):base;
// Expected growth value of declaring: own known modifiers (challengeKit) against the opponent swing estimate above.
function challengeValue(a,o){
 const me=o.players[o.seat].stats,op=o.players[other(o.seat)].stats,k=a.parameter;if(!me||!op)return -15;
 const kit=o.challengeKit??{own:[],opponent:{faceDown:0,hand:0,time:0}},t=o.players[o.seat].time??0;
 const usable=kit.own.filter(x=>(x.param===k||x.param==='any')&&(!x.only||x.only===k)).sort((x,y)=>y.n-x.n||x.cost-y.cost);
 const q=opponentSwingChance(o),d=me[k]-op[k];
 const resolve=x=>{let m=d-x,cost=0,time=t;for(const u of usable){if(m>0)break;if(u.cost>time)continue;m+=u.n;time-=u.cost;cost+=(u.card?3:0)+legacySpend(u,o);}return outcomeValue(Math.sign(m),o)-(m>0||m===0?cost:0);};
 // Declaring uses the once-per-turn challenge, which could otherwise follow a later improvement this turn.
 return (1-q)*resolve(0)+q*resolve(2)-.5;
}
export function scoreCpuAction(a,o,spendOf=legacySpend,prof=PROFILES.intermediate){
 const p=o.players[o.seat],opp=o.players[other(o.seat)],b=p.board,c=a.card;
 if(a.kind==='choose')return choiceScore(a,o);
 if(a.kind==='pass')return 0;
 if(a.kind==='skip')return -0.1;
 const spend=spendOf(a,o);
 if(a.kind==='place'){
  if(a.slot==='main'){if(a.variant==='birth')return 40+Math.max(c?.power??0,c?.wisdom??0)-spend;const improvement=Math.max(c?.power??0,c?.wisdom??0)-Math.max(p.stats?.power??0,p.stats?.wisdom??0);return (a.variant==='time_skip'?13+Math.min(a.timeSkipBonus??0,100-p.growth)*growthMult(o):0)+improvement*2+(c?.stage??0)-(b.main?.stage??0)-spend;}
  if(a.slot==='partner')return 20+(b.main?6:0);
  if(a.slot==='companions')return a.target?cardValue(c,o)-cardValue(a.target,o)-2:15;
  if(a.slot==='world')return (b.world?.cardId===c?.cardId?-6:b.world?3:9)-spend;
  if(a.slot==='prepared'){if(prof.b3&&a.trapHint)return (7+(b.main?2:0))*a.trapHint.p-spend;return 7-spend+(b.main?2:0);}
 }
 if(a.kind==='relationship')return (p.relationship===3?28:17)-spend;
 if(a.kind==='challenge'){if(prof.challenge==='expected')return challengeValue(a,o);const delta=(p.stats?.[a.parameter]??0)-(opp.stats?.[a.parameter]??0);return delta>0?12+Math.min(delta,8):delta===0?-2:-15;}
 let value=a.program?stepValue(a.program.steps,o,a,prof):0;
 // Legacy cards expose canonical text rather than a rule program. Estimate utility only;
 // all effects are still executed exclusively by engine.act.
 if(!a.program&&c){const t=c.text??'';if(/そだち|成長/.test(t))value+=8;if(/引く|手札に|回収/.test(t))value+=5;if(/ちから|ちえ/.test(t))value+=o.challenge?5:1;}
 if(a.kind==='ability')value+=5;
 if(a.kind==='trigger'&&!a.program)value+=4;
 const keep=holdValue(a,o,prof)/3; // 1 normally; 0 when a hand card has no later use (b2)
 if(a.program?.handCost)value-=cardValue(a.costCard,o)*.7*keep;
 if(a.program?.selfCost)value-=5;
 value-=(a.program?.select??[]).filter(g=>g.cost).reduce((n,g)=>n+g.count*3,0)*keep;
 if(a.costCard)value-=cardValue(a.costCard,o)*.25*keep;
 if(['play','programPlay'].includes(a.kind))value-=holdValue(a,o,prof);
 value-=spend;
 // Play a reserved time-skip effect before the time-skip it waits for: the pair is worth at least the best such time-skip.
 if(a.timeSkipAfter?.length){const left=(p.time??0)-(a.cost??0);value+=Math.max(0,...o.actions.filter(x=>x.kind==='place'&&x.variant==='time_skip'&&(x.cost??0)<=left).map(x=>scoreCpuAction(x,o,spendOf,prof)));}
 if(a.mandatory)return Math.max(1,value);
 if(!['programPlay','play','programAbility','ability','trigger'].includes(a.kind))throw Error('Unknown CPU action kind: '+a.kind);
 return value;
}
// Time is reset to the round number at each own turn start (engine beginTurn) and never carries over. In the own normal
// phase and on the opponent's turn, paying time only costs what it makes unaffordable: the best other candidate now,
// or one card-equivalent (3) when a held reaction card could no longer be paid for.
export function timeOpportunity(o,prof=PROFILES.intermediate){
 const own=o.turn===o.seat;if(prof.time!=='opportunity'||!(own&&o.phase==='normal')&&own)return null;
 const t=o.players[o.seat].time??0,base=o.actions.map(a=>scoreCpuAction(a,o,()=>0,prof));
 return o.actions.map((a,i)=>{const c=a.cost??0;if(c<=0)return base[i];const left=t-c;
  // A reserved time-skip effect does not give up a time-skip that is still affordable afterwards (e.g. a cheaper quote of it).
  const keptSkip=b=>a.timeSkipAfter?.length&&b.kind==='place'&&b.variant==='time_skip'&&o.actions.some(x=>x.kind==='place'&&x.variant==='time_skip'&&x.card?.id===b.card?.id&&(x.cost??0)<=left);
  let alt=0;o.actions.forEach((b,j)=>{if(j!==i&&(b.cost??0)>left&&(b.cost??0)>0&&!(a.card&&b.card?.id===a.card.id)&&!['pass','choose','skip'].includes(b.kind)&&!keptSkip(b))alt=Math.max(alt,base[j]);});
  const reserve=own&&(o.reactive??[]).some(r=>r.id!==a.card?.id&&r.cost<=t&&r.cost>left)?3:0;
  return base[i]-Math.max(alt,reserve);});
}
// `profile` overrides individual evaluation features (verification experiments only; play uses `difficulty`).
export function chooseCpuAction(observation,{difficulty='intermediate',seed=1,step=0,profile=null}={}){
 if(!DIFFICULTIES.includes(difficulty))throw Error('Unsupported CPU difficulty');
 if(!observation?.actions?.length)throw Error('CPU has no legal candidates');
 const prof={...PROFILES[difficulty],...profile},o=observation,timed=timeOpportunity(o,prof),spend=spendB2(legacySpend,prof);
 // Beginner does not react on the opponent's turn: only required choices/triggers and passing.
 const idle=!prof.opponentTurn&&o.turn!==o.seat&&o.phase==='response';
 const ranked=o.actions.map((a,i)=>{let score=timed?timed[i]:scoreCpuAction(a,o,spend,prof);if(!Number.isFinite(score))throw Error('Non-finite CPU evaluation');if(idle&&a.kind!=='pass'&&!a.mandatory)score=Math.min(score,-1);if(prof.cap!==null&&score>0&&a.kind!=='choose')score=Math.min(score,prof.cap);return {id:a.id,score,tie:tie(seed,step,i)};}).sort((a,b)=>b.score-a.score||b.tie-a.tie);
 return {id:ranked[0].id,score:ranked[0].score,policy:POLICY_VERSION};
}
