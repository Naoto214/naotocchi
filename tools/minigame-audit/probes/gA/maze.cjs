const fs=require('fs');const src=fs.readFileSync('/home/user/naotocchi/script.js','utf8');
const g=src.slice(src.indexOf('  function generateMaze('),src.indexOf('  const MESSAGE_DURATION_MS'));
const gs=fs.readFileSync('/home/user/naotocchi/games.js','utf8');
const pf=gs.slice(gs.indexOf('  function pickFarCell('),gs.indexOf('  function facingOpenDir('));
const f=new Function(g+pf+'return {generateMaze,mazeBfs,pickFarCell};')();
let lt3=0,N=20000,routeLens=[];
for(let i=0;i<N;i++){const map=f.generateMaze(11,9,3);const start={x:1,y:1};const d0=f.mazeBfs(map,1,1);const exit=f.pickFarCell(map,[d0],[start]);const chests=[];const fc=[];for(let y=0;y<9;y++)for(let x=0;x<11;x++)if(map[y][x]==='.'&&d0[y][x]>=4)fc.push({x,y});fc.sort(()=>Math.random()-0.5);for(const c of fc){if(chests.length>=3)break;if([exit,...chests].some(p=>Math.abs(p.x-c.x)+Math.abs(p.y-c.y)<4))continue;chests.push(c);}if(chests.length<3)lt3++;
// shortest route start->3 chests (any order)->exit
const D=p=>f.mazeBfs(map,p.x,p.y);const pts=[start,...chests];const dd=pts.map(D);let best=1e9;const perms=[[1,2,3],[1,3,2],[2,1,3],[2,3,1],[3,1,2],[3,2,1]].filter(p=>p.every(i=>i<pts.length));for(const p of perms){let L=0,cur=0;for(const i of p){L+=dd[cur][pts[i].y][pts[i].x];cur=i;}L+=dd[cur][exit.y][exit.x];best=Math.min(best,L);}routeLens.push(best);}
routeLens.sort((a,b)=>a-b);console.log('fp-dungeon <3 chests',lt3/N,'route cells p10/p50/p90',routeLens[N*0.1|0],routeLens[N/2|0],routeLens[N*0.9|0],'min',routeLens[0]);
{const L=[];let turnsA=[];for(let i=0;i<N;i++){const map=f.generateMaze(11,9,5);const start={x:1,y:1};const d0=f.mazeBfs(map,1,1);const key=f.pickFarCell(map,[d0],[start]);const dK=f.mazeBfs(map,key.x,key.y);const exit=f.pickFarCell(map,[d0,dK],[start,key]);L.push(d0[key.y][key.x]+dK[exit.y][exit.x]);}
L.sort((a,b)=>a-b);console.log('haunted route cells p10/p50/p90',L[N*0.1|0],L[N/2|0],L[N*0.9|0],'max',L[N-1]);}
