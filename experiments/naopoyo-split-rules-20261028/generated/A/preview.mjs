import {enteredCells} from '../../baseline/prototypes/naopoyo-v2/input.mjs';
import {clone,move} from './engine.mjs';

// A one-move transaction on a disposable board, never a second rule engine.
export function simulateSplit(state,id,dx,dy,policy={}){
 const next=clone(state),result=move(next,id,dx,dy,policy);
 if(!result.ok||!result.events.some(e=>e.type==='split'))return null;
 const changed=(a,b)=>!a||!b||a.x!==b.x||a.y!==b.y||a.level!==b.level||a.species!==b.species;
 const affectedIds=[...new Set([...state.actors,...next.actors].map(a=>a.id))].filter(id=>changed(state.actors.find(a=>a.id===id),next.actors.find(a=>a.id===id)));
 return {state:next,events:result.events,dx,dy,affectedIds,
  actors:next.actors.filter(a=>affectedIds.includes(a.id)),
  births:result.events.filter(e=>e.type==='split').flatMap(e=>e.children||[]),
  rescues:result.events.filter(e=>e.type==='rescue')};
}

// Relative drag-B uses pointer cells independently of the actor's logical
// row after falling. Only approach inside the current pointer cell predicts;
// crossed cells are handled immediately by the existing input engine.
export function previewDirection(cursor,p){
 if(![cursor?.x,cursor?.y,p?.x,p?.y].every(Number.isFinite))return null;
 const x=p.x-cursor.x-.5,y=p.y-cursor.y-.5,ax=Math.abs(x),ay=Math.abs(y);
 if(Math.max(ax,ay)<.22||Math.max(ax,ay)>=.5)return null;
 const scale=1.5/Math.max(ax,ay);
 const end={x:cursor.x+.5+x*scale,y:cursor.y+.5+y*scale};
 const next=enteredCells(p,end).find(([nx,ny])=>nx!==cursor.x||ny!==cursor.y);
 if(!next)return null;
 const dx=next[0]-cursor.x,dy=next[1]-cursor.y;
 return Math.max(Math.abs(dx),Math.abs(dy))===1?[dx,dy]:null;
}
