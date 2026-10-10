const fs=require('fs'),path=require('path');const {harness}=require(path.join(process.cwd(),'tests/helpers/runtime-harness.cjs'));
const M=harness({deterministic:true,fullDisplay:true,pinDate:true}).api.meguruMod,world=M.buildWorld('home',M.buildRegistry(),{world3d:true}),objects=M.worldObjects3d(world).objects;
const out={sourceSha256:require('crypto').createHash('sha256').update(fs.readFileSync('meguru.js')).digest('hex'),scenes:[]};
for(const id of ['home:15','home:45','home:64','home:196']){
 const h=objects.find(o=>o.id===id),g=objects.find(o=>o.id==='home:garden:'+id),door=h.parts.find(p=>p.door),np=M.nearestPath({x:h.x+door.dx,z:h.z+door.dz},world);
 out.scenes.push({id,x:h.x,z:h.z,collision:h.collision,body:h.parts.find(p=>p.family),door,road:{...np.seg,half:np.half},garden:g?.parts||[],housePlants:h.parts.filter(p=>(p.y||0)<=7&&(p.shape==='flower'||(p.shape==='crown'&&p.small))),obstacles:objects.filter(o=>o.id!==id&&o.collision&&Math.hypot(o.x-h.x,o.z-h.z)<400).map(o=>({id:o.id,x:o.x,z:o.z,collision:o.collision}))});
}
fs.writeFileSync(process.argv[2],JSON.stringify(out,null,2));
