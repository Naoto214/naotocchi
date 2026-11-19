// Shows the first decision where two arms diverge in the same match (both replayed from the fixed manifest).
// Usage: node tools/first-diff.mjs runs/T-manifest.json <armA> <armB> <match> [<match> ...]
import {readFileSync} from 'node:fs';
import * as e from '../../engine.mjs';
import {play} from './exp-run.mjs';
const [manifestPath,x,y,...ids]=process.argv.slice(2);
const M=JSON.parse(readFileSync(manifestPath,'utf8')),cid=(s,id)=>s.cards[id]?.cardId;
const trace=(m,arm)=>{const t=[];play(M,m,arm,{onDecision:(s,a,o,d,act)=>t.push({rev:s.revision,round:s.round,turn:s.turn,seat:a,phase:s.phase,challenge:s.challenge&&!s.challenge.completed?s.challenge.parameter:null,
 act:`${act.kind}:${act.source?cid(s,act.source):''}${act.variant?'/'+act.variant:''}`,growth:{A:s.players.A.growth,B:s.players.B.growth}})});return t;};
for(const id of ids){const m=M.matches.find(z=>z.match===id),a=trace(m,x),b=trace(m,y);const i=a.findIndex((r,k)=>!b[k]||r.act!==b[k].act);
 console.log(id,'first divergence at decision',i,JSON.stringify({[x]:a[i],[y]:b[i]}),'final',JSON.stringify(a.at(-1)?.growth),JSON.stringify(b.at(-1)?.growth));}
