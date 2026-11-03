import fs from 'node:fs';import {stages} from '../stages.mjs';import {search,replay} from '../search.mjs';
const stage=stages[9],mode=+(process.argv[2]||0);
const score=s=>s.actors.reduce((sum,a)=>sum+(a.x<3?40+Math.abs(a.level-8)*2:0)+(a.y<=4?-a.level*(mode+3):8)+(a.x>=4?Math.min(Math.abs(a.level-3),Math.abs(a.level-7))*2:0),0)-s.rescued*(mode+4);
const r=search(stage,{method:'greedy',score,limit:300000,maxMs:120000});
fs.writeFileSync(`docs/naopoyo-gate-v8-20261026/evidence/workshop20-${mode}.json`,JSON.stringify({mode,stage,result:r,replayed:r.path?replay(stage,r.path).actors.length===0:false},null,2));console.log(mode,r.status,r.depth,r.visited);
