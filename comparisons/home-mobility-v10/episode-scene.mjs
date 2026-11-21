import fs from 'node:fs';
import path from 'node:path';
import {forest,sx,sy} from '../home-mobility-v9/movement-scene.mjs';
export {sx,sy};
export const source=fs.readFileSync(path.join(process.env.MOBILITY_GAME,'home-production-model-mobility-v9-seats.js'),'utf8');
const definitions=JSON.parse(fs.readFileSync(new URL('./dog-episode.json',import.meta.url))).actorDefinitions;
export function restoreEpisode(row,nativeSource=source) {
  const mod={exports:{}};
  const injection=`    return {probe:{actors:()=>actors,inspect:()=>({relief,waiting,clock}),setClock:t=>clock=t,
    setMissHistory:(key,since,choices)=>{if(typeof crowdMisses!=='undefined')crowdMisses.set(key,{since,choices});},nearbyFeet,intentPlan:(a,p)=>intentPlan(a,p),yieldLeg,canHelpAmbient,contactSegmentSafe,
    solo:(a,p)=>localIntentRoute(a,p,bounds(a,scene),scene.planVisibility(a))}, metrics:`;
  if(nativeSource.split('    return {metrics:').length!==2)throw Error('Native QA anchor changed');
  new Function('module',nativeSource.replace('    return {metrics:',injection))(mod);
  const trial=forest(mod.exports,937,row.peers.map(([k,x,y,w,h])=>[k,null,x,y,w,h]));
  const {model}=trial;model.probe.setClock(row.clock);
  for(const [i,a] of model.probe.actors().entries()){
    const [key,,,,,target,source,manualUntil,yieldAfter,manual,yieldFor,activity]=row.peers[i];
    if(a.key!==key)throw Error('Mismatched replay roster');
    a.extent=definitions.find(r=>r.key===key)?.extent;
    a.nextAt=row.clock+1000;a.lastWalk=a.lastOwnWalk=row.lastOwnWalk??(row.clock-90);
    a.source=source;a.activity=activity;a.yieldAfter=yieldAfter;
    // Unrelated locomotion remains stationary for this counterfactual; the
    // recorded target/hold/ownership still makes a moving helper ineligible.
    a.manualUntil=target||manual||yieldFor||row.selected===key?row.clock+1000:manualUntil;
  }
  return {...trial,a:model.probe.actors().find(a=>a.key===row.key),goal:{x:row.goal[0],y:row.goal[1]}};
}
export function complete(generator){let r,count=0;do{r=generator.next();count++;}while(!r.done);return {plan:r.value,slices:count};}
