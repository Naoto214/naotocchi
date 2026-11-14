import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';
const root=path.dirname(fileURLToPath(import.meta.url)),read=p=>JSON.parse(fs.readFileSync(path.join(root,p)));
const audit=read('evidence/audit.json'),repro=read('evidence/repro-source.json');
const rows=Object.fromEntries(['A','B','C','B-once'].map(m=>[m,read(`evidence/shortened-${m}.json`)]));
const data={repro:{before:repro.before,action:repro.action},stages:rows.A.map(a=>({number:a.number,...Object.fromEntries(Object.entries(rows).map(([m,r])=>[m,r.find(v=>v.number===a.number)?.depth??'未確認'])),oldB:audit.modes.B.stages.find(v=>v.number===a.number).complete,oldC:audit.modes.C.stages.find(v=>v.number===a.number).complete})),attempts:['A','B','C'].reduce((n,m)=>n+audit.modes[m].attempted,0),previews:['A','B','C'].reduce((n,m)=>n+audit.modes[m].previewMatches,0),cyclesB:audit.modes.B.cycles};
fs.writeFileSync(path.join(root,'report-data.json'),JSON.stringify(data,null,2)+'\n');
if(process.argv[2]){
 const dest=path.resolve(process.argv[2]);fs.mkdirSync(dest,{recursive:true});
 for(const p of ['index.html','style.css','app.mjs','fixtures.mjs','report-data.json','figures','generated','baseline'])fs.cpSync(path.join(root,p),path.join(dest,p),{recursive:true});
 // Solver and witnesses are research evidence, not a hint feed to the page.
 fs.rmSync(path.join(dest,'baseline/docs'),{recursive:true,force:true});
 for(const m of ['A','B','C','B-once'])fs.rmSync(path.join(dest,'generated',m,'search.mjs'));
 fs.rmSync(path.join(dest,'baseline/prototypes/naopoyo-chapter2/search.mjs'));
 console.log('Static comparison packaged at',dest);
}
