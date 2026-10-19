// Pure replaceable decision policy. No engine import, transition, random source or hidden state.
export const POLICY_VERSION='heuristic-1';
export const DIFFICULTIES=['beginner','intermediate'];
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
function stepValue(steps,o,a){
 const p=o.players[o.seat],opp=o.players[other(o.seat)],targetSign=a.targetSeat&&a.targetSeat!==o.seat?-1:1;
 return steps.reduce((total,s)=>{let n=Number(s.n??1),v=0;
 switch(s.op){
 case 'growth':v=(s.to==='opponent'?-1:1)*Math.min(Math.abs(n),n<0?(s.to==='opponent'?opp.growth:p.growth):100-(s.to==='opponent'?opp.growth:p.growth))*(n<0?-1:1)*(o.round>=8?2.2:1.6);break;
 case 'draw':v=(s.to==='opponent'?-1:1)*Math.min(n,p.deckCount)*3;break;
 case 'search':case 'chooseTop':case 'revealTopType':case 'deepseaFishing':v=p.deckCount?5:0;break;
 case 'stat':v=targetSign*((s.power??0)+(s.wisdom??0))*(o.challenge?2.4:s.duration==='turn'&&o.turn!==o.seat?.2:1.1);break;
 case 'chosenStat':case 'battleStat':v=n*(o.challenge?2:1);break;
 case 'move':case 'selectedMove':v=a.targetSeat===o.seat?(s.destination==='hand'?3:-6):a.targetSeat?7:2;break;
 case 'negate':v=o.chain.some(l=>l.actor!==o.seat)?12:0;break;
 case 'discount':v=o.turn===o.seat?n*2:0.5;break;
 case 'handBottom':case 'handTop':v=-3;break;
 case 'schedule':v=stepValue(s.steps,o,a)*(o.round===10?.1:.65);break;
 case 'if':v=stepValue(s.steps,o,a)*.45;break;
 case 'coin':v=5;break;
 case 'growthVariant':v=Math.min(5,a.variant==='opponent'?opp.growth:100-p.growth)*(o.round>=8?2.2:1.6);break;
 case 'look':v=p.deckCount?1.5:0;break;
 default:v=s.steps?.length?stepValue(s.steps,o,a)*.5:1;
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
export function scoreCpuAction(a,o){
 const p=o.players[o.seat],opp=o.players[other(o.seat)],b=p.board,c=a.card;
 if(a.kind==='choose')return choiceScore(a,o);
 if(a.kind==='pass')return 0;
 if(a.kind==='skip')return -0.1;
 const cost=a.cost??0,spend=cost*(o.round<4?2.6:1.25);
 if(a.kind==='place'){
  if(a.slot==='main'){if(a.variant==='birth')return 40+Math.max(c?.power??0,c?.wisdom??0)-spend;const improvement=Math.max(c?.power??0,c?.wisdom??0)-Math.max(p.stats?.power??0,p.stats?.wisdom??0);return (a.variant==='time_skip'?13:0)+improvement*2+(c?.stage??0)-(b.main?.stage??0)-spend;}
  if(a.slot==='partner')return 20+(b.main?6:0);
  if(a.slot==='companions')return a.target?cardValue(c,o)-cardValue(a.target,o)-2:15;
  if(a.slot==='world')return (b.world?.cardId===c?.cardId?-6:b.world?3:9)-spend;
  if(a.slot==='prepared')return 7-spend+(b.main?2:0);
 }
 if(a.kind==='relationship')return (p.relationship===3?28:17)-spend;
 if(a.kind==='challenge'){const delta=(p.stats?.[a.parameter]??0)-(opp.stats?.[a.parameter]??0);return delta>0?12+Math.min(delta,8):delta===0?-2:-15;}
 let value=a.program?stepValue(a.program.steps,o,a):0;
 // Legacy cards expose canonical text rather than a rule program. Estimate utility only;
 // all effects are still executed exclusively by engine.act.
 if(!a.program&&c){const t=c.text??'';if(/そだち|成長/.test(t))value+=8;if(/引く|手札に|回収/.test(t))value+=5;if(/ちから|ちえ/.test(t))value+=o.challenge?5:1;}
 if(a.kind==='ability')value+=5;
 if(a.kind==='trigger'&&!a.program)value+=4;
 if(a.program?.handCost)value-=cardValue(a.costCard,o)*.7;
 if(a.program?.selfCost)value-=5;
 value-=(a.program?.select??[]).filter(g=>g.cost).reduce((n,g)=>n+g.count*3,0);
 if(a.costCard)value-=cardValue(a.costCard,o)*.25;
 if(['play','programPlay'].includes(a.kind))value-=3;
 value-=spend;
 if(a.mandatory)return Math.max(1,value);
 if(!['programPlay','play','programAbility','ability','trigger'].includes(a.kind))throw Error('Unknown CPU action kind: '+a.kind);
 return value;
}
export function chooseCpuAction(observation,{difficulty='intermediate',seed=1,step=0}={}){
 if(!DIFFICULTIES.includes(difficulty))throw Error('Unsupported CPU difficulty');
 if(!observation?.actions?.length)throw Error('CPU has no legal candidates');
 const ranked=observation.actions.map((a,i)=>{let score=scoreCpuAction(a,observation);if(!Number.isFinite(score))throw Error('Non-finite CPU evaluation');if(difficulty==='beginner'&&score>0&&a.kind!=='choose')score=Math.min(score,12);return {id:a.id,score,tie:tie(seed,step,i)};}).sort((a,b)=>b.score-a.score||b.tie-a.tie);
 return {id:ranked[0].id,score:ranked[0].score,policy:POLICY_VERSION};
}
