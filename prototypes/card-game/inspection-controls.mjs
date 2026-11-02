// Display-only helpers: no game/session/storage dependencies.
export const INSPECTION_MOTION={duration:260,easing:'cubic-bezier(.25,.8,.25,1)',fill:'forwards'};
export function syncZoomButton(button,zoom){if(!button)return;button.hidden=false;button.textContent=zoom?'全体表示':'拡大';button.setAttribute('aria-pressed',String(zoom));}
export function createDoubleTap(onDouble){
 const pointers=new Set();let start=null,last=null;
 const reset=()=>{start=null;last=null;};
 return {
  reset,
  down(e,target){pointers.add(e.pointerId);if(pointers.size!==1||e.isPrimary===false||e.button!==0||!target){reset();return;}start={id:e.pointerId,x:e.clientX,y:e.clientY,t:e.timeStamp,target};},
  move(e){if(start?.id===e.pointerId&&Math.hypot(e.clientX-start.x,e.clientY-start.y)>12)reset();},
  up(e){pointers.delete(e.pointerId);const s=start;start=null;if(!s||s.id!==e.pointerId||pointers.size)return;
   if(e.timeStamp-s.t>500||Math.hypot(e.clientX-s.x,e.clientY-s.y)>12){last=null;return;}
   const l=last;if(l&&l.target===s.target&&e.timeStamp-l.t<=350&&Math.hypot(e.clientX-l.x,e.clientY-l.y)<=36){last=null;e.preventDefault();onDouble(s.target,{x:e.clientX,y:e.clientY});}
   else last={target:s.target,x:e.clientX,y:e.clientY,t:e.timeStamp};
  },
  cancel(e){pointers.delete(e.pointerId);reset();},
  clear(){pointers.clear();reset();}
 };
}
export function installDoubleTap({doc,resolve,onDouble}){
 const gesture=createDoubleTap(onDouble),handlers={pointerdown:e=>gesture.down(e,resolve(e.target)),pointermove:e=>gesture.move(e),pointerup:e=>gesture.up(e),pointercancel:e=>gesture.cancel(e)};
 for(const [name,fn]of Object.entries(handlers))doc.addEventListener(name,fn,true);
 const blur=()=>gesture.clear();doc.defaultView?.addEventListener('blur',blur);
 return {reset:()=>gesture.clear(),destroy(){for(const [name,fn]of Object.entries(handlers))doc.removeEventListener(name,fn,true);doc.defaultView?.removeEventListener('blur',blur);gesture.clear();}};
}

export function inspectionZoomSize(width,height){const w=Math.max(1,width),h=Math.max(1,height),scale=Math.max(1.5,720/Math.min(w,h));return {width:w*scale,height:h*scale,scale};}
