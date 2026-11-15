// Generates disposable instrumented copies. Does not change production modules.
const cp=require('node:child_process'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'../..'),out=path.resolve(process.argv[2]||'/tmp/v4-audit');
if(fs.existsSync(out))throw Error('Use a new output directory: '+out);
cp.execFileSync(process.execPath,['tools/home-movement-v3/build.cjs',out],{cwd:root});
for(const v of ['a','b','c','d']){
 const modelPath=path.join(out,v,'home-production-model.js');let model=fs.readFileSync(modelPath,'utf8');
 model=model.replaceAll('globalThis.__reachTrace.path=path;', 'globalThis.__reachTrace.path=path.map(p=>({...p}));');
 // Capture an immutable accepted plan uniformly, including original/V1.
 model=model.replace('a.route=path.slice(1);a.target=path[0];', 'globalThis.__reachTrace.path=path.map(p=>({...p}));globalThis.__reachTrace.destination=q;a.route=path.slice(1);a.target=path[0];');
 if(!model.includes('__reachTrace.stop='))model=model.replace('if(!safe){a.target=null;', 'if(!safe){globalThis.__reachTrace.stop={from:{x:a.x,y:a.y},next:p,visible:visible(a,p),polygon:!scene.navigation||scene.navigation.segmentSafe(a,p),contacts:actors.filter(b=>b!==a&&!separated(a,p,b)).map(b=>b.key)};a.target=null;');
 if(!model.includes('__reachTrace.stop=')||!model.includes('__reachTrace.path=path.map'))throw Error('Instrumentation mismatch: '+v);
 fs.writeFileSync(modelPath,model);fs.copyFileSync(path.join(__dirname,'diagnose.js'),path.join(out,v,'v4-diagnose.js'));
 for(const f of ['movement-a.html','movement-b.html']){const p=path.join(out,v,f);fs.writeFileSync(p,fs.readFileSync(p,'utf8').replace('</body>','<script src="v4-diagnose.js"></script></body>'));}
}
console.log(out);
