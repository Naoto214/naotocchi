import fs from 'node:fs';import {run} from './run.mjs';
const config={id:'actual-old-supply',mode:'old',supply:'legacy',anchor:'A',gaugeUnit:8,policy:'focus',position:'adaptive'};
fs.writeFileSync(new URL('./legacy-manifest.json',import.meta.url),JSON.stringify({config,seeds:Array.from({length:16},(_,i)=>4100+i),cap:{drops:160,actions:480},note:'Actual original all01 supply; not paired new-supply causal contrast.'},null,2));
for(let seed=4100;seed<4116;seed++){const dest=new URL(`./supplement-results/actual-old-supply-${seed}.json`,import.meta.url);if(fs.existsSync(dest))continue;const r=run(config,seed);fs.writeFileSync(dest,JSON.stringify(r));console.log(seed,r.metrics.success,r.drops);}
