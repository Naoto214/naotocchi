for (const big of [false,true]) {
const layout=[]; const addRect=(layer,cols,rows,ox,oy)=>{for(let r=0;r<rows;r++)for(let c=0;c<cols;c++)layout.push({layer,x:ox+c*2,y:oy+r*2});};
addRect(0,8,5,0,0); addRect(1,6,3,2,2); if(big){addRect(2,4,2,4,3);addRect(3,2,1,6,4);} else addRect(2,2,1,6,4);
let tiles;
const covers=(a,b)=>a.layer===b.layer+1&&Math.abs(a.x-b.x)<2&&Math.abs(a.y-b.y)<2;
const sideBlocked=(t,dir)=>tiles.some(o=>o.alive&&o!==t&&o.layer===t.layer&&o.x===t.x+dir*2&&Math.abs(o.y-t.y)<2);
const isFree=t=>t.alive&&!tiles.some(o=>o.alive&&covers(o,t))&&!(sideBlocked(t,-1)&&sideBlocked(t,1));
let fail=0,T=3000;
for(let n=0;n<T;n++){ tiles=layout.map(p=>({...p,alive:true,face:null})); let ok=true;
 while(tiles.some(t=>t.alive)){ const free=tiles.filter(isFree); if(free.length<2){ok=false;break;} const a=free[Math.floor(Math.random()*free.length)]; let b=free[Math.floor(Math.random()*free.length)]; if(b===a)b=free.find(t=>t!==a); a.alive=b.alive=false; a.face=1;b.face=1;}
 if(!ok)fail++; }
console.log('big',big,'tiles',layout.length,'dealOnce fail rate',fail/T);
}
