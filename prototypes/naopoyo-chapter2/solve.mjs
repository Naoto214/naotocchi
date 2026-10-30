import {createState,move,settle,complete} from '../naopoyo-v2/engine.mjs';
export const actor=(id,x,y,level)=>({id,x,y,level,species:'dog'});
export const stage=(id,actors,extra={})=>({id,w:8,h:8,actors,walls:[],gates:[],spikes:[],exits:[],gravity:true,...extra});
export const key=s=>JSON.stringify([s.actors.map(a=>[a.species,a.level,a.x,a.y]).sort(),s.rescued]);
export function solve(stage,{limit=100000,filter=()=>true,initial=null}={}){
 const s=initial?structuredClone(initial):createState(stage);if(!initial)settle(s);
 const nodes=[{s,parent:-1}],seen=new Set([key(s)]);let cursor=0;
 for(;cursor<nodes.length&&nodes.length<limit;cursor++){
  const n=nodes[cursor];if(complete(n.s)){const path=[];let p=n;while(p.parent>=0){path.push(p.action);p=nodes[p.parent]}return {status:'solved',visited:seen.size,depth:path.length,path:path.reverse()}}
  for(const a of n.s.actors)for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){
   if(!dx&&!dy)continue;const ns=structuredClone(n.s),r=move(ns,a.id,dx,dy);if(!r.ok||!filter(n.s,ns,r,a,dx,dy))continue;
   const k=key(ns);if(seen.has(k))continue;seen.add(k);nodes.push({s:ns,parent:cursor,action:{id:a.id,at:[a.x,a.y],d:[dx,dy],events:r.events}});
  }
 }
 return {status:cursor===nodes.length?'exhausted':'limit',visited:seen.size};
}
