const fs=require('fs'),path=require('path'),cp=require('child_process');const root=path.resolve(__dirname,'../..'),out=path.resolve(process.argv[2]||path.join(root,'../v2-runtime'));
cp.execFileSync(process.execPath,['tools/home-reach-audit/build.cjs',out],{cwd:root});
const pin=(rev,file)=>cp.execFileSync('git',['show',rev+':'+file],{cwd:root,encoding:'utf8'});
for(const v of ['a','b','c']){const dir=path.join(out,v);fs.mkdirSync(dir,{recursive:true});for(const e of fs.readdirSync(out,{withFileTypes:true})){if(['a','b','c'].includes(e.name))continue;const dest=path.join(dir,e.name);if(e.isDirectory()){if(!fs.existsSync(dest))fs.symlinkSync('../'+e.name,dest);}else fs.copyFileSync(path.join(out,e.name),dest);}
 if(v!=='c'){
  const rev=v==='a'?'408c72e6ebef71da3eab33cfb268c7494117aaaa':'6ab53fc23747fc1982089939206c1b6087643953';
  for(const f of ['home-art-navigation.mjs','home-route-navigation.mjs','home-recovered-navigation.mjs','home-production-world.mjs'])fs.writeFileSync(path.join(dir,f),pin(rev,f));
  let model=pin(rev,'home-production-model.js');model=model.replace('return {metrics:()=>','return {auditRestore(list){actors=structuredClone(list);selected=null;paused=false;for(const a of actors){a.target=null;a.route=[];a.activity="rest";}globalThis.__reachTrace=null;},metrics:()=>').replace('const q=destination(a,p);if(!q)return false;','const q=destination(a,p);globalThis.__reachTrace={key,raw:p,clamped:limit(a,p,scene),destination:q};if(!q)return false;');
  fs.writeFileSync(path.join(dir,'home-production-model.js'),model);
  if(v==='b'){let adapter=pin(rev,'home-production-diorama.js');adapter=adapter.replace('modelAPI.createModel({onEvent:emit})','modelAPI.createModel({onEvent:emit,random:(()=>{let seed=521;return ()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296)})()})').replace('{blocked:busy,reducedMotion:','{autonomy:!env.__movementPaused,blocked:busy,reducedMotion:').replace('return {model,update,sync,interrupt,','return {paintFrame:paint,inspectRows:()=>[...rows.values()],inspectPaint:()=>[...rows.values()].map(r=>({key:r.key,ink:r.paintExtent})),inspectScene:()=>scene,inspectWorld:()=>world?.stats(),model,update,sync,interrupt,');fs.writeFileSync(path.join(dir,'movement-b-diorama.js'),adapter);}
 }
}
console.log(out);
