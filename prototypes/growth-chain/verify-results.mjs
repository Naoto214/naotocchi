// Separate replay path: validates all saved starting seeds, actions, event counts and checksums.
import fs from 'node:fs';import assert from 'node:assert/strict';import {createSession,applyAction,stateData,stateHash,replay} from './session.mjs';import {configuration} from './rules.mjs';import {expandAction,summarize} from './experiments.mjs';
const dir=new URL('./results/',import.meta.url);let jobs=0,trials=0,witnesses=0,actions=0;
for(const name of fs.readdirSync(dir).filter(n=>n.endsWith('.json'))){
 const data=JSON.parse(fs.readFileSync(new URL(name,dir)));
 if(data.trials){jobs++;assert.deepEqual(data.trials.map(t=>t.seed),data.job.seeds);
  for(const t of data.trials){trials++;let s=createSession(t.seed,configuration(data.job.rules),data.job.initialResources);assert.deepEqual(stateData(s),t.initial,name+' initial');let max=0,created08=0,deaths=0,chains={2:0,3:0,5:0},drops={2:0,3:0,5:0},earned=[0,0,0,0],spent=[0,0,0,0];
   for(const c of t.actions){actions++;let a=expandAction(c);s=applyAction(s,a,false);let n=s.last.waves.length;max=Math.max(max,n);created08+=s.last.created08;deaths+=s.last.deaths;for(const k of [2,3,5])if(n>=k){chains[k]++;if(a.type==='drop')drops[k]++;}earned=earned.map((v,i)=>v+s.last.eggs[i]);if(a.type==='egg')spent[a.rank]++;}
   assert.equal(stateHash(s),t.hash,name+' checksum');assert.equal(s.over,t.over);assert.equal(s.drops,t.drops);assert.equal(t.censored,!s.over&&s.drops===t.limit);assert.equal(max,t.maxChain);assert.equal(created08,t.created08);assert.equal(deaths,t.deaths);assert.deepEqual(earned,t.eggsEarned);assert.deepEqual(spent,t.eggsSpent);for(const k of [2,3,5]){assert.equal(chains[k],t['chains'+k]);assert.equal(drops[k],t['dropChains'+k]);}
  }assert.deepEqual(summarize(data.trials),data.summary,name+' summary');
 }else if(name.includes('witness')){replay(data);witnesses++;}
}
let result={status:'PASS',jobs,trials,witnesses,actions,checks:['seed initialization','full legal action histories','final checksum','chain and 08 event counts','egg earn/spend','game-over vs censoring','summary denominators']};fs.writeFileSync(new URL('verification.json',dir),JSON.stringify(result,null,2));console.log(JSON.stringify(result));
