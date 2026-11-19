// Read-only replay of the TR matches that contain スキージャンプ or かくとうバトル (challenge, item and balance decks).
// For every activation during a challenge, records which stat the CPU chose and whether it matches the parameter
// being compared, and whether the final comparison would have changed had the right stat been chosen (+3 / +1).
// Same official decision loop; nothing is changed. Usage: node lib/variant-audit.mjs > results/variant-audit.json
import {readFileSync} from 'node:fs';
import * as e from '../../engine.mjs';
import {observeCpu} from '../../cpu-observation.mjs';
import {chooseCpuAction} from '../../cpu-policy.mjs';
import {advanceResponses} from '../../auto-progress.mjs';
import {permutations,inputFor,apply} from '../../balance-verification-20261020/lib.mjs';
const here=new URL('..',import.meta.url).pathname,M=JSON.parse(readFileSync(here+'runs/TR-manifest.json','utf8'));
const STAT={'パンチ':'power','キック':'power','ガード':'wisdom',power:'power',wisdom:'wisdom'},GAIN={'パンチ':1,'キック':3,'ガード':2,power:3,wisdom:3};
const rows=[];
for(const m of M.matches.filter(m=>['challenge','item','balance'].includes(m.deckA))){
 const g=M.groups.find(x=>x.group===m.group),perm=permutations(g.orderSeed),order={X:apply(M.decks[g.X].cards,perm.A),Y:apply(M.decks[g.Y].cards,perm.B)};
 const so={A:m.first==='X'?order.X:order.Y,B:m.first==='X'?order.Y:order.X};
 let s=e.createGame(g.orderSeed,{A:inputFor(so.A,perm.A),B:inputFor(so.B,perm.B)});s=advanceResponses(s).state;const step={A:0,B:0};const open=[];
 for(let n=0;n<6000&&s.phase!=='finished';n++){
  const a=e.actor(s),o=observeCpu(s,a),d=chooseCpuAction(o,{difficulty:m.difficulty[a],seed:m.policySeed[a],step:step[a]}),i=o.actions.findIndex(x=>x.id===d.id),raw=e.legalActions(s)[i];
  const card=raw.source&&s.cards[raw.source]?.cardId;
  if(s.challenge&&['G-ski-jump','G-street-fight'].includes(card)&&['trigger','programPlay'].includes(raw.kind))
   open.push({match:m.match,seat:a,difficulty:m.difficulty[a],card,round:s.round,param:s.challenge.parameter,variant:raw.variant,right:STAT[raw.variant]===s.challenge.parameter,challengeId:s.challenge.id,ownChallenge:s.turn===a,
    alternatives:o.actions.filter(x=>x.card?.cardId===card).length});
  const before=s;s=e.act(s,a,s.revision,raw.id);step[a]++;s=advanceResponses(s).state;
  // close rows when the comparison is recorded
  const h=s.history.slice(before.history.length).filter(x=>x.kind==='comparison');
  for(const c of h)for(const r of open.filter(r=>r.outcome===undefined&&r.round===c.round)){r.values=c.values;r.winner=c.winner;
   if(!r.right){const v={...c.values};v[r.seat]+=GAIN[r.variant];const w=v.A>v.B?'A':v.B>v.A?'B':null;r.flipWithRightStat=w!==(c.winner??null);}r.outcome=c.winner===r.seat?'win':c.winner?'loss':'draw';}
 }
 rows.push(...open);
}
const sum={};for(const r of rows){const k=`${r.difficulty}|${r.card}`;const t=sum[k]??={activations:0,rightStat:0,wrongStat:0,wrongAndResultWouldChange:0};t.activations++;r.right?t.rightStat++:t.wrongStat++;if(r.flipWithRightStat)t.wrongAndResultWouldChange++;}
console.log(JSON.stringify({engine:e.VERSION,note:'flipWithRightStat: adding the same card\'s gain to the challenged stat instead would change the compared winner (approximation: same final values otherwise)',summary:sum,rows},null,1));
