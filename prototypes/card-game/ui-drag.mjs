// Pointer interaction only; commits a permutation of safe-view instance IDs on drop.
export class DragGesture {
 mode='idle';preview=[];id=null;
 begin(ids,id,x,y,time){this.mode='pending';this.preview=[...ids];this.id=id;this.x=x;this.y=y;this.time=time;}
 activate(time){if(this.mode!=='pending'||time-this.time<350)return false;this.mode='drag';return true;}
 move(x,y){if(this.mode==='pending'&&Math.hypot(x-this.x,y-this.y)>9)this.mode='pan';return this.mode;}
 over(id){if(this.mode!=='drag'||id===this.id)return;const from=this.preview.indexOf(this.id),to=this.preview.indexOf(id);if(from<0||to<0)return;this.preview.splice(from,1);this.preview.splice(to,0,this.id);}
 finish(){const result=this.mode==='drag'?{kind:'reorder',ids:[...this.preview]}:this.mode==='pending'?{kind:'tap',id:this.id}:this.mode==='pan'?{kind:'pan'}:{kind:'none'};this.cancel();return result;}
 cancel(){this.mode='idle';this.preview=[];this.id=null;}
}
let blockPointerClickUntil=0;
export function mountHandDrag(strip,{onTap,onReorder,onAnnounce=()=>{}}){
 if(!strip)return ()=>{};
 const gesture=new DragGesture(),abort=new AbortController(),opt={signal:abort.signal};let pointer=null,timer=null,ghost=null,origin=null,initial=[],startScroll=0,lastX=0,lastY=0,frame=null;
 const entries=()=>[...strip.querySelectorAll('[data-hand-entry]')];
 const clean=()=>{clearTimeout(timer);cancelAnimationFrame(frame);frame=null;ghost?.remove();ghost=null;origin?.classList.remove('drag-source');strip.classList.remove('dragging');if(pointer!==null&&strip.hasPointerCapture(pointer))strip.releasePointerCapture(pointer);pointer=null;};
 const arrange=()=>{const nodes=entries(),before=new Map(nodes.map(n=>[n,n.getBoundingClientRect().left]));for(const id of gesture.preview){const n=nodes.find(n=>n.dataset.handEntry===id);if(n)strip.append(n);}if(!matchMedia('(prefers-reduced-motion: reduce)').matches)for(const n of nodes){const dx=before.get(n)-n.getBoundingClientRect().left;if(dx&&n!==origin)n.animate?.([{transform:`translateX(${dx}px)`},{transform:'translateX(0)'}],{duration:150,easing:'ease-out'});}};
 const update=()=>{if(gesture.mode!=='drag')return;const rect=strip.getBoundingClientRect();if(lastX<rect.left+28)strip.scrollLeft-=7;else if(lastX>rect.right-28)strip.scrollLeft+=7;ghost.style.left=lastX+'px';ghost.style.top=lastY+'px';const target=entries().find(n=>{const b=n.getBoundingClientRect();return lastX>=b.left&&lastX<=b.right;});if(target){gesture.over(target.dataset.handEntry);arrange();}frame=requestAnimationFrame(update);};
 strip.addEventListener('pointerdown',e=>{if(e.button!==0||!e.isPrimary||pointer!==null)return;const card=e.target.closest('.hand-card'),entry=card?.closest('[data-hand-entry]');if(!entry||card.disabled)return;pointer=e.pointerId;origin=entry;initial=entries().map(n=>n.dataset.handEntry);startScroll=strip.scrollLeft;lastX=e.clientX;lastY=e.clientY;gesture.begin(initial,entry.dataset.handEntry,e.clientX,e.clientY,performance.now());strip.setPointerCapture(pointer);timer=setTimeout(()=>{if(!gesture.activate(performance.now()))return;const b=card.getBoundingClientRect();ghost=card.cloneNode(true);ghost.className='drag-ghost';ghost.removeAttribute('data-inspect');ghost.setAttribute('aria-hidden','true');ghost.tabIndex=-1;ghost.style.width=b.width+'px';ghost.style.height=b.height+'px';document.body.append(ghost);origin.classList.add('drag-source');strip.classList.add('dragging');onAnnounce('カードを持ち上げました。左右へ動かして離すと並び替えます。');update();},360);},opt);
 strip.addEventListener('pointermove',e=>{if(e.pointerId!==pointer)return;lastX=e.clientX;lastY=e.clientY;const mode=gesture.move(lastX,lastY);if(mode==='pan'){clearTimeout(timer);strip.scrollLeft=startScroll-(lastX-gesture.x);}if(mode==='pan'||mode==='drag')e.preventDefault();},{...opt,passive:false});
 strip.addEventListener('pointerup',e=>{if(e.pointerId!==pointer)return;e.preventDefault();blockPointerClickUntil=performance.now()+400;const result=gesture.finish();clean();if(result.kind==='tap')onTap(result.id);if(result.kind==='reorder'){onReorder(result.ids);onAnnounce('手札の表示順を変更しました。');}},opt);
 const cancel=()=>{if(gesture.mode==='drag'){gesture.preview=initial;arrange();}gesture.cancel();clean();};
 strip.addEventListener('pointercancel',cancel,opt);strip.addEventListener('lostpointercapture',()=>{if(pointer!==null)cancel();},opt);
 strip.addEventListener('contextmenu',e=>{if(e.target.closest('.hand-card'))e.preventDefault();},opt);
 // A pointer tap is dispatched above. Block its synthesized click and all post-drag clicks;
 // retain keyboard/screen-reader activation (detail===0).
 strip.addEventListener('click',e=>{if(e.target.closest('.hand-card')&&e.detail!==0){e.preventDefault();e.stopImmediatePropagation();}},{...opt,capture:true});
 document.addEventListener('click',e=>{if(e.detail!==0&&performance.now()<blockPointerClickUntil){e.preventDefault();e.stopImmediatePropagation();}},{...opt,capture:true});
 return ()=>{cancel();abort.abort();};
}
