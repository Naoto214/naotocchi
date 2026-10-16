// Held-out seeds chosen after exploratory cost screen, before any confirmation run.
import fs from 'node:fs';import {run} from './run.mjs';
const manifest={version:1,seeds:Array.from({length:32},(_,i)=>4200+i),cap:{drops:640,actions:2560},configs:[8,2].map(gaugeUnit=>({id:'heldout-'+gaugeUnit,mode:'new',anchor:'A',gaugeUnit,policy:'focus',position:'adaptive'})),note:'Held-out from 4100..4115 exploratory seeds; fixed policy, no tuning on this set. Stop at first lifetime clear.'};
fs.writeFileSync(new URL('./confirmation-manifest.json',import.meta.url),JSON.stringify(manifest,null,2));
let i=0;const shard=Number(process.argv[2]||0),shards=Number(process.argv[3]||1);
for(const config of manifest.configs)for(const seed of manifest.seeds){if(i++%shards!==shard)continue;const dest=new URL(`./supplement-results/${config.id}-${seed}.json`,import.meta.url);if(fs.existsSync(dest))continue;const r=run(config,seed,manifest.cap);fs.writeFileSync(dest,JSON.stringify(r));console.log(config.id,seed,r.drops,r.metrics.success,r.over);}
