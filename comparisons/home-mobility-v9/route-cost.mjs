// Attribute actual CPU work in a deterministic replay, including generator slices.
// This excludes native layout/painting. The WPE trace covers those costs separately.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {forest} from './movement-scene.mjs';

const result={seed:214,stepSeconds:.1,seconds:600,node:process.version,rows:[]};
function summarize(times) {
  times.sort((a,b)=>a-b);
  const grade=p=>Number(times[Math.max(0,Math.ceil(p*times.length)-1)].toFixed(3));
  return {calls:times.length,ms:Number(times.reduce((sum,t)=>sum+t,0).toFixed(3)),
    p50:grade(.5),p95:grade(.95),p99:grade(.99),max:grade(1)};
}
for(const arm of ['v8','v9']){
  const original=fs.readFileSync(path.join(process.env.MOBILITY_GAME,`home-production-model-mobility-${arm}.js`),'utf8');
  const marks=new Map();
  function timed(key,operation) {
    if(!marks.has(key))marks.set(key,[]);
    const start=performance.now();
    try{return operation();}finally{marks.get(key).push(performance.now()-start);}
  }
  let code=original;
  for(const name of ['move','step','stepRelief',...(arm==='v9'?['localIntentRoute']:[])]){
    const header=code.match(new RegExp('function '+name+'\\([^)]*\\)\\s*\\{'))?.[0];
    assert(header,name);
    code=code.replace(header,header+`return timed('${name}',()=>inner_${name}.apply(this,arguments));} `
      +header.replace(name,'inner_'+name));
  }
  const anchor='result=r.search.next();';
  assert.equal(code.split(anchor).length,2);
  code=code.replace(anchor,"result=timed('ambient-search-slice',()=>r.search.next());");
  const module={exports:{}};
  new Function('module','timed',code)(module,timed);
  const {model}=forest(module.exports,214);
  for(let i=0;i<6000;i++)model.step(.1,{reducedMotion:false});
  result.rows.push({arm,sourceSHA256:createHash('sha256').update(original).digest('hex'),model:model.metrics(),
    timing:Object.fromEntries([...marks].map(([name,times])=>[name,summarize(times)]))});
}
fs.writeFileSync(process.argv[2],JSON.stringify(result)+'\n');
