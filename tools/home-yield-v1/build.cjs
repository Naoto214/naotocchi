// Isolated A/B/C runtime. Never edits the frozen V5 artifact or game save keys.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'../..'),source=path.resolve(process.env.YIELD_BASE_DIST||'/workspace/sites/naotocchi-movement-v5/dist'),out=path.resolve(process.argv[2]||'/workspace/work/yield-runtime');
if(out===source||out===root||out.startsWith(source+path.sep))throw Error('Choose an independent output directory');
const game=path.join(out,'game'),base=path.join(source,'game'),frozen=path.join(base,'e');fs.mkdirSync(game,{recursive:true});
const excluded=new Set(['a','b','c','d','e','comparisons']);
for(const entry of fs.readdirSync(base,{withFileTypes:true})){if(excluded.has(entry.name))continue;const from=path.join(base,entry.name),to=path.join(game,entry.name);if(entry.isDirectory()){if(!fs.existsSync(to)){if(process.env.YIELD_MATERIALIZE==='1')fs.cpSync(from,to,{recursive:true,dereference:true});else fs.symlinkSync(from,to,'dir');}}else fs.copyFileSync(from,to);}
const seed=JSON.parse(fs.readFileSync(path.join(game,'release-qa-seed.json'),'utf8'));
const current=fs.readFileSync(path.join(root,'home-production-model.js'),'utf8'),hash=s=>crypto.createHash('sha256').update(s).digest('hex'),versions={};
function instrument(model){
 if(!model.includes('auditRestore(list)')){
  const anchor='metrics:()=>';
  if(!model.includes(anchor))throw Error('Missing model exposure anchor');
  model=model.replace(anchor,'auditRestore(list){cancel();actors=structuredClone(list);selected=null;paused=false;for(const a of actors){a.target=null;a.route=[];a.activity="rest";}globalThis.__reachTrace=null;globalThis.__reachAttempts=[];},metrics:()=>');
 }
 return model;
}
for(const variant of ['a','b','c']){
 const dir=path.join(game,variant);fs.mkdirSync(dir,{recursive:true});
 for(const entry of fs.readdirSync(frozen,{withFileTypes:true})){const from=path.join(frozen,entry.name),to=path.join(dir,entry.name);if(entry.isDirectory()){if(!fs.existsSync(to))fs.cpSync(from,to,{recursive:true,dereference:true});}else fs.copyFileSync(from,to);}
 const key='naotocchi-home-yield-v1-'+variant,mode={a:'off',b:'manual',c:'all'}[variant];
 const model=variant==='a'?fs.readFileSync(path.join(frozen,'home-production-model.js'),'utf8'):instrument(current);
 fs.writeFileSync(path.join(dir,'home-production-model.js'),model);
 let script=fs.readFileSync(path.join(dir,'movement-b-script.js'),'utf8').replaceAll('naotocchi-movement-v5-e',key);
 fs.writeFileSync(path.join(dir,'movement-b-script.js'),script);
 let html=fs.readFileSync(path.join(frozen,'movement-b.html'),'utf8').replaceAll('naotocchi-movement-v5-e',key).replaceAll('src="e/','src="'+variant+'/').replace("window.MOVEMENT_VARIANT='e'","window.MOVEMENT_VARIANT='"+variant+"'");
 html=html.replace('<head>','<head><script>localStorage.setItem('+JSON.stringify(key)+','+JSON.stringify(JSON.stringify(seed)).replaceAll('<','\\u003c')+');window.YIELD_VARIANT='+JSON.stringify(variant)+';window.YIELD_INITIAL_MODE='+JSON.stringify(mode)+';</script>');
 html=html.replace("window.__movementPaused=new URLSearchParams(location.search).get('freeze')!=='0'","window.__movementPaused=true");
 html=html.replace('src="'+variant+'/movement-v5-debug.js"','src="'+variant+'/yield-fixture.js"');
 fs.writeFileSync(path.join(dir,'movement-b.html'),html);
 fs.copyFileSync(path.join(__dirname,'fixture.js'),path.join(dir,'yield-fixture.js'));
 versions[variant]={mode,modelHash:hash(model),frozenProductionModel:variant==='a',sourceModelHash:variant==='a'?null:hash(current)};
}
for(const f of ['page.html','page.css','page.js'])fs.copyFileSync(path.join(__dirname,f),path.join(out,f==='page.html'?'index.html':f));
fs.writeFileSync(path.join(out,'yield-build.json'),JSON.stringify({base:'02df2efc39cd18543b9c66df281872ed1751b02c',versions,saveNamespaces:['a','b','c'].map(v=>'naotocchi-home-yield-v1-'+v)},null,2));console.log(out);
