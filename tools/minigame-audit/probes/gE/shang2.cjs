const FACES=[...Array(16).keys()];
for (const big of [false,true]) {
const layout=[]; const addRect=(layer,cols,rows,ox,oy)=>{for(let r=0;r<rows;r++)for(let c=0;c<cols;c++)layout.push({layer,x:ox+c*2,y:oy+r*2});};
addRect(0,8,5,0,0); addRect(1,6,3,2,2); if(big){addRect(2,4,2,4,3);addRect(3,2,1,6,4);} else addRect(2,2,1,6,4);
let tiles;
const covers=(a,b)=>a.layer===b.layer+1&&Math.abs(a.x-b.x)<2&&Math.abs(a.y-b.y)<2;
const sideBlocked=(t,dir)=>tiles.some(o=>o.alive&&o!==t&&o.layer===t.layer&&o.x===t.x+dir*2&&Math.abs(o.y-t.y)<2);
const isFree=t=>t.alive&&!tiles.some(o=>o.alive&&covers(o,t))&&!(sideBlocked(t,-1)&&sideBlocked(t,1));
function faceBag(n){const bag=[];for(let i=0;i<n/2;i++)bag.push(FACES[i%16]);for(let i=bag.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[bag[i],bag[j]]=[bag[j],bag[i]];}return bag;}
function dealOnce(pos){tiles=pos.map(p=>({...p,face:null,alive:true}));let k=0;const bag=faceBag(pos.length);let g=0;while(tiles.some(t=>t.alive)&&g++<5000){const free=tiles.filter(isFree);if(free.length<2)break;const a=free[Math.floor(Math.random()*free.length)];let b=free[Math.floor(Math.random()*free.length)];if(b===a)b=free.find(t=>t!==a);a.face=b.face=bag[k++%bag.length];a.alive=b.alive=false;}for(const t of tiles)t.alive=true;return tiles;}
function dealSearch(pos){tiles=pos.map(p=>({...p,face:null,alive:true}));const bag=faceBag(pos.length);let k=0,budget=4000;const rec=()=>{if(!tiles.some(t=>t.alive))return true;if(budget--<=0)return false;const free=tiles.filter(isFree).sort(()=>Math.random()-0.5);for(let i=0;i<free.length;i++)for(let j=i+1;j<free.length;j++){const a=free[i],b=free[j];a.alive=b.alive=false;if(rec()){a.face=b.face=bag[k++%bag.length];return true;}a.alive=b.alive=true;}return false;};if(!rec()){dealOnce(pos);const rest=tiles.filter(t=>t.face===null);for(let i=0;i+1<rest.length;i+=2)rest[i].face=rest[i+1].face=bag[(k++)%bag.length];}for(const t of tiles)t.alive=true;return tiles;}
function deal(pos){for(let i=0;i<30;i++){const ts=dealOnce(pos);if(ts.every(t=>t.face!==null))return ts;}return dealSearch(pos);}
const matchable=()=>{const free=tiles.filter(isFree);for(let i=0;i<free.length;i++)for(let j=i+1;j<free.length;j++)if(free[i].face===free[j].face)return[free[i],free[j]];return null;};
let stuck=0,shufSum=0,T=400; const shHist={};
for(let n=0;n<T;n++){ deal(layout); let shuffles=0, steps=0;
 while(tiles.some(t=>t.alive)&&steps++<200){ // random player: random matchable pair among all
   const free=tiles.filter(isFree); const pairs=[];for(let i=0;i<free.length;i++)for(let j=i+1;j<free.length;j++)if(free[i].face===free[j].face)pairs.push([free[i],free[j]]);
   if(!pairs.length){ // reshuffle
     const alive=tiles.filter(t=>t.alive); const dead=tiles.filter(t=>!t.alive); deal(alive.map(t=>({layer:t.layer,x:t.x,y:t.y}))); tiles=tiles.concat(dead); shuffles++; if(shuffles>20)break; continue; }
   const [a,b]=pairs[Math.floor(Math.random()*pairs.length)]; a.alive=b.alive=false; }
 if(tiles.some(t=>t.alive)){stuck++; if(stuck<=3)console.log(JSON.stringify(tiles.filter(t=>t.alive).map(t=>[t.layer,t.x,t.y,t.face])));} shufSum+=shuffles; shHist[shuffles]=(shHist[shuffles]||0)+1; }
console.log('big',big,'stuck(unclearable)',stuck,'/',T,'avg shuffles (random player)',shufSum/T, JSON.stringify(shHist));
}
