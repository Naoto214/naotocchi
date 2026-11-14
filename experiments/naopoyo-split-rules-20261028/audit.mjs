import fs from 'node:fs';
import assert from 'node:assert/strict';
import {stages} from './baseline/prototypes/naopoyo-chapter2/stages.mjs';
import * as original from './baseline/prototypes/naopoyo-v2/engine.mjs';
const root=new URL('./',import.meta.url),read=p=>JSON.parse(fs.readFileSync(new URL(p,root)));
const save=(p,v)=>fs.writeFileSync(new URL('evidence/'+p,root),JSON.stringify(v,null,2)+'\n');
const solutions=read('baseline/docs/naopoyo-gate-v8-20261026/solutions.json');
const repro=read('evidence/repro-source.json');
export const dirs=[[0,-1],[1,-1],[1,0],[1,1],[0,1],[-1,1],[-1,0],[-1,-1]];
const engines={},previews={};for(const mode of ['A','B','C','B-once']){engines[mode]=await import(`./generated/${mode}/engine.mjs`);previews[mode]=await import(`./generated/${mode}/preview.mjs`);}
const reproduction={classification:'equivalent-condition, not user-input replay',baselineStep:7,modes:{}};
for(const [mode,E] of Object.entries(engines)){
 const s=structuredClone(repro.before),trace=[],a=s.actors.find(a=>a.x===repro.action.at[0]&&a.y===repro.action.at[1]);
 const result=E.move(s,a.id,...repro.action.d,{trace:x=>trace.push(x)});
 reproduction.modes[mode]={before:repro.before,action:repro.action,result,after:s,trace};
}
save('reproduction.json',reproduction);
const report={seed:43628,baseline:'1e1e04661e2f59b7ad6bd3e56dc3cef7c2d623c5',modes:{},cycleExamples:{},commonComparisons:{}};
for(const [mode,E] of Object.entries(engines)){
 const row=report.modes[mode]={attempted:0,accepted:0,cycles:0,splitMoves:0,previewMatches:0,invalid:0,unsupported:0,massViolations:0,determinism:0,stages:[]};
 let seed=report.seed;const rng=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296};
 function attempt(stage,s,id,d){
  row.attempted++;const before=JSON.stringify(s),next=E.clone(s),copy=E.clone(s),r=E.move(next,id,...d),r2=E.move(copy,id,...d);
  assert.deepEqual(r,r2);assert.deepEqual(next,copy);row.determinism++;
  const prediction=previews[mode].simulateSplit(s,id,...d);assert.equal(JSON.stringify(s),before);
  if(r.ok){row.accepted++;assert.equal(E.mass(next),E.mass(s));assert.ok(E.validState(stage,next));
   for(const a of next.actors)assert.ok(E.supportsAt(next,a.x,a.y+1,a,a.id));
   if(r.events.some(e=>e.type==='split')){row.splitMoves++;assert.deepEqual(prediction.state,next);assert.deepEqual(prediction.events,r.events);row.previewMatches++;}else assert.equal(prediction,null);
  }else{assert.deepEqual(next,s);assert.equal(prediction,null);if(r.reason==='gravity-cycle'){row.cycles++;if(!report.cycleExamples[mode]){const traced=E.clone(s),trace=[];const result=E.move(traced,id,...d,{trace:x=>trace.push(x)});report.cycleExamples[mode]={stage:stage.number,before:E.clone(s),id,d,result,after:traced,trace};}}}
  return {s:next,r};
 }
 for(const st of stages){
  const solution=solutions.stages.find(v=>v.number===st.number),initial=E.createState(st);E.settle(initial);let s=initial;
  const summary={number:st.number,savedLength:solution.path.length,replayed:0,split:0,children:0,merge:0,overflow:0,fall:0,complete:false,failure:null};
  for(const [i,p] of solution.path.entries()){
   const a=s.actors.find(a=>a.x===p.at[0]&&a.y===p.at[1]&&a.level===p.level);
   if(!a){summary.failure={step:i+1,reason:'actor/level changed',expected:p,actors:s.actors};break;}
   const n=attempt(st,s,a.id,p.d);if(!n.r.ok){summary.failure={step:i+1,reason:n.r.reason};break;}s=n.s;summary.replayed++;
   for(const e of n.r.events){if(e.type in summary)summary[e.type]++;if(e.type==='split')summary.children+=e.count;if(e.type==='merge'&&e.overflow)summary.overflow++;}
  }summary.complete=E.complete(s);row.stages.push(summary);
  // Common-state branch coverage uses unchanged V9 witness states for all variants.
  let common=original.createState(st);original.settle(common);
  for(const p of solution.path){
   for(const a of common.actors)for(const d of dirs){const n=attempt(st,common,a.id,d);if(mode==='A'){const check=original.clone(common),r=original.move(check,a.id,...d);assert.deepEqual(n.s,check);assert.deepEqual(n.r,r);}}
   const a=common.actors.find(a=>a.x===p.at[0]&&a.y===p.at[1]);original.move(common,a.id,...p.d);
  }
  // Same seed, independent reachable walks (2,000 attempts per stage).
  s=E.clone(initial);for(let i=0;i<2000;i++){if(!s.actors.length||i%100===0)s=E.clone(initial);const a=s.actors[Math.floor(rng()*s.actors.length)],d=dirs[Math.floor(rng()*8)];const n=attempt(st,s,a.id,d);if(n.r.ok)s=n.s;}
 }
 console.log(mode,JSON.stringify({...row,stages:row.stages.map(x=>[x.number,x.complete,x.failure?.step])}));
}
save('audit.json',report);
console.log('Saved reproduction.json and audit.json; invariant/preview assertions passed.');
