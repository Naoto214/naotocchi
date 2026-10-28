import fs from 'node:fs';import assert from 'node:assert/strict';
import {actor,board,cycleWell,overflowBoard,multipleSpikes} from './fixtures.mjs';
const save=(p,v)=>fs.writeFileSync(new URL('./evidence/'+p,import.meta.url),JSON.stringify(v)+'\n');
const out={modes:{},directions:[]};
const dirs=[[0,-1],[1,-1],[1,0],[1,1],[0,1],[-1,1],[-1,0],[-1,-1]];
for(const mode of ['A','B','C','B-once']){
 const E=await import(`./generated/${mode}/engine.mjs`),row=out.modes[mode]={};
 function run(name,st,id,d,external=false,power=1){const s=E.createState(st),trace=[],before=E.clone(s);const result=external?E.externalSplit(s,id,power,...d,{trace:x=>trace.push(x)}):E.move(s,id,...d,{trace:x=>trace.push(x)});assert.equal(E.mass(s),E.mass(before));row[name]={before,id,d,result,after:s,trace};return s;}
 run('inactive-spike-cycle',cycleWell(),'active',[1,0]);
 run('overflow-two-spikes',overflowBoard(),'a',[0,1]);
 run('multiple-spikes-same-step',multipleSpikes(),'a',[0,1]);
 const s=run('parent-child-immediate',board({actors:[actor('a',3,5,6)],walls:[[3,6]],spikes:[{x:3,y:5,power:1}]}),'a',[0,1],true);
 if(mode==='A'){
  const trace=[],before=E.clone(s);const upper=s.actors.find(a=>a.x===3&&a.y===4);const r=E.move(s,upper.id,0,1,{trace:x=>trace.push(x)});row['next-step-normal-merge']={before,id:upper.id,d:[0,1],result:r,after:s,trace};assert.ok(r.events.some(e=>e.type==='merge'));
 }
 const st=board({actors:[actor('a',2,6,6)],spikes:[{x:3,y:6,power:1}]});let repeat=E.createState(st);const events=[];
 for(const d of [[1,0],[-1,0],[1,0]]){const r=E.move(repeat,'a',...d);events.push(r);assert.ok(r.ok);}
 row['consecutive-reentry-new-steps']={before:st,results:events,after:repeat};assert.ok(events[0].events.some(e=>e.type==='split'));assert.ok(events[2].events.some(e=>e.type==='split'));
 const enclosed=board({w:3,h:3,actors:[actor('a',1,1,8)],walls:[[0,0],[1,0],[2,0],[0,1],[2,1],[0,2],[1,2],[2,2]],spikes:[{x:1,y:1,power:9}]});
 run('no-space',enclosed,'a',[1,0],true,9);assert.equal(row['no-space'].result.split,0);
 run('max-seven-children',board({w:9,h:9,actors:[actor('a',4,4,8)]}),'a',[1,0],true,99);assert.equal(row['max-seven-children'].result.split,7);
}
const A=await import('./generated/A/engine.mjs');
for(const d of dirs){const st=board({w:9,h:9,actors:[actor('a',4,4,8)]}),s=A.createState(st),positions=A.splitCandidates(s,4,4,...d,s.actors[0]);const r=A.externalSplit(s,'a',7,...d);out.directions.push({direction:d,positions,initial:st,result:r,after:s});}
// Keep every contact/actor/family snapshot, but store accumulated event history
// once at the final trace entry instead of duplicating it at each contact.
for(const cases of Object.values(out.modes))for(const row of Object.values(cases)){
 for(const [i,t] of (row.trace||[]).entries()){t.eventCount=t.events.length;if(i<row.trace.length-1)delete t.events;}
}
save('probes.json',out);console.log(Object.fromEntries(Object.entries(out.modes).map(([m,v])=>[m,Object.fromEntries(Object.entries(v).map(([k,x])=>[k,{ok:x.result?.ok,reason:x.result?.reason,events:x.result?.events?.map(e=>e.type),actors:x.after.actors.map(a=>[a.x,a.y,a.level])}]))])));
