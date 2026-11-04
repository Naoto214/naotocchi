// Extend retained V16 only; no regenerated historical sources or assets.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const out=path.resolve(process.argv[2]),read=f=>fs.readFileSync(path.join(out,f),'utf8'),write=(f,s)=>fs.writeFileSync(path.join(out,f),s);
for(const f of ['script.js','home-production-touch.js','home-production-world.mjs','home-production-layout.css','home-production-model.js'])write('v17-'+f,fs.readFileSync(f,'utf8'));
const diorama=fs.readFileSync('home-production-diorama.js','utf8').replace("import('./home-production-world.mjs')","import('./v17-home-production-world.mjs')");
write('v17-home-production-diorama.js',diorama);
write('v17-qa-diorama.js',diorama.replace('return {model,update,sync,interrupt,','return {inspectPaint:()=>[...rows.values()].map(r=>({key:r.key,ink:r.paintExtent})),inspectScene:()=>scene,inspectWorld:()=>world?.stats(),model,update,sync,interrupt,'));
let qa=read('v16-qa-script.js').replaceAll("document.body.dataset.homeDisplayVersion==='16'","['16','17'].includes(document.body.dataset.homeDisplayVersion)").replaceAll("['15','16']","['15','16','17']");
qa=qa.replace('window.HomeReleaseQA={',`window.HomeReleaseQA={
 human40(){this.human();Object.assign(state,{stageIndex:3,ageTicks:40*AGE_TICKS_PER_YEAR});render();},
 v17Evidence(){const sc=homeDiorama.inspectScene(),vp=window.NaotocchiHomeViewport,p=vp.residentPresentation(),r=vp.presentationRect(el.castStage),inks=homeDiorama.inspectPaint();return {presentation:p,stage:r,paint:homeDiorama.model.snapshot().map(a=>{const ink=inks.find(i=>i.key===a.key)?.ink,d=sc.navigation.depthScale(a),foot=p.y+(r.top+a.y-p.y)*p.scaleY;return {key:a.key,world:sc.navigation.unproject(a),valid:sc.navigation.valid(a),bounds:homeDiorama.model.bounds(a),position:{x:a.x,y:a.y},ink,depth:d,foot,top:foot-(ink.up*d+5)*p.bodyScale,bottom:foot+(ink.down*d+3)*p.bodyScale};})};},
`);
write('v17-qa-script.js',qa);
for(const entry of ['v16.html','v16-qa.html']){
 let html=read(entry).replace('data-home-display-version="16"','data-home-display-version="17"').replaceAll('v16-','v17-').replace('src="home-production-model.js','src="v17-home-production-model.js');
 html=html.replace(/((?:src|href)=")(v17-[^"?]+)(?:\?[^" ]*)?(" )/g,(_,a,f,z)=>a+f+'?v='+crypto.createHash('sha256').update(read(f)).digest('hex').slice(0,12)+z);
 // Cache keys match the exact bytes, including scripts without a trailing space.
 html=html.replace(/((?:src|href)=")(v17-[^"?]+)(?:\?[^" ]*)?(")/g,(_,a,f,z)=>a+f+'?v='+crypto.createHash('sha256').update(read(f)).digest('hex').slice(0,12)+z);
 write(entry.replace('v16','v17'),html);
}
fs.copyFileSync(path.join(out,'v17.html'),path.join(out,'index.html'));
