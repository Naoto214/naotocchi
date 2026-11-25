// 使いかた: node lifesim.cjs を PLAN=A|B|C で 3回 うごかし(stderr に 1生=1行の JSON)、prog-{A,B,C}.log に ためてから node agg.cjs
const fs=require('fs');const rows=[];for(const p of ['A','B','C'])for(const l of fs.readFileSync('prog-'+p+'.log','utf8').trim().split('\n'))if(l.startsWith('{'))rows.push(JSON.parse(l));
const g={};for(const r of rows)(g[r.persona+'|'+r.plan]=g[r.persona+'|'+r.plan]||[]).push(r);
const avg=(L,k)=>L.reduce((a,r)=>a+r[k],0)/L.length;
const pers=[...new Set(rows.map(r=>r.persona))];
console.log('persona plan n | reach100 | 寿命avg | maxSodachi | 進化(evo) | へんしん | games fails | coins | きげんavg | declineAvg | いのちavg | いのち最大 | 80超tick | 病気');
for(const p of pers)for(const pl of ['A','B','C']){const L=g[p+'|'+pl];if(!L)continue;
console.log([p,pl,L.length,'|',L.filter(r=>r.reached100).length+'/'+L.length,avg(L,'age').toFixed(1),avg(L,'maxSodachi').toFixed(1),avg(L,'evolutions').toFixed(1),avg(L,'transforms').toFixed(1),avg(L,'games').toFixed(0)+' '+avg(L,'fails').toFixed(0),avg(L,'coins').toFixed(0),avg(L,'happyAvg').toFixed(1),avg(L,'declineAvg').toFixed(1),avg(L,'deathAvg').toFixed(1),avg(L,'deathMax').toFixed(1)+' (max '+Math.max(...L.map(r=>r.deathMax)).toFixed(0)+')',avg(L,'warnTicks').toFixed(1),avg(L,'sick').toFixed(1)].join(' '));}
