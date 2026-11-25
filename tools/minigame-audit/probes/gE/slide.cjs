for (const N of [3,4]) { const SHUF=N===3?60:140; let solved=0, T=N===3?3e6:1e6; const corr=[];
for (let t=0;t<T;t++){ const board=Array.from({length:N*N},(_,i)=>i); let blank=N*N-1, prev=-1;
 for (let k=0;k<SHUF;k++){ const bx=blank%N, by=Math.floor(blank/N); const opts=[[1,0],[-1,0],[0,1],[0,-1]].map(([dx,dy])=>[bx+dx,by+dy]).filter(([x,y])=>x>=0&&y>=0&&x<N&&y<N).map(([x,y])=>y*N+x).filter(i=>i!==prev); const pick=opts[Math.floor(Math.random()*opts.length)]; board[blank]=board[pick]; board[pick]=N*N-1; prev=blank; blank=pick; }
 if (board.every((v,i)=>v===i)) solved++; if(t<20000){corr.push(board.filter((v,i)=>v===i&&v!==N*N-1).length);} }
 const avg=corr.reduce((a,b)=>a+b,0)/corr.length; const hist={}; corr.forEach(c=>hist[c]=(hist[c]||0)+1);
 console.log(N, 'solved-after-shuffle', solved, '/', T, 'avg correct', avg.toFixed(2), JSON.stringify(hist)); }
