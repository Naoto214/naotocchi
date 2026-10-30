import fs from 'node:fs';import assert from 'node:assert/strict';import {execFileSync} from 'node:child_process';
import {stages} from '../stages.mjs';import * as E from '../../naopoyo-v2/engine.mjs';import {simulateSplit} from '../split-preview.mjs';import {search,replay} from '../search.mjs';import {splitVisualActors} from '../split-motion.mjs';
const dir=new URL('../../../docs/naopoyo-v10-20261028/',import.meta.url),read=p=>JSON.parse(fs.readFileSync(new URL(p,dir))),save=(p,v)=>fs.writeFileSync(new URL(p,dir),JSON.stringify(v,null,2)+'\n');
const old=JSON.parse(fs.readFileSync(new URL('../../../docs/naopoyo-gate-v8-20261026/solutions.json',import.meta.url))),solutions=read('solutions.json');
const report={implementation:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),workingTree:true,rule:'recombine-once-v1',seed:43610,attempted:0,accepted:0,cycles:0,previewMatches:0,frames:0,stages:[],v9Replay:[],noSplit:[],examples:{}};
let seed=report.seed;const rng=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296};const dirs=[[0,-1],[1,-1],[1,0],[1,1],[0,1],[-1,1],[-1,0],[-1,-1]];
function attempt(st,s,id,d){
 const before=JSON.stringify(s),n=E.clone(s),n2=E.clone(s),r=E.move(n,id,...d),r2=E.move(n2,id,...d);report.attempted++;assert.deepEqual(n,n2);assert.deepEqual(r,r2);const p=simulateSplit(s,id,...d);assert.equal(JSON.stringify(s),before);
 if(!r.ok){assert.deepEqual(n,s);assert.equal(p,null);if(r.reason==='gravity-cycle')report.cycles++;return {n,r};}
 report.accepted++;assert.deepEqual(E.totals(n),E.totals(s));assert.ok(E.validState(st,n));for(const a of n.actors)assert.ok(E.supportsAt(n,a.x,a.y+1,a,a.id));
 const splits=r.events.filter(e=>e.type==='split');assert.equal(new Set(splits.map(e=>`${e.x},${e.y}`)).size,splits.length);
 if(splits.length){assert.ok(p);assert.deepEqual(p.state,n);assert.deepEqual(p.events,r.events);report.previewMatches++;for(const e of splits){const body=n.actors.find(a=>a.id===e.id);if(body)assert.ok(p.actors.some(a=>a.id===body.id),'surviving split body appears in preview');}}else assert.equal(p,null);
 return {n,r};
}
for(const st of stages){
 const w=solutions.stages.find(w=>w.number===st.number),initial=E.createState(st);E.settle(initial);let s=initial;const row={number:st.number,moves:w.path.length,split:0,children:0,merge:0,overflow:0,fall:0,rescue:0,immediateRecombinations:0,distanceTwoBirths:0,remoteSurvivors:0,uniqueStates:0};const seen=new Set();
 for(const [i,a] of w.path.entries()){
  seen.add(JSON.stringify(s.actors.map(a=>[a.x,a.y,a.level,a.species]).sort()));
  for(const v of s.actors)for(const d of dirs)attempt(st,s,v.id,d);
  const v=s.actors.find(v=>v.x===a.at[0]&&v.y===a.at[1]&&v.level===a.level);assert.ok(v);const {n,r}=attempt(st,s,v.id,a.d);assert.ok(r.ok);
  for(const e of r.events){if(e.type in row)row[e.type]++;if(e.type==='merge'&&e.overflow)row.overflow++;if(e.type==='split'){
   row.children+=e.count;
   for(const c of e.children){const remote=Math.max(Math.abs(c.x-e.x),Math.abs(c.y-e.y))===2;if(remote)row.distanceTwoBirths++;if(remote&&n.actors.some(x=>x.id===c.id))row.remoteSurvivors++;if(r.events.some(m=>m.type==='merge'&&m.absorbed?.some(x=>x.id===c.id)))row.immediateRecombinations++;}
  }}
  if(r.events.some(e=>e.type==='split')){
   const f={before:s,after:n,events:r.events,id:v.id,dx:a.d[0],dy:a.d[1]};
   for(let j=0;j<=100;j++){const drawn=splitVisualActors(f,j/100);report.frames++;for(const x of drawn){assert.ok(Number.isFinite(x.x)&&Number.isFinite(x.y));assert.ok(Number.isInteger(x.level)&&x.level>=1&&x.level<=8);}
    if(j===100)assert.deepEqual(drawn.filter(x=>x.opacity>0).map(x=>[x.id,x.x,x.y,x.level]).sort(),n.actors.map(x=>[x.id,x.x,x.y,x.level]).sort());
   }
   for(const c of r.events.flatMap(e=>e.children||[]).filter(c=>!n.actors.some(a=>a.id===c.id))){assert.ok(Array.from({length:1001},(_,i)=>i/1000).some(t=>splitVisualActors(f,t).some(x=>x.id===c.id&&x.opacity>0)),'transient child visible');}
   if(!report.examples[st.number])report.examples[st.number]={step:i+1,before:s,action:a,events:r.events,after:n};
  }
  s=n;
 }
 assert.ok(E.complete(s));row.complete=true;row.uniqueStates=seen.size;report.stages.push(row);
 try{const result=replay(st,old.stages.find(x=>x.number===st.number).path);report.v9Replay.push({number:st.number,complete:E.complete(result)});}catch(e){report.v9Replay.push({number:st.number,complete:false,reason:e.message});}
 s=E.clone(initial);for(let i=0;i<2000;i++){if(!s.actors.length||i%100===0)s=E.clone(initial);const v=s.actors[Math.floor(rng()*s.actors.length)],d=dirs[Math.floor(rng()*8)],{n,r}=attempt(st,s,v.id,d);if(r.ok)s=n;}
 // Stages 11–14 intentionally teach gravity/support before split is introduced.
 if(st.number>=15){const result=search(st,{limit:400000,maxMs:60000,filter:(_s,_n,r)=>!r.events.some(e=>e.type==='split')});report.noSplit.push({number:st.number,...result});assert.equal(result.status,'exhausted');}
 save('evidence/audit.json',report);console.log(JSON.stringify(row));
}
const repro=read('repro-source.json');report.comparison={classification:'equivalent condition from V9 witness step 7, not user input trace'};
for(const v of [9,10]){const before=E.clone(repro.before);if(v===10)before.splitRules='recombine-once-v1';const after=E.clone(before),a=after.actors.find(a=>a.x===repro.action.at[0]&&a.y===repro.action.at[1]),prediction=simulateSplit(before,a.id,...repro.action.d),result=E.move(after,a.id,...repro.action.d);report.comparison['v'+v]={before,action:repro.action,result,after,preview:prediction};}
assert.equal(report.cycles,0);save('evidence/audit.json',report);console.log(JSON.stringify({attempted:report.attempted,accepted:report.accepted,cycles:report.cycles,previewMatches:report.previewMatches,frames:report.frames,noSplit:report.noSplit.map(r=>[r.number,r.status,r.visited])}));
