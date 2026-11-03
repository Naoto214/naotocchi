import fs from'node:fs';import{stages}from'../stages.mjs';import{search}from'../search.mjs';import{shorten}from'./shorten.mjs';
const base=stages.find(s=>s.number===20),out=[];
for(const [name,add]of [['left-step',[[4,7],[5,4]]],['right-step',[[4,7],[7,4]]],['both-split-supported',[[4,7],[5,4],[6,7]]]]){
 const stage={...base,walls:[...base.walls,...add]};const score=s=>s.actors.reduce((n,a)=>n+(a.x<3?30:0)-(7-a.y)*a.level*5+(a.y<5?Math.abs(a.level-7):0),0)-s.rescued*10;
 let result=search(stage,{method:'greedy',score,limit:300000,maxMs:20000});console.log(name,result.status,result.depth,result.visited);const reduced=result.path?shorten(stage,result.path,{passes:80}):null;console.log('reduced',reduced?.path.length);out.push({name,stage,result,reduced});fs.writeFileSync('docs/naopoyo-gravity-20261024/evidence/20-minimal.json',JSON.stringify(out,null,2));
}
