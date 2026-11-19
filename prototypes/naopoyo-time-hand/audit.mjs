import fs from 'node:fs';import {gzipSync} from 'node:zlib';import assert from 'node:assert/strict';
import {stages as chapter1} from '../naopoyo-chapter1/stages.mjs';import {stages as chapter2} from '../naopoyo-chapter2/stages.mjs';
import * as e from './engine.mjs';import {fixture,simulate,scenarios} from './model.mjs';import {compass} from './priorities.mjs';import {search,replay as checkWitness} from './search-core.mjs';
const out=new URL('../../docs/naopoyo-time-hand-20261031/',import.meta.url);fs.mkdirSync(out,{recursive:true});const write=(name,data)=>{if(name==='scenarios.json')fs.writeFileSync(new URL(name+'.gz',out),gzipSync(JSON.stringify(data)));else fs.writeFileSync(new URL(name,out),JSON.stringify(data,null,2));};
const first=JSON.parse(fs.readFileSync(new URL('chapter1-reference.json',out)));
const rows=[],all=[...chapter1,...chapter2];
function replay(stage,path,mode){const s=e.createState({...stage,splitPriority:mode});e.settle(s);const total=e.mass(s),metrics={steps:0,splits:0,children:0,merges:0,familyMerges:0,overflow:0,falls:0},snapshots=[],splitLog=[];let failure=null;
 for(const [i,step] of path.entries()){
  const a=step.id?s.actors.find(a=>a.id===step.id):s.actors.find(a=>a.x===step.at[0]&&a.y===step.at[1]);
  if(!a||step.level!==undefined&&a.level!==step.level){failure={step:i+1,reason:'actor-or-level'};break;}
  const r=e.move(s,a.id,...(step.d||[step.dx,step.dy]),{observeSplit:v=>splitLog.push({step:i+1,...v})});if(!r.ok){failure={step:i+1,reason:r.reason};break;}
  assert.equal(e.mass(s),total);assert(e.validState(stage,s),`${stage.id}/${i}`);metrics.steps++;
  const families=new Map();let family=0;
  for(const event of r.events){if(event.type==='split'){metrics.splits++;metrics.children+=event.count;family++;families.set(event.id,family);for(const c of event.children||[])families.set(c.id,family);}if(event.type==='merge'){metrics.merges++;if(event.overflow)metrics.overflow++;const a=event.contact?.incoming?.id,b=event.contact?.target?.id;if(families.has(a)&&families.get(a)===families.get(b))metrics.familyMerges++;}if(event.type==='fall')metrics.falls++;}
  snapshots.push(e.clone(s));
 }
 return {status:e.complete(s)?'solved':failure?'incompatible':'incomplete',failure,metrics,rescued:s.rescued,mass:total,final:s,snapshots,splitLog};
}
for(const [i,stage] of all.entries()){
 const path=i<10?first.find(w=>w.stage===stage.id).commands:JSON.parse(fs.readFileSync(new URL(`../naopoyo-chapter2/examples/${stage.number}.json`,import.meta.url))).path;
 const row={number:i+1,id:stage.id,savedMoves:path.length,modes:{}};
 for(const mode of ['A','B','C','D']){const result=replay(stage,path,mode);row.modes[mode]={...result};delete row.modes[mode].snapshots;delete row.modes[mode].splitLog;delete row.modes[mode].final;if(mode==='D')write(`replay-${i+1}-D.json`,result);}
 rows.push(row);console.log('replay',i+1,Object.entries(row.modes).map(([k,v])=>`${k}:${v.status}${v.failure?'@'+v.failure.step:''}`).join(' '));
}
write('compatibility.json',rows);fs.writeFileSync(new URL('compatibility.json',import.meta.url),JSON.stringify(rows,null,2));
const cases=[];for(const [name] of scenarios)for(const gravity of [false,true])for(let heading=0;heading<8;heading++)for(const mode of ['A','B','C','D']){const r=simulate(fixture(name,{gravity}),mode,heading);assert.equal(e.mass(r.initial),e.mass(r.final));assert(r.result.ok,`${name}/${mode}/${heading}/${gravity}`);cases.push({name,gravity,heading,mode,...r});}
write('scenarios.json',cases);console.log('scenarios',cases.length);
const variants=[];for(const maxSteps of [2,3,7])for(const resetHeading of [false,true])for(const passGenerated of [false,true])for(const [name]of scenarios)for(let h=0;h<8;h++){const s=fixture(name);s.timeHand={maxSteps,resetHeading,passGenerated};const r=simulate(s,'D',h);assert.equal(e.mass(r.final),e.mass(s));variants.push({name,h,...s.timeHand,count:r.spawns[0]?.children.length||0,cells:r.candidates.map(p=>[p.x,p.y]),stop:r.trace.stop});}write('variants.json',variants);console.log('variants',variants.length);
if(!process.argv.includes('--no-search')){
 const searches=[];for(const [i,stage]of all.entries()){
  let result;if(rows[i].modes.D.status==='solved')result={status:'solved',method:'existing-witness',depth:rows[i].savedMoves,shortestProven:false};else{
   result=search({...stage,splitPriority:'D'},{limit:20000,maxMs:5000,method:'greedy'});
   if(result.status==='solved'){const final=checkWitness({...stage,splitPriority:'D'},result.path);assert(e.complete(final));write(`alternative-${i+1}-D.json`,{id:stage.id,mode:'D',...result});}
  }searches.push({number:i+1,...result});write('search-results.json',searches);console.log('search',i+1,result.status,result.depth||'',result.visited||'');
 }
}
