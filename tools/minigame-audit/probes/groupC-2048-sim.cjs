// replicates 2048 slide/spawn/score (games.js 6019-6093)
function run(moves, strat){
 const N=4; let grid=[...Array(N)].map(()=>Array(N).fill(0)), best=0, score=0;
 const spawn=()=>{const e=[];for(let r=0;r<N;r++)for(let c=0;c<N;c++)if(!grid[r][c])e.push([r,c]);if(!e.length)return;const[r,c]=e[Math.floor(Math.random()*e.length)];grid[r][c]=Math.random()<0.9?2:4;};
 spawn();spawn();
 function slide(dr,dc){const merged=[...Array(N)].map(()=>Array(N).fill(false));let any=false;const order=[];for(let r=0;r<N;r++)for(let c=0;c<N;c++)order.push([r,c]);if(dr===1)order.sort((a,b)=>b[0]-a[0]);if(dr===-1)order.sort((a,b)=>a[0]-b[0]);if(dc===1)order.sort((a,b)=>b[1]-a[1]);if(dc===-1)order.sort((a,b)=>a[1]-b[1]);
  for(const[r,c]of order){const v=grid[r][c];if(!v)continue;let nr=r,nc=c;while(true){const tr=nr+dr,tc=nc+dc;if(tr<0||tr>=N||tc<0||tc>=N)break;if(grid[tr][tc]===0){nr=tr;nc=tc;continue;}if(grid[tr][tc]===v&&!merged[tr][tc]){nr=tr;nc=tc;}break;}
   if(nr===r&&nc===c)continue;any=true;if(grid[nr][nc]===v){grid[nr][nc]=v*2;merged[nr][nc]=true;score+=v*2;best=Math.max(best,v*2);}else grid[nr][nc]=v;grid[r][c]=0;}
  if(any)spawn();return any;}
 const dirs={u:[-1,0],d:[1,0],l:[0,-1],r:[0,1]};
 let i=0, made=0;
 while(made<moves && i<moves*20){i++;let k;
  if(strat==='random')k='udlr'[Math.floor(Math.random()*4)];
  else if(strat==='cycle')k='dldr'[i%4];
  else { // corner greedy: prefer d,l, then r, then u
   for(const kk of ['d','l','r','u']){const save=JSON.stringify(grid),sb=best,ss=score; if(slide(...dirs[kk])){made++;k=null;break;} } if(k===undefined) continue; else continue; }
  if(slide(...dirs[k]))made++;
  // game over check
  let can=false;for(let r=0;r<N;r++)for(let c=0;c<N;c++){if(!grid[r][c])can=true;if(c+1<N&&grid[r][c]===grid[r][c+1])can=true;if(r+1<N&&grid[r][c]===grid[r+1][c])can=true;} if(!can)break;
 }
 const tier=best>=1024?100:best>=512?86:best>=256?70:best>=128?54:best>=64?40:best>=32?28:16;
 return Math.max(10,Math.min(100,Math.round(tier+Math.min(10,score/300))));
}
for(const strat of ['random','cycle','corner'])for(const m of [30,60,100,150,200]){const a=[];for(let i=0;i<3000;i++)a.push(run(m,strat));a.sort((x,y)=>x-y);const mean=a.reduce((s,v)=>s+v,0)/a.length;console.log(strat,m,'moves: mean',mean.toFixed(1),'p10',a[300],'p90',a[2700],'P>=70',(a.filter(v=>v>=70).length/a.length*100).toFixed(1)+'%');}
