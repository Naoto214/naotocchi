// Additive build from the preserved v7 release. Never rebuild or replace v7.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {adaptDiorama}=require('./home-v8-adapter.cjs');
const out=path.resolve(process.argv[2]),read=f=>fs.readFileSync(path.join(out,f),'utf8'),write=(f,s)=>fs.writeFileSync(path.join(out,f),s),hash=b=>crypto.createHash('sha256').update(b).digest('hex');
if(!fs.existsSync(path.join(out,'release-v7.json')))throw Error('Preserved v7 distribution required');
const files=[];function put(f,s){write(f,s);files.push(f);}
for(const f of ['home-v8-manifest.mjs','home-v8.css'])put(f,fs.readFileSync(f,'utf8'));
put('home-v8-world.mjs',read('home-v7-world.mjs').replaceAll('home-v7-manifest.mjs','home-v8-manifest.mjs'));
for(const scope of ['qa','sheet','play']){
 const old=scope==='qa'?'qa-home-v7':scope==='sheet'?'qa-home-v7-sheet':'home-v7-play',next=old.replaceAll('v7','v8');
 for(const suffix of ['-script.js','-diorama.js',scope==='play'?'.html':'-game.html']){
  let s=read(old+suffix).replaceAll('naotocchi-home-v7-','naotocchi-home-v8-').replaceAll(old,next).replaceAll('home-v7-world.mjs','home-v8-world.mjs').replaceAll('home-v7-'+scope+'-conversation','home-v8-'+scope+'-conversation').replaceAll('href="home-v7.html"','href="home-v8.html"');
  if(suffix==='-diorama.js')s=adaptDiorama(s);
  if(suffix.endsWith('.html'))s=s.replace('</head>','<link rel="stylesheet" href="home-v8.css"></head>');
  put(next+suffix,s);
 }
 for(const n of ['director','away'])put('home-v8-'+scope+'-conversation-'+n+'.js',read('home-v7-'+scope+'-conversation-'+n+'.js').replaceAll('naotocchi-home-v7-','naotocchi-home-v8-'));
}
for(const ext of ['html','js'])if(fs.existsSync('tools/home-v8-gallery.'+ext))put(ext==='html'?'home-v8.html':'home-v8-gallery.js',fs.readFileSync('tools/home-v8-gallery.'+ext,'utf8'));
put('home-v8-qa.html',read('home-v7-qa.html').replaceAll('home-v7','home-v8'));
put('home-v8-browser-check.js',read('home-v7-browser-check.js').replaceAll('home-v7','home-v8'));
fs.mkdirSync(path.join(out,'assets/home-v8-20261029/runtime'),{recursive:true});
const image='assets/home-v8-20261029/runtime/sea-b2.webp';fs.copyFileSync(image,path.join(out,image));files.push(image);
if(fs.existsSync('tools/home-v8-qa.js'))put('home-v8-qa-runner.js',fs.readFileSync('tools/home-v8-qa.js','utf8'));
if(fs.existsSync('tools/home-v8-qa.html'))put('home-v8-validation.html',fs.readFileSync('tools/home-v8-qa.html','utf8'));
fs.mkdirSync(path.join(out,'v8-comparisons'),{recursive:true});
for(const name of fs.readdirSync('docs/qa/home-v8').filter(n=>n.endsWith('.webp'))){fs.copyFileSync('docs/qa/home-v8/'+name,path.join(out,'v8-comparisons',name));files.push('v8-comparisons/'+name);}
put('release-v8.json',JSON.stringify({version:8,githubHead:process.env.HOME_V8_GITHUB_HEAD||require('node:child_process').execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),adoption:{sea:'sea-b',seaB2:'comparison only',star_stop:'star-new design',memory_lake:'lake-new design',production:'not approved'},files:Object.fromEntries(files.map(f=>[f,hash(fs.readFileSync(path.join(out,f)))]))},null,2)+'\n');
console.log('V8 additive build:',files.length,'files');
