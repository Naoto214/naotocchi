// Add the recovered candidates without replacing any previous entrypoint/assets.
const fs=require('node:fs'),path=require('node:path'),{execFileSync}=require('node:child_process');
const out=path.resolve(process.argv[2]);
execFileSync(process.execPath,['tools/home-japan-build.cjs',out],{stdio:'inherit'});
for(const f of ['home-recovered-manifest.mjs','home-recovered-navigation.mjs','home-recovered-world.mjs'])fs.copyFileSync(f,path.join(out,f));
fs.cpSync('assets/home-art-recovered-20261029',path.join(out,'assets/home-art-recovered-20261029'),{recursive:true});
const replacements=s=>s.replaceAll('home-japan-world.mjs','home-recovered-world.mjs').replaceAll('qa-japan-script.js','qa-recovered-script.js').replaceAll('qa-japan-diorama.js','qa-recovered-diorama.js').replaceAll('japan-play-script.js','recovered-play-script.js').replaceAll('japan-play-diorama.js','recovered-play-diorama.js').replaceAll('naotocchi-japan-qa-v1','naotocchi-recovered-qa-v1').replaceAll('naotocchi-japan-play-v1','naotocchi-recovered-play-v1');
const {recoveredModelSource}=require('./home-recovered-model.cjs');
fs.writeFileSync(path.join(out,'recovered-model.js'),recoveredModelSource(fs.readFileSync('home-diorama-model.js','utf8')));
fs.writeFileSync(path.join(out,'qa-recovered-model.js'),recoveredModelSource(fs.readFileSync(path.join(out,'qa-v22-model.js'),'utf8')));
for(const [src,dst]of [['qa-japan-game.html','qa-recovered-game.html'],['qa-japan-script.js','qa-recovered-script.js'],['qa-japan-diorama.js','qa-recovered-diorama.js'],['japan-play.html','recovered-play.html'],['japan-play-script.js','recovered-play-script.js'],['japan-play-diorama.js','recovered-play-diorama.js']]){
 let s=replacements(fs.readFileSync(path.join(out,src),'utf8'));
 if(dst.endsWith('.html'))s=s.replace(/src="home-diorama-model.js[^"]*"/,'src="recovered-model.js"').replace('qa-v22-model.js','qa-recovered-model.js');
 if(dst==='recovered-play.html')s=s.replace('</body>','<a href="recovered.html" style="position:fixed;right:8px;bottom:8px;z-index:10000;background:#fff;color:#234;padding:7px 12px;border-radius:20px;font:13px system-ui">背景比較へもどる</a></body>');
 fs.writeFileSync(path.join(out,dst),s);
}
for(const [src,dst]of [['home-japan-qa.html','home-recovered-qa.html'],['home-japan-browser-check.js','home-recovered-browser-check.js']]){
 let s=replacements(fs.readFileSync(path.join(out,src),'utf8')).replaceAll('home-japan-browser-check.js','home-recovered-browser-check.js').replaceAll('qa-japan-game.html','qa-recovered-game.html');
 if(dst.endsWith('.js'))s=s.replace("frame.src='qa-recovered-game.html';","frame.src='qa-recovered-game.html?candidate='+encodeURIComponent(new URLSearchParams(location.search).get('candidate')||'');").replace("frame.src='qa-recovered-game.html?case='+Date.now();","frame.src='qa-recovered-game.html?candidate='+encodeURIComponent(new URLSearchParams(location.search).get('candidate')||'')+'&case='+Date.now();");
 fs.writeFileSync(path.join(out,dst),s);
}
for(const [src,dst]of [['tools/home-recovered-gallery.html','recovered.html'],['tools/home-recovered-gallery.js','home-recovered-gallery.js']])fs.copyFileSync(src,path.join(out,dst));
for(const entry of ['index.html','japan.html']){const p=path.join(out,entry);fs.writeFileSync(p,fs.readFileSync(p,'utf8').replace('<nav class="nav">','<nav class="nav"><a class="button" href="recovered.html">保存済み6背景 · version 4</a>'));}
fs.writeFileSync(path.join(out,'recovered-release.json'),JSON.stringify({githubHead:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),gallery:'recovered.html',sourceImages:require('node:crypto')?Object.fromEntries(fs.readdirSync('assets/home-art-recovered-20261029').filter(f=>f.endsWith('.png')).map(f=>[f,require('node:crypto').createHash('sha256').update(fs.readFileSync('assets/home-art-recovered-20261029/'+f)).digest('hex')])):{}},null,2));
console.log('Recovered six backgrounds built; previous ten candidates retained.');
