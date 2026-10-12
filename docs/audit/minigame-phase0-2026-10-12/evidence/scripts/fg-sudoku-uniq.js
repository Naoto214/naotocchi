// replicate games.js 8159-8164 generator; count solutions of generated puzzle
function gen(N, blanks){ const BR=2, BC=N===6?3:2; const base=(r,c)=>((r%BR)*BC+Math.floor(r/BR)+c)%N;
 const perm=[...Array(N).keys()].sort(()=>Math.random()-0.5).map(v=>v+1); const rows=[]; for(let b=0;b<N/BR;b++){const rs=[...Array(BR).keys()].sort(()=>Math.random()-0.5); for(const r of rs) rows.push(b*BR+r);} const cols=[]; for(let b=0;b<N/BC;b++){const cs=[...Array(BC).keys()].sort(()=>Math.random()-0.5); for(const c of cs) cols.push(b*BC+c);}
 const sol=Array.from({length:N},(_,r)=>Array.from({length:N},(_,c)=>perm[base(rows[r],cols[c])]));
 const grid=sol.map(r=>r.slice()); const cells=[]; for(let r=0;r<N;r++)for(let c=0;c<N;c++)cells.push([r,c]); cells.sort(()=>Math.random()-0.5); for(let i=0;i<blanks;i++){const[r,c]=cells[i];grid[r][c]=0;}
 return {sol,grid,BR,BC}; }
function valid(sol,N,BR,BC){ for(let r=0;r<N;r++){const s=new Set(sol[r]); if(s.size!==N) return false;} for(let c=0;c<N;c++){const s=new Set(sol.map(r=>r[c])); if(s.size!==N) return false;} for(let br=0;br<N;br+=BR)for(let bc=0;bc<N;bc+=BC){const s=new Set(); for(let r=br;r<br+BR;r++)for(let c=bc;c<bc+BC;c++)s.add(sol[r][c]); if(s.size!==N) return false;} return true; }
function count(g,N,BR,BC,lim=2){ let n=0; const ok=(r,c,v)=>{for(let i=0;i<N;i++){if(g[r][i]===v||g[i][c]===v)return false;} const br=Math.floor(r/BR)*BR, bc=Math.floor(c/BC)*BC; for(let rr=br;rr<br+BR;rr++)for(let cc=bc;cc<bc+BC;cc++) if(g[rr][cc]===v) return false; return true;};
 (function rec(){ if(n>=lim) return; for(let r=0;r<N;r++)for(let c=0;c<N;c++) if(!g[r][c]){ for(let v=1;v<=N;v++) if(ok(r,c,v)){g[r][c]=v; rec(); g[r][c]=0;} return; } n++; })(); return n; }
const T=20000;
for (const [N,bl] of [[4,7],[4,8],[4,9],[4,10],[4,11],[6,18],[6,20],[6,22]]) { let multi=0, invalidSol=0; for(let t=0;t<T;t++){ const {sol,grid,BR,BC}=gen(N,bl); if(!valid(sol,N,BR,BC)) invalidSol++; if(count(grid.map(r=>r.slice()),N,BR,BC)>1) multi++; } console.log(`N=${N} blanks=${bl}: multi-solution ${(multi/T*100).toFixed(2)}%  invalid sol ${invalidSol}`); }
