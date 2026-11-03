// Add V13 to an existing V12 private artifact without regenerating its assets.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const out=path.resolve(process.argv[2]);
const read=f=>fs.readFileSync(path.join(out,f),'utf8'),write=(f,s)=>fs.writeFileSync(path.join(out,f),s);
for(const file of ['home-production-touch.js','home-production-world.mjs'])write('v13-'+file,fs.readFileSync(file,'utf8'));
const diorama=fs.readFileSync('home-production-diorama.js','utf8').replace("import('./home-production-world.mjs')","import('./v13-home-production-world.mjs')");
write('v13-home-production-diorama.js',diorama);
write('v13-qa-diorama.js',diorama.replace('return {model,update,sync,interrupt,','return {inspectScene:()=>scene,inspectWorld:()=>world?.stats(),model,update,sync,interrupt,'));
let qa=read('v12-qa-script.js').replace('window.HomeReleaseQA={',`window.HomeReleaseQA={
 stableComment(){this.resetDisplay();setMessage('表示の確認');setSpeechBubble('ここは、いいところだね。',petSpeaker(),{holdMs:60000});},
`);
qa=qa.replace(/(markCase\(kind\)\{[^\n]*render\(\);)\}/,'$1homeDiorama.sync();}');
write('v13-qa-script.js',qa);
for(const entry of ['v12.html','v12-qa.html']){
 let html=read(entry).replace('<body ','<body data-home-display-version="13" ');
 for(const file of ['home-production-touch.js','home-production-diorama.js','qa-script.js','qa-diorama.js'])html=html.replaceAll('v12-'+file,'v13-'+file);
 html=html.replace(/((?:src|href)=")(v13-[^"?]+)(?:\?[^" ]*)?(")/g,(_,a,f,z)=>a+f+'?v='+crypto.createHash('sha256').update(read(f)).digest('hex').slice(0,12)+z);
 write(entry.replace('v12','v13'),html);
}
// Ordinary saves retain the existing origin and key; only QA uses its old isolated key.
fs.copyFileSync(path.join(out,'v13.html'),path.join(out,'index.html'));
