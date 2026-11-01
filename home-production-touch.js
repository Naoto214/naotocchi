/* Presentation scroll only: never reads or writes saved entities or actor positions. */
(() => {
  const device=document.getElementById('device'),frame=device?.querySelector('.screen-frame');
  if(!device||!frame)return;
  const terrain=()=>document.body.dataset.homeProduction==='true'&&document.body.dataset.homeTerrain==='true'&&device.dataset.homeFixed==='true';
  let paintedScroll='',paintedOverflow='',paintScheduled=false;
  function paintScroll(){
    const scroll=(terrain()?frame.scrollTop:0)+'px',overflow=(terrain()?Math.max(0,frame.scrollHeight-frame.clientHeight):0)+'px';
    if(scroll!==paintedScroll){paintedScroll=scroll;document.body.style.setProperty('--home-center-scroll',scroll);}
    if(overflow!==paintedOverflow){paintedOverflow=overflow;document.body.style.setProperty('--home-center-overflow',overflow);}
  }
  // WebKit may update scrollTop before delivering its scroll event. Read the
  // presentation offset at paint time too; never write the viewport or model.
  function queueScrollPaint(){
    if(paintScheduled||!terrain()||document.visibilityState==='hidden')return;
    paintScheduled=true;
    requestAnimationFrame(()=>{paintScheduled=false;paintScroll();queueScrollPaint();});
  }
  frame.addEventListener('scroll',paintScroll,{passive:true});
  // A short landscape viewport may initially show only the information lanes.
  // Reveal the existing actor (or an open question) by moving the viewport,
  // once on entry/resize. Ordinary user scrolling never triggers this focus.
  let focusPending=true,focusRequest=0,frameSize='';
  function revealOnResize(){
    if(!focusPending||!terrain())return;
    const request=++focusRequest,requestedScroll=frame.scrollTop;
    requestAnimationFrame(()=>requestAnimationFrame(()=>{
      if(request!==focusRequest||!focusPending||!terrain())return;
      // Honor a scroll made after this focus was queued, even when WebKit has
      // not dispatched its scroll event yet. Only the viewport is translated.
      if(frame.scrollTop!==requestedScroll){focusPending=false;paintScroll();return;}
      const speech=document.getElementById('speechSlot');
      const choiceVisible=speech?.classList.contains('is-asking')||speech?.querySelector('.home-choice-popup:not(.hidden)');
      const dock=document.getElementById('homeCommentDock');
      const target=choiceVisible?(dock?.getBoundingClientRect?dock:speech):document.querySelector('[data-diorama-actor^="pet:"]');
      if(!target)return;
      const viewport=frame.getBoundingClientRect(),rect=target.getBoundingClientRect();
      if(!rect.height||!viewport.height)return;
      focusPending=false;
      if(rect.top<viewport.top+8||rect.bottom>viewport.bottom-8)frame.scrollTop+=(rect.top+rect.bottom-viewport.top-viewport.bottom)/2;
      paintScroll();
    }));
  }
  if(typeof ResizeObserver==='function'){
    const observer=new ResizeObserver(()=>{
      paintScroll();
      const size=frame.clientWidth+':'+frame.clientHeight;
      if(size!==frameSize){frameSize=size;focusPending=true;revealOnResize();}
    });
    observer.observe(frame);observer.observe(document.getElementById('screenNormal'));
  }
  let wasTerrain=terrain();
  function modeChanged(){const active=terrain();if(active!==wasTerrain){wasTerrain=active;focusPending=true;}if(active){revealOnResize();queueScrollPaint();}}
  document.addEventListener('visibilitychange',queueScrollPaint);
  new MutationObserver(modeChanged).observe(device,{attributes:true,attributeFilter:['data-home-fixed']});
  new MutationObserver(modeChanged).observe(document.body,{attributes:true,attributeFilter:['data-home-terrain']});
  new MutationObserver(revealOnResize).observe(document.getElementById('castStage'),{subtree:true,childList:true,attributes:true,attributeFilter:['data-diorama-actor']});
  new MutationObserver(paintScroll).observe(device,{attributes:true,attributeFilter:['data-home-fixed']});
  new MutationObserver(paintScroll).observe(document.body,{attributes:true,attributeFilter:['data-home-terrain']});
  let gesture=null;
  // Text may live inside a scrolling slot or popup. Route each axis to its
  // nearest real scroll container, including the header's horizontal badges.
  // At that container's edge, contain the gesture instead of chaining it.
  function scrollParent(target,axis){
    for(let element=target;element&&device.contains(element);element=element.parentElement){
      const style=getComputedStyle(element),horizontal=axis==='x';
      if(/^(auto|scroll)$/.test(horizontal?style.overflowX:style.overflowY)
        &&(horizontal?element.scrollWidth-element.clientWidth:element.scrollHeight-element.clientHeight)>1)return element;
    }
    return null;
  }
  document.addEventListener('touchstart',event=>{
    gesture=null;if(device.dataset.homeFixed!=='true'||window.visualViewport?.scale>1||event.touches.length!==1||event.target.closest?.('#device')!==device)return;
    gesture={x:event.touches[0].clientX,y:event.touches[0].clientY,horizontal:scrollParent(event.target,'x'),vertical:scrollParent(event.target,'y')};
  },{passive:true,capture:true});
  document.addEventListener('touchmove',event=>{
    if(!gesture)return;if(device.dataset.homeFixed!=='true'||window.visualViewport?.scale>1||event.touches.length!==1){gesture=null;return;}
    const p=event.touches[0],dx=p.clientX-gesture.x,dy=p.clientY-gesture.y;gesture.x=p.clientX;gesture.y=p.clientY;
    const horizontal=Math.abs(dx)>Math.abs(dy),container=horizontal?gesture.horizontal:gesture.vertical,delta=horizontal?dx:dy;
    if(container){
      const limit=horizontal?container.scrollWidth-container.clientWidth:container.scrollHeight-container.clientHeight;
      const position=horizontal?container.scrollLeft:container.scrollTop;
      if((delta<0&&position<limit-1)||(delta>0&&position>0))return;
    }
    if(event.cancelable)event.preventDefault();
  },{passive:false,capture:true});
  for(const name of ['touchend','touchcancel'])document.addEventListener(name,()=>{gesture=null;},{passive:true,capture:true});
  paintScroll();queueScrollPaint();
})();

/* V7 presentation dock: measure the controls, never text length or world geometry. */
(() => {
 const slot=document.getElementById('speechSlot'),controls=document.getElementById('careActions');
 if(!slot?.children||!controls?.getBoundingClientRect||document.body.dataset.homeProduction!=='true')return;
 const dock=document.getElementById('homeCommentDock');if(!dock)return;
 for(const node of [...slot.children])if(node!==dock)dock.appendChild(node);
 // The terrain controller moves the existing individuality dialog later.
 new MutationObserver(()=>{for(const node of [...slot.children])if(node!==dock)dock.appendChild(node);}).observe(slot,{childList:true});
 function place(){
  const r=controls.getBoundingClientRect(),viewport=window.visualViewport;
  const bottom=viewport?viewport.offsetTop+viewport.height:innerHeight;
  dock.style.setProperty('--comment-left',r.left+'px');
  dock.style.setProperty('--comment-width',r.width+'px');
  dock.style.setProperty('--comment-bottom',Math.max(0,innerHeight-Math.min(r.top,bottom))+4+'px');
  dock.style.setProperty('--comment-max-height',Math.max(76,r.top-8)+'px');
 }
 new ResizeObserver(place).observe(controls);
 window.addEventListener('resize',place);window.visualViewport?.addEventListener('resize',place);
 document.fonts?.ready.then(place);place();
})();

/* Notice layout only. Observe the actual font/wrapping result, never text
   length or game state. Keep the 42px slot and reserve all extra ink in flow. */
(() => {
  const slot=document.getElementById('homeEventSlot');
  if(!slot?.children||typeof ResizeObserver!=='function')return;
  let scheduled=false,last=-1;
  const watched=new WeakSet();
  const resize=new ResizeObserver(schedule);
  function schedule(){if(scheduled)return;scheduled=true;queueMicrotask(measure);}
  function measure(){
    scheduled=false;
    let height=0,count=0;
    const active=document.body.dataset.homeProduction==='true'&&document.body.dataset.homeTerrain==='true';
    for(const child of slot.children){
      if(!watched.has(child)){watched.add(child);resize.observe(child);}
      if(!active||!child.getClientRects().length)continue;
      const rect=child.getBoundingClientRect();
      if(!rect.height)continue;
      height+=rect.height;count++;
    }
    const extra=active?Math.max(0,Math.ceil(height+Math.max(0,count-1)*2)-42):0;
    if(extra!==last){last=extra;slot.style.setProperty('--home-notice-extra',extra+'px');slot.dataset.expanded=extra?'true':'false';}
  }
  resize.observe(slot);
  new MutationObserver(schedule).observe(slot,{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:['class','hidden']});
  new MutationObserver(schedule).observe(document.body,{attributes:true,attributeFilter:['data-home-terrain','data-home-production']});
  document.fonts?.ready.then(schedule);
  schedule();
})();
