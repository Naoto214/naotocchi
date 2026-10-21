// Reproduce: node prototypes/naopoyo-rescue/tests/destination-evidence.mjs > <report.json>
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {stages} from '../stages.mjs';
import {createState,move,release,mass,complete,validState,gatePassages} from '../engine.mjs';
import {search} from './search.mjs';
const bytes=fs.readFileSync(new URL('../solutions.json',import.meta.url));
const solutions=JSON.parse(bytes),report={rule:'destination-only-eight-way',
 solutionsSha256:createHash('sha256').update(bytes).digest('hex'),replays:[],sealed:[]};
for(const stage of stages){
 const s=createState(stage),total=mass(s);
 for(const drag of solutions[stage.id]){
  for(const [x,y] of drag.path){
   const a=s.actors.find(a=>a.id===drag.id);assert.ok(a);
   assert.ok(move(s,a.id,x-a.x,y-a.y));assert.equal(mass(s),total);assert.ok(validState(stage,s));
  }
  assert.ok(release(s));assert.equal(mass(s),total);assert.ok(validState(stage,s));
 }
 assert.ok(complete(s));
 const passages=Object.fromEntries(gatePassages(s));
 for(const g of stage.gates)assert.ok(passages[`${g.x},${g.y}`]);
 report.replays.push({stage:stage.id,drags:solutions[stage.id].length,moves:s.moves,
  rescued:s.rescued,total,complete:complete(s),passages});
 if(stage.gates.length){
  const result=search(stage,{sealed:true});assert.equal(result.status,'exhausted');assert.equal(result.maxRescued,0);
  report.sealed.push({stage:stage.id,gates:'all',...result});
 }
}
for(const i of [0,1]){
 const result=search(stages[9],{sealedGateIndices:[i]});assert.equal(result.status,'exhausted');
 report.sealed.push({stage:'10',gates:[i],...result});
}
console.log(JSON.stringify(report,null,2));
