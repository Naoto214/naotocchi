// World-only visual changes must preserve 2D layouts and canonical 3D world data.
const {harness}=require('../../tests/helpers/runtime-harness.cjs');
const {createHash}=require('node:crypto');
const {execFileSync}=require('node:child_process');
const M=harness({deterministic:true,fullDisplay:true,pinDate:true}).api.meguruMod;
const reg=M.buildRegistry(), digest=v=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
const result={checkout:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),regions:{}};
for(const rid of ['home','city','countryside','forest','jungle','sea','river_lake','mountain','snow','desert','memory_lake','deepsea','star_stop']) {
 const w2=M.buildWorld(rid,reg), w3=M.buildWorld(rid,reg,{world3d:true});
 const canonical3d=digest(w3), objects=M.worldObjects3d(w3).objects;
 result.regions[rid]={world2d:digest(w2),canonical3d,collision:digest(objects.filter(o=>o.collision).map(o=>({id:o.id,x:o.x,z:o.z,collision:o.collision}))),rendered:digest(objects),objects:objects.length,parts:objects.reduce((n,o)=>n+o.parts.length,0)};
}
console.log(JSON.stringify(result,null,2));
