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

// Process every crossed cell, including after collisions, independent of event batching.
export function movePointer(state,id,from,to){
 let result;
 for(const [x,y] of pointerTrace(from,to)){
  const actor=state.actors.find(a=>a.id===id);if(!actor)break;
  if(x===actor.x&&y===actor.y)continue;
  result=move(state,id,x-actor.x,y-actor.y);
 }
 return result;
}
