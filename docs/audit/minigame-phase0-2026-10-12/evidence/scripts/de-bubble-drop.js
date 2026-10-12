// games.js 5354-5357 の降下処理を再現: 降下前後の泡数と x 座標
const COLS=9,R=10,RH=R*Math.sqrt(3);
const rowLen=r=>r%2?COLS-1:COLS;
const cellPos=(r,c)=>({x:R+c*2*R+(r%2?R:0)+R*0.5,y:R+r*RH+4});
let grid=[];for(let r=0;r<5;r++)grid.push(Array.from({length:rowLen(r)},()=>1));
const count=g=>g.flat().filter(v=>v>=0).length;
const before=count(grid); const x00=cellPos(0,0).x;
grid.unshift(Array.from({length:COLS},()=>2));
for(let rr=1;rr<grid.length;rr++){const need=rowLen(rr);if(grid[rr].length>need)grid[rr]=grid[rr].slice(0,need);while(grid[rr].length<need)grid[rr].push(-1);}
console.log('old bubbles',before,'after(excluding new row)',count(grid.slice(1)),'lost',before-count(grid.slice(1)));
console.log('old row0 col0 x',x00,'-> new row1 col0 x',cellPos(1,0).x);
