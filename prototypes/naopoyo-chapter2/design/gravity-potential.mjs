import fs from 'node:fs';import {stages} from '../stages.mjs';import {search} from '../search.mjs';import {shorten} from './shorten.mjs';
const stage=stages.find(s=>s.number===18),out=[];
for(const v of [0,1,2]){
 const score=s=>s.actors.reduce((sum,a)=>sum+(a.x<3?80+Math.abs(a.level-8)*8:0)-a.level*(7-a.y)*12+(a.y===7?Math.abs(a.level-8)*(v+1):0),0)-s.rescued*(v===0?20:v===1?6:40);
 const r=search(stage,{method:'greedy',score,limit:350000,maxMs:25000});console.log(v,r.status,r.depth,r.visited);let reduced=null;if(r.path)reduced=shorten(stage,r.path,{passes:100});out.push({v,result:r,reduced});fs.writeFileSync('docs/naopoyo-gravity-20261024/evidence/18-potential.json',JSON.stringify(out,null,2));if(r.path)break;
}
