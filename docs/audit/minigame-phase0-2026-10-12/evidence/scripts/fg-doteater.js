// replicate script.js generateMaze + games.js 8471-8481 dot layout; estimate covering walk
function generateMaze(cols, rows, loops = 0) { const grid = Array.from({ length: rows }, () => Array(cols).fill('#'));
  const carve = (x, y) => { grid[y][x] = '.'; const dirs = [[2,0],[-2,0],[0,2],[0,-2]].sort(() => Math.random() - 0.5); for (const [dx, dy] of dirs) { const nx = x + dx, ny = y + dy; if (nx > 0 && ny > 0 && nx < cols - 1 && ny < rows - 1 && grid[ny][nx] === '#') { grid[y + dy / 2][x + dx / 2] = '.'; carve(nx, ny); } } };
  carve(1, 1); let opened = 0, guard = 0; while (opened < loops && guard++ < 500) { const x = 1 + Math.floor(Math.random() * (cols - 2)), y = 1 + Math.floor(Math.random() * (rows - 2)); if (grid[y][x] !== '#') continue; const h = grid[y][x-1]==='.'&&grid[y][x+1]==='.'; const v = grid[y-1][x]==='.'&&grid[y+1][x]==='.'; if (h !== v) { grid[y][x] = '.'; opened++; } } return grid.map(r => r.join('')); }
const N=15; const res=[];
for(let t=0;t<2000;t++){
 const map=generateMaze(N,N,16).map(r=>r.split('')); for(let y=6;y<=8;y++)for(let x=6;x<=8;x++)map[y][x]='.'; for(let x=5;x<=9;x++){map[5][x]='.';map[9][x]='.';} map[5][7]='.'; map[4][7]='.';
 const open=(x,y)=>x>=0&&y>=0&&x<N&&y<N&&map[y][x]==='.';
 const dot=new Set(); for(let y=0;y<N;y++)for(let x=0;x<N;x++) if(open(x,y)&&!(x>=6&&x<=8&&y>=6&&y<=8)) dot.add(x+','+y);
 const total=dot.size;
 // greedy nearest-unvisited (BFS) walk from (1,1)
 let cur=[1,1]; dot.delete('1,1'); let len=0;
 while(dot.size){ const dist=new Map([[cur.join(','),0]]); const q=[cur]; let found=null; for(let i=0;i<q.length&&!found;i++){ const [x,y]=q[i]; for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){const nx=x+dx,ny=y+dy,k=nx+','+ny; if(!open(nx,ny)||dist.has(k)) continue; dist.set(k,dist.get(x+','+y)+1); if(dot.has(k)){found=[nx,ny];break;} q.push([nx,ny]);} }
   if(!found) break; len+=dist.get(found.join(',')); dot.delete(found.join(',')); cur=found; }
 res.push({total,len});
}
const avg=a=>a.reduce((s,v)=>s+v,0)/a.length; const reach=28*4.6;
console.log('dots avg',avg(res.map(r=>r.total)).toFixed(1),'min',Math.min(...res.map(r=>r.total)),'max',Math.max(...res.map(r=>r.total)));
console.log('lower bound moves (dots-1) > 128.8 in',(res.filter(r=>r.total-1>reach).length/res.length*100).toFixed(1),'%');
console.log('greedy walk avg',avg(res.map(r=>r.len)).toFixed(1),'; greedy <=128.8 in',(res.filter(r=>r.len<=reach).length/res.length*100).toFixed(1),'%', '; greedy <= 1.2x? n/a');
// tighter lower bound: dead-end corridors must be walked twice except start-side and end-side ones
let lbs=[];
for(let t=0;t<2000;t++){
 const map=generateMaze(N,N,16).map(r=>r.split('')); for(let y=6;y<=8;y++)for(let x=6;x<=8;x++)map[y][x]='.'; for(let x=5;x<=9;x++){map[5][x]='.';map[9][x]='.';} map[5][7]='.'; map[4][7]='.';
 const open=(x,y)=>x>=0&&y>=0&&x<N&&y<N&&map[y][x]==='.';
 const nb=(x,y)=>[[1,0],[-1,0],[0,1],[0,-1]].map(([dx,dy])=>[x+dx,y+dy]).filter(([a,b])=>open(a,b));
 let dots=0; for(let y=0;y<N;y++)for(let x=0;x<N;x++) if(open(x,y)&&!(x>=6&&x<=8&&y>=6&&y<=8)) dots++;
 const Ls=[]; let startL=0;
 for(let y=0;y<N;y++)for(let x=0;x<N;x++){ if(!open(x,y)||nb(x,y).length!==1) continue; let px=-1,py=-1,cx=x,cy=y,L=0; while(true){ const ns=nb(cx,cy).filter(([a,b])=>!(a===px&&b===py)); if(nb(cx,cy).length>=3||ns.length!==1&&!(cx===x&&cy===y)) break; const [nx,ny]=ns[0]; px=cx;py=cy;cx=nx;cy=ny;L++; if(L>200)break;} if(x===1&&y===1) startL=L; else Ls.push(L); }
 Ls.sort((a,b)=>b-a); const lb=(dots-1)+Ls.slice(1).reduce((s,v)=>s+v,0); lbs.push(lb);
}
console.log('tight LB avg',avg(lbs).toFixed(1),'min',Math.min(...lbs),'; LB>128.8 in',(lbs.filter(v=>v>128.8).length/lbs.length*100).toFixed(1),'%; LB>154.6(easy) in',(lbs.filter(v=>v>154.6).length/lbs.length*100).toFixed(1),'%');
