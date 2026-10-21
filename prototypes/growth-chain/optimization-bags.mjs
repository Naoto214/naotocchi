import fs from 'node:fs';
import {createBag,draw} from './random.mjs';
const results=[];
for(const kinds of [4,5,6])for(const bag of ['fourEach','fixed20']){
 let same=0,pairs=0,maxGap=0;const counts=[];
 for(let seed=200;seed<232;seed++){
  const b=createBag(seed,{kinds,bag}),last=Array(kinds).fill(null),v=[];
  for(let i=0;i<2000;i++){const k=draw(b);v.push(k);if(last[k]!==null)maxGap=Math.max(maxGap,i-last[k]-1);last[k]=i;if(i%2===1){pairs++;if(v[i]===v[i-1])same++;}}
  const n=bag==='fixed20'?20:4*kinds;for(let off=0;off+n<=v.length;off+=n)counts.push(Array.from({length:kinds},(_,k)=>v.slice(off,off+n).filter(x=>x===k).length));
 }
 results.push({kinds,bag,draws:64000,samePairRate:same/pairs,maxObservedAbsentIndividuals:maxGap,minPerBag:Math.min(...counts.flat()),maxPerBag:Math.max(...counts.flat())});
}
fs.writeFileSync(new URL('./optimization-bags-20261014.json',import.meta.url),JSON.stringify({seeds:[200,231],perSeed:2000,results},null,2));console.log(results);
