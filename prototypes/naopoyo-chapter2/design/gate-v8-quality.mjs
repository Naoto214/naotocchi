import fs from 'node:fs';import {stages} from '../stages.mjs';import {search} from '../search.mjs';
const rows=[];for(const number of [19,20])for(const [name,filter] of [
 ['no-split',(_s,_n,r)=>!r.events.some(e=>e.type==='split')],
 ['no-merge',(_s,_n,r)=>!r.events.some(e=>e.type==='merge')],
 ['no-overflow',(_s,_n,r)=>!r.events.some(e=>e.overflow)],
 ['under-20-moves',(_s,n)=>n.moves<20]
]){const r=search(stages.find(s=>s.number===number),{filter,limit:40000,maxMs:6000});rows.push({number,name,...r});console.log(number,name,r.status,r.visited,r.depth);fs.writeFileSync('docs/naopoyo-gate-v8-20261026/evidence/quality.json',JSON.stringify(rows,null,2));}
