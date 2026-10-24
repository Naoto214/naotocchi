import {clone,move,complete,createState} from '../naopoyo-v2/engine.mjs';import {WorldSession} from '../naopoyo-world/session.mjs';import {stages} from './stages.mjs';import {solve,execute} from './witness.mjs';import fs from 'node:fs';
export function exhaust(stage,{limit=50000,forbid,initial}={}){
 const q=new WorldSession(stage),nodes=[initial||createState(stage)],seen=new Set();
 const key=s=>JSON.stringify([s.actors.map(a=>[a.species,a.level,a.x,a.y]).sort(),s.rescuedBySpecies]);seen.add(key(nodes[0]));let visited=0;
 for(let i=0;i<nodes.length&&i<limit;i++){
  visited++;const s=nodes[i];if(complete(s))return {status:'solution-found',visited,discovered:nodes.length};
  for(const a of s.actors)for(let dx=-1;dx<=1;dx++)for(let dy=-1;dy<=1;dy++){
   if(!dx&&!dy)continue;const c=clone(s),r=move(c,a.id,dx,dy,q.policy());if(!r.ok||forbid?.(r,c))continue;
   const k=key(c);if(!seen.has(k)){seen.add(k);nodes.push(c)}
  }
 }
 return {status:visited===nodes.length?'exhausted-no-solution':'unproven-cap',visited,discovered:nodes.length,limit};
}
export function audit(){
 const results=[];
 for(const id of ['I04','I07']){const s=stages.find(s=>s.id===id);results.push({stage:id,disabled:'wave',scope:'Initial region; beam/spike is beyond the full-height wave-only gate barrier, so cannot activate before the forbidden crossing. Manual engine exhausts all reachable states.',...exhaust(s)})}
 results.push({stage:'I02',disabled:'overflow',...exhaust(stages[1],{forbid:r=>r.overflow>0})});
 results.push({stage:'I05',disabled:'beam',...exhaust(stages[4])});
 const q=new WorldSession(stages[6]);for(const c of solve(stages[6]).commands){execute(q,c);if(c.wait===3000)break}results.push({stage:'I07',disabled:'beam-after-required-wave-crossing',scope:'At the only crossing, all mass is one fish5; absent beam there is no other split source. Manual exhaustive search starts immediately after that crossing.',...exhaust(stages[6],{initial:q.state})});
 const g=new WorldSession(stages[2]);execute(g,{id:'f',dx:1,dy:0});execute(g,{id:'f',dx:1,dy:0});results.push({stage:'I03',disabled:'support-rescued-first',scope:'Frog rescued immediately, then all remaining manual v2 states exhausted.',...exhaust(stages[2],{initial:g.state})});
 return results;
}
if(process.argv[1]===new URL(import.meta.url).pathname){const out=process.argv[2];const data={solutions:stages.map(s=>solve(s)),ablations:audit()};fs.writeFileSync(out,JSON.stringify(data,null,2));console.log(JSON.stringify(data.ablations,null,2))}
