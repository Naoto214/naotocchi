// Identity check: with b4 the experiment's timeOpportunity() equals PR #488's timeOpportunityCF(...,{strictlyBetter:true})
// on every CPU decision of the given matches (observations from the official adapter, as #488 used).
// Usage: node tools/b4-identity.mjs runs/T-manifest.json results/b4-identity.json [nMatches]
import {readFileSync,writeFileSync} from 'node:fs';
import {play} from './exp-run.mjs';
import {timeOpportunity,PROFILES} from '../lib/policy-exp.mjs';
import {timeOpportunityCF} from '../lib/ref488-counterfactual.mjs';
const [manifestPath,out,n='40']=process.argv.slice(2);
const M=JSON.parse(readFileSync(manifestPath,'utf8'));let checked=0,nullBoth=0,diff=[];
const pool=M.matches.filter(m=>m.pair==='II').filter((m,i)=>i%Math.max(1,Math.floor(224/Number(n)))===0).slice(0,Number(n));
for(const m of pool)play(M,m,'E4',{onDecision:(s,a,o)=>{const prof={...PROFILES.intermediate,b4:true},x=timeOpportunity(o,prof),y=timeOpportunityCF(o,PROFILES.intermediate,{strictlyBetter:true});
 if(x===null&&y===null){nullBoth++;return;}checked++;if(JSON.stringify(x)!==JSON.stringify(y)&&diff.length<5)diff.push({match:m.match,rev:s.revision,x,y});}});
const r={matches:pool.length,decisionsCompared:checked,bothNotApplicable:nullBoth,different:diff.length,examples:diff};writeFileSync(out,JSON.stringify(r,null,1));console.log(r);
