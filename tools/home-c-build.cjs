const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),{execFileSync}=require('node:child_process');
const out=path.resolve(process.argv[2]);execFileSync(process.execPath,['tools/home-ab-build.cjs',out],{stdio:'inherit'});
fs.cpSync('assets/home-c-20261029',path.join(out,'assets/home-c-20261029'),{recursive:true});
for(const [src,dst]of [['tools/home-c-comparison.html','home-c.html'],['tools/home-c-comparison.js','home-c-comparison.js'],['home-c-comparison-data.json','home-c-comparison-data.json']])fs.copyFileSync(src,path.join(out,dst));
for(const f of ['index.html','japan.html','recovered.html','home-ab.html']){const p=path.join(out,f);fs.writeFileSync(p,fs.readFileSync(p,'utf8').replace('<nav class="nav">','<nav class="nav"><a class="button" href="home-c.html">室内C案と4案を比較</a>'));}
const release=JSON.parse(fs.readFileSync(path.join(out,'home-ab-release.json'),'utf8'));release.cStatus='static-only; 2.5D not connected; not adopted';
for(const f of ['home-ab.html','index.html','japan.html','recovered.html','home-c.html','home-c-comparison.js','home-c-comparison-data.json','assets/home-c-20261029/home-interior-c.png','assets/world/home-interior-v2.webp'])release.files[f]=crypto.createHash('sha256').update(fs.readFileSync(path.join(out,f))).digest('hex');
fs.writeFileSync(path.join(out,'home-ab-release.json'),JSON.stringify(release,null,2));
console.log('Version 5: B interactive; C artwork and four-way static comparison only.');
