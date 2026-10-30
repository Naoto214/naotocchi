// Mechanism-informed witness search; non-admissible, never a shortest proof.
import fs from 'node:fs';import {generateLedgeCandidates} from './final-candidates.mjs';import {search,replay} from '../search.mjs';import {shorten} from './shorten.mjs';import {complete} from '../../naopoyo-v2/engine.mjs';
const score=s=>s.actors.reduce((sum,a)=>sum+(a.x<3?20:0)+(a.y<5?Math.abs(a.level-7)*2:8)+(a.x<3?Math.abs(a.level-8):0),0)-s.actors.filter(a=>a.x===6&&a.y===4).reduce((n,a)=>n+a.level*7,0)-(s.rescued%3===1?100:0)-s.rescued*2;
const out=[];for(const stage of generateLedgeCandidates()){
 const result=search(stage,{method:'greedy',limit:600000,maxMs:30000,score});let reduced=null;if(result.path){reduced=shorten(stage,result.path,{passes:80});if(!complete(replay(stage,reduced.path)))throw Error('not complete');}out.push({stage,result,reduced});console.log(stage.id,result.status,result.depth,reduced?.path.length);
}fs.writeFileSync(process.argv[2]||'/tmp/chapter2-guided.json',JSON.stringify(out,null,2));
