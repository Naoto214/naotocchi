// summary.json から 分類と 表(markdown)を つくる
const fs=require('fs');const P=__dirname;const rows=JSON.parse(fs.readFileSync(P+'/summary.json','utf8'));
const frac=(a,th)=>a.scores.length?a.scores.filter(x=>x>=th).length/a.n:0;
const out=[];const G=['action','drive3d','sports','puzzle','board','strategy'];
for(const r of rows){
  const i=r.idle,R=r.random,M=r.mash;
  r.f={
    idleNoEnd:i.ended<i.n,
    idleC:frac(i,35)>=0.6, idleCsome:frac(i,35)>0, idleB:frac(i,55)>=0.6, idleBsome:frac(i,55)>0,
    randC:Math.max(frac(R,35),frac(M,35))>=0.5, randB:Math.max(frac(R,55),frac(M,55))>=0.5, randBsome:Math.max(frac(R,55),frac(M,55))>0,
    auto100:i.scores.some(x=>x>=100)||frac(R,100)>=0.5, nearS:i.scores.some(x=>x>=90),
  };
}
const fmt=a=>a.scores.length?`${a.avg} / ${a.max}`:'—';
const idleS=i=>i.ended<i.n?(i.scores.length?i.scores.join('·')+` (${i.n-i.ended}本打切)`:`終わらない(240秒打切)`):i.scores.join('·');
const pct=(a,th)=>a.n?Math.round(frac(a,th)*100)+'%':'—';
const tags=r=>[r.f.idleB?'ii':r.f.idleC?'i':r.f.idleCsome?'(i)':'',r.f.randB?'iii':r.f.randC?'iii-C':r.f.randBsome?'(iii)':'',r.f.nearS?'iv-近':''].filter(Boolean).join(' ');
out.push('| # | ゲームID | ジャンル | 無操作の点(種1〜5) | ランダム 平均/最大 | ランダム C率/B率 | 連打 平均/最大 | 連打 B率 | 分類 |');
out.push('|---|---|---|---|---|---|---|---|---|');
rows.forEach((r,k)=>out.push(`| ${k+1} | ${r.id} | ${r.genre} | ${idleS(r.idle)} | ${fmt(r.random)} | ${pct(r.random,35)} / ${pct(r.random,55)} | ${fmt(r.mash)} | ${pct(r.mash,55)} | ${tags(r)} |`));
fs.writeFileSync(P+'/table.md',out.join('\n'));
// ジャンル集計
const g=[];g.push('| ジャンル | 本数 | 無操作で C 以上(6割以上の種) | うち無操作で B 以上 | 無操作でときどき C | ランダム/連打で半分以上 C | ランダム/連打で半分以上 B | 無操作が終わらない |');g.push('|---|---|---|---|---|---|---|---|');
for(const ge of G){const rs=rows.filter(r=>r.genre===ge);const L=f=>rs.filter(f).map(r=>r.id);const c=(f)=>{const l=L(f);return `${l.length}${l.length?'（'+l.join(', ')+'）':''}`;};
 g.push(`| ${ge} | ${rs.length} | ${c(r=>r.f.idleC)} | ${c(r=>r.f.idleB)} | ${c(r=>!r.f.idleC&&r.f.idleCsome)} | ${c(r=>r.f.randC)} | ${c(r=>r.f.randB)} | ${c(r=>r.f.idleNoEnd)} |`);}
fs.writeFileSync(P+'/genre.md',g.join('\n'));
const lists={idleC:rows.filter(r=>r.f.idleC).map(r=>r.id),idleB:rows.filter(r=>r.f.idleB).map(r=>r.id),idleCsome:rows.filter(r=>!r.f.idleC&&r.f.idleCsome).map(r=>r.id),idleBsome:rows.filter(r=>!r.f.idleB&&r.f.idleBsome).map(r=>r.id),randC:rows.filter(r=>r.f.randC).map(r=>r.id),randB:rows.filter(r=>r.f.randB).map(r=>r.id),randBsome:rows.filter(r=>r.f.randBsome).map(r=>r.id),idleNoEnd:rows.filter(r=>r.f.idleNoEnd).map(r=>r.id),nearS:rows.filter(r=>r.f.nearS).map(r=>r.id),
 randNeverC:rows.filter(r=>Math.max(r.random.max??0,r.mash.max??0)<35).map(r=>r.id)};
fs.writeFileSync(P+'/classes.json',JSON.stringify(lists,null,1));
for(const[k,v]of Object.entries(lists))console.log(k,v.length,v.join(' '));
console.log(fs.readFileSync(P+'/genre.md','utf8'));
