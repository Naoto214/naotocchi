import fs from 'node:fs/promises';
import {createNodeOfficialRuntime} from '../../prototypes/life-sugoroku/official-runtime-v4.mjs';
import {QUICK_ADDITIONS_V7} from '../../prototypes/life-sugoroku/official-quick-cpu-v7.mjs';
const rows=[];
for(const gameId of QUICK_ADDITIONS_V7)for(const difficulty of ['easy','normal']){
 const samples=[];
 for(let seed=1;seed<=16;seed++){
  const r=await createNodeOfficialRuntime();r.start({gameId,difficulty,seed,cpuSeed:seed+100,cpu:true});const a=r.step(1800);
  if(!a.done||gameId!=='wait'&&!a.inputs.length)throw Error('Unfinished or inactive: '+gameId);
  samples.push({seed,cpuSeed:seed+100,score:a.score,frame:a.frame,inputs:a.inputs.length});
 }
 const scores=samples.map(a=>a.score),histogram={};for(const score of scores)histogram[score]=(histogram[score]||0)+1;
 rows.push({gameId,difficulty,mean:scores.reduce((a,b)=>a+b)/scores.length,min:Math.min(...scores),max:Math.max(...scores),histogram,samples});
}
await fs.writeFile(new URL('../../docs/life-sugoroku/V7-CPU-SCORES.json',import.meta.url),JSON.stringify({method:'Official callback, 60Hz, 16 game seeds, independent CPU seeds101..116, same fixed official difficulty0.5; wait abstains as required by formal rules',rows},null,2)+'\n');
console.log(JSON.stringify(rows.map(({samples,...row})=>row),null,2));
