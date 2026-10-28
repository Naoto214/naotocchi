import fs from 'node:fs';
import {stages} from './baseline/prototypes/naopoyo-chapter2/stages.mjs';
const {search,replay}=await import('./generated/C/search.mjs');
const E=await import('./generated/C/engine.mjs');
const st=stages.find(s=>s.number===16),attempts=[];
for(const mode of [0,1,2,3]){
 const score=s=>s.actors.reduce((sum,a)=>sum+(a.x<3?12+3*Math.max(0,3-a.x):0)+(a.y<6?-a.level*(mode+2):6)+Math.abs(a.level-8)*(a.y<6?1:0),0)-s.rescued*(mode+5);
 const r=search(st,{method:'greedy',score,limit:600000,maxMs:30000});attempts.push({...r,scoreMode:mode});
 console.log(mode,r.status,r.depth,r.visited);fs.writeFileSync(new URL('./evidence/search-C-16-followup.json',import.meta.url),JSON.stringify(attempts,null,2)+'\n');
 if(r.path){if(!E.complete(replay(st,r.path)))throw Error('replay');break;}
}
