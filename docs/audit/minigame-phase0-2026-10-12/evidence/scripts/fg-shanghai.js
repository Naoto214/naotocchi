// replicate games.js 9320-9350 layout + deal; count deals that leave face=null tiles (unsolvable remainder)
for (const big of [false,true]) { let bad=0, T=20000, hist={}, stacked=0;
 for(let t=0;t<T;t++){ const layout=[]; const addRect=(layer,cols,rows,ox,oy)=>{for(let r=0;r<rows;r++)for(let c=0;c<cols;c++)layout.push({layer,x:ox+c*2,y:oy+r*2});};
  addRect(0,8,5,0,0); addRect(1,6,3,2,2); if(big){addRect(2,4,2,4,3);addRect(3,2,1,6,4);} else {addRect(2,2,1,6,4);} if(layout.length%2) layout.pop();
  let tiles=layout.map(p=>({...p,face:null,alive:true}));
  const covers=(a,b)=>a.layer===b.layer+1&&Math.abs(a.x-b.x)<2&&Math.abs(a.y-b.y)<2;
  const sideBlocked=(t,dir)=>tiles.some(o=>o.alive&&o!==t&&o.layer===t.layer&&o.x===t.x+dir*2&&Math.abs(o.y-t.y)<2);
  const isFree=t=>t.alive&&!tiles.some(o=>o.alive&&covers(o,t))&&!(sideBlocked(t,-1)&&sideBlocked(t,1));
  let g=0,k=0; while(tiles.some(t=>t.alive)&&g++<5000){const free=tiles.filter(isFree); if(free.length<2)break; const a=free[Math.floor(Math.random()*free.length)]; let b=free[Math.floor(Math.random()*free.length)]; if(b===a) b=free.find(t=>t!==a); a.face=b.face=k++; a.alive=b.alive=false;}
  const nl=tiles.filter(t=>t.face===null); if(nl.length){bad++; hist[nl.length]=(hist[nl.length]||0)+1; if(nl.length===2&&(covers(nl[0],nl[1])||covers(nl[1],nl[0]))) stacked++;} }
 console.log(big?'68枚':'60枚','null-face deals:',(bad/T*100).toFixed(2)+"%", "null枚数分布", JSON.stringify(hist), "2枚が上下に重なる", stacked); }
