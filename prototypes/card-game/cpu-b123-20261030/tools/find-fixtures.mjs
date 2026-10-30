// Collects real positions for the B1 RED/GREEN tests from the fixed manifest (base arm = official CPU choices).
// Each fixture is the official save text (seed + decks + command list), restored by engine.restore, so the test
// position is exact. Categories: ski-jump / street-fight x power / wisdom challenge, tie, decided (|margin|>=4),
// opponent's challenge (reaction during a chain).  Usage: node tools/find-fixtures.mjs runs/T-manifest.json tests/fixtures.json
import {readFileSync,writeFileSync} from 'node:fs';
import * as e from '../../engine.mjs';
import {play} from './exp-run.mjs';
const [manifestPath,out]=process.argv.slice(2);
const M=JSON.parse(readFileSync(manifestPath,'utf8')),cid=(s,id)=>s.cards[id]?.cardId,other=a=>a==='A'?'B':'A';
const want=['ski:power','ski:wisdom','ski:tie','ski:decided','fight:power:opp','fight:wisdom:opp','fight:tie:any','fight:own'];
const F={};
for(const m of M.matches.filter(m=>m.pair==='II'&&[m.deckA,m.deckB].includes('challenge'))){
 if(want.every(k=>F[k]))break;
 play(M,m,'base',{onDecision:(s,a,o,d,act)=>{
  if(!s.challenge||s.challenge.completed)return;const c=act.source?cid(s,act.source):null;
  const cands=e.legalActions(s).filter(x=>x.source&&['G-ski-jump','G-street-fight'].includes(cid(s,x.source))&&x.variant);if(!cands.length)return;
  const card=cid(s,cands[0].source),k=s.challenge.parameter,margin=e.stats(s,a)[k]-e.stats(s,other(a))[k],own=s.turn===a;
  const keys=card==='G-ski-jump'?[`ski:${k}`,margin===0?'ski:tie':null,Math.abs(margin)>=4?'ski:decided':null]:[own?'fight:own':`fight:${k}:opp`,margin===0?'fight:tie:any':null];
  for(const key of keys.filter(Boolean))if(!F[key])F[key]={match:m.match,seat:a,card,parameter:k,margin,ownTurn:own,chain:s.chain.length,round:s.round,save:e.save(s)};
 }});
}
writeFileSync(out,JSON.stringify(F,null,1));
console.log(Object.fromEntries(Object.entries(F).map(([k,v])=>[k,`${v.match} ${v.seat} R${v.round} ${v.parameter} margin${v.margin} chain${v.chain}`])));
