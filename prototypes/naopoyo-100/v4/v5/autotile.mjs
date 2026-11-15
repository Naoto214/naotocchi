import{effectiveMaterial}from './model.mjs';
export const offsets=[[0,-1,1],[1,0,2],[0,1,4],[-1,0,8],[-1,-1,16],[1,-1,32],[1,1,64],[-1,1,128]];
export function connectionMask(ids,x,y){const id=ids[y*8+x];return offsets.reduce((mask,[dx,dy,bit])=>{const xx=x+dx,yy=y+dy;return mask|(xx>=0&&xx<8&&yy>=0&&yy<8&&ids[yy*8+xx]===id?bit:0)},0)}
export function corners(mask){return [[1,8,16],[1,2,32],[4,2,64],[4,8,128]].map(([a,b,d])=>(mask&a)&&(mask&b)?mask&d?'joined':'inner':!(mask&a)&&!(mask&b)?'outer':'edge')}
export function topology(d){const ids=Array.from({length:64},(_,i)=>effectiveMaterial(d,i%8,Math.floor(i/8)));return ids.map((id,i)=>({id,x:i%8,y:Math.floor(i/8),mask:connectionMask(ids,i%8,Math.floor(i/8)),corners:corners(connectionMask(ids,i%8,Math.floor(i/8)))}))}
export function seedValue(seed,id,x,y){let h=(seed>>>0)^2166136261;for(const c of `${id}:${x}:${y}`)h=Math.imul(h^c.charCodeAt(0),16777619);return(h>>>0)/4294967296}
export function cellPath(c,t,r=.16){const{x,y,corners:k}=t,rr=k.map(v=>v==='outer'?r:0);
 c.moveTo(x+rr[0],y);c.lineTo(x+1-rr[1],y);c.quadraticCurveTo(x+1,y,x+1,y+rr[1]);c.lineTo(x+1,y+1-rr[2]);c.quadraticCurveTo(x+1,y+1,x+1-rr[2],y+1);c.lineTo(x+rr[3],y+1);c.quadraticCurveTo(x,y+1,x,y+1-rr[3]);c.lineTo(x,y+rr[0]);c.quadraticCurveTo(x,y,x+rr[0],y);c.closePath();
 // Tiny inner-corner cut-outs use the diagonal bit; physics stays a full cell.
 for(const[i,[ox,oy,a]]of [[0,0,0],[1,0,Math.PI/2],[1,1,Math.PI],[0,1,Math.PI*1.5]].entries())if(k[i]==='inner'){c.moveTo(x+ox,y+oy);c.arc(x+ox,y+oy,.085,a,a+Math.PI/2);c.closePath()}
}
