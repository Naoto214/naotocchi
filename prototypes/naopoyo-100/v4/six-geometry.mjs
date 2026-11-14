import{terrainTopology}from './nature-terrain.mjs';
export {terrainTopology};
export const ellipse=(c,x,y,rx,ry,color)=>{c.fillStyle=color;c.beginPath();c.ellipse(x,y,rx,ry,0,0,Math.PI*2);c.fill()};
export function gradient(c,top,bottom){const g=c.createLinearGradient(0,0,3,8);g.addColorStop(0,top);g.addColorStop(1,bottom);return g}
export function cellShape(c,t,r=.18){
 const{x,y,n,e,s,w}=t;
 c.moveTo(x+(n||w?0:r),y);c.lineTo(x+1-(n||e?0:r),y);if(!n&&!e)c.quadraticCurveTo(x+1,y,x+1,y+r);
 c.lineTo(x+1,y+1-(s||e?0:r));if(!s&&!e)c.quadraticCurveTo(x+1,y+1,x+1-r,y+1);
 c.lineTo(x+(s||w?0:r),y+1);if(!s&&!w)c.quadraticCurveTo(x,y+1,x,y+1-r);
 c.lineTo(x,y+(n||w?0:r));if(!n&&!w)c.quadraticCurveTo(x,y,x+r,y);c.closePath();
}
export function wallPath(c,cells,r=.18){c.beginPath();cells.filter(t=>t.wall).forEach(t=>cellShape(c,t,r))}
export function floorClip(c,cells){c.beginPath();cells.filter(t=>!t.wall).forEach(t=>c.rect(t.x,t.y,1,1));c.clip()}
export function grid(c,color){c.strokeStyle=color;c.lineWidth=.022;for(let i=1;i<8;i++){c.beginPath();c.moveTo(i,0);c.lineTo(i,8);c.moveTo(0,i);c.lineTo(8,i);c.stroke()}}
export function edges(c,cells,light,dark,r=.18,width=.065){
 c.lineCap='butt';c.lineWidth=width;
 for(const t of cells.filter(t=>t.wall)){const{x,y,n,e,s,w}=t;
  for(const[open,ax,ay,bx,by,color]of [[!n,w?0:r,.035,e?1:1-r,.035,light],[!s,w?0:r,.96,e?1:1-r,.96,dark],[!w,.035,n?0:r,.035,s?1:1-r,light],[!e,.96,n?0:r,.96,s?1:1-r,dark]])if(open){c.strokeStyle=color;c.beginPath();c.moveTo(x+ax,y+ay);c.lineTo(x+bx,y+by);c.stroke()}
 }
}
export function debugTerrain(c,s){
 c.save();for(const t of terrainTopology(s)){c.strokeStyle=t.wall?'#ff9b8e':'#c8ffba';c.lineWidth=.035;c.strokeRect(t.x+.055,t.y+.055,.89,.89);if(t.wall){c.beginPath();c.moveTo(t.x+.12,t.y+.12);c.lineTo(t.x+.26,t.y+.26);c.moveTo(t.x+.26,t.y+.12);c.lineTo(t.x+.12,t.y+.26);c.stroke()}}
 c.restore();
}
