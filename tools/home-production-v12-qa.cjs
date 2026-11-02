// Reuse V11 fixtures and assets; --reuse-v11 avoids duplicating their generation.
const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process'),crypto=require('node:crypto');
const out=path.resolve(process.argv[2]);
if(!process.argv.includes('--reuse-v11'))cp.execFileSync(process.execPath,['tools/home-production-v11-qa.cjs',out]);
for(const file of ['script.js','home-production-touch.js','home-production-layout.css','home-production-diorama.js'])fs.copyFileSync(file,path.join(out,'v12-'+file));
let qa=fs.readFileSync(path.join(out,'v11-qa-script.js'),'utf8').replaceAll("document.body.dataset.homeViewportVersion==='11'","['11','12'].includes(document.body.dataset.homeViewportVersion)");
const runtime=fs.readFileSync('script.js','utf8'),start=runtime.indexOf('const upperV12='),end=runtime.indexOf('\n    const property=',start);
if(!qa.includes('const upperV12='))qa=qa.replace('const html=commentTextHTML(value,character),illustrated=html!==escapeHtml(value);',runtime.slice(start,end));
qa=qa.replace('window.HomeReleaseQA={',`window.HomeReleaseQA={
 actualLong(){this.resetDisplay();this.commentCase('pet','なんで人間がいるの?と思ったが、なぜかだれも気にしていない');setCriticalMessage('⚠️保存に失敗しました。「データ」でセーブコードをひかえられますが、最後に保存できた記録になる場合があります。保存できていない変更は、画面を閉じると失われます。');},
 iconProbe(){this.resetDisplay();setMessage('🏆 🎮 🥚 ✨ 💰 ❤️ 🏠 🌲 🐕 💤 📋 ⚠️');},
`);
fs.writeFileSync(path.join(out,'v12-qa-script.js'),qa);
let diorama=fs.readFileSync(path.join(out,'v11-qa-diorama.js'),'utf8'),current=fs.readFileSync('home-production-diorama.js','utf8');
const a=diorama.indexOf('            row.maskKey=cacheKey;'),b=diorama.indexOf('\n        }',a),c=current.indexOf('            row.maskKey=cacheKey;'),d=current.indexOf('\n        }',c);
if([a,b,c,d].some(n=>n<0))throw Error('V11 mask fixture anchor missing');
diorama=diorama.slice(0,a)+current.slice(c,d)+diorama.slice(b);fs.writeFileSync(path.join(out,'v12-qa-diorama.js'),diorama);
for(const entry of ['v11.html','v11-qa.html']){
 let s=fs.readFileSync(path.join(out,entry),'utf8').replaceAll('viewport-version="11"','viewport-version="12"').replaceAll('v11-qa','v12-qa');
 for(const file of ['script.js','home-production-touch.js','home-production-layout.css','home-production-diorama.js'])s=s.replaceAll('"'+file+'?','"v12-'+file+'?');
 s=s.replace(/((?:src|href)=")(v12-[^"?]+)(?:\?[^" ]*)?(")/g,(_,a,f,z)=>a+f+'?v='+crypto.createHash('sha256').update(fs.readFileSync(path.join(out,f))).digest('hex').slice(0,12)+z);
 fs.writeFileSync(path.join(out,entry.replace('v11','v12')),s);
}
fs.writeFileSync(path.join(out,'v12-review.html'),fs.readFileSync(path.join(out,'v11-review.html'),'utf8').replaceAll('V11','V12').replaceAll('VERSION 11','VERSION 12').replaceAll('v11','v12'));
