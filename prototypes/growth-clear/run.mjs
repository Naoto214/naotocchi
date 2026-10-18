import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';
import {createSession,applyAction,stateHash,replay} from './session.mjs';import {chooseAction} from './policy.mjs';import {newMetrics,observe} from './metrics.mjs';
const root=path.dirname(fileURLToPath(import.meta.url));
export function run(config,seed,{drops=160,actions=480}={}){
 let s=createSession(seed,config),initial=structuredClone(s),m=newMetrics(),log=[],itemStreak=0;
 const started=performance.now();
 while(!s.over&&s.drops<drops&&s.actions<actions&&!m.success){
  const a=chooseAction(s,{...config,items:config.items!==false&&itemStreak<3});if(!a)break;
  const z=applyAction(s,a,true);observe(m,s,z,a);log.push(a);itemStreak=a.type==='drop'?0:itemStreak+1;s=z;
 }
 const record={initial,actions:log,hash:stateHash(s)};
 replay(record);
 return {config,seed,cap:{drops,actions},drops:s.drops,actions:s.actions,over:s.over,censored:!s.over&&!m.success,metrics:m,occupancy:m.occupancySum/Math.max(1,m.observations),mainLossRate:m.mainLost/Math.max(1,m.mainExposed),elapsedMs:performance.now()-started,record};
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 const manifest=JSON.parse(fs.readFileSync(path.join(root,'manifest.json'))),shard=Number(process.argv[2]||0),shards=Number(process.argv[3]||1);
 let i=0;for(const config of manifest.configs)for(const seed of manifest.seeds){if(i++%shards!==shard)continue;const filename=path.join(root,'results',`${config.id}-${seed}.json`);if(fs.existsSync(filename))continue;const r=run(config,seed,manifest.cap);fs.writeFileSync(filename,JSON.stringify(r));console.log(`${config.id} ${seed}: ${r.drops} drops, success=${r.metrics.success}, over=${r.over}`);}
}
