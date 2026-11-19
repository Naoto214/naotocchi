import fs from 'node:fs';import {createHash} from 'node:crypto';import {fileURLToPath} from 'node:url';
import {search,evaluate} from '../search.mjs';import {stage,kind,DIRS} from '../engine.mjs';
import {create,step,adapter,PROFILES,GAUGES} from './engine.mjs';
const root=fileURLToPath(new URL('.',import.meta.url));fs.mkdirSync(root+'results',{recursive:true});
export const hash=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
export function trace(initial,actions){
 let s=initial;const hashes=[hash(s)],rows=[],spawns=[];let reached=false,pair=false;
 for(const a of actions){
  const before=s,r=step(s,a);if(!r.valid)throw Error('invalid action');s=r.state;
  const ev=r.waves.flatMap(w=>w.events);const counts=Array(3).fill(0);s.board.filter(Boolean).forEach(v=>counts[kind(v)]++);
  // Observe both intermediate creation and terminal death; simultaneous death can leave no 08 on final board.
  reached ||= s.board.some(v=>stage(v)===8)||ev.some(e=>e.to===8||e.death);
  pair ||= counts.some((_,k)=>s.board.filter(v=>v&&kind(v)===k&&stage(v)===8).length>=2)||ev.some(e=>e.death);
  const population=s.board.filter(Boolean).length;
  rows.push({type:a.type,population,concentration:population?Math.max(...counts)/population:0,allOne:counts.filter(Boolean).length===1,
   maxStage:Math.max(0,...s.board.map(stage)),chain:r.waves.length,events:ev.length,evolvingSlide:a.type==='slide'&&ev.length>0,
   slideValid:DIRS.filter(dir=>step(s,{type:'slide',dir}).valid).length,largeClear:before.board.filter(Boolean).length-population>=4,
   eggs:[...s.eggs],gauge:s.gauge,spawnCount:r.spawns.length,byKind:counts,
   rewardsByKind:[0,1,2].map(k=>ev.filter(e=>e.kind===k&&!e.death).reduce((n,e)=>n+e.to-e.from,0))});
  hashes.push(hash(s));spawns.push(r.spawns);
 }
 const part=rs=>({steps:rs.length,slideRatio:rs.length?rs.filter(r=>r.type==='slide').length/rs.length:null,evolvingSlides:rs.filter(r=>r.evolvingSlide).length,
  chain2:rs.filter(r=>r.chain>=2).length,meanPopulation:rs.length?rs.reduce((n,r)=>n+r.population,0)/rs.length:null,
  meanConcentration:rs.length?rs.reduce((n,r)=>n+r.concentration,0)/rs.length:null,oneKindSteps:rs.filter(r=>r.allOne).length,
  meanValidDirections:rs.length?rs.reduce((n,r)=>n+r.slideValid,0)/rs.length:null,largeClears:rs.filter(r=>r.largeClear).length});
 const phases=[0,1,2].map(i=>part(rows.slice(Math.floor(rows.length*i/3),Math.floor(rows.length*(i+1)/3))));
 return {hashes,spawns,final:s,rows,metrics:{reached08:reached,same08:pair,won:s.won,moves:actions.length,used:s.used,maxChain:Math.max(0,...rows.map(r=>r.chain)),...part(rows),phases}};
}
const mode=process.argv[2]||'supply';
const combos=mode==='slides'?['E','A','B','C16-20','D0'].map(p=>[p,'current']):mode==='supply'?Object.keys(PROFILES).map(p=>[p,'current']):mode==='gauge'?GAUGES.slice(1).map(g=>['E',g]):[['B','cost4'],['B','slide-only'],['C16-20','cost4'],['C16-20','slide-only'],['D0','slide-only']];
const seeds=Array.from({length:8},(_,i)=>i+1),policies=mode==='slides'?['slides']:['focus','diverse'];
const limits=mode==='slides'?{width:32,maxDepth:240,maxNodes:60000,maxMs:1e9,itemPenalty:0,actionSet:'slides'}:{width:16,maxDepth:160,maxNodes:120000,maxMs:1e9,itemPenalty:3};
const plan={mode,seeds,policies,combos,limits,phaseDefinition:'equal thirds of recorded actions; not human time',fairness:'same seed and initialization; same node budget; not equal winning subset'};
fs.writeFileSync(root+`results/${mode}-plan.json`,JSON.stringify(plan,null,2));
for(const [profile,gauge] of combos)for(const policy of policies)for(const seed of seeds){
 const file=`${profile}-${gauge}-${policy}-${seed}.json`;if(fs.existsSync(root+'results/'+file))continue;
 const initial=create(seed,profile,gauge);
 const score=(s)=>{
  const counts=[0,0,0];for(const v of s.board)if(v)counts[kind(v)]+=2**(stage(v)-1);
  const basic=evaluate(s,policy==='focus'?'transform':'organize');
  return basic+(policy==='diverse'?Math.min(...counts)*0.8:0);
 };
 const result=search(initial,limits,{...adapter,evaluate:score});const actions=result.status==='solved'?result.path:result.bestPath;
 const evidence=trace(initial,actions);
 fs.writeFileSync(root+'results/'+file,JSON.stringify({edition:'slide-refill-v1',profile,gauge,policy,seed,initial,actions,status:result.status,reason:result.reason,limits,stats:result.stats,...evidence}));
 console.log(file,result.status,actions.length,evidence.metrics.phases[2].slideRatio);
}
