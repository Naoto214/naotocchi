// Exact v21 geometry/rendering snapshot with the same age25 / summer fixture.
const fs=require('node:fs'),path=require('node:path'),{execFileSync}=require('node:child_process');
const out=path.resolve(process.argv[2]),sha='d856e4af4715b9e2e34285f9d8188bcd91fde3eb';
const original=f=>execFileSync('git',['show',sha+':'+f],{encoding:'utf8',maxBuffer:8e6});
const modules=['home-world.mjs','home-terrain-navigation.mjs','home-scenery.mjs','meguru-3d.mjs','world-software.mjs','world-life.mjs','world-ambient.mjs'];
for(const f of modules){let s=original(f);for(const m of modules)s=s.replaceAll('./'+m,'./b21-'+m);fs.writeFileSync(path.join(out,'b21-'+f),s);}
let adapter=original('home-diorama.js').replace('return {model,update,sync,interrupt,','return {inspectScene:()=>scene,model,update,sync,interrupt,');for(const m of modules)adapter=adapter.replaceAll('./'+m,'./b21-'+m);
fs.writeFileSync(path.join(out,'b21-home-diorama.js'),adapter);
fs.writeFileSync(path.join(out,'b21-script.js'),fs.readFileSync(path.join(out,'qa-v22-script.js'),'utf8').replaceAll('naotocchi-home-v22-qa-v1','naotocchi-home-v21-comparison-v1'));
fs.writeFileSync(path.join(out,'b21-game.html'),fs.readFileSync(path.join(out,'qa-v22-game.html'),'utf8').replaceAll('qa-v22-script.js','b21-script.js').replaceAll('qa-v22-diorama.js','b21-home-diorama.js').replaceAll('naotocchi-home-v22-qa-v1','naotocchi-home-v21-comparison-v1'));
fs.writeFileSync(path.join(out,'b21-check.js'),fs.readFileSync('tools/home-v22-browser-check.js','utf8').replaceAll('qa-v22-game.html','b21-game.html').replaceAll('naotocchi-home-v22-qa-v1','naotocchi-home-v21-comparison-v1'));
fs.writeFileSync(path.join(out,'home-v21-original.html'),fs.readFileSync('tools/home-v22-qa.html','utf8').replaceAll('Home v22','Home v21 baseline').replaceAll('home-v22-browser-check.js','b21-check.js'));
console.log('Exact d856e4af v21 baseline generated; independent save key');
