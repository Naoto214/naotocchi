import fs from 'node:fs';import {stages} from '../stages.mjs';import {search,replay} from '../search.mjs';import {complete} from '../../naopoyo-v2/engine.mjs';import {shorten} from './shorten.mjs';
const dir='docs/naopoyo-magic-rock-20261025',old=JSON.parse(fs.readFileSync('docs/naopoyo-contact-20261025/solutions.json'));
for(const stage of stages.filter(s=>!process.argv[2]||s.number===+process.argv[2])){
 const row={number:stage.number,id:stage.id,stage};try{row.oldReplay={complete:complete(replay(stage,old.stages.find(w=>w.id===stage.id).path)),moves:old.stages.find(w=>w.id===stage.id).path.length}}catch(e){row.oldReplay={error:e.message}}
 row.search=search(stage,{limit:180000,maxMs:10000});console.log(stage.number,'bfs',row.search.status,row.search.depth,row.oldReplay);
 if(row.search.status!=='solved')row.greedy=search(stage,{method:'greedy',limit:500000,maxMs:45000});
 const result=row.search.status==='solved'?row.search:row.greedy;
 if(result?.status==='solved'){row.path=result.path;row.shortestProven=result.shortestProven;row.replayed=complete(replay(stage,row.path));console.log(stage.number,'fresh',row.path.length)}
 fs.writeFileSync(`${dir}/evidence/search-${stage.number}.json`,JSON.stringify(row,null,2));
}
