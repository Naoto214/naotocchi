import fs from 'node:fs';import {stages} from '../stages.mjs';import {search} from '../search.mjs';
const rows=[];const mode=process.argv[2]||'candidates';
const source=stages.find(s=>s.number===(mode==='18'?18:20));
const variants=mode==='18'?[['original',[]]]:[['support-star',[[6,4]]],['support-star-right',[[6,4],[7,4]]],['support-star-left',[[6,4],[5,4]]]];
for(const [name,walls]of variants){const stage={...source,gravityRules:'supported-v1',walls:[...source.walls,...walls]};const r=search(stage,{method:'greedy',limit:500000,maxMs:30000});rows.push({name,stage,result:r});console.log(name,r.status,r.depth,r.visited,r.elapsedMs);fs.writeFileSync(`docs/naopoyo-gravity-20261024/evidence/search-${mode}.json`,JSON.stringify(rows,null,2));}
