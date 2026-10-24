import fs from 'node:fs';import {generateFinalCandidates,generateAssemblyCandidates} from './final-candidates.mjs';import {search,replay} from '../search.mjs';import {shorten} from './shorten.mjs';import {complete} from '../../naopoyo-v2/engine.mjs';
const out=[];for(const stage of [...generateFinalCandidates(),...generateAssemblyCandidates()]){
 const result=search(stage,{method:'greedy',limit:160000,maxMs:8000});let reduced=null;if(result.path){reduced=shorten(stage,result.path,{passes:30});if(!complete(replay(stage,reduced.path)))throw Error('not complete');}
 out.push({stage,result,reduced});console.log(stage.id,result.status,result.depth,reduced?.path.length);
}fs.writeFileSync(process.argv[2]||'/tmp/chapter2-candidates.json',JSON.stringify(out,null,2));
