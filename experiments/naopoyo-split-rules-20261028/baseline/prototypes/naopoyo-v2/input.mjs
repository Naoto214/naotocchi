// Read-only reuse of v1's destination-only pointer geometry, not its rule engine.
import {pointerTrace} from '../naopoyo-rescue/input.mjs';
// The same chamfered intent region as v1; no terrain/collision checks here.
function enters(from,to,x,y){
 let lo=0,hi=1;const px=from.x-x-.5,py=from.y-y-.5,dx=to.x-from.x,dy=to.y-from.y;
 for(const [nx,ny,b] of [[1,0,.5],[-1,0,.5],[0,1,.5],[0,-1,.5],[1,1,.78],[1,-1,.78],[-1,1,.78],[-1,-1,.78]]){
  const p=nx*px+ny*py,q=nx*dx+ny*dy;if(Math.abs(q)<1e-12){if(p>b)return false;continue}
  const t=(b-p)/q;if(q>0)hi=Math.min(hi,t);else lo=Math.max(lo,t);if(lo>hi)return false;
 }return hi-lo>1e-10;
}
export function enteredCells(from,to){
 if(![from?.x,from?.y,to?.x,to?.y].every(Number.isFinite))return [];
 return [[Math.floor(from.x),Math.floor(from.y)],...pointerTrace(from,to)].filter(([x,y])=>enters(from,to,x,y));
}
