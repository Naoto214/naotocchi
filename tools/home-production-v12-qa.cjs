// Reuse V11's isolated save/scene fixtures; only V12 presentation is activated.
const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process'),crypto=require('node:crypto');
const out=path.resolve(process.argv[2]);cp.execFileSync(process.execPath,['tools/home-production-v11-qa.cjs',out]);
for(const file of ['script.js','home-production-touch.js','home-production-layout.css','home-production-diorama.js'])fs.copyFileSync(file,path.join(out,'v12-'+file));
for(const file of ['script.js','diorama.js'])fs.copyFileSync(path.join(out,'v11-qa-'+file),path.join(out,'v12-qa-'+file));
for(const entry of ['v11.html','v11-qa.html']){
 let s=fs.readFileSync(path.join(out,entry),'utf8').replaceAll('viewport-version="11"','viewport-version="12"').replaceAll('v11-qa','v12-qa');
 for(const file of ['script.js','home-production-touch.js','home-production-layout.css','home-production-diorama.js'])s=s.replaceAll('"'+file+'?','"v12-'+file+'?');
 s=s.replace(/((?:src|href)=")(v12-[^"?]+)(?:\?[^" ]*)?(")/g,(_,a,f,z)=>a+f+'?v='+crypto.createHash('sha256').update(fs.readFileSync(path.join(out,f))).digest('hex').slice(0,12)+z);
 fs.writeFileSync(path.join(out,entry.replace('v11','v12')),s);
}
fs.writeFileSync(path.join(out,'v12-review.html'),fs.readFileSync(path.join(out,'v11-review.html'),'utf8').replaceAll('V11','V12').replaceAll('VERSION 11','VERSION 12').replaceAll('v11','v12'));
