/* Presentation scroll only: never reads or writes saved entities or actor positions. */
(() => {
  const device=document.getElementById('device'),frame=device?.querySelector('.screen-frame');
  if(!device||!frame)return;
  const terrain=()=>document.body.dataset.homeProduction==='true'&&document.body.dataset.homeTerrain==='true'&&device.dataset.homeFixed==='true';
  let paintedScroll='',paintedOverflow='',paintedHorizontal='',paintScheduled=false;
  function paintScroll(){
    const scroll=(terrain()?frame.scrollTop-(document.body.dataset.homeViewportVersion==='12'?Number.parseFloat(document.body.style.getPropertyValue('--home-portrait-camera'))||0:0):0)+'px',overflow=(terrain()?Math.max(0,(document.body.dataset.homeViewportVersion==='12'?(Number(document.body.style.getPropertyValue('--home-v12-content-height'))||frame.scrollHeight):frame.scrollHeight)-frame.clientHeight):0)+'px';
    const horizontal=(terrain()&&document.body.dataset.homeViewportV8==='true'?(frame.scrollLeft||0):0)+'px';
    if(horizontal!==paintedHorizontal){paintedHorizontal=horizontal;document.body.style.setProperty('--home-center-scroll-x',horizontal);}
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
    if(!focusPending||!terrain()||document.body.dataset.homeViewportV8==='true')return;
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
 // Resize may arrive before WebKit commits the new viewport and control row.
 // Keep the immediate placement, then read the settled layout at paint time.
 let placementPending=false;
 function schedulePlace(){
  place();if(placementPending)return;placementPending=true;
  requestAnimationFrame(()=>{place();requestAnimationFrame(()=>{placementPending=false;place();});});
 }
 new ResizeObserver(schedulePlace).observe(controls);
 window.addEventListener('resize',schedulePlace);window.visualViewport?.addEventListener('resize',schedulePlace);
 window.visualViewport?.addEventListener('scroll',schedulePlace);
 document.fonts?.ready.then(schedulePlace);schedulePlace();
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

/* V8 viewport: presentation geometry and camera scrolling only. */
((root)=>{
 const revealDelta=(v,r)=>({
  x:r.left<v.left+8||r.right>v.right-8?(r.left+r.right-v.left-v.right)/2:0,
  y:r.top<v.top+8||r.bottom>v.bottom-8?(r.top+r.bottom-v.top-v.bottom)/2:0
 });
 function layout({width,height,left,headerBottom,controlsTop,controlsBottom}){
  const landscape=width>height,railWidth=Math.min(260,width*.46),railLeft=width-left-railWidth,frameTop=headerBottom+48,commentTop=controlsTop-80;
  return {landscape,railWidth,railLeft,frameTop,commentTop,frameWidth:landscape?railLeft-8-left:width-left*2,frameHeight:Math.max(0,(landscape?controlsBottom:commentTop)-frameTop)};
 }
 function layoutV9({width,height,left,headerBottom,controlsHeight,offsetTop=0}){
  const landscape=width>height,railWidth=Math.min(260,width*.46),railLeft=width-left-railWidth;
  const bottom=offsetTop+height-8,noticeTop=headerBottom+3,noticeHeight=42,commentHeight=76;
  const ch=landscape?80:controlsHeight,controlsTop=bottom-ch,commentTop=controlsTop-4-commentHeight;
  const metersHeight=80,metersTop=commentTop-4-metersHeight,infoTop=noticeTop+noticeHeight+3,infoHeight=64;
  const frameTop=landscape?infoTop:infoTop+infoHeight+3;
  return {landscape,railWidth,railLeft,noticeTop,noticeHeight,commentTop,commentHeight,controlsTop,controlsHeight:ch,metersTop,metersHeight,infoTop,infoHeight,frameTop,frameWidth:landscape?railLeft-8-left:width-left*2,frameHeight:Math.max(0,(landscape?bottom-28:metersTop-4)-frameTop)};
 }
 function layoutV10(args){
  const p=layoutV9(args);if(p.landscape)return p;
  p.infoHeight=40;p.frameTop=p.infoTop+p.infoHeight+3;
  p.metersTop=p.controlsTop-4-p.metersHeight;
  p.commentTop=p.metersTop-4-p.commentHeight;
  p.frameHeight=Math.max(0,p.commentTop-4-p.frameTop);return p;
 }
 function layoutV12(args){
  const p=layoutV10(args);p.infoTop=args.headerBottom+3;p.infoHeight=40;
  p.noticeTop=p.landscape?p.infoTop:p.infoTop+p.infoHeight+3;
  p.frameTop=p.landscape?p.infoTop+p.infoHeight+3:p.noticeTop+p.noticeHeight+3;
  if(!p.landscape){p.commentTop=p.metersTop-4-p.commentHeight;p.frameHeight=Math.max(0,p.commentTop-4-p.frameTop);}
  else {
   p.railWidth=Math.min(400,args.width*.6);p.railLeft=args.width-args.left-p.railWidth;
   p.frameWidth=p.railLeft-8-args.left;
   p.noticeHeight=34;p.metersHeight=62;p.controlsHeight=72;
   p.controlsTop=(args.offsetTop||0)+args.height-8-p.controlsHeight;
   p.metersTop=p.controlsTop-3-p.metersHeight;
   p.commentTop=p.noticeTop+p.noticeHeight+3;
   p.commentHeight=p.metersTop-3-p.commentTop;
   p.frameTop=args.offsetTop||0;p.frameHeight=Math.max(0,args.height-8);
  }
  return p;
 }
 function layoutV14(args){
  const p=layoutV12(args);p.nativeFrameWidth=p.frameWidth;
  if(p.landscape){
   // Keep the complete height-fitted picture clear of the existing right rail.
   p.railWidth=Math.min(p.railWidth,args.width-args.left-args.height/1.5-8);
   p.railLeft=args.width-args.left-p.railWidth;p.frameWidth=p.railLeft-8-args.left;
  }
  return p;
 }
 function layoutV17(args){
  const p=layoutV14(args);
  if(p.landscape){p.noticeTop=args.offsetTop||0;p.noticeHeight=42;p.commentHeight=76;p.commentTop=(args.offsetTop||0)+args.height-p.commentHeight;}
  return p;
 }
 function fitV12Text(base,noticeContentHeight,commentContentHeight){
  const p={...base},nh=Math.ceil(noticeContentHeight),ch=Math.ceil(commentContentHeight);
  // Text may wrap inside its reserved lane; it never resizes the world.
  p.textFits=nh<=p.noticeHeight && ch<=p.commentHeight;

  return p;
 }
 function landscapeOverview({paneWidth,paneHeight,nativeWidth,nativeHeight,stageTop,stageHeight}){
  // Same 2:3 artwork and .94 ground anchor as artTransform. Reserve the
  // clipped upper artwork in presentation space, without moving world points.
  const artHeight=nativeWidth*1.5,pad=Math.max(0,artHeight*.94-stageTop-stageHeight);
  const contentHeight=Math.max(nativeHeight+pad,stageTop+pad+stageHeight+artHeight*.06);
  const scale=Math.min(paneWidth/nativeWidth,paneHeight/contentHeight)*.94;
  const viewWidth=paneWidth/scale,viewHeight=paneHeight/scale;
  const artTop=stageTop+pad+stageHeight-artHeight*.94;
  return {pad,contentHeight,scale,viewWidth,viewHeight,inset:(viewWidth-nativeWidth)/2,cropTop:artTop,cropBottom:Math.max(0,contentHeight-artTop-artHeight)};
 }
 function portraitFit({paneWidth,paneHeight,nativeWidth,stageTop,stageHeight,envelope}){
  const top=envelope?.top??-24,bottom=envelope?.bottom??stageHeight+24;
  const scale=Math.min(1,paneWidth/nativeWidth,Math.max(1,paneHeight)/Math.max(1,bottom-top));
  const viewWidth=paneWidth/scale,viewHeight=paneHeight/scale,pad=Math.max(0,-stageTop-top);
  const spare=Math.max(0,viewHeight-(bottom-top));
  return {scale,viewWidth,viewHeight,pad,scrollTop:Math.max(0,stageTop+pad+top-spare/2),inset:(viewWidth-nativeWidth)/2};
 }
 // V13 changes only the presentation basis. Native positions/navigation stay intact.
 function residentScale(count){return count<=2?1:count<=5?.92:count<=10?.86:count<=18?.8:.74;}
 function portraitPresentation({paneWidth,paneHeight,nativeWidth,stageTop,envelope,count,reserveBodyScale=0}){
  const e=envelope,gap=3;
  const sizeLimit=Math.min((paneHeight-gap*2)/Math.max(1,e.above+e.below+24),(paneWidth-gap*2)/Math.max(1,e.side*2+24));
  const bodyScale=Math.min(residentScale(count),sizeLimit),bodyScaleLimit=Math.min(sizeLimit,Math.max(bodyScale,reserveBodyScale));
  const scaleX=Math.max(.02,(paneWidth-gap*2-e.side*2*bodyScaleLimit)/Math.max(1,e.right-e.left));
  let scaleY=Math.max(.02,(paneHeight-gap*2-(e.above+e.below)*bodyScaleLimit)/Math.max(1,e.bottom-e.top));
  let topInk=e.top*scaleY-e.above*bodyScaleLimit;
  const vertical=e.fitVertical||e.vertical;
  if(vertical?.length){
   // The farther actor is smaller: reserve its real depth, not the nearest size.
   const span=k=>{let lo=Infinity,hi=-Infinity;for(const [y,up,down]of vertical){lo=Math.min(lo,y*k-up*bodyScaleLimit);hi=Math.max(hi,y*k+down*bodyScaleLimit);}return {lo,hi};};
   let low=scaleY,high=Math.max(low,(paneHeight-gap*2)/Math.max(1,e.bottom-e.top));
   for(let i=0;i<32;i++){const mid=(low+high)/2,b=span(mid);if(b.hi-b.lo<=paneHeight-gap*2)low=mid;else high=mid;}
   scaleY=low;topInk=span(scaleY).lo;
  }
  const inset=(gap+e.side*bodyScaleLimit)/scaleX-e.left;
  const camera=stageTop+(topInk-gap)/scaleY,pad=Math.max(0,-camera);
  return {scale:scaleX,scaleX,scaleY,bodyScale,bodyScaleLimit,inset,pad,scrollTop:camera+pad,viewWidth:paneWidth/scaleX,viewHeight:paneHeight/scaleY};
 }
 function landscapePresentation({paneWidth,paneHeight,nativeWidth,nativeHeight,stageTop,stageHeight,frameLeft,hostWidth,hostHeight,count,fullHeight=false}){
  const width=fullHeight?hostHeight/1.5:Math.min(hostWidth,hostHeight/1.5),height=width*1.5;
  const art={width,height,left:(hostWidth-width)/2,top:(hostHeight-height)/2};
  const scale=width/nativeWidth,artTop=stageTop+stageHeight-nativeWidth*1.5*.94;
  const offset=art.top/scale-artTop,pad=Math.max(0,offset),scrollTop=Math.max(0,-offset);
  return {scale,scaleX:scale,scaleY:scale,bodyScale:residentScale(count)*Math.min(1,scale*2.2),
   inset:(art.left-frameLeft)/scale,pad,scrollTop,viewWidth:paneWidth/scale,viewHeight:paneHeight/scale,art};
 }
 let presentation=null,fixedScrollTop=null;
 function unscalePoint(p,t=presentation){return t?{x:t.x+(p.x-t.x)/(t.scaleX||t.scale),y:t.y+(p.y-t.y)/(t.scaleY||t.scale)}:p;}
 function presentationRect(e){
  const r=e.getBoundingClientRect();
  if(presentation?.world&&e.matches?.('.home-living-world'))return presentation.world;
  if(!presentation||!e.closest?.('.screen-frame,.home-living-world'))return r;
  const p=unscalePoint({x:r.left,y:r.top}),sx=presentation.scaleX||presentation.scale,sy=presentation.scaleY||presentation.scale;
  return {left:p.x,top:p.y,width:Math.round(r.width/sx*1000)/1000,height:Math.round(r.height/sy*1000)/1000,right:p.x+r.width/sx,bottom:p.y+r.height/sy};
 }
 root.NaotocchiHomeViewport={revealDelta,layout,layoutV9,layoutV10,layoutV12,layoutV14,layoutV17,fitV12Text,landscapeOverview,portraitFit,residentScale,portraitPresentation,landscapePresentation,presentationRect,unscalePoint,residentPresentation:()=>presentation?.bodyScale?presentation:null};
 const doc=root.document,device=doc?.getElementById('device'),frame=device?.querySelector?.('.screen-frame');
 if(!frame||!['8','9','10','11','12'].includes(doc.body.dataset.homeViewportVersion))return;
 const v17=doc.body.dataset.homeDisplayVersion==='17',v16=v17||doc.body.dataset.homeDisplayVersion==='16',v15=v16||doc.body.dataset.homeDisplayVersion==='15',v14=v15||doc.body.dataset.homeDisplayVersion==='14',v13=v14||doc.body.dataset.homeDisplayVersion==='13';
 const v12=doc.body.dataset.homeViewportVersion==='12',v11=v12||doc.body.dataset.homeViewportVersion==='11',v10=v11||doc.body.dataset.homeViewportVersion==='10',v9=v10||doc.body.dataset.homeViewportVersion==='9';
 const screen=doc.getElementById('screen'),normal=doc.getElementById('screenNormal'),stage=doc.getElementById('castStage'),notice=doc.getElementById('homeEventSlot'),dock=doc.getElementById('homeCommentDock'),info=doc.getElementById('homeInformation'),controls=doc.getElementById('careActions');
 if(!screen||!normal||!stage||!notice||!dock||!info||!controls)return;
 const meters=normal.querySelector('.home-meters'),invite=doc.getElementById('companionInviteOverlay');
 const rect=e=>e.getBoundingClientRect(),saved=new Map();
 // Travel has its own lifetime: opening a modal intentionally disables Home's
 // fixed layout, so its viewport tracking must survive restore().
 if(v17){
  const travel=doc.getElementById('travelOverlay');let prior=null;
  const fitTravel=()=>{
   if(!travel)return;
   const v=root.visualViewport,w=v?.width||root.innerWidth,h=v?.height||root.innerHeight;
   const show=w>h&&!travel.classList.contains('hidden');
   if(prior){for(const [e,css]of prior.styles)e.style.cssText=css;prior.parent.insertBefore(travel,prior.next?.parentNode===prior.parent?prior.next:null);prior=null;}
   if(!show)return;
   const content=travel.querySelector('.theme-scroll'),header=travel.querySelector('.dex-header');
   prior={parent:travel.parentNode,next:travel.nextSibling,styles:[travel,content,header,doc.documentElement,doc.body].filter(Boolean).map(e=>[e,e.style.cssText])};
   doc.body.appendChild(travel);const width=Math.min(600,w-24);
   Object.assign(travel.style,{position:'fixed',inset:'auto',left:((v?.offsetLeft||0)+(w-width)/2)+'px',top:((v?.offsetTop||0)+8)+'px',width:width+'px',height:Math.max(80,h-16)+'px',maxHeight:Math.max(80,h-16)+'px',boxSizing:'border-box',transform:'none',overflow:'hidden',zIndex:'1300'});
   if(content)Object.assign(content.style,{flex:'1 1 0',minHeight:'0',overflowY:'auto',overscrollBehavior:'contain'});
   if(header)header.style.flex='0 0 auto';
   doc.documentElement.style.overflow='hidden';doc.body.style.overflow='hidden';
  };
  if(travel)new MutationObserver(fitTravel).observe(travel,{attributes:true,attributeFilter:['class']});
  root.addEventListener('resize',fitTravel);root.visualViewport?.addEventListener('resize',fitTravel);root.visualViewport?.addEventListener('scroll',fitTravel);
 }

 let resumeAt=0,textLayoutKey='',settleTimer=0;
 let active=false,pending=false,markers=[],navigation=null,landscape=false,followKey='',followUntil=0,dragging=false,viewKey='';
 const eligible=()=>doc.body.dataset.homeProduction==='true'&&doc.body.dataset.homeTerrain==='true'&&device.dataset.homeFixed==='true'&&device.classList.contains('ui-home-active')&&!normal.classList.contains('hidden');
 function style(e,props){
  if(!saved.has(e))saved.set(e,new Map());const previous=saved.get(e);
  for(const [k,v]of Object.entries(props)){if(!previous.has(k))previous.set(k,[e.style.getPropertyValue(k),e.style.getPropertyPriority(k)]);e.style.setProperty(k,String(v),'important');}
 }
 function restore(){presentation=null;fixedScrollTop=null;delete doc.body.dataset.homeTinyOverview;delete doc.body.dataset.homePortraitScale;for(const [e,props]of saved)for(const [k,[v,p]]of props){if(v)e.style.setProperty(k,v,p);else e.style.removeProperty(k);}saved.clear();[...markers].reverse().forEach(e=>e.remove());markers=[];navigation?.remove();navigation=null;delete doc.body.dataset.homeViewportV8;active=false;}
 function reserve(e){const marker=doc.createElement('div');marker.style.cssText='flex:0 0 '+rect(e).height+'px;height:'+rect(e).height+'px;pointer-events:none';e.before(marker);markers.push(marker);}
 function movePresentation(e,parent){
  if(!e||e.parentNode===parent)return;
  const original=e.parentNode,next=e.nextSibling;parent.appendChild(e);
  markers.push({remove(){original.insertBefore(e,next?.parentNode===original?next:null);}});
 }
 function actors(){return [...stage.querySelectorAll('[data-diorama-actor]')].filter(e=>rect(e).height>0);}
 function reveal(actor,initial=false){if(v12||!actor||!active)return;const delta=revealDelta(rect(frame),rect(actor));frame.scrollLeft+=delta.x;frame.scrollTop+=delta.y;}
 function selected(){return stage.querySelector('[data-diorama-selected="true"]')||stage.querySelector('[data-diorama-actor^="pet:"]')||doc.getElementById('petSprite');}
 function go(step){const list=actors();if(!list.length)return;const current=list.findIndex(e=>e.dataset.dioramaActor===(viewKey||selected()?.dataset.dioramaActor));const actor=list[(current+step+list.length)%list.length];followKey='';viewKey=actor.dataset.dioramaActor;if(v11){followKey=viewKey;followUntil=Infinity;}reveal(actor);navigation.setAttribute('aria-label',(actor.getAttribute('aria-label')||'住民')+'を表示中');}
 function textKey(){return [doc.body.dataset.homeUpper||'',...['homeInformation','message','homeActionComment','homeChoiceResult','storyFlash','birthdayToast','mgResultToast','speechBubble','speechChoices','individualityDialog'].map(id=>{const e=doc.getElementById(id);return e?e.className+'|'+e.textContent:'';})].join('\n');}
 function naturalLaneHeight(lane){return Math.max(0,...[...lane.children].map(e=>{
  const css=root.getComputedStyle(e);return css.display==='none'||css.position==='fixed'?0:rect(e).height;
 }));}
 function apply(){
  const previousPresentation=presentation;pending=false;const should=eligible();if(!should){restore();return;}if(v9&&root.visualViewport&&root.visualViewport.scale!==1)return;restore();
  const fr=rect(frame),cr=rect(controls),hr=rect(device.querySelector('.device-header')),sw=rect(screen).width;
  const viewport=root.visualViewport;
  if(v9&&viewport&&viewport.scale!==1)return;
  const p=v9?(v17?layoutV17:v14?layoutV14:v12?layoutV12:v10?layoutV10:layoutV9)({width:viewport?.width||root.innerWidth,height:viewport?.height||root.innerHeight,offsetTop:viewport?.offsetTop||0,left:fr.left,headerBottom:hr.bottom,controlsHeight:cr.height}):layout({width:root.innerWidth,height:root.innerHeight,left:fr.left,headerBottom:hr.bottom,controlsTop:cr.top,controlsBottom:cr.bottom});
  reserve(notice);if(p.landscape||v9)reserve(info);if(v9&&meters)reserve(meters);
  active=true;landscape=p.landscape;doc.body.dataset.homeViewportV8='true';
  style(notice,{position:'fixed',top:(hr.bottom+3)+'px',left:fr.left+'px',width:p.frameWidth+'px',height:'42px','min-height':'42px','max-height':'42px',overflow:'auto','margin-bottom':'0','z-index':'1201'});
  style(frame,{position:'fixed',top:p.frameTop+'px',left:fr.left+'px',width:p.frameWidth+'px',height:p.frameHeight+'px','min-height':'0','max-height':'none',overflow:'auto','touch-action':'pan-x pan-y pinch-zoom'});
  style(dock,{display:'flex',height:'76px','min-height':'76px','max-height':'76px','pointer-events':'auto'});
  if(landscape){
   style(screen,{width:sw+'px','min-width':sw+'px','box-sizing':'border-box'});
   style(controls,{position:'fixed',left:p.railLeft+'px',right:'auto',top:cr.top+'px',bottom:'auto',width:p.railWidth+'px',height:cr.height+'px','z-index':'1201'});
   style(info,{position:'fixed',left:p.railLeft+'px',top:(hr.bottom+37)+'px',width:p.railWidth+'px',height:Math.max(24,p.commentTop-hr.bottom-40)+'px',overflow:'auto','z-index':'1201',background:'#fff9e8'});
   if(!v12){navigation=doc.createElement('nav');navigation.id='homeViewportNavigation';navigation.setAttribute('aria-label','画面外の住民を表示');
   for(const [label,step]of [['前の住民',-1],['次の住民',1]]){const b=doc.createElement('button');b.type='button';b.textContent=label;b.addEventListener('click',()=>go(step));navigation.append(b);}
   device.append(navigation);navigation.style.cssText=`position:fixed;left:${p.railLeft}px;top:${hr.bottom+3}px;width:${p.railWidth}px;height:32px;display:flex;gap:4px;z-index:1202`;}
  }
  if(v9){
   style(controls,{position:'fixed',left:(landscape?p.railLeft:fr.left)+'px',top:p.controlsTop+'px',bottom:'auto',right:'auto',width:(landscape?p.railWidth:p.frameWidth)+'px',height:p.controlsHeight+'px','z-index':'1201'});
   style(dock,{position:'fixed',left:(landscape?p.railLeft:fr.left)+'px',top:p.commentTop+'px',bottom:'auto',width:(landscape?p.railWidth:p.frameWidth)+'px',height:'76px','max-height':'76px',overflow:'auto'});
   style(info,{position:'fixed',left:(landscape?p.railLeft:fr.left)+'px',top:(landscape?hr.bottom+3:p.infoTop)+'px',width:(landscape?p.railWidth:p.frameWidth)+'px',height:(landscape?Math.max(16,p.commentTop-hr.bottom-7):p.infoHeight)+'px',overflow:'auto','overflow-x':'hidden','z-index':'1201',background:'#fff9e8c9'});
   if(meters)style(meters,{position:'fixed',left:(landscape?p.railLeft:fr.left)+'px',top:(landscape?hr.bottom+3:p.metersTop)+'px',width:(landscape?p.railWidth:p.frameWidth)+'px',height:p.metersHeight+'px',overflow:'auto','overflow-x':'hidden','z-index':'1201',background:'#fff9e8c9'});
   // The right rail shares a scrollable information panel; its meter copy is
   // reparented only in presentation, with a same-size placeholder in the world.
   if(landscape&&meters&&!v12){
    const originalParent=meters.parentNode,next=meters.nextSibling;info.appendChild(meters);
    markers.push({remove(){originalParent.insertBefore(meters,next);}});
    style(meters,{position:'static',height:'auto',width:'100%',overflow:'visible'});
   }
   if(navigation)navigation.style.cssText=`position:fixed;left:${fr.left}px;top:${p.frameTop+p.frameHeight+3}px;width:${p.frameWidth}px;height:24px;display:flex;gap:4px;z-index:1202`;
  }
  if(v10){
   // Fixed UI must not inherit the scrolling/clipping pane (notably WebKit).
   // Keep the old in-flow reservations, so the world retains its dimensions.
   movePresentation(notice,device);movePresentation(info,device);
   if(!landscape)movePresentation(meters,device);
   const speech=doc.getElementById('speechSlot');reserve(speech);movePresentation(speech,device);
   style(speech,{position:'fixed',width:'0',height:'0','min-height':'0','max-height':'0',padding:'0',bottom:'0',overflow:'visible'});
   movePresentation(doc.getElementById('homeActionComment'),notice);
   movePresentation(doc.getElementById('homeChoiceResult'),notice);
   // Clip painted actors to the central viewport; never alter world bounds.
   style(frame,{'clip-path':'inset(0)','scrollbar-width':'none'});
   style(stage,{'--home-selection-top':(p.frameTop+4)+'px','--home-selection-left':(fr.left+4)+'px'});
   style(info,{background:'transparent'});
   style(dock,{background:'transparent'});
   if(v11){
    style(speech,{'z-index':'1202'});
    if(meters)style(meters,{background:'transparent'});
    style(dock,{'--v11-choice-left':(landscape?p.railLeft:fr.left)+'px','--v11-choice-width':(landscape?p.railWidth:p.frameWidth)+'px','--v11-choice-bottom':(root.innerHeight-p.commentTop+4)+'px','--v11-choice-height':Math.max(44,p.commentTop-hr.bottom-8)+'px'});
   }
  }
  if(v12){
   style(info,{left:fr.left+'px',top:p.infoTop+'px',width:p.frameWidth+'px',height:p.infoHeight+'px'});
   style(notice,{left:(landscape?p.railLeft:fr.left)+'px',top:p.noticeTop+'px',width:(landscape?p.railWidth:p.frameWidth)+'px','justify-content':'center'});
   if(landscape){
    style(notice,{height:p.noticeHeight+'px','min-height':p.noticeHeight+'px','max-height':p.noticeHeight+'px'});
    style(dock,{height:p.commentHeight+'px','min-height':p.commentHeight+'px','max-height':p.commentHeight+'px'});
    if(meters){movePresentation(meters,device);style(meters,{top:p.metersTop+'px',height:p.metersHeight+'px'});}
   }
   // Keep the optional partner row visible too; only presentation grows.
   style(info,{height:'auto',overflow:'visible'});
   if(v16&&landscape){
    const header=device.querySelector('.device-header'),title=header.querySelector('.header-title'),actions=header.querySelector('.header-actions');
    const left=p.railLeft,top=(viewport?.offsetTop||0)+4,width=Math.max(120,p.railWidth-rect(actions).width-8);
    // Move the existing labels only. Preserve the header's world-flow height.
    style(header,{height:hr.height+'px','min-height':hr.height+'px'});
    style(actions,{position:'fixed',left:(left+p.railWidth-rect(actions).width)+'px',top:hr.top+'px','z-index':'1201'});
    style(title,{display:'block',position:'fixed',left:left+'px',top:top+'px',width:width+'px',padding:'0','z-index':'1201'});
    style(info,{left:left+'px',top:(top+rect(title).height+2)+'px',width:width+'px'});
   }
   const infoHeight=v16&&landscape?Math.ceil(rect(info).height):Math.max(p.infoHeight,Math.ceil(rect(info).height));
   const infoExtra=infoHeight-p.infoHeight;p.infoHeight=infoHeight;
   if(!landscape){p.frameTop+=infoExtra;p.frameHeight=Math.max(0,p.frameHeight-infoExtra);}
   if(!landscape){const season=info.querySelector('.sub-status-row');p.noticeTop=(season?rect(season).bottom:rect(info).bottom)+3;}
   style(info,{height:infoHeight+'px'});
   if(v16&&!v17&&landscape){
    p.noticeTop=Math.max(p.noticeTop,rect(info).bottom+3);
    p.commentTop=p.noticeTop+p.noticeHeight+3;
    p.commentHeight=Math.max(0,p.metersTop-3-p.commentTop);
   }
   if(v17&&landscape){
    style(notice,{left:fr.left+'px',width:p.frameWidth+'px'});
    style(dock,{left:fr.left+'px',width:p.frameWidth+'px'});
   }
   style(notice,{top:p.noticeTop+'px'});
   if(!landscape){p.frameTop=p.noticeTop+p.noticeHeight+2;p.frameHeight=Math.max(1,p.commentTop-2-p.frameTop);}
   style(frame,{top:p.frameTop+'px',height:p.frameHeight+'px'});
   style(stage,{'--home-selection-top':(p.frameTop+4)+'px'});
   style(frame,{overflow:'hidden','clip-path':'inset(0)','touch-action':'none'});
   if(meters)style(meters,{overflow:'hidden'});
   style(notice,{height:p.noticeHeight+'px','min-height':p.noticeHeight+'px','max-height':p.noticeHeight+'px',overflow:'visible','align-items':'flex-start'});
   style(dock,{top:p.commentTop+'px',height:p.commentHeight+'px','min-height':p.commentHeight+'px','max-height':p.commentHeight+'px',overflow:'visible','justify-content':v15&&!v16&&!landscape?'flex-start':'flex-end'});
   if(v13&&stage.__homeResidentEnvelope){
    if(landscape){const nativeWidth=Math.max(320,(p.nativeFrameWidth??p.frameWidth)*(rect(stage).height+96)/p.frameHeight);style(screen,{width:nativeWidth+'px','min-width':nativeWidth+'px'});}
    const nativeWidth=rect(screen).width,nativeHeight=Math.max(screen.scrollHeight,rect(screen).height),stageTop=rect(stage).top-rect(screen).top,stageHeight=rect(stage).height;
    const envelope=stage.__homeResidentEnvelope,count=actors().length;
    const fit=landscape?landscapePresentation({paneWidth:p.frameWidth,paneHeight:p.frameHeight,nativeWidth,nativeHeight,stageTop,stageHeight,frameLeft:fr.left,hostWidth:fr.left+p.frameWidth,hostHeight:viewport?.height||root.innerHeight,count,fullHeight:v14}):portraitPresentation({paneWidth:p.frameWidth,paneHeight:p.frameHeight,nativeWidth,stageTop,envelope,count,reserveBodyScale:previousPresentation?.landscape===false?previousPresentation.bodyScale:0});
    const {scale,scaleX,scaleY,viewWidth,viewHeight,inset,pad,scrollTop,bodyScale}=fit;
    // The cast is a flex child: freeze its native height before adding camera space.
    style(stage,{height:stageHeight+'px','min-height':stageHeight+'px','max-height':stageHeight+'px',flex:'0 0 '+stageHeight+'px'});
    // Extra empty flow allows the fixed camera offset without changing cast dimensions.
    style(screen,{width:nativeWidth+'px','min-width':nativeWidth+'px',height:Math.max(nativeHeight,scrollTop+viewHeight-pad)+'px','min-height':nativeHeight+'px','margin-left':inset+'px','margin-top':pad+'px'});
    presentation={x:fr.left,y:p.frameTop,scale,scaleX,scaleY,bodyScale,bodyScaleLimit:fit.bodyScaleLimit??bodyScale,landscape,...(v17&&landscape?{safeTop:p.noticeTop+p.noticeHeight+3,safeBottom:p.commentTop-3,safeLeft:fr.left+3,safeRight:fr.left+p.frameWidth-3}: {})};
    if(fit.bodyScaleLimit>bodyScale+.001){root.clearTimeout(settleTimer);settleTimer=root.setTimeout(schedule,350);}
    style(frame,{width:viewWidth+'px',height:viewHeight+'px',transform:'scale('+scaleX+','+scaleY+')','transform-origin':'0 0'});
    frame.scrollLeft=0;frame.scrollTop=scrollTop;
    presentation.world={left:fr.left+inset,top:p.frameTop-frame.scrollTop,width:nativeWidth,height:nativeHeight+pad};
    style(stage,{'--home-selection-top':(4/scaleY)+'px','--home-selection-left':(4/scaleX)+'px'});
    doc.body.dataset.homeTinyOverview='true';
    doc.body.dataset.homePortraitScale=scale.toFixed(4);
   }else if(landscape){
    // Scale the complete reserved world and its artwork together. Simulation
    // geometry and pointer coordinates are converted at the display boundary.
    const gameHeight=rect(stage).height+96;
    const nativeWidth=Math.max(320,p.frameWidth*gameHeight/p.frameHeight);
    style(screen,{width:nativeWidth+'px','min-width':nativeWidth+'px'});
    const nativeHeight=Math.max(screen.scrollHeight,rect(screen).height);
    const {scale,viewHeight,viewWidth,inset,pad,contentHeight,cropTop,cropBottom}=landscapeOverview({paneWidth:p.frameWidth,paneHeight:p.frameHeight,nativeWidth,nativeHeight,stageTop:rect(stage).top-rect(screen).top,stageHeight:rect(stage).height});
    style(screen,{'margin-left':inset+'px','margin-top':pad+'px',height:nativeHeight+'px','min-height':nativeHeight+'px'});
    presentation={x:fr.left,y:p.frameTop,scale};
    style(frame,{width:viewWidth+'px',height:viewHeight+'px',transform:'scale('+scale+')','transform-origin':'0 0'});
    frame.scrollLeft=0;frame.scrollTop=0;
    presentation.world={left:fr.left+inset,top:p.frameTop,width:nativeWidth,height:contentHeight};
    // The scaled frame is the fixed label's containing block.
    style(stage,{'--home-selection-top':(4/scale)+'px','--home-selection-left':(4/scale)+'px'});
    doc.body.dataset.homeTinyOverview='true';
    for(const [key,value]of Object.entries({'--home-overview-x':(fr.left+inset*scale)+'px','--home-overview-y':p.frameTop+'px','--home-overview-width':nativeWidth+'px','--home-overview-height':contentHeight+'px','--home-overview-scale':scale,'--home-overview-crop-top':cropTop+'px','--home-overview-crop-bottom':cropBottom+'px'}))style(doc.body,{[key]:value});
   }else{
    const nativeWidth=rect(screen).width,nativeHeight=Math.max(screen.scrollHeight,rect(screen).height),stageTop=rect(stage).top-rect(screen).top,stageHeight=rect(stage).height;
    const e=stage.__homePaintEnvelope;
    const envelope=e&&Math.abs(e.width-nativeWidth)<2&&Math.abs(e.height-stageHeight)<2?e:null;
    const {scale,viewWidth,viewHeight,pad,scrollTop,inset}=portraitFit({paneWidth:p.frameWidth,paneHeight:p.frameHeight,nativeWidth,stageTop,stageHeight,envelope});
    style(screen,{width:nativeWidth+'px','min-width':nativeWidth+'px',height:nativeHeight+'px','min-height':nativeHeight+'px','margin-left':inset+'px','margin-top':pad+'px'});
    presentation={x:fr.left,y:p.frameTop,scale};
    style(frame,{width:viewWidth+'px',height:viewHeight+'px',transform:'scale('+scale+')','transform-origin':'0 0'});
    frame.scrollLeft=0;frame.scrollTop=scrollTop;
    presentation.world={left:fr.left+inset,top:p.frameTop-frame.scrollTop,width:nativeWidth,height:nativeHeight+pad};
    style(stage,{'--home-selection-top':(4/scale)+'px','--home-selection-left':(4/scale)+'px'});
    doc.body.dataset.homeTinyOverview='true';
    doc.body.dataset.homePortraitScale=scale.toFixed(4);
    for(const [key,value]of Object.entries({'--home-overview-x':(fr.left+inset*scale)+'px','--home-overview-y':(p.frameTop-frame.scrollTop*scale)+'px','--home-overview-width':nativeWidth+'px','--home-overview-height':nativeHeight+pad+'px','--home-overview-scale':scale,'--home-overview-crop-top':frame.scrollTop+'px','--home-overview-crop-bottom':Math.max(0,nativeHeight+pad-frame.scrollTop-viewHeight)+'px'}))style(doc.body,{[key]:value});
   }
   style(doc.body,{'--home-v12-content-height':screen.scrollHeight});
   textLayoutKey=textKey();
   const vw=viewport?.width||root.innerWidth,vh=viewport?.height||root.innerHeight,ot=viewport?.offsetTop||0;
   // Background coverage is independent of the resident-safe presentation.
   style(doc.body,{'--home-backdrop-width':(landscape?fr.left+p.frameWidth:vw)+'px','--home-backdrop-top':ot+'px','--home-backdrop-height':vh+'px'});
   if(v14&&invite&&(v15||invite.dataset.companionId==='snail')&&!invite.classList.contains('hidden')){
    // Keep the original card outside the transformed resident pane; the full
    // transparent surface still intercepts input while existing modal guards run.
    movePresentation(invite,device);
    style(invite,{position:'fixed',inset:'0',width:'auto',height:'auto','z-index':'1300'});
   }
   if(v13&&root.CustomEvent)stage.dispatchEvent(new root.CustomEvent('home-presentation'));
   style(dock,{'--v12-choice-x':(vw/2)+'px','--v12-choice-y':(ot+vh/2)+'px','--v12-choice-width':Math.min(360,vw-32)+'px','--v12-choice-height':Math.max(44,vh-32)+'px'});
  }
  if(v15&&presentation){fixedScrollTop=frame.scrollTop;presentation.scrollTop=fixedScrollTop;}
  root.requestAnimationFrame(()=>root.requestAnimationFrame(()=>{if(active){reveal(selected(),true);if(v11 || v10&&!landscape){followKey=selected()?.dataset.dioramaActor||'';followUntil=Infinity;}}}));
 }
 function schedule(){if(pending)return;pending=true;root.requestAnimationFrame(apply);}
 new MutationObserver(()=>{if(eligible()!==active)schedule();}).observe(device,{attributes:true,attributeFilter:['class','data-home-fixed'],subtree:true});
 new MutationObserver(()=>{if(eligible()!==active)schedule();}).observe(doc.body,{attributes:true,attributeFilter:['data-home-production','data-home-terrain']});

 stage.addEventListener('home-paint-envelope',schedule);
 if(v14&&invite)new MutationObserver(schedule).observe(invite,{attributes:true,attributeFilter:['class','data-companion-id']});
 root.addEventListener('resize',schedule);root.visualViewport?.addEventListener('resize',schedule);
 if(v11)root.visualViewport?.addEventListener('scroll',schedule);
 doc.addEventListener('pointerdown',e=>{if(!active)return;dragging=stage.contains(e.target);if(frame.contains(e.target)&&!e.target.closest?.('[data-diorama-actor]')){followKey='';if(v11)resumeAt=Date.now()+1500;}},{capture:true,passive:true});
 doc.addEventListener('pointerup',()=>{if(dragging){dragging=false;root.requestAnimationFrame(()=>{followKey=selected()?.dataset.dioramaActor||'';followUntil=v11||(v10&&!landscape)?Infinity:Date.now()+6000;});}},{passive:true});
 doc.addEventListener('pointercancel',()=>{dragging=false;followKey='';},{passive:true});
 frame.addEventListener('wheel',()=>{followKey='';},{passive:true});
 function resumeCamera(){if(!v11)return;resumeAt=Date.now()+900;}
 // overflow:hidden still permits focus/scrollIntoView to move this container.
 // Keep the fixed camera authoritative; text/card scrollers remain independent.
 frame.addEventListener('scroll',()=>{
  if(v15&&active&&fixedScrollTop!==null){frame.scrollTop=fixedScrollTop;frame.scrollLeft=0;}
  else if(v11&&!followKey)resumeCamera();
 },{passive:true,capture:true});
 doc.addEventListener('pointercancel',resumeCamera,{passive:true});
 frame.addEventListener('wheel',resumeCamera,{passive:true});
 doc.addEventListener('pointerup',()=>{if(v11){resumeAt=Date.now()+200;followUntil=Infinity;}},{passive:true});
 function track(){if(!v12&&v11&&active&&!dragging&&!followKey&&Date.now()>=resumeAt){followKey=selected()?.dataset.dioramaActor||'';followUntil=Infinity;}if(v10&&active){const single=actors().length<=1?'true':'false';if(stage.dataset.homeSingleActor!==single)stage.dataset.homeSingleActor=single;}if(!v12&&active&&!dragging&&followKey&&Date.now()<followUntil){const a=actors().find(e=>e.dataset.dioramaActor===followKey);reveal(a);}root.requestAnimationFrame(track);}
 schedule();root.requestAnimationFrame(track);
})(typeof window==='object'?window:globalThis);
