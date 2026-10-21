import {move} from './engine.mjs';
// Integer public inputs denote cell centres; pointerTrace uses continuous board coordinates.
export const trace=(from,to)=>pointerTrace({x:from.x+.5,y:from.y+.5},{x:to.x+.5,y:to.y+.5});
export function pointerTrace(from,to){
 let x=Math.floor(from.x),y=Math.floor(from.y);const endX=Math.floor(to.x),endY=Math.floor(to.y),out=[];
 const dx=to.x-from.x,dy=to.y-from.y,sx=Math.sign(dx),sy=Math.sign(dy);
 let tx=dx?((sx>0?x+1:x)-from.x)/dx:Infinity,ty=dy?((sy>0?y+1:y)-from.y)/dy:Infinity;
 const stepX=dx?1/Math.abs(dx):Infinity,stepY=dy?1/Math.abs(dy):Infinity;
 for(let i=0;i<256&&(x!==endX||y!==endY);i++){
  if(Math.abs(tx-ty)<1e-10){x+=sx;y+=sy;tx+=stepX;ty+=stepY;}
  else if(tx<ty){x+=sx;tx+=stepX;}else{y+=sy;ty+=stepY;}
  out.push([x,y]);
 }
 return out;
}

// Clip the pointer segment to a tile with chamfered corners. A diagonal finger
// movement may skim a neighbouring tile's corner without intending to enter it.
// Full edge centres remain responsive. This is pointer intent selection, not a
// corner collision rule: move() checks each selected destination only, never
// the two side tiles. Keep this independent of walls, gates and their conditions.
function entersTile(from,to,x,y){
 let lo=0,hi=1;
 const px=from.x-x-.5,py=from.y-y-.5,dx=to.x-from.x,dy=to.y-from.y;
 for(const [nx,ny,b] of [[1,0,.5],[-1,0,.5],[0,1,.5],[0,-1,.5],[1,1,.78],[1,-1,.78],[-1,1,.78],[-1,-1,.78]]){
  const p=nx*px+ny*py,q=nx*dx+ny*dy;
  if(Math.abs(q)<1e-12){if(p>b)return false;continue;}
  const t=(b-p)/q;if(q>0)hi=Math.min(hi,t);else lo=Math.max(lo,t);
  if(lo>hi)return false;
 }
 return hi-lo>1e-10;
}
// Include the starting tile: a previous sample may have ended in its corner
// before entering its active area. This keeps fast/coalesced and slow input equal.
export function movePointer(state,id,from,to){
 let result;
 for(const [x,y] of [[Math.floor(from.x),Math.floor(from.y)],...pointerTrace(from,to)]){
  if(!entersTile(from,to,x,y))continue;
  const actor=state.actors.find(a=>a.id===id);if(!actor)break;
  if(x===actor.x&&y===actor.y)continue;
  result=move(state,id,x-actor.x,y-actor.y);
 }
 return result;
}
