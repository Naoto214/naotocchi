import fs from 'node:fs';
import {simulateSplit} from '../split-preview.mjs';
import assert from 'node:assert/strict';
import {stages} from '../stages.mjs';
import {createState,settle,move,mass,validState,supportsAt,complete} from '../../naopoyo-v2/engine.mjs';
const solutions=JSON.parse(fs.readFileSync(new URL('../../../docs/naopoyo-gate-v8-20261026/solutions.json',import.meta.url)));
const report={rules:'magic-gate-v2',seed:43609,unsupported:[],invalid:[],cycles:0,checkedMoves:0,previewMatches:0,stages:[]};
let seed=report.seed;const rng=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296};
const dirs=[[0,-1],[1,-1],[1,0],[1,1],[0,1],[-1,1],[-1,0],[-1,-1]];
function check(stage,s,label){
 if(!validState(stage,s))report.invalid.push({stage:stage.number,label});
 for(const a of s.actors)if(!supportsAt(s,a.x,a.y+1,a,a.id))report.unsupported.push({stage:stage.number,label,actor:structuredClone(a)});
 assert.equal(mass(s),mass(createState(stage)));
}
function attempt(stage,s,id,d,label){
 const before=JSON.stringify(s),copy=structuredClone(s),copy2=structuredClone(s),r=move(copy,id,...d),r2=move(copy2,id,...d);report.checkedMoves++;
 const prediction=simulateSplit(s,id,...d);if(r.ok&&r.events.some(e=>e.type==='split')){assert.ok(prediction);assert.deepEqual(prediction.state,copy);assert.deepEqual(prediction.events,r.events);report.previewMatches++;}else assert.equal(prediction,null);
 assert.deepEqual(copy,copy2,'determinism state');assert.deepEqual(r,r2,'determinism events');assert.equal(JSON.stringify(s),before);
 if(r.ok)check(stage,copy,label);else {assert.deepEqual(copy,s,'rejected move is atomic');if(r.reason==='gravity-cycle')report.cycles++;}
 return {s:copy,r};
}
for(const stage of stages){
 const sol=solutions.stages.find(v=>v.number===stage.number),initial=createState(stage);settle(initial);check(stage,initial,'initial');let s=initial;
 const row={number:stage.number,moves:sol.path.length,split:0,children:0,fall:0,merge:0,overflow:0,contactSupportedAfterSplit:0,acceptedBranches:0,walkAccepted:0};
 for(const [i,p] of sol.path.entries()){
  for(const a of s.actors)for(const d of dirs){const b=attempt(stage,s,a.id,d,'branch-'+i);if(b.r.ok)row.acceptedBranches++;}
  const a=s.actors.find(a=>a.x===p.at[0]&&a.y===p.at[1]&&a.level===p.level);assert.ok(a);
  const n=attempt(stage,s,a.id,p.d,'witness-'+i);assert.ok(n.r.ok);s=n.s;
  for(const e of n.r.events){if(e.type in row)row[e.type]++;if(e.type==='split')row.children+=e.count;if(e.type==='merge'&&e.overflow)row.overflow++;}
  if(n.r.events.some(e=>e.type==='split'))row.contactSupportedAfterSplit+=s.actors.filter(a=>s.actors.some(b=>b.x===a.x&&b.y===a.y+1)).length;
 }
 assert.ok(complete(s));row.complete=true;
 s=structuredClone(initial);
 for(let n=0;n<2000;n++){
  if(!s.actors.length||n%100===0)s=structuredClone(initial);
  const a=s.actors[Math.floor(rng()*s.actors.length)],d=dirs[Math.floor(rng()*8)],next=attempt(stage,s,a.id,d,'walk-'+n);
  if(next.r.ok){s=next.s;row.walkAccepted++;}
 }
 report.stages.push(row);
}
assert.equal(report.unsupported.length,0);assert.equal(report.invalid.length,0);
if(process.argv[2])fs.writeFileSync(process.argv[2],JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));
