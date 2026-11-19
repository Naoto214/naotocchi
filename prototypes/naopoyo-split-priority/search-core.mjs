// Analysis copy of chapter2/search.mjs; only engine import changed.
// Offline analysis only. Every transition calls the shipped engine.
import {createState,settle,move,complete,mass,gateAllows} from './engine.mjs';
export const stateKey=(s,{exact=false}={})=>exact?JSON.stringify([s.actors,s.gates,s.rescued,s.rescuedBySpecies,s.nextId]):s.actors.map(a=>`${a.y*8+a.x}:${a.level}:${a.species}`).sort().join('|')+'#'+JSON.stringify(Object.entries(s.rescuedBySpecies).sort());
const fork=s=>({...s,actors:s.actors.map(a=>({...a})),gates:s.gates.map(g=>({...g})),rescuedBySpecies:{...s.rescuedBySpecies}});
const pathTo=(nodes,i)=>{const out=[];while(nodes[i].parent>=0){out.push(nodes[i].action);i=nodes[i].parent}return out.reverse()};
// Binary heap used only by bounded greedy witness search. It does NOT prove optimality.
class Heap{
 a=[];
 push(v){const a=this.a;let i=a.length;a.push(v);while(i){const p=(i-1)>>1;if(a[p][0]<=v[0])break;a[i]=a[p];i=p}a[i]=v;}
 pop(){const a=this.a,v=a[0],last=a.pop();if(a.length){let i=0;while(i*2+1<a.length){let c=i*2+1;if(c+1<a.length&&a[c+1][0]<a[c][0])c++;if(a[c][0]>=last[0])break;a[i]=a[c];i=c}a[i]=last}return v;}
}
const estimate=s=>s.actors.reduce((sum,a)=>sum+8+Math.min(...s.exits.map(e=>Math.max(Math.abs(e.x-a.x),Math.abs(e.y-a.y))+(e.exact===undefined||e.exact===a.level?0:3))),0);
export function search(stage,{limit=100000,maxMs=30000,method='bfs',filter=()=>true,initial=null,score=estimate,goal=complete,exact=false}={}){
 const start=performance.now(),s=initial?structuredClone(initial):createState(stage);if(!initial)settle(s);
 const nodes=[{s,parent:-1,depth:0}],seen=new Set([stateKey(s,{exact})]),heap=new Heap();heap.push([score(s),0]);let cursor=0,expanded=0,edges=0;
 while(method==='bfs'?cursor<nodes.length:heap.a.length){
  if(nodes.length>=limit||performance.now()-start>=maxMs)return {status:'limit',visited:seen.size,expanded,edges,shortestProven:false,elapsedMs:Math.round(performance.now()-start),method};
  const i=method==='bfs'?cursor++:heap.pop()[1],n=nodes[i];expanded++;
  if(goal(n.s))return {status:'solved',visited:seen.size,expanded,edges,depth:n.depth,path:pathTo(nodes,i),shortestProven:method==='bfs'&&goal===complete,elapsedMs:Math.round(performance.now()-start),method};
  for(const a of n.s.actors)for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){
   if(!dx&&!dy)continue;const ns=fork(n.s),r=move(ns,a.id,dx,dy);if(!r.ok||!filter(n.s,ns,r,a,dx,dy))continue;edges++;
   const key=stateKey(ns,{exact});if(seen.has(key))continue;seen.add(key);
   const index=nodes.length;nodes.push({s:ns,parent:i,depth:n.depth+1,action:{at:[a.x,a.y],level:a.level,d:[dx,dy]}});
   if(method!=='bfs')heap.push([score(ns)+(n.depth+1)*.03,index]);
  }
 }
 return {status:'exhausted',visited:seen.size,expanded,edges,shortestProven:false,elapsedMs:Math.round(performance.now()-start),method};
}
export function replay(stage,path){
 const s=createState(stage);settle(s);const total=mass(s);for(const [i,step]of path.entries()){
  const a=s.actors.find(a=>a.x===step.at[0]&&a.y===step.at[1]);if(!a||step.level!==undefined&&a.level!==step.level)throw Error(`witness actor ${i}`);
  const r=move(s,a.id,...step.d);if(!r.ok)throw Error(`witness rejected ${i}: ${r.reason}`);
  if(mass(s)!==total||s.actors.some(a=>!gateAllows(s,a,a.x,a.y)))throw Error(`invariant ${i}`);
 }return s;
}
