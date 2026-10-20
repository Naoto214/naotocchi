// Decision-level diagnostic (read-only). Replays manifest matches with the current CPU and classifies:
//  - response windows: why the CPU passed; - normal turn ends with unspent time: why; - per-card candidate scores.
// Usage: node diag.mjs <manifest> <out.json> [shard] [shards]
import {readFileSync,writeFileSync} from 'node:fs';
import * as e from '../engine.mjs';import {observeCpu} from '../cpu-observation.mjs';import {chooseCpuAction,scoreCpuAction} from '../cpu-policy.mjs';
import {advanceResponses} from '../auto-progress.mjs';import {RULES} from '../rules.mjs';import {permutations,inputFor,apply} from '../balance-verification-20261020/lib.mjs';
const [manifestPath,out,shard='0',shards='1']=process.argv.slice(2);
const M=JSON.parse(readFileSync(manifestPath,'utf8')),G=Object.fromEntries(M.groups.map(g=>[g.group,g]));
const cid=(s,id)=>s.cards[id]?.cardId;const inc=(o,k,n=1)=>{o[k]=(o[k]??0)+n;};
const resp={},endT={},limits={},cardStat={},respCard={},auto={n:0};
const free=(a,o)=>scoreCpuAction({...a,cost:0},o);
const quickCapable=id=>{const c=e.CARDS[id];return ['play','item','event'].includes(c.type)&&(RULES[id]?.mode==='quick'||RULES[id]?.reaction||!RULES[id]);};
for(const [mi,m] of M.matches.entries()){if(mi%Number(shards)!==Number(shard))continue;
 const g=G[m.group],perm=permutations(g.orderSeed),order={X:apply(M.decks[g.X].cards,perm.A),Y:apply(M.decks[g.Y].cards,perm.B)};
 const so={A:m.first==='X'?order.X:order.Y,B:m.first==='X'?order.Y:order.X};
 let s=e.createGame(g.orderSeed,{A:inputFor(so.A,perm.A),B:inputFor(so.B,perm.B)});const step={A:0,B:0};
 const adv=()=>{for(;;){if(s.phase!=='response'||s.choice||s.pending?.length)return;const r=e.legalActions(s);if(r.length!==1)return;const a=e.actor(s),p=s.players[a];
   inc(resp,(p.hand.some(id=>quickCapable(cid(s,id)))?'R0b_card_but_no_legal_candidate':'R0a_no_response_card')+(a===s.turn?':own_turn':':opp_turn'));auto.n++;s=e.act(s,a,s.revision,r[0].id);}};adv();
 for(let n=0;s.phase!=='finished'&&n<6000;n++){
  const a=e.actor(s),o=observeCpu(s,a),raw=e.legalActions(s),d=chooseCpuAction(o,{difficulty:m.difficulty[a],seed:m.policySeed[a],step:step[a]}),i=o.actions.findIndex(x=>x.id===d.id),p=s.players[a];
  const scored=o.actions.map((x,k)=>({x,k,sc:scoreCpuAction(x,o),fr:free(x,o),id:raw[k].source?cid(s,raw[k].source):null}));
  for(const c of scored){if(!c.id||['choose','pass'].includes(c.x.kind))continue;const st=cardStat[c.id]??={offered:0,chosen:0,positive:0,freePositive:0,best:-1e9,decisionsOffered:0};st.offered++;if(c.sc>0)st.positive++;if(c.fr>0)st.freePositive++;st.best=Math.max(st.best,c.sc);if(c.k===i)st.chosen++;}
  for(const id of new Set(scored.filter(c=>c.id&&!['choose','pass'].includes(c.x.kind)).map(c=>c.id)))cardStat[id].decisionsOffered++;
  const others=scored.filter(c=>c.x.kind!=='pass');
  if(s.phase==='response'&&!s.choice){
   const handQuick=p.hand.some(id=>quickCapable(cid(s,id)))||p.board.prepared.some(x=>x.faceDown);
   const cat=!others.length?(handQuick?'R0b_card_but_no_legal_candidate':'R0a_no_response_card'):raw[i].kind!=='pass'?'R3_used':others.every(c=>c.fr<=0)?'R1_legal_but_low_value':'R2_value_but_cost';
   inc(resp,cat+(a===s.turn?':own_turn':':opp_turn'));
   for(const c of others){const r=respCard[c.id??c.x.kind]??={offered:0,freePositive:0,positive:0,chosen:0};r.offered++;if(c.fr>0)r.freePositive++;if(c.sc>0)r.positive++;if(c.k===i)r.chosen++;}
  }
  if(s.phase==='normal'&&raw[i].kind==='pass'){
   const t=p.time;const costly=others.filter(c=>(c.x.cost??0)>0);
   const cat=t===0?'T_none_left':!costly.length?(others.length?'T1_only_free_actions_left':'T0_no_legal_time_action'):costly.every(c=>c.fr<=0)?'T2_time_actions_low_value':'T3_time_actions_valued_but_cost';
   inc(endT,cat);inc(endT,'timeLeft:'+cat,t);
   if(t>0){const hand=p.hand.map(id=>e.CARDS[cid(s,id)]);inc(limits,'turnsWithTime');
    inc(limits,'handCardsTotal',hand.length);inc(limits,'handUnaffordable',hand.filter(c=>(c.type==='main'?e.mainCost(p.board.main?cid(s,p.board.main):null,c.id):c.cost)>t).length);
    if(p.personUsed)inc(limits,'personUsed');if(p.relationshipUsed)inc(limits,'relationshipUsed');if(p.challengeUsed)inc(limits,'challengeUsed');if(p.board.prepared.length>=3)inc(limits,'preparedFull');
    for(const c of costly)if(c.fr>0&&c.sc<=0)inc(limits,'costAverse:'+c.id);}
  }
  s=e.act(s,a,s.revision,raw[i].id);step[a]++;adv();
 }
}
for(const v of Object.values(cardStat))v.best=Math.round(v.best*100)/100;
writeFileSync(out,JSON.stringify({manifest:manifestPath,shard,shards,responses:resp,turnEnds:endT,limits,autoPass:auto.n,cards:cardStat,responseCandidates:respCard},null,1));
