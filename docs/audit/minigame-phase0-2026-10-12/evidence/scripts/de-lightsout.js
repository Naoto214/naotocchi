// games.js 7479 lights-out gen(): par=n(押した数) と 真の最小手数の比較
const N=5;
function apply(set){const g=Array(25).fill(0);for(const i of set){const x=i%5,y=(i/5)|0;for(const[dx,dy]of[[0,0],[1,0],[-1,0],[0,1],[0,-1]]){const nx=x+dx,ny=y+dy;if(nx<0||ny<0||nx>=N||ny>=N)continue;g[ny*5+nx]^=1;}}return g;}
// nullspace: brute force over 2^5 first-row choices via light chasing
function solveAll(target){const sols=[];for(let m=0;m<32;m++){const p=Array(25).fill(0);const g=target.slice();const press=i=>{p[i]^=1;const x=i%5,y=(i/5)|0;for(const[dx,dy]of[[0,0],[1,0],[-1,0],[0,1],[0,-1]]){const nx=x+dx,ny=y+dy;if(nx<0||ny<0||nx>=N||ny>=N)continue;g[ny*5+nx]^=1;}};for(let x=0;x<5;x++)if(m>>x&1)press(x);for(let y=1;y<5;y++)for(let x=0;x<5;x++)if(g[(y-1)*5+x])press(y*5+x);if(g.every(v=>!v))sols.push(p.reduce((a,b)=>a+b,0));}return sols;}
const nullW=solveAll(Array(25).fill(0));console.log('null-space solution weights',nullW);
for(const n of [3,4,5,6,7,8]){let less=0,T=20000,allOff=0;for(let t=0;t<T;t++){const s=new Set();while(s.size<n)s.add(Math.floor(Math.random()*25));const g=apply(s);if(g.every(v=>!v)){allOff++;continue;}const mn=Math.min(...solveAll(g));if(mn<n)less++;}console.log('n',n,'true-min<par',(less/T*100).toFixed(1)+'%','all-off',allOff);}
