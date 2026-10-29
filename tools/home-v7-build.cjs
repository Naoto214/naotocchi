// Additive v7 build. --existing preserves a verified packaged v6 distribution.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),{execFileSync}=require('node:child_process');
const out=path.resolve(process.argv[2]);
if(!process.argv.includes('--existing'))execFileSync(process.execPath,['tools/home-v6-build.cjs',out],{stdio:'inherit'});
if(!fs.existsSync(path.join(out,'release-v6.json')))throw Error('V6 distribution required');
const read=f=>fs.readFileSync(path.join(out,f),'utf8'),write=(f,s)=>fs.writeFileSync(path.join(out,f),s);
const before=Object.fromEntries(fs.readdirSync(out).filter(f=>fs.statSync(path.join(out,f)).isFile()).map(f=>[f,crypto.createHash('sha256').update(fs.readFileSync(path.join(out,f))).digest('hex')]));
fs.cpSync('assets/home-v7-20261029/runtime',path.join(out,'assets/home-v7-20261029/runtime'),{recursive:true});
fs.copyFileSync('home-v7-manifest.mjs',path.join(out,'home-v7-manifest.mjs'));
write('home-v7-world.mjs',read('home-v6-world.mjs').replaceAll('home-v6-manifest.mjs','home-v7-manifest.mjs'));
for(const scope of ['qa','sheet','play']){
 const stem=scope==='qa'?'qa-home-v6':scope==='sheet'?'qa-home-v6-sheet':'home-v6-play';
 const next=stem.replaceAll('v6','v7');
 for(const suffix of ['-script.js','-diorama.js',scope==='play'?'.html':'-game.html'])write(next+suffix,read(stem+suffix).replaceAll('naotocchi-home-v6-','naotocchi-home-v7-').replaceAll(stem,next).replaceAll('home-v6-world.mjs','home-v7-world.mjs').replaceAll('home-v6-'+scope+'-conversation','home-v7-'+scope+'-conversation').replaceAll('href="home-v6.html"','href="home-v7.html"'));
 for(const n of ['director','away'])write('home-v7-'+scope+'-conversation-'+n+'.js',read('home-v6-'+scope+'-conversation-'+n+'.js').replaceAll('naotocchi-home-v6-','naotocchi-home-v7-'));
}
write('home-v7-browser-check.js',read('home-v6-browser-check.js').replaceAll('home-v6','home-v7').replace('boot();',"const initialRegion=new URLSearchParams(location.search).get('region');if(initialRegion)$('region').value=initialRegion;boot();").replace("'/312'","'/24'"));
write('home-v7-qa.html',read('home-v6-qa.html').replaceAll('home-v6','home-v7'));
for(const ext of ['html','js'])fs.copyFileSync('tools/home-v7-gallery.'+ext,path.join(out,ext==='html'?'home-v7.html':'home-v7-gallery.js'));
for(const [f,h]of Object.entries(before)){if(f.includes('v7'))continue;const after=crypto.createHash('sha256').update(fs.readFileSync(path.join(out,f))).digest('hex');if(after!==h)throw Error('Prior distribution changed: '+f);}
const files=fs.readdirSync(out).filter(f=>f.includes('v7')&&fs.statSync(path.join(out,f)).isFile()&&!f.startsWith('release'));
for(const f of fs.readdirSync(path.join(out,'assets/home-v7-20261029/runtime')))files.push('assets/home-v7-20261029/runtime/'+f);
for(const f of ['star_stop-v1.webp','memory_lake-v1.webp'])files.push('assets/world/'+f);
write('release-v7.json',JSON.stringify({version:7,githubHead:process.env.HOME_V7_GITHUB_HEAD||execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),adoption:'pending owner iPhone comparison',originals:['assets/world/star_stop-v1.webp','assets/world/memory_lake-v1.webp'],files:Object.fromEntries(files.map(f=>[f,crypto.createHash('sha256').update(fs.readFileSync(path.join(out,f))).digest('hex')])),v6EntryHashes:Object.fromEntries(Object.entries(before).filter(([f])=>f.includes('v6')))},null,2)+'\n');
console.log('V7 additive build complete; existing distribution preserved.');
