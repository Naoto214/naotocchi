const N=5;
function apply(set){let g=0;for(let i=0;i<25;i++)if(set>>i&1){const x=i%5,y=(i/5)|0;for(const[dx,dy]of[[0,0],[1,0],[-1,0],[0,1],[0,-1]]){const nx=x+dx,ny=y+dy;if(nx<0||ny<0||nx>=5||ny>=5)continue;g^=1<<(ny*5+nx);}}return g;}
const A=0x15a82b5,B=0x1b06c1b;
console.log('null A',apply(A),'B',apply(B),'A^B',apply(A^B));
// kernel dimension: gaussian elimination rank
const rows=[];for(let i=0;i<25;i++)rows.push(apply(1<<i));
let rank=0;const r=rows.slice();for(let bit=0;bit<25;bit++){let p=-1;for(let i=rank;i<25;i++)if(r[i]>>bit&1){p=i;break;}if(p<0)continue;[r[rank],r[p]]=[r[p],r[rank]];for(let i=0;i<25;i++)if(i!==rank&&(r[i]>>bit&1))r[i]^=r[rank];rank++;}
console.log('rank',rank);
