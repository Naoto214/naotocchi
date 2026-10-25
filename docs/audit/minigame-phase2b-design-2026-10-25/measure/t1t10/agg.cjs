const fs=require('fs');const d=__dirname;const R={};
for(const m of ['normal','short'])for(const s of [1,2,3])for(const p of [0,50]){for(const r of JSON.parse(fs.readFileSync(`${d}/ni-${m}-${s}-${p}.json`))){const o=R[r.id]||(R[r.id]={id:r.id,timer:r.timerShown,normal:[],short:[],nEnd:[],sEnd:[],err:r.err});o[m].push(r.score);(m==='normal'?o.nEnd:o.sEnd).push(r.endMs);}}
const rows=Object.values(R);
const avg=a=>a.every(x=>x===null)?null:Math.round(a.filter(x=>x!==null).reduce((x,y)=>x+y,0)/a.filter(x=>x!==null).length);
console.log('id\tnoInputNormal(avg,max)\tnoInputShort\tendNormal_s\tendShort_s\ttimerShown\terr');
for(const r of rows){console.log([r.id,`${avg(r.normal)}/${Math.max(...r.normal.map(x=>x??-1))}`,`${avg(r.short)}/${Math.max(...r.short.map(x=>x??-1))}`,(avg(r.nEnd)??'∞')/1000,(avg(r.sEnd)??'∞')/1000,r.timer,r.err||''].join('\t'));}
