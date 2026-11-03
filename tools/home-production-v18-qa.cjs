// Reuse V17 entries, fixtures and assets; only current runtime gets a new prefix.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const out=path.resolve(process.argv[2]),read=f=>fs.readFileSync(path.join(out,f),'utf8'),write=(f,s)=>fs.writeFileSync(path.join(out,f),s);
for(const f of ['script.js','home-production-touch.js','home-production-world.mjs','home-production-layout.css','home-production-model.js'])write('v18-'+f,fs.readFileSync(f,'utf8'));
const diorama=fs.readFileSync('home-production-diorama.js','utf8').replace("import('./home-production-world.mjs')","import('./v18-home-production-world.mjs')");
write('v18-home-production-diorama.js',diorama);
write('v18-qa-diorama.js',diorama.replace('return {model,update,sync,interrupt,','return {inspectPaint:()=>[...rows.values()].map(r=>({key:r.key,ink:r.paintExtent})),inspectScene:()=>scene,inspectWorld:()=>world?.stats(),model,update,sync,interrupt,'));
const old=read('v17-qa-script.js');
// Apply the adult and age in one render, avoiding a transient 32-year-old sprite.
const fixture=old.slice(old.indexOf('window.HomeReleaseQA={'),old.lastIndexOf('})();')).replace("human40(){this.human();Object.assign(state,{stageIndex:3,ageTicks:40*AGE_TICKS_PER_YEAR});render();}","human40(){this.resetDisplay();Object.assign(state,{speciesLine:'woman',stageIndex:3,ageTicks:40*AGE_TICKS_PER_YEAR,hunger:95,happiness:95,poopCount:0});render();}");
let qa=fs.readFileSync('script.js','utf8');qa=qa.slice(0,qa.lastIndexOf('})();'))+fixture+'})();';
for(const name of ['scheduleIdleGreeting','scheduleCompanionEncounter','scheduleEnvironmentMoment'])qa=qa.replace('function '+name+'() {','function '+name+'() { return; // isolated QA fixture\n');
qa=qa.replaceAll('naotocchi-save-v1','naotocchi-home-release-qa-v1').replace('setInterval(loop, TICK_MS);','/* deterministic QA clock */');
write('v18-qa-script.js',qa);
for(const entry of ['v17.html','v17-qa.html']){
 let html=read(entry).replace('data-home-display-version="17"','data-home-display-version="18"').replaceAll('v17-','v18-');
 html=html.replace(/((?:src|href)=")(v18-[^"?]+)(?:\?[^" ]*)?(")/g,(_,a,f,z)=>a+f+'?v='+crypto.createHash('sha256').update(read(f)).digest('hex').slice(0,12)+z);
 write(entry.replace('v17','v18'),html);
}
// Deliberately do not change the published index until every V18 condition passes.
