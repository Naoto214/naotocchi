import {createState,settle,move} from '../../naopoyo-v2/engine.mjs';import {stateKey,replay} from '../search.mjs';
const copy=s=>({...s,actors:s.actors.map(a=>({...a})),gates:s.gates.map(g=>({...g})),rescuedBySpecies:{...s.rescuedBySpecies}});
export function shorten(stage,input,{limit=1500,depth=5,passes=3}={}){
 let path=structuredClone(input),rewrites=0;
 for(let pass=0;pass<passes;pass++){
  let changed=false;const states=[createState(stage)];settle(states[0]);
  for(const p of path){const s=copy(states.at(-1)),a=s.actors.find(a=>a.x===p.at[0]&&a.y===p.at[1]);if(!move(s,a.id,...p.d).ok)throw Error('invalid input');states.push(s);}
  for(let start=0;start<path.length-2;start++){
   const goals=new Map(states.slice(start+2).map((s,i)=>[stateKey(s),start+i+2]));const nodes=[{s:states[start],p:[],depth:0}],seen=new Set([stateKey(states[start])]);let best=null;
   for(let i=0;i<nodes.length&&nodes.length<limit;i++){
    const n=nodes[i],end=goals.get(stateKey(n.s));if(end!==undefined&&end-start>n.depth&&(!best||end-start-n.depth>best.gain))best={end,p:n.p,gain:end-start-n.depth};
    if(n.depth>=depth)continue;
    for(const a of n.s.actors)for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){
     if(!dx&&!dy)continue;const s=copy(n.s);if(!move(s,a.id,dx,dy).ok)continue;const k=stateKey(s);if(seen.has(k))continue;seen.add(k);nodes.push({s,p:[...n.p,{at:[a.x,a.y],level:a.level,d:[dx,dy]}],depth:n.depth+1});
    }
   }
   if(best){path.splice(start,best.end-start,...best.p);rewrites++;changed=true;break;}
  }
  if(!changed)break;
 }
 replay(stage,path);return {path,rewrites};
}
