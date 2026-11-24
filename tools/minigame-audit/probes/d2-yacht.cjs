const counts=d=>{const c=[0,0,0,0,0,0,0];for(const v of d)c[v]++;return c.slice(1)};const sum=d=>d.reduce((a,b)=>a+b,0);
const CATS=[d=>d.filter(v=>v===1).length,d=>d.filter(v=>v===2).length*2,d=>d.filter(v=>v===3).length*3,d=>d.filter(v=>v===4).length*4,d=>d.filter(v=>v===5).length*5,d=>d.filter(v=>v===6).length*6,
d=>Math.max(...counts(d))>=3?sum(d):0,d=>Math.max(...counts(d))>=4?sum(d):0,d=>{const c=counts(d).filter(x=>x).sort();return c.length===2&&c[0]===2?25:0},
d=>{const s=[...new Set(d)].sort().join('');return /1234|2345|3456/.test(s)?30:0},d=>{const s=[...new Set(d)].sort().join('');return s==='12345'||s==='23456'?40:0},d=>Math.max(...counts(d))===5?50:0,d=>sum(d)];
const roll=()=>1+Math.floor(Math.random()*6);
function game(strat){const used=new Set();let total=0;for(let t=0;t<5;t++){let d=[roll(),roll(),roll(),roll(),roll()];
 if(strat!=='random1'&&strat!=='best1'){for(let r=1;r<3;r++){// keep most common value
  const c=counts(d);let best=0;for(let v=0;v<6;v++)if(c[v]>c[best]||(c[v]===c[best]&&v>best))best=v;d=d.map(x=>x===best+1?x:roll());}}
 const avail=CATS.map((f,i)=>i).filter(i=>!used.has(i));let pick;
 if(strat==='random1')pick=avail[Math.floor(Math.random()*avail.length)];else{pick=avail.reduce((a,i)=>CATS[i](d)>CATS[a](d)?i:a,avail[0]);}
 used.add(pick);total+=CATS[pick](d);}
 return Math.max(10,Math.min(100,Math.round(10+total*0.66)));}
for(const s of ['random1','best1','keepcommon']){const a=[];for(let i=0;i<20000;i++)a.push(game(s));a.sort((x,y)=>x-y);const m=a.reduce((x,y)=>x+y,0)/a.length;
console.log(s,'mean',m.toFixed(1),'p10',a[2000],'p50',a[10000],'p90',a[18000],'>=30',(a.filter(x=>x>=30).length/a.length).toFixed(3),'>=70',(a.filter(x=>x>=70).length/a.length).toFixed(3),'100',(a.filter(x=>x>=100).length/a.length).toFixed(3));}
