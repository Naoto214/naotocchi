import fs from 'node:fs';import {stages} from '../stages.mjs';import {search} from '../search.mjs';
const old=stages.find(s=>s.number===20),rows=[];
const base={...old,walls:[[3,0],[3,1],[3,2],[3,3],[3,4],[3,6],[4,5],[4,6],[5,5],[6,5],[7,0],[7,1],[7,2],[7,3],[7,4],[7,6]],gates:[{x:3,y:7,exact:8},{x:4,y:4,exact:3},{x:6,y:4,exact:4}],spikes:[{x:2,y:6,power:3},{x:5,y:6,power:2}],exits:[{x:5,y:3,exact:7},{x:7,y:7,exact:3}]};
for(const [name,stage]of [['two-workshops',base],['low-workshop',{...base,walls:base.walls.filter(([x,y])=>!(x===4&&y===6)),spikes:[{x:2,y:6,power:3},{x:5,y:7,power:2}]}]]){
 const score=s=>s.actors.reduce((n,a)=>n+(a.y<=4?-15-a.level*2:4)+(a.x>3&&a.level===4?-8:0)+(a.x<3&&a.level===3?-8:0),0)-s.rescued*6;
 const r=search(stage,{method:'greedy',score,limit:300000,maxMs:20000});rows.push({name,stage,result:r});console.log(name,r.status,r.depth,r.visited);fs.writeFileSync('docs/naopoyo-gravity-20261024/evidence/20-workshop.json',JSON.stringify(rows,null,2));
}
