// minesweeper sim replicating games.js place/reveal logic
function sim(MINES, strategy){
 const N=8; const mine=[...Array(N)].map(()=>Array(N).fill(false)), open=[...Array(N)].map(()=>Array(N).fill(false)), num=[...Array(N)].map(()=>Array(N).fill(0));
 let placed=false, revealed=0;
 const nb=(x,y,f)=>{for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){if(!dx&&!dy)continue;const nx=x+dx,ny=y+dy;if(nx>=0&&ny>=0&&nx<N&&ny<N)f(nx,ny);}};
 function place(sx,sy){let n=0;while(n<MINES){const x=Math.floor(Math.random()*N),y=Math.floor(Math.random()*N);if(mine[y][x]||(Math.abs(x-sx)<=1&&Math.abs(y-sy)<=1))continue;mine[y][x]=true;n++;}for(let y=0;y<N;y++)for(let x=0;x<N;x++){let c=0;nb(x,y,(nx,ny)=>{if(mine[ny][nx])c++;});num[y][x]=c;}placed=true;}
 function reveal(x,y){if(open[y][x])return 'ok';if(!placed)place(x,y);if(mine[y][x])return 'boom';const st=[[x,y]];while(st.length){const[cx,cy]=st.pop();if(open[cy][cx])continue;open[cy][cx]=true;revealed++;if(num[cy][cx]===0)nb(cx,cy,(nx,ny)=>{if(!open[ny][nx])st.push([nx,ny]);});}return revealed>=N*N-MINES?'win':'ok';}
 const total=N*N-MINES;
 const first=[Math.floor(Math.random()*N),Math.floor(Math.random()*N)];
 reveal(first[0],first[1]);
 const afterFirst=revealed;
 if(strategy==='first'){ return {score:Math.round(10+revealed/total*45), afterFirst}; }
 // random taps until boom/win
 for(let k=0;k<64;k++){const cells=[];for(let y=0;y<N;y++)for(let x=0;x<N;x++)if(!open[y][x])cells.push([x,y]);const [x,y]=cells[Math.floor(Math.random()*cells.length)];const r=reveal(x,y);if(r==='boom')return {score:Math.round(10+revealed/total*45),afterFirst,taps:k+2};if(r==='win')return {score:'win',afterFirst};}
}
for(const M of [8,10,12]){
 for(const s of ['first','random']){
  const R=[];for(let i=0;i<20000;i++)R.push(sim(M,s));
  const sc=R.filter(r=>r.score!=='win').map(r=>r.score);
  const ge30=sc.filter(v=>v>=30).length/R.length;
  const wins=R.filter(r=>r.score==='win').length/R.length;
  const mean=sc.reduce((a,b)=>a+b,0)/sc.length;
  const af=R.reduce((a,r)=>a+r.afterFirst,0)/R.length;
  console.log(`mines=${M} strat=${s} mean=${mean.toFixed(1)} P(>=30)=${(ge30*100).toFixed(1)}% win=${(wins*100).toFixed(2)}% avgFirstReveal=${af.toFixed(1)}/${64-M}`);
 }
}
