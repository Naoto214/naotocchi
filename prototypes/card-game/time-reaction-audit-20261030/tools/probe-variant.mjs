// Natural-match check (2026-10-30): when a challenge stat card is activated during a challenge, does the chosen
// stat match the challenge parameter? Covers スキージャンプ (trap, power/wisdom +3), かくとうバトル
// (パンチ/キック=ちから, ガード=ちえ) and every other variant-bearing stat action. Observation only.
// Usage: node tools/probe-variant.mjs runs/T-manifest.json results/variant-shardK.json K N
import {readFileSync,writeFileSync} from 'node:fs';
import * as e from '../../engine.mjs';
import {play} from './audit-run.mjs';
const [manifestPath,out,shard='0',shards='1']=process.argv.slice(2);
const M=JSON.parse(readFileSync(manifestPath,'utf8')),cid=(s,id)=>s.cards[id]?.cardId,other=a=>a==='A'?'B':'A';
const STAT={power:'power',wisdom:'wisdom','パンチ':'power','キック':'power','ガード':'wisdom'};
const rows=[];
const pool=M.matches.filter(m=>[m.deckA,m.deckB].some(d=>['challenge','item','balance'].includes(d))).filter((m,i)=>i%Number(shards)===Number(shard));
for(const m of pool){
 const hook=(s,a,o,d,act)=>{
  if(!s.challenge||s.challenge.completed||!act.variant||!(act.variant in STAT))return;
  const card=cid(s,act.source),k=s.challenge.parameter,me=e.stats(s,a),op=e.stats(s,other(a));
  rows.push({match:m.match,pair:m.pair,seat:a,difficulty:m.difficulty[a],card,kind:act.kind,variant:act.variant,stat:STAT[act.variant],parameter:k,match_:STAT[act.variant]===k,ownTurn:s.turn===a,margin:me&&op?me[k]-op[k]:null,round:s.round});
 };
 try{play(M,m,{onDecision:hook});}catch(err){process.stderr.write(m.match+' '+err.message+'\n');}
}
writeFileSync(out,JSON.stringify(rows));
