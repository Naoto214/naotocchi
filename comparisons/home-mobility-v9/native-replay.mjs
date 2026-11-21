// Deterministic movement-only replay with authentic opening feet and released geometry.
// Native arrival, net endpoint displacement and the original goal are recorded
// separately. Browser household, input and renderer measurements use their own harness.
import fs from 'node:fs';
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
import {forest,v8,opening,sx,sy} from './movement-scene.mjs';

const [arm,seedText='214',output]=process.argv.slice(2);
if(!['v8','v9'].includes(arm)||!/^\d+$/.test(seedText))throw Error('Usage: native-replay.mjs v8|v9 SEED [output.json]');
const seed=Number(seedText);
const source=arm==='v8'?v8:createRequire(import.meta.url)('./movement.cjs').patchMovement(v8);
const distance=(p,q)=>Math.hypot((q.x-p.x)*sx,(q.y-p.y)*sy);
const stats=new Map(), started=new Map(), failed=new Map(), completed=[];
function resident(key) {
  if(!stats.has(key))stats.set(key,{key,requests:0,accepted:0,refused:0,arrivals:0,
    completed8:0,goalAdvancing8:0,ordinaryGoalAdvancing8:0,escapeArrivals:0,helpers:0,ambientCss:0,maxNetCss:0});
  return stats.get(key);
}
const observe={
  request(key,p,clock,ok,a,relief,waiting){
    const rec=resident(key);rec.requests++;
    if(!ok){rec.refused++;failed.set(key,{x:p.x,y:p.y});return;}
    rec.accepted++;
    // V8 reissues its short surrogate endpoint after assistance. Recover the
    // original failed personal request from this stint. V9 carries it directly.
    let original=p;
    if(arm==='v8'&&relief?.ready&&relief.owner===key)original=waiting.get(key)?.point||failed.get(key)||p;
    started.set(key,{clock,from:{x:a.x,y:a.y},goal:{x:original.x,y:original.y},escape:a.ambientEscape,assisted:!!relief?.ready});
  },
  hop(a,p){if(a.source==='ambient')resident(a.key).ambientCss+=distance(a,p);},
  arrival(a,clock){
    if(a.source==='yield'){resident(a.key).helpers++;return;}
    const plan=started.get(a.key);
    if(a.source!=='ambient'||!plan)return;
    started.delete(a.key);
    const rec=resident(a.key),net=distance(plan.from,a),gain=distance(plan.from,plan.goal)-distance(a,plan.goal);
    rec.arrivals++;if(plan.escape)rec.escapeArrivals++;
    if(net>=8-1e-6){
      rec.completed8++;
      if(gain>=.75){rec.goalAdvancing8++;if(!plan.escape)rec.ordinaryGoalAdvancing8++;}
    }
    rec.maxNetCss=Math.max(rec.maxNetCss,net);
    completed.push({key:a.key,start:plan.clock,arrival:clock,from:plan.from,end:{x:a.x,y:a.y},goal:plan.goal,net,gain,escape:plan.escape,assisted:plan.assisted});
  }
};
function insertOnce(s,anchor,replacement){
  if(s.split(anchor).length!==2)throw Error('Unexpected observation anchor '+anchor);
  return s.replace(anchor,()=>replacement);
}
let observed=insertOnce(source,'if(!mobility?.enabled)return executeMove(key,p,source,{pointerDrop});',
  `if(!mobility?.enabled){
        const result=executeMove(key,p,source,{pointerDrop});
        if(source==='ambient')observe.request(key,p,clock,result,actor(key),relief,waiting);
        return result;
      }`);
observed=insertOnce(observed,'if(mobility?.enabled)mobility.hop(a,p,clock);','observe.hop(a,p);if(mobility?.enabled)mobility.hop(a,p,clock);');
observed=insertOnce(observed,"if(a.source==='yield'){if(mobility?.enabled)mobility.arrival(a,clock);","if(a.source==='yield'){observe.arrival(a,clock);if(mobility?.enabled)mobility.arrival(a,clock);");
observed=insertOnce(observed,"if(mobility?.enabled)mobility.arrival(a,clock);emit('arrive',a,a.source);","observe.arrival(a,clock);if(mobility?.enabled)mobility.arrival(a,clock);emit('arrive',a,a.source);");
const mod={exports:{}};
new Function('module','observe',observed)(mod,observe);
const {model}=forest(mod.exports,seed);
for(const a of model.snapshot())resident(a.key);
for(let step=0;step<12000;step++)model.step(.05);
const json=JSON.stringify({arm,seed,modelSeconds:600,step:.05,modelSHA256:createHash('sha256').update(source).digest('hex'),
  openingSHA256:opening.openingSHA256,residents:[...stats.values()],completed});
if(output)fs.writeFileSync(output,json+'\n');else console.log(json);
