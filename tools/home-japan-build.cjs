const fs=require('node:fs'),path=require('node:path'),{execFileSync}=require('node:child_process');
const out=path.resolve(process.argv[2]);
execFileSync(process.execPath,['tools/home-art-build.cjs',out],{stdio:'inherit'});
for(const f of ['home-japan-manifest.mjs','home-japan-world.mjs'])fs.copyFileSync(f,path.join(out,f));
fs.cpSync('assets/home-japan-v1',path.join(out,'assets/home-japan-v1'),{recursive:true});
for(const [from,to] of [['tools/home-japan-gallery.html','japan.html'],['tools/home-japan-gallery.js','home-japan-gallery.js'],['tools/home-japan-report.html','japan-report.html']])fs.copyFileSync(from,path.join(out,to));
for(const [src,dst] of [['qa-art-game.html','qa-japan-game.html'],['qa-art-script.js','qa-japan-script.js'],['qa-art-diorama.js','qa-japan-diorama.js'],['play.html','japan-play.html'],['art-play-script.js','japan-play-script.js'],['art-play-diorama.js','japan-play-diorama.js']]){
let s=fs.readFileSync(path.join(out,src),'utf8').replaceAll('home-art-world.mjs','home-japan-world.mjs').replaceAll('qa-art-script.js','qa-japan-script.js').replaceAll('qa-art-diorama.js','qa-japan-diorama.js').replaceAll('art-play-script.js','japan-play-script.js').replaceAll('art-play-diorama.js','japan-play-diorama.js').replaceAll('naotocchi-art25d-qa-v1','naotocchi-japan-qa-v1').replaceAll('naotocchi-art25d-play-v1','naotocchi-japan-play-v1');fs.writeFileSync(path.join(out,dst),s);}
const index=path.join(out,'index.html');fs.writeFileSync(index,fs.readFileSync(index,'utf8').replace('<nav class="nav">','<nav class="nav"><a class="button" href="japan.html">日本の風景・新4案を比較</a>'));

for(const [src,dst] of [['home-art-qa.html','home-japan-qa.html'],['home-art-browser-check.js','home-japan-browser-check.js']]){let s=fs.readFileSync(path.join(out,src),'utf8').replaceAll('home-art-browser-check.js','home-japan-browser-check.js').replaceAll('qa-art-game.html','qa-japan-game.html').replaceAll('naotocchi-art25d-qa-v1','naotocchi-japan-qa-v1').replace("['forest','river_lake','city']","['home','forest','river_lake','city']");fs.writeFileSync(path.join(out,dst),s);}
