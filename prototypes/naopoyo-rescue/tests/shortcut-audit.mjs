// Test-only counterfactual: reject every merge and split, including during fall.
// A solved superset state is only a candidate; exhaustion proves that at least
// one transformation is necessary. A cap is always unproved.
import fs from 'node:fs';
import {stages} from '../stages.mjs';
let source=fs.readFileSync(new URL('../engine.mjs',import.meta.url),'utf8');
source=source.replace("'./conditions.mjs'",JSON.stringify(new URL('../conditions.mjs',import.meta.url).href));
source=source.replace('const prev={x:a.x,y:a.y};',`if(target||(!exit&&s.spikes.some(p=>p[0]===x&&p[1]===y)&&prospective.level>1))return false;\n const prev={x:a.x,y:a.y};`);
const {createState,clone,move,release}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
const key=s=>JSON.stringify([s.rescued,s.actors.map(a=>[a.species,a.level,a.x,a.y]).sort()]);
function audit(stage,limit=1500){
 const queue=[createState(stage)],seen=new Set([key(queue[0])]);
 for(let i=0;i<queue.length;i++){
 const s=queue[i];if(!s.actors.length)return {status:'candidate-bypass',visited:seen.size};
 const next=[];
 for(const a of s.actors)for(const [dx,dy]of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]]){const t=clone(s);if(move(t,a.id,dx,dy))next.push(t);}
 const t=clone(s);if(release(t))next.push(t);
 for(const t of next){const k=key(t);if(seen.has(k))continue;if(seen.size>=limit)return {status:'limit-unproved',visited:seen.size};seen.add(k);queue.push(t);}
 }
 return {status:'exhausted-no-transform-solution',visited:seen.size};
}
const results=stages.slice(12).map(s=>({id:s.id,...audit(s,s.id==='21'?20000:1500)}));
fs.writeFileSync(new URL('../../../docs/naopoyo-expansion-20261022/shortcut-audit.json',import.meta.url),JSON.stringify({limit:1500,stage21Limit:20000,model:'real engine with merge and split rejected; actor switching before release is relaxed',results},null,2)+'\n');
console.log(results);
