// Exact v19 runtime snapshot with the same v20 synthetic cast/day/weather fixture.
// Comparison files are QA-only; production packaging never includes them.
const fs=require('node:fs'),path=require('node:path'),{execFileSync}=require('node:child_process');
const out=path.resolve(process.argv[2]),sha='d9586c7ea6cbfffaf0d6d2bf3ee0ca688df51759';
const original=f=>execFileSync('git',['show',sha+':'+f],{encoding:'utf8',maxBuffer:8e6});
const modules=['home-world.mjs','home-terrain-navigation.mjs','home-scenery.mjs'];
for(const f of modules){let s=original(f);for(const m of modules)s=s.replaceAll('./'+m,'./v19-'+m);fs.writeFileSync(path.join(out,'v19-'+f),s);}
let adapter=original('home-diorama.js').replace('return {model,update,sync,interrupt,','return {inspectScene:()=>scene,model,update,sync,interrupt,');
for(const m of modules)adapter=adapter.replaceAll('./'+m,'./v19-'+m);
fs.writeFileSync(path.join(out,'v19-home-diorama.js'),adapter);
fs.writeFileSync(path.join(out,'v19-home-diorama-model.js'),original('home-diorama-model.js').replace('move,step,cancel','move,step:(dt,opts)=>step(dt,{...opts,autonomy:window.HomeV13Autonomy===true}),cancel').replace('return {metrics:()=>','return {setFacing:(kind,direction)=>{for(const a of actors)if(a.kind===kind)a.direction=direction;},metrics:()=>'));
fs.writeFileSync(path.join(out,'v19-home-diorama.css'),original('home-diorama.css'));
fs.writeFileSync(path.join(out,'v19-comparison-script.js'),fs.readFileSync(path.join(out,'qa-v20-script.js'),'utf8').replaceAll('naotocchi-home-v20-qa-v1','naotocchi-home-v19-comparison-v1'));
fs.writeFileSync(path.join(out,'v19-comparison-game.html'),fs.readFileSync(path.join(out,'qa-v20-game.html'),'utf8').replaceAll('qa-v20-script.js','v19-comparison-script.js').replaceAll('qa-v20-diorama.js','v19-home-diorama.js').replaceAll('qa-v20-model.js','v19-home-diorama-model.js').replaceAll('home-diorama.css','v19-home-diorama.css').replaceAll('naotocchi-home-v20-qa-v1','naotocchi-home-v19-comparison-v1'));
fs.writeFileSync(path.join(out,'v19-comparison-check.js'),fs.readFileSync('tools/home-v20-browser-check.js','utf8').replaceAll('qa-v20-game.html','v19-comparison-game.html').replaceAll('naotocchi-home-v20-qa-v1','naotocchi-home-v19-comparison-v1'));
fs.writeFileSync(path.join(out,'v19-comparison.html'),fs.readFileSync('tools/home-v20-qa.html','utf8').replaceAll('Home v20','Home v19 baseline').replaceAll('home-v20-browser-check.js','v19-comparison-check.js'));
