import fs from 'node:fs';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import {runTrial} from './gauge-comparison.mjs';
import {ensureManifest} from './balance-manifest.mjs';
const root=new URL('./',import.meta.url),dir=new URL('./gauge-results-20261014/',root);
fs.mkdirSync(dir,{recursive:true});
const designs=JSON.parse(fs.readFileSync(new URL('gauge-design-20261014.json',root)));
const phase=process.argv[2]??'fixed',worker=Number(process.argv[3]??0),workers=Number(process.argv[4]??1);
const design=phase==='adapted'?JSON.parse(fs.readFileSync(new URL('selection.json',dir))).design:designs[phase];
assert.ok(design,'unknown phase');
const sources={};function visit(f){if(sources[f])return;const b=fs.readFileSync(new URL(f,root));sources[f]=crypto.createHash('sha256').update(b).digest('hex');for(const m of b.toString().matchAll(/(?:from\s*|import\s*)['"]\.\/([^'"]+\.mjs)['"]/g))visit(m[1]);}visit('gauge-run.mjs');
const manifest={phase,...design,limits:designs.limits,toolCap:64,sources,sourceHead:designs.sourceHead};
const mf=new URL(phase+'-manifest.json',dir);if(worker===0)ensureManifest(mf,manifest);else {while(!fs.existsSync(mf))await new Promise(r=>setTimeout(r,50));ensureManifest(mf,manifest);}
let job=0;
for(const c of design.conditions)for(const seed of design.seeds){
 if(job++%workers!==worker)continue;
 const f=new URL(`${phase}-${c.id}-${seed}.json`,dir);if(fs.existsSync(f))continue;
 let t,source=null;
 if(phase==='fixed'&&[2,8].includes(c.gauge)){
  source=`optimization-confirm-v2-20261014/${c.gauge===2?'g2':'baseline8'}-${seed}.json`;
 }else if(phase==='adapted'&&Object.keys(c.options).length===0)source=`gauge-results-20261014/fixed-g${c.gauge}-${seed}.json`;
 if(source){const raw=fs.readFileSync(new URL(source,root));t=JSON.parse(raw);assert.equal(t.seed,seed);assert.equal(t.initial.rules.gaugeUnit,c.gauge);t={...t,condition:c,reused:{source,sha256:crypto.createHash('sha256').update(raw).digest('hex')}};}
 else t=runTrial(c,seed,designs.limits);
 fs.writeFileSync(f,JSON.stringify(t),{flag:'wx'});console.log(phase,c.id,seed,t.metrics.status,t.metrics.drops,t.actions.length);
}
