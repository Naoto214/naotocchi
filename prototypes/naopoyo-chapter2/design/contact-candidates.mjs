import fs from 'node:fs';import {stages} from '../stages.mjs';import {search,replay} from '../search.mjs';import {complete} from '../../naopoyo-v2/engine.mjs';
const number=+process.argv[2],base=stages.find(s=>s.number===number),rows=[];
for(const [name,remove,add] of [['remove-lower-support',[4,7],[]],['relocate-support-right',[4,7],[[5,7]]],['remove-wall-corner',[3,6],[]]]){
 const stage={...base,walls:base.walls.filter(p=>p.toString()!==remove.toString()).concat(add)};
 const r=search(stage,{limit:250000,maxMs:18000});const row={name,stage,result:r};
 if(r.status!=='solved')row.greedy=search(stage,{method:'greedy',limit:180000,maxMs:18000});
 const win=[row.result,row.greedy].find(r=>r?.status==='solved');if(win)row.replayed=complete(replay(stage,win.path));
 rows.push(row);fs.writeFileSync(`docs/naopoyo-contact-20261025/evidence/candidates-${number}.json`,JSON.stringify(rows,null,2));console.log(number,name,r.status,r.depth,r.visited,row.greedy?.status,row.greedy?.depth);
}
