import fs from 'node:fs';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import {start,metrics} from './optimization.mjs';
import {burden,contributions,selectPolicy} from './gauge-comparison.mjs';
import {applyAction,stateData,stateHash,spawnPose,replay} from './session.mjs';
import {toolTransaction} from './live-tools.mjs';
const root=new URL('./',import.meta.url),dir=new URL('./gauge-results-20261014/',root),phase=process.argv[2]??'fixed';
const manifest=JSON.parse(fs.readFileSync(new URL(phase+'-manifest.json',dir)));
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
for(const [f,h] of Object.entries(manifest.sources))assert.equal(hash(fs.readFileSync(new URL(f,root))),h,f);
const quant=(a,q)=>a.length?[...a].sort((a,b)=>a-b)[Math.floor((a.length-1)*q)]:null;
const summary={phase,conditions:[]};let totalActions=0,trials=0;
for(const c of manifest.conditions){const rows=[];
 for(const seed of manifest.seeds){
  const raw=fs.readFileSync(new URL(`${phase}-${c.id}-${seed}.json`,dir)),t=JSON.parse(raw);
  assert.deepEqual(t.condition,c);assert.equal(t.seed,seed);assert.deepEqual(t.initial,stateData(start(c,seed)));
  if(t.reused)assert.equal(hash(fs.readFileSync(new URL(t.reused.source,root))),t.reused.sha256);
  const m=metrics(t.initial,t.actions);assert.deepEqual(t.metrics,m);
  assert.equal(stateHash(replay({version:t.initial.version,initial:t.initial,actions:t.actions,hash:t.hash})),t.hash);
  let s=structuredClone(t.initial),streak=0,hits=0;
  for(const [i,a] of t.actions.entries()){
   assert.ok(!s.over&&s.drops<manifest.limits.drops&&i<manifest.limits.actions);
   if(c.options.allowedTypes)assert.ok(c.options.allowedTypes.includes(a.type));
   if(streak===64)hits++;if(streak>=64)assert.equal(a.type,'drop');
   s=a.type==='drop'?applyAction(s,a,false):toolTransaction(s,spawnPose(s.rules),a).state;
   streak=a.type==='drop'?0:streak+1;if(s.last.deaths)assert.equal(i,t.actions.length-1);
  }
  assert.equal(t.capHits,hits);assert.equal(stateHash(s),t.hash);
  if(m.status==='censored')assert.ok(s.drops===manifest.limits.drops||t.actions.length===manifest.limits.actions);
  const b=burden(t.actions),con=contributions(t.initial,t.actions);
  assert.equal(Object.values(b.logical).reduce((a,b)=>a+b,0),m.actions);
  assert.equal(b.logical.drop,m.drops);assert.equal(b.logical.transform,m.transforms);assert.equal(b.logical.bulk,m.bulks);assert.equal(b.logical.egg,m.spent.reduce((a,b)=>a+b,0));
  rows.push({seed,status:m.status,created:m.created,two08:m.two08,drops:m.drops,actions:m.actions,transforms:m.transforms,bulks:m.bulks,eggs:m.spent.reduce((a,b)=>a+b,0),earned:m.earned,spent:m.spent,causalRewards:m.causalRewards,descendantDeaths:m.descendantDeaths,maxChain:m.maxChain,maxToolStreak:m.maxToolStreak,capHits:hits,burden:b,contributions:con,hash:t.hash,rawSha256:hash(raw)});trials++;totalActions+=t.actions.length;
 }
 const n=rows.length,w=rows.filter(x=>x.status==='win'),sum=(key,rs=rows)=>rs.reduce((s,r)=>s+r[key],0);
 const quantiles=(key,rs=rows)=>[0,.25,.5,.75,1].map(q=>quant(rs.map(x=>key in x?x[key]:x.burden[key]),q));
 const aggCon={};for(const type of ['drop','egg','transform','bulk']){aggCon[type]={};for(const key of Object.keys(rows[0].contributions[type]))aggCon[type][key]=key==='maxChain'?Math.max(...rows.map(r=>r.contributions[type][key])):rows.reduce((s,r)=>s+r.contributions[type][key],0);}
 summary.conditions.push({condition:c,n,wins:w.length,reach:rows.filter(x=>x.created>0).length,two08:rows.filter(x=>x.two08).length,gameovers:rows.filter(x=>x.status==='gameover').length,censored:rows.filter(x=>x.status==='censored').length,meanObservedDrops:sum('drops')/n,meanActions:sum('actions')/n,meanTransforms:sum('transforms')/n,meanBulks:sum('bulks')/n,meanEggs:sum('eggs')/n,transforms:sum('transforms'),bulks:sum('bulks'),screenInputs:rows.reduce((s,r)=>s+r.burden.screenDiscrete,0),meanScreenInputs:rows.reduce((s,r)=>s+r.burden.screenDiscrete,0)/n,meanHoldInputs:rows.reduce((s,r)=>s+r.burden.screenHold,0)/n,meanWaitSteps:rows.reduce((s,r)=>s+r.burden.downSteps,0)/n,winQuantiles:Object.fromEntries(['drops','actions','transforms','bulks','eggs','screenDiscrete','screenHold'].map(k=>[k,quantiles(k,w)])),allQuantiles:Object.fromEntries(['drops','actions','transforms','screenDiscrete','maxToolStreak'].map(k=>[k,quantiles(k)])),maxChain:Math.max(...rows.map(x=>x.maxChain)),capHits:sum('capHits'),earned:[0,1,2,3].map(i=>rows.reduce((s,r)=>s+r.earned[i],0)),spent:[0,1,2,3].map(i=>rows.reduce((s,r)=>s+r.spent[i],0)),causalRewards:sum('causalRewards'),reacquisitionTrials:rows.filter(r=>r.causalRewards>0).length,descendantDeathTrials:rows.filter(r=>r.descendantDeaths>0).length,contributions:aggCon,winTriggers:Object.fromEntries(['drop','egg','transform','bulk'].map(k=>[k,w.filter(r=>r.contributions.winTrigger===k).length])),rows});
}
fs.writeFileSync(new URL(phase+'-summary.json',dir),JSON.stringify(summary,null,2));
fs.writeFileSync(new URL(phase+'-verification.json',dir),JSON.stringify({status:'PASS',trials,totalActions,manifestSha256:hash(fs.readFileSync(new URL(phase+'-manifest.json',dir))),analyzerSha256:hash(fs.readFileSync(new URL('gauge-analyze.mjs',root))),checks:['all trial membership and sources','reused raw hash','initial resources and common bag','full replay hash','live tool legality','metrics and economy invariants','action ablation','caps and first victory stop','burden count reconciliation']},null,2));
if(phase==='tune'){
 const conditions=[];for(const gauge of [2,3,4,8]){const candidates=summary.conditions.filter(r=>r.condition.gauge===gauge),id=selectPolicy(candidates.map(r=>({...r,id:r.condition.id}))),c=candidates.find(r=>r.condition.id===id).condition;conditions.push({...c,id:`g${gauge}`});}
 const selection={rule:JSON.parse(fs.readFileSync(new URL('gauge-design-20261014.json',root))).selectionRule,tuneSummarySha256:hash(fs.readFileSync(new URL('tune-summary.json',dir))),design:{conditions,seeds:Array.from({length:32},(_,i)=>300+i)}};
 const f=new URL('selection.json',dir);if(fs.existsSync(f))assert.deepEqual(JSON.parse(fs.readFileSync(f)),selection);else fs.writeFileSync(f,JSON.stringify(selection,null,2));
}
console.log(phase,trials,totalActions,'PASS');
