import fs from 'node:fs';import {stages} from '../stages.mjs';import {replay} from '../search.mjs';import {shorten} from './shorten.mjs';
const dir='docs/naopoyo-gate-v8-20261026',old=JSON.parse(fs.readFileSync('docs/naopoyo-magic-rock-20261025/solutions.json')),rows=[];
for(const stage of stages){
 const n=stage.number,r=JSON.parse(fs.readFileSync(`${dir}/evidence/search-${n}.json`));let input=r.path,source=`evidence/search-${n}.json`,shortestProven=r.shortestProven;
 if(n===16&&!input){input=old.stages.find(w=>w.id===stage.id).path;source='V7 witness explicitly revalidated; fresh bounded search hit limit';shortestProven=false;}
 if(n===20){const guided=JSON.parse(fs.readFileSync(`${dir}/evidence/workshop20-2.json`));input=guided.result.path;source='evidence/workshop20-2.json';shortestProven=false;}
 if(!input)throw Error('no path '+n);
 const result=shortestProven?{path:input,rewrites:0}:shorten(stage,input,{passes:20,limit:600,depth:4});
 if(replay(stage,result.path).actors.length)throw Error('not complete');
 rows.push({number:n,id:stage.id,stage,source,searchMoves:input.length,moves:result.path.length,shortestProven:!!shortestProven,...result});
 fs.writeFileSync(`${dir}/solutions.json`,JSON.stringify({rules:'magic-gate-v2',method:'real-engine fresh BFS/greedy; stage16 verified prior witness after bounded search; bounded shortcut reduction is not an optimality proof',stages:rows},null,2));console.log(n,input.length,result.path.length);
}
