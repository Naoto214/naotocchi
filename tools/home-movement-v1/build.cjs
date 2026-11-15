// Disposable comparison: never loaded by the production entry or save namespace.
const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process');
const root=path.resolve(__dirname,'../..'),out=path.resolve(process.argv[2]||path.join(root,'../home-movement-site/dist')),baseline='408c72e6ebef71da3eab33cfb268c7494117aaaa';
fs.mkdirSync(out,{recursive:true});
for(const name of fs.readdirSync(root))if(/\.(js|mjs|css|json|html)$/.test(name)&&fs.statSync(path.join(root,name)).isFile())fs.copyFileSync(path.join(root,name),path.join(out,name));
for(const dir of ['assets/characters','assets/items','assets/ui','assets/fonts','vendor','character-3d'])if(fs.existsSync(path.join(root,dir)))fs.cpSync(path.join(root,dir),path.join(out,dir),{recursive:true});
const dayparts=fs.readFileSync(path.join(root,'home-dayparts.mjs'),'utf8');
const manifest=fs.readFileSync(path.join(root,'home-production-manifest.mjs'),'utf8');
for(const file of new Set([...dayparts.matchAll(/"(comparisons\/[^" ]+\.webp)"/g),...manifest.matchAll(/"(assets\/[^" ]+\.webp)"/g)].map(m=>m[1]))){fs.mkdirSync(path.dirname(path.join(out,file)),{recursive:true});fs.copyFileSync(path.join(root,file),path.join(out,file));}
cp.execFileSync(process.execPath,['tools/home-production-qa.cjs',out],{cwd:root});
let script=fs.readFileSync(path.join(out,'release-qa-script.js'),'utf8');
script=script.replace('window.HomeReleaseQA={',fs.readFileSync(path.join(__dirname,'fixture.js'),'utf8')+'\nwindow.HomeReleaseQA={');
for(const name of ['scheduleIdleGreeting','scheduleCompanionEncounter','scheduleEnvironmentMoment'])script=script.replace('function '+name+'() {','function '+name+'() { return; // comparison only\n');
const html=fs.readFileSync(path.join(out,'current-production-qa.html'),'utf8');
for(const variant of ['a','b']){
 const prefix='movement-'+variant;
 let adapter=variant==='a'?cp.execFileSync('git',['show',baseline+':home-production-diorama.js'],{cwd:root,encoding:'utf8'}):fs.readFileSync(path.join(root,'home-production-diorama.js'),'utf8');
 adapter=adapter.replace('modelAPI.createModel({onEvent:emit})','modelAPI.createModel({onEvent:emit,random:(()=>{let seed=521;return ()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296)})()})').replace('{blocked:busy,reducedMotion:','{autonomy:!env.__movementPaused,blocked:busy,reducedMotion:');
 adapter=adapter.replace('const snapshot=model.snapshot(),chosen=', 'env.__movementPaintObserver?.();const snapshot=model.snapshot(),chosen=');
 adapter=adapter.replace('return {model,update,sync,interrupt,','return {paintFrame:paint,inspectRows:()=>[...rows.values()],inspectPaint:()=>[...rows.values()].map(r=>({key:r.key,ink:r.paintExtent})),inspectScene:()=>scene,inspectWorld:()=>world?.stats(),model,update,sync,interrupt,');
 fs.writeFileSync(path.join(out,prefix+'-diorama.js'),adapter);
 fs.writeFileSync(path.join(out,prefix+'-script.js'),script.replaceAll('naotocchi-home-release-qa-v1','naotocchi-movement-v1-'+variant));
 fs.writeFileSync(path.join(out,prefix+'.html'),html.replaceAll('naotocchi-home-release-qa-v1','naotocchi-movement-v1-'+variant).replace('release-qa-script.js',prefix+'-script.js').replace('release-qa-diorama.js',prefix+'-diorama.js').replace('</head>',`<script>window.MOVEMENT_VARIANT='${variant}';window.__movementPaused=new URLSearchParams(location.search).get('freeze')==='1';</script></head>`).replace('</body>','<script src="movement-debug.js"></script></body>'));
}
for(const [src,dest]of [['panel.html','index.html'],['debug.js','movement-debug.js']])fs.copyFileSync(path.join(__dirname,src),path.join(out,dest));
fs.writeFileSync(path.join(out,'movement-build.json'),JSON.stringify({baseline,candidate:cp.execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim(),adapterSha256:require('node:crypto').createHash('sha256').update(fs.readFileSync(path.join(root,'home-production-diorama.js'))).digest('hex'),workingTreeDirty:!!cp.execFileSync('git',['status','--porcelain'],{cwd:root,encoding:'utf8'}).trim()},null,2));
console.log(out);
