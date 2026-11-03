import fs from 'node:fs';import {stages} from '../stages.mjs';import {search,replay} from '../search.mjs';import {complete} from '../../naopoyo-v2/engine.mjs';
const number=+process.argv[2],base=stages.find(s=>s.number===number),rows=[];
const variants=number===20?[
 ['open-three-pinches',[[4,7],[4,5],[5,4]],[]],
 ['keep-upper-ledge',[[4,7],[5,6],[6,5]],[]],
 ['open-three-add-step',[[4,7],[4,5],[5,4]],[[5,3]]],
 ['open-left-pinches',[[3,6],[4,5],[5,4]],[]]
]:[
 ['lower-gap-step',[[4,7]],[[5,7]]],
 ['shift-wall-up',[[3,6]],[[3,3]]],
 ['shift-support-downstream',[[4,7]],[[6,7]]]
];
for(const [name,remove,add] of variants){const stage={...base,walls:base.walls.filter(p=>!remove.some(r=>r.toString()===p.toString())).concat(add)},row={name,stage,attempts:[]};
 for(const mode of [0,1,2]){
 const score=s=>s.actors.reduce((sum,a)=>sum+(a.x<3?25+Math.abs(a.level-8):0)+(a.y<6?-a.level*(mode+2):6)+(a.x>3?Math.min(Math.abs(a.level-3),Math.abs(a.level-(number===18?5:7)))*2:0),0)-s.rescued*(mode+2);
 const r=search(stage,{method:mode===0?'bfs':'greedy',limit:250000,maxMs:12000,...(mode?{score}:{})});row.attempts.push(r);console.log(number,name,mode,r.status,r.depth,r.visited);if(r.status==='solved'){row.replayed=complete(replay(stage,r.path));break;}if(r.status==='exhausted')break;
 }
 rows.push(row);fs.writeFileSync(`docs/naopoyo-contact-20261025/evidence/workshop-${number}.json`,JSON.stringify(rows,null,2));
}
