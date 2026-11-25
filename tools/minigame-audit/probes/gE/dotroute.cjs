function generateMaze(cols, rows, loops = 0) {
  const grid = Array.from({ length: rows }, () => Array(cols).fill('#'));
  const carve = (x, y) => { grid[y][x] = '.'; const dirs = [[2, 0], [-2, 0], [0, 2], [0, -2]].sort(() => Math.random() - 0.5);
    for (const [dx, dy] of dirs) { const nx = x + dx, ny = y + dy; if (nx > 0 && ny > 0 && nx < cols - 1 && ny < rows - 1 && grid[ny][nx] === '#') { grid[y + dy / 2][x + dx / 2] = '.'; carve(nx, ny); } } };
  carve(1, 1); let opened = 0, guard = 0;
  while (opened < loops && guard++ < 500) { const x = 1 + Math.floor(Math.random() * (cols - 2)), y = 1 + Math.floor(Math.random() * (rows - 2)); if (grid[y][x] !== '#') continue;
    const h = grid[y][x - 1] === '.' && grid[y][x + 1] === '.'; const v = grid[y - 1][x] === '.' && grid[y + 1][x] === '.'; if (h !== v) { grid[y][x] = '.'; opened++; } }
  return grid;
}
const N=15; const res=[];
for (let t=0;t<300;t++){ const map=generateMaze(N,N,16); for (let y=6;y<=8;y++) for (let x=6;x<=8;x++) map[y][x]='.'; for (let x=5;x<=9;x++){map[5][x]='.';map[9][x]='.';} map[4][7]='.';
 const open=(x,y)=>x>=0&&y>=0&&x<N&&y<N&&map[y][x]==='.'; const dot=new Set(); for(let y=0;y<N;y++)for(let x=0;x<N;x++) if(open(x,y)&&!(x>=6&&x<=8&&y>=6&&y<=8)) dot.add(y*N+x);
 const total=dot.size; let px=1,py=1,len=0; dot.delete(py*N+px);
 while(dot.size){ // BFS to nearest
  const dist=new Map([[py*N+px,0]]); const q=[[px,py]]; let found=null; while(q.length){const [x,y]=q.shift(); const d=dist.get(y*N+x); if(dot.has(y*N+x)){found=[x,y,d];break;} for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){const nx=x+dx,ny=y+dy; if(open(nx,ny)&&!dist.has(ny*N+nx)){dist.set(ny*N+nx,d+1);q.push([nx,ny]);}}}
  if(!found)break; px=found[0];py=found[1];len+=found[2]; dot.delete(py*N+px); }
 res.push([total,len]); }
const lens=res.map(r=>r[1]).sort((a,b)=>a-b); console.log('dots avg',res.reduce((a,r)=>a+r[0],0)/res.length,'greedy route len min/med/max',lens[0],lens[150],lens[299],'cells/28s',4.6*28,'cells/19.6s',4.6*19.6, 'cells/33.6',4.6*33.6);
