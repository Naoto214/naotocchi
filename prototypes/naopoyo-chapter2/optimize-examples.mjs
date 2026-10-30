// Bounded witness shortening, not an optimal solver. Shipped engine is immutable.
import fs from 'node:fs';
import {stages} from './stages.mjs';
import {ForestSession} from './session.mjs';
import {ExampleReplay} from './example-replay.mjs';
import {move,complete,clone} from '../naopoyo-v2/engine.mjs';
import {stateKey} from './search.mjs';
const root=new URL('../../docs/naopoyo-v12-quality/',import.meta.url);
const dirs=[[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,1],[1,-1],[-1,-1]];
const diagonal=p=>p.filter(a=>a.d.every(n=>n!==0)).length;
const metrics=p=>({moves:p.length,diagonal:diagonal(p)});
const summary=[];
for(const stage of stages){
 const old=JSON.parse(fs.readFileSync(new URL(`original/${stage.number}.json`,root))),original=new ExampleReplay(stage,old.path);
 fs.writeFileSync(new URL(`traces/${stage.number}-v11.json`,root),JSON.stringify(original.snapshots.map((s,i)=>({step:i,state:s.state,action:old.path[i]||null})))+'\n');
 let path=old.path;const candidates=[{method:'V11',...metrics(path)}];
 // Shortcut any saved position to a later one (or completion) within depth 3.
 for(let pass=0;pass<8;pass++){
  const replay=new ExampleReplay(stage,path),states=replay.snapshots.map(s=>s.state),keys=states.map(stateKey),n=path.length;
  const best=Array(n+1);best[n]=[];let expanded=0;
  for(let i=n-1;i>=0;i--){
   best[i]=[path[i],...best[i+1]];const targets=new Map();for(let j=i+1;j<=n;j++){const k=keys[j];if(!targets.has(k)||best[j].length<best[targets.get(k)].length)targets.set(k,j);}
   const nodes=[{s:states[i],path:[]}],seen=new Set([keys[i]]),policy=new ForestSession(stage).policy();
   for(let cursor=0;cursor<nodes.length&&cursor<1500;cursor++){
    const node=nodes[cursor],j=targets.get(stateKey(node.s));
    if(j!==undefined||complete(node.s)){
     const candidate=[...node.path,...(complete(node.s)?[]:best[j])];
     if(candidate.length<best[i].length||candidate.length===best[i].length&&diagonal(candidate)<diagonal(best[i]))best[i]=candidate;
    }
    if(node.path.length>=3||node.path.length>=best[i].length)continue;
    for(const actor of node.s.actors)for(const d of dirs){
     const s=clone(node.s),r=move(s,actor.id,...d,policy);expanded++;if(!r.ok)continue;
     const key=stateKey(s);if(seen.has(key))continue;seen.add(key);
     nodes.push({s,path:[...node.path,{at:[actor.x,actor.y],level:actor.level,d}]});
    }
   }
  }
  // Final suffix may have different actor IDs: verify every move via real input.
  const checked=new ExampleReplay(stage,best[0]);
  const next=best[0];candidates.push({method:`bounded-shortcut-${pass+1}`,expanded,...metrics(next)});
  const changed=JSON.stringify(next)!==JSON.stringify(path);path=next;
  if(!changed)break;
 }
 new ExampleReplay(stage,path);
 const data={id:stage.id,solutionVersion:'v12-quality-1',shortestProven:false,path};
 fs.writeFileSync(new URL(`./examples/${stage.number}.json`,import.meta.url),JSON.stringify(data)+'\n');
 fs.writeFileSync(new URL(`traces/${stage.number}-v12.json`,root),JSON.stringify(new ExampleReplay(stage,path).snapshots.map((s,i)=>({step:i,state:s.state,action:path[i]||null})))+'\n');
 summary.push({number:stage.number,original:metrics(old.path),selected:metrics(path),shortestProven:false,candidates});
 fs.writeFileSync(new URL('optimization.json',root),JSON.stringify(summary,null,2)+'\n');console.log(JSON.stringify(summary.at(-1)));
}
