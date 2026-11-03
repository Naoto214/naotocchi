// Extend the retained V14 private artifact; keep previous entries and assets intact.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const out=path.resolve(process.argv[2]),read=f=>fs.readFileSync(path.join(out,f),'utf8'),write=(f,s)=>fs.writeFileSync(path.join(out,f),s);
for(const file of ['script.js','home-production-touch.js','home-production-world.mjs','home-production-layout.css'])write('v15-'+file,fs.readFileSync(file,'utf8'));
const diorama=fs.readFileSync('home-production-diorama.js','utf8').replace("import('./home-production-world.mjs')","import('./v15-home-production-world.mjs')");
write('v15-home-production-diorama.js',diorama);
write('v15-qa-diorama.js',diorama.replace('return {model,update,sync,interrupt,','return {inspectScene:()=>scene,inspectWorld:()=>world?.stats(),model,update,sync,interrupt,'));
let qa=read('v14-qa-script.js');
const runtime=fs.readFileSync('script.js','utf8'),start=runtime.indexOf('    el.device.dataset.homeFixed ='),end=runtime.indexOf('    renderWorldScene(suppressFrontFx);',start),qs=qa.indexOf('    el.device.dataset.homeFixed ='),qe=qa.indexOf('    renderWorldScene(suppressFrontFx);',qs);
qa=qa.slice(0,qs)+runtime.slice(start,end)+qa.slice(qe);
qa=qa.replace('window.HomeReleaseQA={',`window.HomeReleaseQA={
 human(){this.resetDisplay();Object.assign(state,{speciesLine:'woman',stageIndex:2,ageTicks:32*AGE_TICKS_PER_YEAR,hunger:95,happiness:95,poopCount:0});render();},
 dragEvidence(){const m=homeDiorama.model,s=homeDiorama.inspectScene(),a=m.snapshot()[0],b=m.bounds(a),e=el.castStage.__homeResidentEnvelope,v=window.NaotocchiHomeViewport,p=v.residentPresentation(),r=v.presentationRect(el.castStage),d=s.navigation.depthScale(a);const foot=p.y+(r.top+a.y-p.y)*p.scaleY;return {actor:a,bounds:b,ground:s.navigation.unproject(a),valid:s.navigation.valid(a),visible:s.visible(a,a),blocked:homeDioramaBlocked(),foot,scroll:document.querySelector('.screen-frame').scrollTop,cameraScroll:p.scrollTop,frame:document.querySelector('.screen-frame').getBoundingClientRect().toJSON(),comment:el.speechBubble.getBoundingClientRect().toJSON(),envelope:e,body:p.bodyScale,trace:HomeReleaseInputTrace.filter(x=>x.type==='move').slice(-2)};},
`);
write('v15-qa-script.js',qa);
for(const entry of ['v14.html','v14-qa.html']){
 let html=read(entry).replace('data-home-display-version="14"','data-home-display-version="15"').replaceAll('v14-','v15-');
 html=html.replace(/((?:src|href)=")(v15-[^"?]+)(?:\?[^" ]*)?(")/g,(_,a,f,z)=>a+f+'?v='+crypto.createHash('sha256').update(read(f)).digest('hex').slice(0,12)+z);
 write(entry.replace('v14','v15'),html);
}
fs.copyFileSync(path.join(out,'v15.html'),path.join(out,'index.html'));
