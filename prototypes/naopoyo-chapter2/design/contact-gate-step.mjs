import fs from 'node:fs';import {stages} from '../stages.mjs';import {search,replay} from '../search.mjs';import {complete} from '../../naopoyo-v2/engine.mjs';
const number=+process.argv[2],base=stages.find(s=>s.number===number),rows=[];
const lower={...base,walls:base.walls.filter(p=>p.toString()!=='3,6').concat([[3,7]]),gates:base.gates.map(g=>g.x===3&&g.y===7?{...g,y:6}:g)};
const variants=number===18?[['gate-step',lower]]:[
 ['gate-step-upper-clear',{...lower,walls:lower.walls.filter(p=>!['4,5','5,4','7,6'].includes(p.toString()))}],
 ['gate-step-assembly-support',{...lower,walls:lower.walls.filter(p=>!['4,5','6,5'].includes(p.toString())).concat([[6,4]])}],
 ['gate-step-open-center',{...lower,walls:lower.walls.filter(p=>!['4,5','6,5'].includes(p.toString()))}]
];
for(const [name,stage]of variants){const row={name,stage,attempts:[]};for(const mode of [0,1,2]){
 const score=s=>s.actors.reduce((sum,a)=>sum+(a.x<3?50+Math.abs(a.level-8)*4:0)+(a.y<6?-a.level*2:5)+(a.x>3?Math.min(Math.abs(a.level-3),Math.abs(a.level-5))*2:0),0)-s.rescued*(mode===1?10:2);
 const r=search(stage,{method:mode===0?'bfs':'greedy',limit:250000,maxMs:15000,...(mode?{score}:{})});row.attempts.push(r);console.log(number,name,mode,r.status,r.depth,r.visited);if(r.status==='solved'){row.replayed=complete(replay(stage,r.path));break;}if(r.status==='exhausted')break;
 }rows.push(row);fs.writeFileSync(`docs/naopoyo-contact-20261025/evidence/gate-step-${number}.json`,JSON.stringify(rows,null,2));}
