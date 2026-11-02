// Reuse V11 fixtures and assets; --reuse-v11 avoids duplicating their generation.
const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process'),crypto=require('node:crypto');
const out=path.resolve(process.argv[2]);
if(!process.argv.includes('--reuse-v11'))cp.execFileSync(process.execPath,['tools/home-production-v11-qa.cjs',out]);
for(const file of ['script.js','home-production-touch.js','home-production-layout.css','home-production-diorama.js'])fs.copyFileSync(file,path.join(out,'v12-'+file));
let qa=fs.readFileSync(path.join(out,'v11-qa-script.js'),'utf8').replaceAll("document.body.dataset.homeViewportVersion==='11'","['11','12'].includes(document.body.dataset.homeViewportVersion)");
const runtime=fs.readFileSync('script.js','utf8'),start=runtime.indexOf('const upperV12='),end=runtime.indexOf('\n    const property=',start);
if(!qa.includes('const upperV12='))qa=qa.replace('const html=commentTextHTML(value,character),illustrated=html!==escapeHtml(value);',runtime.slice(start,end));
qa=qa.replace('window.HomeReleaseQA={',`window.HomeReleaseQA={
 edgeCase(edge){this.resetDisplay();const m=homeDiorama.model,a=m.snapshot().find(a=>a.kind==='pet'),b=m.bounds(a);m.select(a.key);const ok=m.move(a.key,{x:a.x,y:edge==='bottom'?b.bottom:b.top},'drag');for(let i=0;i<240;i++)m.step(.1,{autonomy:false});m.select(a.key);return {ok,bounds:b,actor:m.snapshot().find(row=>row.key===a.key)};},
 markCase(kind){this.resetDisplay();Object.assign(state,{speciesLine:"woman",stageIndex:1,ageTicks:16*AGE_TICKS_PER_YEAR,hunger:kind==="hungry"?5:95,happiness:kind==="sulky"?5:95});render();},
 actualLong(){this.resetDisplay();this.commentCase('pet','なんで人間がいるの?と思ったが、なぜかだれも気にしていない');setCriticalMessage('⚠️保存に失敗しました。「データ」でセーブコードをひかえられますが、最後に保存できた記録になる場合があります。保存できていない変更は、画面を閉じると失われます。');},
 iconProbe(){this.resetDisplay();setMessage('🏆 🎮 🥚 ✨ 💰 ❤️ 🏠 🌲 🐕 💤 📋 ⚠️');},
`);
fs.writeFileSync(path.join(out,'v12-qa-script.js'),qa);
for(const file of ['v12-home-production-diorama.js','v12-qa-diorama.js'])fs.writeFileSync(path.join(out,file),fs.readFileSync('home-production-diorama.js','utf8').replace("import('./home-production-world.mjs')","import('./v12-home-production-world.mjs')"));
const qaDiorama=path.join(out,'v12-qa-diorama.js');fs.writeFileSync(qaDiorama,fs.readFileSync(qaDiorama,'utf8').replace('return {model,update,sync,interrupt,','return {inspectScene:()=>scene,inspectWorld:()=>world?.stats(),model,update,sync,interrupt,'));
fs.copyFileSync('home-production-world.mjs',path.join(out,'v12-home-production-world.mjs'));
for(const entry of ['v11.html','v11-qa.html']){
 let s=fs.readFileSync(path.join(out,entry),'utf8').replaceAll('viewport-version="11"','viewport-version="12"').replaceAll('v11-qa','v12-qa');
 for(const file of ['script.js','home-production-touch.js','home-production-layout.css','home-production-diorama.js'])s=s.replaceAll('"'+file+'?','"v12-'+file+'?');
 s=s.replace(/((?:src|href)=")(v12-[^"?]+)(?:\?[^" ]*)?(")/g,(_,a,f,z)=>a+f+'?v='+crypto.createHash('sha256').update(fs.readFileSync(path.join(out,f))).digest('hex').slice(0,12)+z);
 fs.writeFileSync(path.join(out,entry.replace('v11','v12')),s);
}
fs.writeFileSync(path.join(out,'v12-review.html'),fs.readFileSync(path.join(out,'v11-review.html'),'utf8').replaceAll('V11','V12').replaceAll('VERSION 11','VERSION 12').replaceAll('v11','v12'));
