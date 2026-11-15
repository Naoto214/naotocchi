const fs=require('fs'),path=require('path'),cp=require('child_process');const root=path.resolve(__dirname,'../..'),out=path.resolve(process.argv[2]||'/tmp/v3-runtime');
cp.execFileSync(process.execPath,['tools/home-movement-v2/build.cjs',out],{cwd:root});
fs.renameSync(path.join(out,'c'),path.join(out,'d'));fs.cpSync(path.join(out,'d'),path.join(out,'c'),{recursive:true,verbatimSymlinks:true});
const pin=f=>cp.execFileSync('git',['show','e7032c2862320296b88969a6125ddb52af3d228a:'+f],{cwd:root,encoding:'utf8'});
for(const f of ['home-route-navigation.mjs','home-art-navigation.mjs','home-recovered-navigation.mjs','home-production-world.mjs'])fs.writeFileSync(path.join(out,'c',f),pin(f));
let model=pin('home-production-model.js').replace('return {metrics:()=>','return {auditRestore(list){actors=structuredClone(list);selected=null;paused=false;for(const a of actors){a.target=null;a.route=[];a.activity="rest";}globalThis.__reachTrace=null;},metrics:()=>').replace('let q=preferReference?reference.point:proposal;','let q=preferReference?reference.point:proposal;globalThis.__reachTrace={key,raw:p,destination:q};').replace('if(!path.length||Math.hypot','globalThis.__reachTrace.path=path;globalThis.__reachTrace.destination=q;if(!path.length||Math.hypot');
fs.writeFileSync(path.join(out,'c','home-production-model.js'),model);
for(const v of ['d']){const f=path.join(out,v,'home-art-navigation.mjs');let s=fs.readFileSync(f,'utf8');s=s.replace(' const t=artTransform',` if(spec.region==='city'){const mode=new URLSearchParams(globalThis.location?.search||'').get('polygon');if(mode==='current')expandCity=false;if(mode==='small'){expandCity=false;spec={...spec,ground:spec.ground.map(([x,z])=>[x,z===.53?.51:z])};}}\n const t=artTransform`);fs.writeFileSync(f,s);}
console.log(out);
