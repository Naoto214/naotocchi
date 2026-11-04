// Extend the retained V13 private artifact without regenerating earlier versions.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const out=path.resolve(process.argv[2]);
const read=f=>fs.readFileSync(path.join(out,f),'utf8'),write=(f,s)=>fs.writeFileSync(path.join(out,f),s);
for(const file of ['script.js','home-production-touch.js','home-production-world.mjs','home-production-layout.css'])write('v14-'+file,fs.readFileSync(file,'utf8'));
const diorama=fs.readFileSync('home-production-diorama.js','utf8').replace("import('./home-production-world.mjs')","import('./v14-home-production-world.mjs')");
write('v14-home-production-diorama.js',diorama);
write('v14-qa-diorama.js',diorama.replace('return {model,update,sync,interrupt,','return {inspectScene:()=>scene,inspectWorld:()=>world?.stats(),model,update,sync,interrupt,'));
let qa=read('v13-qa-script.js').replace("el.companionInviteOverlay.classList.toggle('rare', !!isRare);", "el.companionInviteOverlay.dataset.companionId = companion.id;\n    el.companionInviteOverlay.classList.toggle('rare', !!isRare);");
// Carry the narrow production render-layout change into the retained QA fixture.
const runtime=fs.readFileSync('script.js','utf8'),fixedStart=runtime.indexOf('    el.device.dataset.homeFixed ='),fixedEnd=runtime.indexOf('    renderWorldScene(suppressFrontFx);',fixedStart);
const qaStart=qa.indexOf('    el.device.dataset.homeFixed ='),qaEnd=qa.indexOf('    renderWorldScene(suppressFrontFx);',qaStart);
qa=qa.slice(0,qaStart)+runtime.slice(fixedStart,fixedEnd)+qa.slice(qaEnd);
qa=qa.replace('window.HomeReleaseQA={',`window.HomeReleaseQA={
 invite(id='snail'){this.resetDisplay();openCompanionInvite(allCompanionsById(id),false);},
 v14Bounds(){const e=el.castStage.__homeResidentEnvelope,v=window.NaotocchiHomeViewport,p=v.residentPresentation(),frame=document.querySelector('.screen-frame').getBoundingClientRect(),r=v.presentationRect(el.castStage),args={paneWidth:frame.width,paneHeight:frame.height,nativeWidth:e.width,stageTop:0,count:e.count,envelope:e},old=v.portraitPresentation({...args,envelope:{...e,vertical:undefined}}),current=v.portraitPresentation(args);return {count:e.count,body:[old.bodyScale,current.bodyScale],footScaleY:[old.scaleY,current.scaleY],oldInk:e.vertical.map(([y,u,d])=>[(old.pad+y-old.scrollTop)*old.scaleY-u*old.bodyScale,(old.pad+y-old.scrollTop)*old.scaleY+d*old.bodyScale]).reduce((b,a)=>[Math.min(b[0],a[0]),Math.max(b[1],a[1])],[Infinity,-Infinity]),newInk:e.vertical.map(([y,u,d])=>[(current.pad+y-current.scrollTop)*current.scaleY-u*current.bodyScale,(current.pad+y-current.scrollTop)*current.scaleY+d*current.bodyScale]).reduce((b,a)=>[Math.min(b[0],a[0]),Math.max(b[1],a[1])],[Infinity,-Infinity]),paneHeight:frame.height};},
 reach(edge){this.resetDisplay();const m=homeDiorama.model,scene=homeDiorama.inspectScene(),a=m.snapshot().find(a=>a.kind==='pet'),b=m.bounds(a),direct={x:a.x,y:edge==='top'?b.top:b.bottom};m.select(a.key);const directAccepted=m.move(a.key,direct,'drag'),points=[];let accepted=directAccepted?direct:null;for(let y=b.top;y<=b.bottom;y+=4)for(let x=b.left;x<=b.right;x+=4)if(scene.navigation.valid({x,y}))points.push({x,y});points.sort((p,q)=>(edge==='top'?p.y-q.y:q.y-p.y)||Math.abs(p.x-a.x)-Math.abs(q.x-a.x));if(!accepted)for(const p of points)if(m.move(a.key,p,'drag')){accepted=p;break;}for(let i=0;i<240;i++)m.step(.1,{autonomy:false});return {edge,directAccepted,direct,accepted,actor:m.snapshot().find(row=>row.key===a.key)};},
`);
write('v14-qa-script.js',qa);
for(const entry of ['v13.html','v13-qa.html']){
 let html=read(entry).replace('data-home-display-version="13"','data-home-display-version="14"');
 for(const file of ['home-production-touch.js','home-production-diorama.js','qa-script.js','qa-diorama.js'])html=html.replaceAll('v13-'+file,'v14-'+file);
 for(const file of ['script.js','home-production-layout.css'])html=html.replaceAll('v12-'+file,'v14-'+file);
 html=html.replace(/((?:src|href)=")(v14-[^"?]+)(?:\?[^" ]*)?(")/g,(_,a,f,z)=>a+f+'?v='+crypto.createHash('sha256').update(read(f)).digest('hex').slice(0,12)+z);
 write(entry.replace('v13','v14'),html);
}
fs.copyFileSync(path.join(out,'v14.html'),path.join(out,'index.html'));
