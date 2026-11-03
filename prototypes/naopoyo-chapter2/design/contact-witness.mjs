import fs from 'node:fs';import {stages} from '../stages.mjs';import {search,replay} from '../search.mjs';import {createState,settle,move,complete} from '../../naopoyo-v2/engine.mjs';import {shorten} from './shorten.mjs';
const number=+process.argv[2],stage=stages.find(s=>s.number===number),old=JSON.parse(fs.readFileSync('docs/naopoyo-gravity-20261024/solutions.json')).stages.find(r=>r.id===stage.id),rows=[];
let s=createState(stage);settle(s);const prefix=[];for(const p of old.path){const a=s.actors.find(a=>a.x===p.at[0]&&a.y===p.at[1]);if(!a||!move(s,a.id,...p.d).ok)break;prefix.push(p)}
for(const [name,initial,path] of [['resume',s,prefix],['fresh',null,[]]]){
 const result=search(stage,{method:'greedy',initial,limit:400000,maxMs:30000}),row={name,result};
 if(result.status==='solved'){row.path=[...path,...result.path];row.replayed=complete(replay(stage,row.path));const reduced=shorten(stage,row.path,{passes:20,limit:900,depth:4});row.path=reduced.path;row.rewrites=reduced.rewrites;}
 rows.push(row);fs.writeFileSync(`docs/naopoyo-contact-20261025/evidence/witness-${number}.json`,JSON.stringify(rows,null,2));console.log(number,name,result.status,row.path?.length,result.visited);if(row.path)break;
}
