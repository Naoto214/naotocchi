import fs from 'node:fs';import {stages} from '../stages.mjs';import {search} from '../search.mjs';
const n=+(process.argv[2]||18),base={...stages.find(s=>s.number===n),gravityRules:'supported-v1'};
const variants=n===18?[['same',base]]:[
 ['stair-workshop',{...base,walls:[[3,4],[3,5],[3,6],[5,7],[6,6],[6,4],[4,4],[7,6]],spikes:[{x:5,y:6,power:3},{x:7,y:5,power:2}],gates:[{x:3,y:7,exact:8},{x:5,y:5,exact:3},{x:7,y:4,exact:4}]}],
 ['assembly-floor',{...base,exits:[{x:6,y:4,exact:7},base.exits[1]],walls:base.walls}],
 ['upper-gates',{...base,walls:[[3,4],[3,5],[3,6],[4,5],[5,6],[6,6],[7,6],[6,4]],gates:[{x:3,y:7,exact:8},{x:5,y:5,exact:3},{x:7,y:5,exact:4}],spikes:base.spikes.filter(s=>s.x!==6)}]
];
const out=[];for(const [name,stage]of variants)for(const mode of [0,1,2]){
 const score=s=>s.actors.reduce((sum,a)=>sum+(a.x<3?25+Math.abs(a.level-8):0)+(a.y<6?-a.level*(mode+2):6)+(a.x>3?Math.min(Math.abs(a.level-3),Math.abs(a.level-5))*2:0),0)-s.rescued*(mode+2);
 const r=search(stage,{method:'greedy',limit:450000,maxMs:12000,score});out.push({name,mode,stage,result:r});fs.writeFileSync(`docs/naopoyo-gravity-20261024/evidence/guided-${n}.json`,JSON.stringify(out,null,2));console.log(name,mode,r.status,r.depth,r.visited);if(r.status==='solved')break;
}
