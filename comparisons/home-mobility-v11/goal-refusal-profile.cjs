'use strict';
const fs=require('node:fs');
const {patchMovement:fromV9}=require('../home-mobility-v10/movement.cjs');
const {patchAfterRefusal}=require('./goal-after-refusal.cjs');
const {replaceExact}=require('../home-finish-v5/native-hooks.cjs');
const rows=[];let refusals=0,totalMs=0,slowest=0;
const active=new Map();
const point=p=>[p.x,p.y];
const distance=(o,e,s)=>Math.hypot((o[0]-e[0])*s[0],(o[1]-e[1])*s[1]);
globalThis.HomeRefusedWanderAudit=(a,p,route,clock,scale)=>{
  refusals++;
  if(!route)return;
  const r={key:a.key,clock,start:point(a),goal:point(p),route:route.map(point),scale:[scale.x,scale.y],arrived:false,travel:0};
  rows.push(r);active.set(a.key,r);
};
globalThis.refusedWanderCost=elapsed=>{totalMs+=elapsed;slowest=Math.max(slowest,elapsed)};
globalThis.refusedWanderHop=(a,p)=>{
  const r=active.get(a.key);if(r&&a.source==='ambient'){r.travel+=distance(point(a),point(p),r.scale);r.end=point(p);}
};
globalThis.refusedWanderArrival=a=>{
  const r=active.get(a.key);
  if(r&&a.source==='ambient'){
    r.arrived=true;r.end=point(a);active.delete(a.key);
  }
};
function patchMovement(s){
 const shadow=process.env.GOAL_REFUSAL_MODE==='shadow';
 const policy=process.env.GOAL_REFUSAL_SCANNER==='ray'?'ray':'pivot';
 let out=patchAfterRefusal(fromV9(s),{shadow,policy});
 let strategy=policy==='ray'?'refusedForwardRay':'afterRefusedWander';
 if(process.env.GOAL_REFUSAL_SCANNER==='graph'){
   out=require('./goal-local-graph.cjs').addResearchGraph(out);strategy='exploreAfterRefusal';
 }
 const mark='const checked='+strategy+'(a,p,safeBounds,canSee);';
 out=replaceExact(out,mark,'const started=performance.now();'+mark+'globalThis.refusedWanderCost(performance.now()-started);');
 if(!shadow){
   const hop='if(mobility?.enabled)mobility.hop(a,p,clock);',arrive="if(mobility?.enabled)mobility.arrival(a,clock);emit('arrive'";
   out=replaceExact(out,hop,'globalThis.refusedWanderHop(a,p);'+hop);
   out=replaceExact(out,arrive,'globalThis.refusedWanderArrival(a);'+arrive);
   const move="    function move(key,p,source='tap',{pointerDrop=false}={}){";
   out=replaceExact(out,move,move+'globalThis.cancelRefusedWander(key,p);');
   globalThis.cancelRefusedWander=(key,p)=>{const row=active.get(key);if(row && (p.x!==row.goal[0]||p.y!==row.goal[1]))active.delete(key);};
 }
 return out;
}
process.on('beforeExit',()=>fs.writeFileSync(process.env.GOAL_REFUSAL_OUT,JSON.stringify({refusals,found:rows.length,totalMs,slowest,rows})));
module.exports={patchMovement};
