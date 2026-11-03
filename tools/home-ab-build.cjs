// Additive B candidate. Original six recovered scenes and their URLs stay intact.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),{execFileSync}=require('node:child_process');
const out=path.resolve(process.argv[2]);
execFileSync(process.execPath,['tools/home-recovered-build.cjs',out],{stdio:'inherit'});
const read=f=>fs.readFileSync(path.join(out,f),'utf8'),write=(f,s)=>fs.writeFileSync(path.join(out,f),s);
const {scopeConversation}=require('./home-ab-storage.cjs');
function conversation(html,scope){
 for(const name of ['conversation-director','conversation-away']){
  const file='home-ab-'+scope+'-'+name+'.js';
  write(file,scopeConversation(fs.readFileSync(name+'.js','utf8'),scope));
  html=html.replaceAll(name+'.js',file);
 }
 return html;
}
fs.copyFileSync('home-ab-manifest.mjs',path.join(out,'home-ab-manifest.mjs'));
fs.cpSync('assets/home-b-20261029',path.join(out,'assets/home-b-20261029'),{recursive:true});
write('home-ab-world.mjs',read('home-recovered-world.mjs').replace("{ART_CANDIDATES,selectRecoveredScene}","{WORLD_CANDIDATES as ART_CANDIDATES,selectRecoveredScene}").replace('./home-recovered-manifest.mjs','./home-ab-manifest.mjs'));
for(const [side,key] of [['a','naotocchi-home-ab-a-qa-v1'],['b','naotocchi-home-ab-b-qa-v1']]){
 const stem='qa-home-ab-'+side;
 write(stem+'-script.js',read('qa-recovered-script.js').replaceAll('naotocchi-recovered-qa-v1',key));
 write(stem+'-diorama.js',read('qa-recovered-diorama.js').replaceAll('home-recovered-world.mjs','home-ab-world.mjs'));
 write(stem+'-game.html',conversation(read('qa-recovered-game.html').replaceAll('naotocchi-recovered-qa-v1',key).replaceAll('qa-recovered-script.js',stem+'-script.js').replaceAll('qa-recovered-diorama.js',stem+'-diorama.js'),side+'-qa'));
}
write('home-ab-play-script.js',read('recovered-play-script.js').replaceAll('naotocchi-recovered-play-v1','naotocchi-home-ab-play-v1'));
write('home-ab-play-diorama.js',read('recovered-play-diorama.js').replaceAll('home-recovered-world.mjs','home-ab-world.mjs'));
write('home-ab-play.html',conversation(read('recovered-play.html').replaceAll('naotocchi-recovered-play-v1','naotocchi-home-ab-play-v1').replaceAll('recovered-play-script.js','home-ab-play-script.js').replaceAll('recovered-play-diorama.js','home-ab-play-diorama.js').replace('href="recovered.html"','href="home-ab.html"'),'play'));
write('home-ab-browser-check.js',read('home-recovered-browser-check.js').replaceAll('qa-recovered-game.html','qa-home-ab-a-game.html').replaceAll('naotocchi-recovered-qa-v1','naotocchi-home-ab-a-qa-v1'));
write('home-ab-qa.html',read('home-recovered-qa.html').replaceAll('home-recovered-browser-check.js','home-ab-browser-check.js'));
for(const [src,dst] of [['tools/home-ab-gallery.html','home-ab.html'],['tools/home-ab-gallery.js','home-ab-gallery.js']])fs.copyFileSync(src,path.join(out,dst));
for(const entry of ['index.html','japan.html','recovered.html'])write(entry,read(entry).replace('<nav class="nav">','<nav class="nav"><a class="button" href="home-ab.html">おうちA/B · version 5</a>'));
const hash=f=>crypto.createHash('sha256').update(fs.readFileSync(path.join(out,f))).digest('hex');
const files=[...['a-qa','b-qa','play'].flatMap(scope=>['conversation-director','conversation-away'].map(name=>'home-ab-'+scope+'-'+name+'.js')),'home-ab.html','home-ab-gallery.js','home-ab-manifest.mjs','home-ab-world.mjs','home-recovered-manifest.mjs','home-recovered-navigation.mjs','recovered-model.js','qa-recovered-model.js','home-ab-play.html','home-ab-play-script.js','home-ab-play-diorama.js','qa-home-ab-a-game.html','qa-home-ab-a-script.js','qa-home-ab-a-diorama.js','qa-home-ab-b-game.html','qa-home-ab-b-script.js','qa-home-ab-b-diorama.js','assets/home-b-20261029/home-interior-b.png',...fs.readdirSync('assets/home-art-recovered-20261029').filter(f=>f.endsWith('.png')).map(f=>'assets/home-art-recovered-20261029/'+f)];
write('home-ab-release.json',JSON.stringify({version:5,githubHead:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),adopted:false,files:Object.fromEntries(files.map(f=>[f,hash(f)]))},null,2));
console.log('Home A/B version 5 built; original candidates and save families retained.');
