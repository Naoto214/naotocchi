const fs=require('fs'),crypto=require('crypto');
const {harness}=require(process.cwd()+'/tests/helpers/runtime-harness.cjs');
const M=harness({deterministic:true,fullDisplay:true,pinDate:true}).api.meguruMod,reg=M.buildRegistry();
const hash=x=>crypto.createHash('sha256').update(JSON.stringify(x)).digest('hex');const out={};
for(const rid of Object.keys(M.REGION3D)){
 const c=M.buildWorld(rid,reg),w=M.buildWorld(rid,reg,{world3d:true}),obs=M.worldObjects3d(w).objects;
 out[rid]={canonical:hash(c),collision:hash(w.obstacles),objects:obs.length,other:hash(obs.filter(o=>!(o.type==='bridge'&&o.bridgeKind==='stone'))),stone:obs.filter(o=>o.type==='bridge'&&o.bridgeKind==='stone').map(o=>({id:o.id,parts:o.parts.length,placement:hash({...o,parts:undefined}),deck:hash(o.parts.filter(p=>p.shape!=='box'||p.y<6))}))};
}
fs.writeFileSync(process.argv[2],JSON.stringify(out,null,2)+'\n');
