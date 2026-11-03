// Fresh bounded searches always use the shipped engine; no old witness seeding.
import fs from 'node:fs';import {stages} from '../stages.mjs';import {search,replay} from '../search.mjs';
const number=+process.argv[2],stage=stages.find(s=>s.number===number),dir='docs/naopoyo-gate-v8-20261026/evidence';
const result={number,id:stage.id,stage,attempts:[]};
for(const method of ['bfs','greedy']){
 const r=search(stage,{method,limit:method==='bfs'?160000:500000,maxMs:method==='bfs'?10000:40000});result.attempts.push(r);
 console.log(number,method,r.status,r.depth,r.visited);
 if(r.status==='solved'){result.path=r.path;result.shortestProven=r.shortestProven;result.replayed=replay(stage,r.path).actors.length===0;break;}
}
fs.writeFileSync(`${dir}/search-${number}.json`,JSON.stringify(result,null,2));
