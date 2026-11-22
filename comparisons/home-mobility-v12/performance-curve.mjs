// Profile native route, update and candidate work in a repeatable captured 28-resident scene.
// Generator timings wrap each resume separately so suspended frames do not count as CPU work.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {narrowForest} from '../home-mobility-v11/performance-narrow.mjs';

const arms = (process.env.PERF_ARMS || 'v10,v11-foot,v12').split(',');
const seconds = Number(process.env.PROFILE_SECONDS || 600);
const seed = Number(process.env.PROFILE_SEED || 214);
const output = process.argv[2];
assert.ok(output && seconds > 0);

function summary(numbers) {
  const ordered = numbers.toSorted((a,b) => a-b);
  const percentile = p => ordered[Math.ceil(ordered.length * p)-1];
  return {n: ordered.length, total: numbers.reduce((sum,n) => sum + n,0),
    p50: percentile(.5), p95: percentile(.95), p99: percentile(.99), max: ordered.at(-1)};
}

function profile(arm,order) {
  const sourceFile = `home-production-model-mobility-${arm}.js`;
  const native = fs.readFileSync(path.join(process.env.MOBILITY_GAME,sourceFile),'utf8');
  const samples = new Map();
  const curveEvents = {};
  const lastEvent = {};
  globalThis.HomeV12CurveEvent = (type,details) => {
    curveEvents[type] = (curveEvents[type] || 0)+1;
    lastEvent[type]=details;
  };
  function time(name,action) {
    const start=process.hrtime.bigint(), initial=process.threadCpuUsage();
    try {return action();}
    finally {
      const used=process.threadCpuUsage(initial);
      const elapsed=Number(process.hrtime.bigint()-start)/1e6;
      if (!samples.has(name)) samples.set(name,{wall:[],cpu:[]});
      const row=samples.get(name);
      row.cpu.push((used.user+used.system)/1000);
      row.wall.push(elapsed);
    }
  }
  let observed=native;
  function replaceOne(pattern,replacement) {
    const match=observed.match(new RegExp(pattern.source,'g'));
    assert.equal(match?.length,1,`${arm}: ${pattern}`);
    observed=observed.replace(pattern,replacement);
  }
  for (const name of ['step','move','localIntentRoute','offerYield','yieldLeg','stepRelief']) {
    const pattern=new RegExp('function '+name+'\\([^)]*\\)\\s*\\{');
    replaceOne(pattern, signature=>signature+`return time('${name}',()=>profile_${name}.apply(this,arguments));}`+signature.replace(name,'profile_'+name));
  }
  for (const name of ['pairPlan', ...(arm==='v12'?['curvedHandoff']:[])]) {
    const generator=new RegExp('function\\s*\\*\\s*'+name+'\\s*\\(');
    replaceOne(generator, `function ${name}(...args){const it=profile_${name}(...args), advance=it.next;`+
      `it.next=function(...v){return time('${name}Slice',()=>advance.apply(this,v));};return it;} function* profile_${name}(`);
  }
  const mod={exports:{}};
  new Function('module','time',observed)(mod,time);
  const {model}=narrowForest(mod.exports,seed);
  const feet = model.snapshot().map(a=>[a.key,a.x,a.y]);
  for(let tick=0;tick<Math.round(seconds*10);tick++)model.step(.1,{reducedMotion:false});
  delete globalThis.HomeV12CurveEvent;
  return {arm,order,sourceFile,sourceSHA256:createHash('sha256').update(native).digest('hex'),feet,metrics:model.metrics(),
    curveEvents,lastEvent,timings:Object.fromEntries([...samples].map(([name,row])=>[name,{wallMs:summary(row.wall),cpuMs:summary(row.cpu)}]))};
}

const result={node:process.version,seed,seconds,geometry:'captured-320',rows:[]};
for(const [order,list] of [['forward',arms],['reverse',arms.toReversed()]]) {
  for(const arm of list) {
    result.rows.push(profile(arm,order));
    fs.writeFileSync(output,JSON.stringify(result)+'\n');
  }
}
for(const row of result.rows)assert.deepEqual(row.feet,result.rows[0].feet);
for(const arm of arms)assert.deepEqual(result.rows.find(r=>r.arm===arm).metrics,result.rows.find(r=>r.arm===arm&&r.order==='reverse').metrics);
