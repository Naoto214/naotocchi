import fs from 'node:fs';import {stages} from '../stages.mjs';import {search} from '../search.mjs';
const base={...stages.find(s=>s.number===18),gravityRules:'supported-v1'};
const out=[];for(const [name,extra]of [['ground-split',{spikes:[{x:4,y:7,power:3}]}],['right-ground-split',{spikes:[{x:5,y:7,power:3}]}],['supported-split',{spikes:[{x:5,y:5,power:3}]}]]){
 const stage={...base,...extra};const r=search(stage,{method:'greedy',limit:250000,maxMs:15000});out.push({name,stage,result:r});console.log(name,r.status,r.depth,r.visited);fs.writeFileSync('docs/naopoyo-gravity-20261024/evidence/18-candidates.json',JSON.stringify(out,null,2));
}
