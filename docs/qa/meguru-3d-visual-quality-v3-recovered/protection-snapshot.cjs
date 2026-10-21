const fs=require('fs'),path=require('path'),crypto=require('crypto');
const root=process.cwd();
const {harness}=require(path.join(root,'tests/helpers/runtime-harness.cjs'));
const M=harness({deterministic:true,fullDisplay:true,pinDate:true}).api.meguruMod,reg=M.buildRegistry();
const sha=x=>crypto.createHash('sha256').update(JSON.stringify(x)).digest('hex');
const result={commit:require('child_process').execFileSync('git',['rev-parse','HEAD']).toString().trim(),regions:{}};
for(const rid of Object.keys(M.REGION3D)){
 const canonical=M.buildWorld(rid,reg),w=M.buildWorld(rid,reg,{world3d:true}),obs=M.worldObjects3d(w).objects;
 result.regions[rid]={world2d:sha(canonical),worldSemantics:sha([w.props,w.paths,w.spots,w.terrain,w.obstacles]),collision:sha(obs.filter(o=>!o.dressing).map(o=>[o.id,o.x,o.z,o.collision])),rendered:sha(obs),objects:obs.length,gardens:obs.filter(o=>o.garden).length,gardenParts:obs.filter(o=>o.garden).reduce((n,o)=>n+o.parts.length,0)};
}
fs.writeFileSync(process.argv[2],JSON.stringify(result,null,2));
