import fs from 'node:fs';
import {stages} from '../naopoyo-chapter2/stages.mjs';
import {search,stateKey} from './search-core.mjs';
import {createState,settle,move,complete,clone,mass} from './engine.mjs';
const out=new URL('../../docs/naopoyo-split-priority-20261030/',import.meta.url);
const compatibility=JSON.parse(fs.readFileSync(new URL('compatibility.json',out)));
function run(stage,path){const s=createState(stage);settle(s);const snapshots=[clone(s)];for(const step of path){const a=s.actors.find(a=>a.x===step.at[0]&&a.y===step.at[1]&&a.level===step.level);if(!a)return {ok:false,s,snapshots};const r=move(s,a.id,...step.d);if(!r.ok)return {ok:false,s,snapshots};snapshots.push(clone(s));}return {ok:complete(s),s,snapshots};}
const results=[];
for(const row of compatibility)for(const mode of ['B','C'])if(row.modes[mode].status!=='solved'){
 const stage=stages.find(s=>s.number===row.number),candidate={...stage,splitPriority:mode},witness=JSON.parse(fs.readFileSync(new URL(`../naopoyo-chapter2/examples/${row.number}.json`,import.meta.url))).path;
 const baseline=run({...stage,splitPriority:'A'},witness),first=row.modes[mode].firstDivergence||row.modes[mode].failure.step,start=Math.max(0,first-1),prefix=witness.slice(0,start),initial=run(candidate,prefix).s;
 const goals=new Map(baseline.snapshots.map((s,i)=>[stateKey(s),i]).filter(([,i])=>i>start));
 const attempts=[];let solution=null;
 // First seek a short bridge back to a verified suffix. A matching board is only
 // a candidate: the whole assembled path must replay successfully under B/C.
 const bridge=search(candidate,{initial,limit:100000,maxMs:20000,method:'bfs',goal:s=>goals.has(stateKey(s))});attempts.push({kind:'bridge',...bridge,path:undefined});
 if(bridge.status==='solved'){const bs=run(candidate,[...prefix,...bridge.path]).s,index=goals.get(stateKey(bs)),path=[...prefix,...bridge.path,...witness.slice(index)];if(run(candidate,path).ok)solution=path;}
 if(!solution){const greedy=search(candidate,{limit:130000,maxMs:25000,method:'greedy'});attempts.push({kind:'full-greedy',...greedy,path:undefined});if(greedy.status==='solved'&&run(candidate,greedy.path).ok)solution=greedy.path;}
 if(!solution){const bfs=search(candidate,{limit:100000,maxMs:15000,method:'bfs'});attempts.push({kind:'full-bfs',...bfs,path:undefined});if(bfs.status==='solved'&&run(candidate,bfs.path).ok)solution=bfs.path;}
 const result={stage:row.number,mode,status:solution?'solved':'not-found-within-budget',moves:solution?.length||null,shortestProven:false,attempts};
 if(solution){const verified=run(candidate,solution);if(!verified.ok||mass(verified.s)!==mass(createState(candidate)))throw Error('invalid witness');fs.writeFileSync(new URL(`alternative-${row.number}-${mode}.json`,out),JSON.stringify({id:stage.id,mode,path:solution,shortestProven:false}));}
 results.push(result);fs.writeFileSync(new URL('search-results.json',out),JSON.stringify(results,null,2));console.log(JSON.stringify(result));
}
