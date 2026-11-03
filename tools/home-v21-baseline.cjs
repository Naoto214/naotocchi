// Exact v20 geometry/rendering snapshot with the same age25 / summer fixture.
const fs=require('node:fs'),path=require('node:path'),{execFileSync}=require('node:child_process');
const out=path.resolve(process.argv[2]),sha='a77fd1e3888acd6a2cd46076bf64a66e6357af28';
const original=f=>execFileSync('git',['show',sha+':'+f],{encoding:'utf8',maxBuffer:8e6});
const modules=['home-world.mjs','home-terrain-navigation.mjs','home-scenery.mjs','meguru-3d.mjs','world-software.mjs'];
for(const f of modules){let s=original(f);for(const m of modules)s=s.replaceAll('./'+m,'./b20-'+m);fs.writeFileSync(path.join(out,'b20-'+f),s);}
let adapter=original('home-diorama.js').replace('return {model,update,sync,interrupt,','return {inspectScene:()=>scene,model,update,sync,interrupt,');for(const m of modules)adapter=adapter.replaceAll('./'+m,'./b20-'+m);
fs.writeFileSync(path.join(out,'b20-home-diorama.js'),adapter);
fs.writeFileSync(path.join(out,'b20-script.js'),fs.readFileSync(path.join(out,'qa-v21-script.js'),'utf8').replaceAll('naotocchi-home-v21-qa-v1','naotocchi-home-v20-comparison-v1'));
fs.writeFileSync(path.join(out,'b20-game.html'),fs.readFileSync(path.join(out,'qa-v21-game.html'),'utf8').replaceAll('qa-v21-script.js','b20-script.js').replaceAll('qa-v21-diorama.js','b20-home-diorama.js').replaceAll('naotocchi-home-v21-qa-v1','naotocchi-home-v20-comparison-v1'));
fs.writeFileSync(path.join(out,'b20-check.js'),fs.readFileSync('tools/home-v21-browser-check.js','utf8').replaceAll('qa-v21-game.html','b20-game.html').replaceAll('naotocchi-home-v21-qa-v1','naotocchi-home-v20-comparison-v1'));
fs.writeFileSync(path.join(out,'home-v20-original.html'),fs.readFileSync('tools/home-v21-qa.html','utf8').replaceAll('Home v21','Home v20 baseline').replaceAll('home-v21-browser-check.js','b20-check.js'));
console.log('Exact a77fd1e v20 baseline generated; independent save key');
