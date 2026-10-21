import {clone,createState,move,release,mass} from '../engine.mjs';
const key=s=>JSON.stringify([s.rescued,s.gates.map(g=>!!g.open),s.actors.map(a=>[a.species,a.level,a.x,a.y]).sort()]);
// Deliberately explores a SUPERSET of drag inputs: any actor can move before
// release. Also includes release itself, using the real gravity engine.
// Exhaustion proves impossibility; hitting the cap never does.
export function search(stage,{sealed=false,limit=100000}={}){
 const initial=createState(stage);
 if(sealed)for(const g of initial.gates){g.open=false;g.species='__sealed__';g.required=false;}
 const queue=[initial],seen=new Set([key(initial)]);let maxRescued=0;
 const total=mass(initial);
 for(let at=0;at<queue.length;at++){
  const s=queue[at];maxRescued=Math.max(maxRescued,s.rescued);
  if(!s.actors.length)return {status:'solved',visited:seen.size,maxRescued};
  const next=[];
  for(const a of s.actors)for(const [dx,dy]of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]]){
   const t=clone(s);if(move(t,a.id,dx,dy))next.push(t);
  }
  const dropped=clone(s);if(release(dropped))next.push(dropped);
  for(const t of next){
   if(mass(t)!==total)throw new Error('mass changed');
   const k=key(t);if(seen.has(k))continue;
   if(seen.size>=limit)return {status:'limit',visited:seen.size,maxRescued};
   seen.add(k);queue.push(t);
  }
 }
 return {status:'exhausted',visited:seen.size,maxRescued};
}

