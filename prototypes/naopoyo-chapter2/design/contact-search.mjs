import fs from 'node:fs';
import {stages} from '../stages.mjs';import {stages as first} from '../../naopoyo-chapter1/stages.mjs';
import {search,replay} from '../search.mjs';import {complete,createState,settle,move} from '../../naopoyo-v2/engine.mjs';
const dir='docs/naopoyo-contact-20261025',old=JSON.parse(fs.readFileSync('docs/naopoyo-gravity-20261024/solutions.json'));
const numbers=process.argv.slice(2).map(Number),selected=numbers.length?stages.filter(s=>numbers.includes(s.number)):stages;
const rows=[];
for(const stage of selected){
 const row={id:stage.id,number:stage.number,stage};
 try{row.oldWitness={complete:complete(replay(stage,old.stages.find(w=>w.id===stage.id).path))}}catch(e){row.oldWitness={error:e.message}}
 row.result=search(stage,{limit:350000,maxMs:25000});
 if(row.result.status==='solved')row.replayed=complete(replay(stage,row.result.path));
 rows.push(row);fs.writeFileSync(`${dir}/evidence/search-${numbers.join('-')||'all'}.json`,JSON.stringify(rows,null,2));
 console.log(stage.number,JSON.stringify({...row.result,path:undefined}),row.oldWitness);
}
