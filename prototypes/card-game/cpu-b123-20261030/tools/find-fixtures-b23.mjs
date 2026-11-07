// Collects real positions for the B2/B3 tests (official CPU = base arm), stored as official save text.
// Usage: node tools/find-fixtures-b23.mjs runs/T-manifest.json tests/fixtures-b23.json
import {readFileSync,writeFileSync} from 'node:fs';
import * as e from '../../engine.mjs';
import {RULES} from '../../rules.mjs';
import {play} from './exp-run.mjs';
const [manifestPath,out]=process.argv.slice(2);
const M=JSON.parse(readFileSync(manifestPath,'utf8')),cid=(s,id)=>s.cards[id]?.cardId;
const want=['b2:last:B','b2:last:A:oppUsable','b2:last:A:plain','b2:r9','b3:missile:early','b3:missile:late','b3:ski:r10','b3:ski:early','b3:takoyaki'];
const F={};
const paid=(s,acts)=>acts.filter(x=>['play','programPlay'].includes(x.kind)&&(x.cost??0)>0&&s.players[e.actor(s)].hand.includes(x.source));
for(const m of M.matches.filter(m=>m.pair==='II'||m.pair==='BB')){
 if(want.every(k=>F[k]))break;
 play(M,m,'base',{onDecision:(s,a,o,d,act)=>{
  if(s.phase!=='normal'||s.turn!==a)return;const raw=e.legalActions(s),pp=paid(s,raw),cards=pp.map(x=>cid(s,x.source));
  const put=(k)=>{if(!F[k])F[k]={match:m.match,seat:a,difficulty:m.difficulty[a],round:s.round,cards:[...new Set(cards)],save:e.save(s)};};
  if(act.kind==='pass'&&pp.length){
   if(s.round===10&&a==='B')put('b2:last:B');
   if(s.round===10&&a==='A'&&cards.includes('G-street-fight'))put('b2:last:A:oppUsable');
   if(s.round===10&&a==='A'&&!cards.includes('G-street-fight'))put('b2:last:A:plain');
   if(s.round===9)put('b2:r9');}
  const traps=raw.filter(x=>x.kind==='place'&&x.trap).map(x=>cid(s,x.source));
  if(traps.includes('G-missile-command'))put(s.round<=3?'b3:missile:early':s.round>=7?'b3:missile:late':'_');
  if(traps.includes('G-ski-jump'))put(s.round===10?'b3:ski:r10':s.round<=4?'b3:ski:early':'_');
  if(traps.includes('G-takoyaki-grill'))put('b3:takoyaki');
 }});
}
delete F._;writeFileSync(out,JSON.stringify(F,null,1));
console.log(Object.fromEntries(Object.entries(F).map(([k,v])=>[k,`${v.match} ${v.seat} ${v.difficulty} R${v.round} ${v.cards.join(',')}`])),want.filter(k=>!F[k]));
