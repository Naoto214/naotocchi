// Extend the retained V15 artifact; preserve all previous versions and official assets.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const out=path.resolve(process.argv[2]),read=f=>fs.readFileSync(path.join(out,f),'utf8'),write=(f,s)=>fs.writeFileSync(path.join(out,f),s);
for(const f of ['script.js','home-production-touch.js','home-production-world.mjs','home-production-layout.css'])write('v16-'+f,fs.readFileSync(f,'utf8'));
const diorama=fs.readFileSync('home-production-diorama.js','utf8').replace("import('./home-production-world.mjs')","import('./v16-home-production-world.mjs')");
write('v16-home-production-diorama.js',diorama);
write('v16-qa-diorama.js',diorama.replace('return {model,update,sync,interrupt,','return {inspectScene:()=>scene,inspectWorld:()=>world?.stats(),model,update,sync,interrupt,'));
let qa=read('v15-qa-script.js').replace('homeText(raw,true)',"homeText(raw,true,document.body.dataset.homeDisplayVersion==='16')").replace("homeText(message,document.body.dataset.homeViewportVersion==='12')","homeText(message,document.body.dataset.homeViewportVersion==='12',document.body.dataset.homeDisplayVersion==='16')");
const runtime=fs.readFileSync('script.js','utf8'),start=runtime.indexOf('    el.device.dataset.homeFixed ='),end=runtime.indexOf('    renderWorldScene(suppressFrontFx);',start),qs=qa.indexOf('    el.device.dataset.homeFixed ='),qe=qa.indexOf('    renderWorldScene(suppressFrontFx);',qs);
qa=qa.slice(0,qs)+runtime.slice(start,end)+qa.slice(qe);
qa=qa.replace('window.HomeReleaseQA={',`window.HomeReleaseQA={
 countNotice(){this.resetDisplay();setMessage('おかえり。変化：おなか−30／うんち+1');render();},
 uiEvidence(){const r=s=>document.querySelector(s)?.getBoundingClientRect().toJSON();return {title:r('.header-title'),info:r('#homeInformation'),actions:r('.header-actions'),notice:r('#homeEventSlot'),dock:r('#homeCommentDock'),speech:r('#speechBubble'),meters:r('.home-meters'),frame:r('.screen-frame'),titleCount:document.querySelectorAll('.name-plate').length,infoCount:document.querySelectorAll('#homeInformation').length,message:el.message.textContent,rawMessage:message};},
`);
// Keep pointer measurements free of scheduled invitations/conversations; production timers are untouched.
for(const name of ['scheduleIdleGreeting','scheduleCompanionEncounter','scheduleEnvironmentMoment'])qa=qa.replace('function '+name+'() {','function '+name+'() { return; // isolated QA fixture\n');
write('v16-qa-script.js',qa);
for(const entry of ['v15.html','v15-qa.html']){
 let html=read(entry).replace('data-home-display-version="15"','data-home-display-version="16"').replaceAll('v15-','v16-');
 html=html.replace(/((?:src|href)=")(v16-[^"?]+)(?:\?[^" ]*)?(")/g,(_,a,f,z)=>a+f+'?v='+crypto.createHash('sha256').update(read(f)).digest('hex').slice(0,12)+z);
 write(entry.replace('v15','v16'),html);
}
fs.copyFileSync(path.join(out,'v16.html'),path.join(out,'index.html'));
