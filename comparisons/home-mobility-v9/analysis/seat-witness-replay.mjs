// Accelerated native autonomy check for the offline seat proposals. This runs
// the captured forest model without drawing or input. The live browser test
// independently includes the actual UI, social/illness gates and frame times.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {forest,opening,sx,sy} from '../movement-scene.mjs';

const file=new URL('../evidence/forest-seat-witnesses.json',import.meta.url);
const proposals=[{label:'fixed',initialOffsetsCss:[]},...JSON.parse(fs.readFileSync(file))];
const built=fs.readFileSync(path.join(process.env.MOBILITY_GAME,'home-production-model-mobility-v9.js'),'utf8');
function insert(source,anchor,replacement){
  assert.equal(source.split(anchor).length,2,anchor);
  return source.replace(anchor,()=>replacement);
}
const direct='if(!mobility?.enabled)return executeMove(key,p,source,{pointerDrop});';
let measured=insert(built,direct,`if(!mobility?.enabled){const ok=executeMove(key,p,source,{pointerDrop});
        if(ok&&source==='ambient')record.goal(key,p);return ok;}`);
for(const [anchor,prefix] of [["emit('arrive',a,a.source);",'record.arrival(a);'],
  ['stats.distance+=Math.hypot(p.x-a.x,p.y-a.y);','record.hop(a,p);']]){
  measured=insert(measured,anchor,prefix+anchor);
}
measured=insert(measured,'if(!safe){if(mobility?.enabled)mobility.veto',
  'if(!safe){record.block(a);if(mobility?.enabled)mobility.veto');
const distance=(a,b)=>Math.hypot((a.x-b.x)*sx,(a.y-b.y)*sy);
function replay(proposal,seed){
  const data=structuredClone(opening.residents);
  for(const {slot,dx,dy} of proposal.initialOffsetsCss){data[slot][2]+=dx/sx;data[slot][3]+=dy/sy;}
  const rows=new Map(data.map(([key])=>[key,{normal:0,arrivals:0,longest:0,walked:0}]));
  const active=new Map(),goals=new Map();
  const record={
    goal(key,point){goals.set(key,{...point});active.delete(key);},
    block(a){active.delete(a.key);},
    hop(a,p){
      if(a.source!=='ambient')return;
      if(!active.has(a.key))active.set(a.key,{x:a.x,y:a.y});
      rows.get(a.key).walked+=distance(a,p);
    },
    arrival(a){
      if(a.source!=='ambient'||!active.has(a.key))return;
      const from=active.get(a.key),goal=goals.get(a.key),net=distance(from,a),r=rows.get(a.key);
      r.arrivals++;r.longest=Math.max(r.longest,net);
      if(goal&&!a.ambientEscape&&net>=8-1e-7&&distance(from,goal)-distance(a,goal)>.75)r.normal++;
      active.delete(a.key);
    }
  };
  const mod={exports:{}};new Function('module','record',measured)(mod,record);
  const {model}=forest(mod.exports,seed,data);
  for(let i=0;i<12000;i++)model.step(.05,{autonomy:true});
  return {label:proposal.label,seed,modelSeconds:model.metrics().clock,
    normalResidents:[...rows.values()].filter(r=>r.normal>0).length,
    rows:Object.fromEntries([...rows].map(([key,r])=>[key,{...r,longest:+r.longest.toFixed(2),walked:+r.walked.toFixed(2)}]))};
}
const selected=process.argv.slice(2),seed=Number(process.env.SEAT_REPLAY_SEED||214);
const runs=proposals.filter(p=>!selected.length||selected.includes(p.label)).map(p=>replay(p,seed));
assert.ok(runs.length);
console.log(JSON.stringify({sourceSHA256:createHash('sha256').update(built).digest('hex'),runs}));
