// best-of-K randomized nearest-neighbor covering walk per maze (upper bound on optimal)
const src=require('fs').readFileSync(__dirname+'/fg-doteater.js','utf8'); eval(src.split('const N=15')[0]);
const N=15, K=300, reach=28*4.6, reachEasy=reach*1.2; let ok=0, okE=0, best=[];
for(let t=0;t<200;t++){
 const map=generateMaze(N,N,16).map(r=>r.split('')); for(let y=6;y<=8;y++)for(let x=6;x<=8;x++)map[y][x]='.'; for(let x=5;x<=9;x++){map[5][x]='.';map[9][x]='.';} map[5][7]='.'; map[4][7]='.';
 const open=(x,y)=>x>=0&&y>=0&&x<N&&y<N&&map[y][x]==='.';
 const all=[]; for(let y=0;y<N;y++)for(let x=0;x<N;x++) if(open(x,y)&&!(x>=6&&x<=8&&y>=6&&y<=8)) all.push(x+','+y);
 let b=1e9;
 for(let k=0;k<K;k++){ const dot=new Set(all); let cur=[1,1]; dot.delete('1,1'); let len=0;
  while(dot.size){ const dist=new Map([[cur.join(','),0]]); const q=[cur]; const cands=[]; let fd=1e9; for(let i=0;i<q.length;i++){ const [x,y]=q[i]; const d0=dist.get(x+','+y); if(d0>=fd) break; const dirs=[[1,0],[-1,0],[0,1],[0,-1]].sort(()=>Math.random()-0.5); for(const [dx,dy] of dirs){const nx=x+dx,ny=y+dy,kk=nx+','+ny; if(!open(nx,ny)||dist.has(kk)) continue; dist.set(kk,d0+1); if(dot.has(kk)){cands.push([nx,ny]); fd=d0+1;} q.push([nx,ny]);} }
   const f=cands[Math.floor(Math.random()*cands.length)]; len+=dist.get(f.join(',')); dot.delete(f.join(',')); cur=f; }
  b=Math.min(b,len); }
 best.push(b); if(b<=reach) ok++; if(b<=reachEasy) okE++;
}
console.log('best-of-300 NN walk avg',(best.reduce((a,b)=>a+b,0)/best.length).toFixed(1),'min',Math.min(...best),'max',Math.max(...best),'; <=128.8:',ok,'/200; <=154.6(easy):',okE,'/200');
