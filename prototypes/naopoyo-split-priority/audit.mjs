import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {stages} from '../naopoyo-chapter2/stages.mjs';
import * as engine from './engine.mjs';
import {candidateDetails,compass,headingNames} from './priorities.mjs';
import {fixture,simulate,scenarios} from './model.mjs';
const root=path.dirname(fileURLToPath(import.meta.url));
const out=path.resolve(root,'../../docs/naopoyo-split-priority-20261030');fs.mkdirSync(out,{recursive:true});
export function replay(stage,witness,mode){
 const state=engine.createState({...stage,splitPriority:mode});engine.settle(state);const total=engine.mass(state),initial=engine.clone(state);
 const metrics={steps:0,splits:0,children:0,merges:0,familyMerges:0,overflow:0,rescues:0,secondStepSplits:0,selectedDiffersFromA:0,candidateOrderChangesWithObstacles:0,directionChanges:0,actorSwitches:0};
 const snapshots=[engine.clone(state)],splitLog=[];let lastActor=null,lastDirection=null;
 for(const [i,step]of witness.entries()){
  const actor=state.actors.find(a=>a.x===step.at[0]&&a.y===step.at[1]);
  if(!actor||actor.level!==step.level)return {mode,status:'incompatible',failure:{step:i+1,reason:'actor-or-level',expected:step,actual:actor||null},metrics,state,initial,snapshots,splitLog};
  const families=new Map();let familyId=0;
  const result=engine.move(state,actor.id,...step.d,{observeSplit:e=>{
   const pre=engine.clone(e.state);pre.actors=pre.actors.filter(a=>!e.children.some(c=>c.id===a.id));const p=pre.actors.find(a=>a.id===e.parentId);p.level+=e.children.length;
   const actual=candidateDetails(pre,p.x,p.y,...e.direction,p,{},mode),baseline=candidateDetails(pre,p.x,p.y,...e.direction,p,{},'A'),n=e.children.length;
   const empty=engine.clone(pre);empty.walls=[];empty.gates=[];empty.exits=[];empty.spikes=empty.spikes.filter(q=>q.x===p.x&&q.y===p.y);empty.actors=[p];
   const unobstructed=candidateDetails(empty,p.x,p.y,...e.direction,p,{},mode);const allowed=new Set(actual.map(q=>`${q.x},${q.y}`));
   const positions=v=>JSON.stringify(v.map(q=>[q.x,q.y]));
   if(actual.slice(0,n).some(q=>q.distance===2))metrics.secondStepSplits++;
   const power=pre.spikes.find(t=>t.x===p.x&&t.y===p.y)?.power||0,baselineCount=Math.min(p.level-1,power,baseline.length);
   if(positions(actual.slice(0,n))!==positions(baseline.slice(0,baselineCount)))metrics.selectedDiffersFromA++;
   if(positions(actual)!==positions(unobstructed.filter(q=>allowed.has(`${q.x},${q.y}`))))metrics.candidateOrderChangesWithObstacles++;
   splitLog.push({step:i+1,parentId:p.id,direction:e.direction,candidates:actual,children:e.children,remaining:e.state.actors.find(a=>a.id===p.id).level});
   // Family tags are local to a single move and used only for observational counts.
   familyId++;families.set(p.id,familyId);for(const c of e.children)families.set(c.id,familyId);
  }});
  if(!result.ok)return {mode,status:'incompatible',failure:{step:i+1,reason:result.reason},metrics,state,initial,snapshots,splitLog};
  if(engine.mass(state)!==total||!engine.validState({...stage,splitPriority:mode},state))throw Error(`Invalid state ${stage.number}/${mode}/${i}`);
  metrics.steps++;if(lastActor&&lastActor!==actor.id)metrics.actorSwitches++;if(lastDirection&&lastDirection!==step.d.join())metrics.directionChanges++;lastActor=actor.id;lastDirection=step.d.join();
  // Count families chronologically from split/merge events, so later splits do not
  // retroactively reclassify earlier merges.
  const eventFamily=new Map();let f=0;
  for(const e of result.events){if(e.type==='split'){metrics.splits++;metrics.children+=e.count;f++;eventFamily.set(e.id,f);for(const c of e.children||[])eventFamily.set(c.id,f);}
   if(e.type==='merge'){metrics.merges++;if(e.overflow)metrics.overflow++;const a=e.contact?.incoming?.id,b=e.contact?.target?.id;if(a&&b&&eventFamily.has(a)&&eventFamily.get(a)===eventFamily.get(b))metrics.familyMerges++;eventFamily.delete(a);eventFamily.delete(b);}
   if(e.type==='rescue')metrics.rescues++;
  }
  snapshots.push(engine.clone(state));
 }
 return {mode,status:engine.complete(state)?'solved':'incomplete',metrics,state,initial,snapshots,splitLog};
}
export function audit(){
const report=[];
for(const stage of stages){const witness=JSON.parse(fs.readFileSync(path.join(root,`../naopoyo-chapter2/examples/${stage.number}.json`))).path;const row={number:stage.number,id:stage.id,savedMoves:witness.length,modes:{}};let a;
 for(const mode of ['A','B','C']){const r=replay(stage,witness,mode);if(mode==='A')a=r;const clean=s=>{const q=engine.clone(s);delete q.splitPriority;return q};let firstDivergence=null;for(let i=0;i<Math.min(r.snapshots.length,a.snapshots.length);i++)if(JSON.stringify(clean(r.snapshots[i]))!==JSON.stringify(clean(a.snapshots[i]))){firstDivergence=i;break}row.modes[mode]={status:r.status,failure:r.failure,firstDivergence,metrics:r.metrics,rescued:r.state.rescued,remaining:engine.mass(r.state)-r.state.rescued};
  fs.writeFileSync(path.join(out,`replay-${stage.number}-${mode}.json`),JSON.stringify({stage:stage.number,mode,...row.modes[mode],splitLog:r.splitLog}));
 }report.push(row);
}
fs.writeFileSync(path.join(out,'compatibility.json'),JSON.stringify(report,null,2));
const atlas=[],cases=[];
for(const mode of ['A','B','C'])for(let heading=0;heading<8;heading++){
 const r=simulate(fixture(),mode,heading);atlas.push({mode,heading:headingNames[heading],direction:compass[heading],candidates:r.candidates});
 for(const [name]of scenarios)for(const gravity of [false,true]){const r=simulate(fixture(name,{gravity}),mode,heading);cases.push({mode,heading,name,gravity,candidates:r.candidates,initial:r.initial,spawn:r.spawn,final:r.final,events:r.result.events,ok:r.result.ok,reason:r.result.reason});}
}
fs.writeFileSync(path.join(out,'rank-atlas.json'),JSON.stringify(atlas));fs.writeFileSync(path.join(out,'scenarios.json'),JSON.stringify(cases));
console.log(report.map(r=>`${r.number} (${r.savedMoves}): `+Object.entries(r.modes).map(([k,v])=>`${k} ${v.status}${v.failure?' @'+v.failure.step:''}`).join(' / ')).join('\n'));
const alternatives=[];
for(const f of fs.readdirSync(out).filter(f=>/^alternative-\d+-[BC]\.json$/.test(f))){const w=JSON.parse(fs.readFileSync(path.join(out,f))),stage=stages.find(s=>s.id===w.id),r=replay(stage,w.path,w.mode);if(r.status!=='solved')throw Error(`Alternative failed: ${f}`);alternatives.push({stage:stage.number,mode:w.mode,status:r.status,metrics:r.metrics});}
fs.writeFileSync(path.join(out,'alternative-metrics.json'),JSON.stringify(alternatives,null,2));

}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))audit();
