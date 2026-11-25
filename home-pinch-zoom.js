/* Home pinch zoom: a view-only camera above the finished 2.5D home.
   It scales the painted backdrop layers and the resident stage together with
   CSS `translate`/`scale` only. Resident coordinates, sizes, walking bounds,
   routes, contact checks and saved state are never read or written here.
   Measurements made by the home code are mapped back through `rect`/`point`,
   so every calculation sees the same numbers as at 1.0x. */
(function(root){
  'use strict';
  const doc=root.document;
  const MAX=2,MIN=1,SNAP=1.04,EPS=1e-4;
  let z=1,cx=0,cy=0;            // screen mapping: X' = z*X + c
  let layers=null;              // elements carrying the view transform
  let pinch=null,anim=0,regionKey='',suspended=false,resumeQueued=false,guard=null;
  const pointers=new Map();let cancelling=false;
  const stage=()=>doc.getElementById('castStage');
  const frame=()=>stage()?.closest('.screen-frame')||null;
  const world=()=>doc.querySelector('.home-living-world');
  const active=()=>{
    const b=doc.body?.dataset,s=stage();
    return !!s&&b.homeProduction==='true'&&b.homeTerrain==='true'&&s.hasAttribute('data-diorama')&&!!world()&&doc.getElementById('device')?.dataset.homeFixed==='true';
  };
  const zoomed=()=>z>1+EPS;
  function targets(){const s=stage(),w=world();return [s,...(w?[...w.children]:[])].filter(Boolean);}
  function inside(e){
    const s=stage(),w=world();
    return !!e&&((s&&(e===s||s.contains(e)))||(w&&e!==w&&w.contains(e)));
  }
  // Un-zoomed client point / rectangle. Identity objects are returned at 1.0x.
  function point(p){return zoomed()?{x:(p.x-cx)/z,y:(p.y-cy)/z}:p;}
  function rect(e){
    const r=e.getBoundingClientRect();
    if(!zoomed()||suspended||!inside(e))return r;
    // The scaled layers themselves report their exact 1.0x box.
    const base=layers?.base.get(e);if(base)return base;
    const left=(r.left-cx)/z,top=(r.top-cy)/z,width=r.width/z,height=r.height/z;
    return {left,top,width,height,right:left+width,bottom:top+height,x:left,y:top,toJSON(){return {x:left,y:top,left,top,width,height,right:left+width,bottom:top+height};}};
  }
  function clamp(){
    z=Math.max(MIN,Math.min(MAX,z));
    const w=root.innerWidth,h=root.innerHeight;
    cx=Math.max(w*(1-z),Math.min(0,cx));cy=Math.max(h*(1-z),Math.min(0,cy));
    if(!zoomed()){z=1;cx=0;cy=0;}
  }
  const unstyle=e=>{e.style.translate='';e.style.scale='';e.style.transformOrigin='';e.style.willChange='';};
  function clearLayers(){
    if(!layers)return;
    for(const e of layers.list)unstyle(e);
    releaseLabel();
    closeFrame();
    layers=null;
  }
  // The selected-name label is screen UI that happens to live in the stage:
  // hold it at its 1.0x place and size while the stage is scaled. The home
  // writes its own inline `scale` on it; that value is kept and restored.
  function releaseLabel(){
    const l=layers?.label;if(!l)return;
    if(l.style.scale===layers.labelMine)l.style.scale=layers.labelOwn;
    l.style.translate='';layers.label=null;layers.labelAt=null;layers.labelMine=undefined;
  }
  function pinLabel(){
    const s=stage(),label=s?.querySelector(':scope>.diorama-selected-label'),b=layers?.base.get(s);
    if(!layers||!b)return;
    if(!label||label.hidden){releaseLabel();return;}
    const sx=s.offsetWidth?b.width/s.offsetWidth:1,sy=s.offsetHeight?b.height/s.offsetHeight:1;
    if(layers.label!==label||label.style.scale!==layers.labelMine||layers.labelText!==label.textContent){
      if(layers.label&&layers.label!==label)releaseLabel();
      if(label.style.scale!==layers.labelMine||layers.label!==label)layers.labelOwn=label.style.scale;
      label.style.scale=layers.labelOwn;label.style.translate='';
      const own=(root.getComputedStyle(label).scale||'none').split(/\s+/).map(Number).filter(Number.isFinite);
      layers.labelScale=own.length?[own[0],own[1]??own[0]]:[1,1];
      const r=label.getBoundingClientRect();
      // Offset from the stage box in screen units; the same offset from the
      // frame box (less its scroll) is where the home places it at 1.0x.
      layers.label=label;layers.labelText=label.textContent;layers.labelAt={x:(r.left-cx)/z-b.left,y:(r.top-cy)/z-b.top};
    }
    const at=layers.labelAt,fr=layers.frameRect;
    const curX=cx+z*(b.left+at.x),curY=cy+z*(b.top+at.y);
    // A fixed box inside the transformed, scrolled frame moves with its scroll.
    const f=layers.frame,scrollX=(f?.scrollLeft||0)*sx,scrollY=(f?.scrollTop||0)*sy;
    label.style.translate=((fr.left+at.x-scrollX-curX)/(z*(sx||1)))+'px '+((fr.top+at.y-scrollY-curY)/(z*(sy||1)))+'px';
    label.style.scale=(layers.labelScale[0]/z)+' '+(layers.labelScale[1]/z);
    layers.labelMine=label.style.scale;
  }
  // The resident window clips its content for the 1.0x layout. While zoomed,
  // residents are drawn up to the real screen edge instead. The window keeps
  // its box; only its clipping is lifted. Lifting it also drops its scroll
  // offset, so the same offset is applied to its content and the window keeps
  // answering with the offset it had (the home positions the backdrop by it).
  function openFrame(){
    const f=layers?.frame,inner=f?.firstElementChild;if(!f||!inner||layers.open)return;
    const keep=k=>[k,f.style.getPropertyValue(k),f.style.getPropertyPriority(k)];
    const open={top:f.scrollTop,left:f.scrollLeft,inner,styles:[keep('overflow'),keep('clip-path')],innerTranslate:inner.style.translate};
    f.style.setProperty('overflow','visible','important');f.style.setProperty('clip-path','none','important');
    inner.style.translate=(-open.left)+'px '+(-open.top)+'px';
    for(const [name,value] of [['scrollTop',open.top],['scrollLeft',open.left]])Object.defineProperty(f,name,{configurable:true,get:()=>value,set(){}});
    layers.open=open;
  }
  function closeFrame(){
    const f=layers?.frame,open=layers?.open;if(!f||!open)return;
    delete f.scrollTop;delete f.scrollLeft;
    open.inner.style.translate=open.innerTranslate;
    for(const [k,v,p] of open.styles){if(v)f.style.setProperty(k,v,p);else f.style.removeProperty(k);}
    // The window is a scroll container again only after layout. Flush it,
    // restore the offset, and make sure the engine really took it.
    const put=()=>{void f.scrollHeight;f.scrollTop=open.top;f.scrollLeft=open.left;return Math.abs(f.scrollTop-open.top)<.5&&Math.abs(f.scrollLeft-open.left)<.5;};
    if(!put())root.requestAnimationFrame(()=>{if(!layers?.open&&!Object.prototype.hasOwnProperty.call(f,'scrollTop')&&!put())stage()?.dispatchEvent(new root.CustomEvent('home-paint-envelope'));});
    layers.open=null;
  }
  // The home layout pass reads scroll extents that a scaled stage would widen.
  // Lift the view for exactly that pass and restore it before the next paint.
  function suspend(){
    if(!zoomed())return;
    if(!suspended){suspended=true;clearLayers();}
    if(!resumeQueued){resumeQueued=true;root.requestAnimationFrame(()=>{resumeQueued=false;suspended=false;apply();captureGuard();});}
  }
  function layoutState(){const f=frame();return f?f.scrollTop+'|'+f.scrollLeft+'|'+JSON.stringify(root.NaotocchiHomeViewport?.residentPresentation?.()||null):'';}
  function captureGuard(){guard=zoomed()?layoutState():null;}
  function apply(){
    if(suspended)return;
    const list=targets();
    if(!zoomed()){
      clearLayers();delete doc.body.dataset.homeZoom;guard=null;
      return;
    }
    const base=layers?layers.base:new Map();
    for(const e of list){
      // Layout box and local scale at 1.0x, measured once before scaling.
      let b=base.get(e);
      if(!b){b=e.getBoundingClientRect();base.set(e,b);e.style.transformOrigin='0 0';e.style.willChange='translate,scale';}
      const sx=e.offsetWidth?b.width/e.offsetWidth:1,sy=e.offsetHeight?b.height/e.offsetHeight:1;
      e.style.translate=((cx-(1-z)*b.left)/(sx||1))+'px '+((cy-(1-z)*b.top)/(sy||1))+'px';
      e.style.scale=String(z);
    }
    if(layers)for(const e of layers.list)if(!list.includes(e)){base.delete(e);e.style.translate='';e.style.scale='';e.style.transformOrigin='';e.style.willChange='';}
    const f=frame();
    layers={list,base,label:layers?.label||null,labelAt:layers?.labelAt||null,labelScale:layers?.labelScale||[1,1],labelOwn:layers?.labelOwn||'',labelMine:layers?.labelMine,labelText:layers?.labelText,frame:f,frameRect:layers?.frameRect||f?.getBoundingClientRect(),open:layers?.open||null};
    openFrame();pinLabel();doc.body.dataset.homeZoom='true';if(guard===null)captureGuard();
  }
  function set(nz,nx,ny){cancelAnimationFrame(anim);anim=0;z=nz;cx=nx;cy=ny;clamp();apply();}
  function reset(animated){
    cancelAnimationFrame(anim);anim=0;pinch=null;
    if(suspended){suspended=false;}
    if(!zoomed()){z=1;cx=cy=0;apply();return;}
    if(!animated||root.matchMedia?.('(prefers-reduced-motion: reduce)').matches){z=1;cx=cy=0;apply();return;}
    const z0=z,x0=cx,y0=cy,t0=performance.now();
    const tick=now=>{const k=Math.min(1,(now-t0)/220),e=1-Math.pow(1-k,3);z=z0+(1-z0)*e;cx=x0*(1-e);cy=y0*(1-e);if(k>=1){z=1;cx=cy=0;anim=0;}apply();if(k<1)anim=requestAnimationFrame(tick);};
    anim=requestAnimationFrame(tick);
  }
  function zoomAt(fx,fy,nz){
    nz=Math.max(MIN,Math.min(MAX,nz));const wx=(fx-cx)/z,wy=(fy-cy)/z;set(nz,fx-nz*wx,fy-nz*wy);
  }
  // ---- two-finger gesture (only fingers that start on the home world) ----
  const pair=()=>{const [a,b]=[...pointers.values()];return {d:Math.hypot(a.x-b.x,a.y-b.y)||1,mx:(a.x+b.x)/2,my:(a.y+b.y)/2};};
  // A lost pointerup must never leave a phantom finger behind.
  function forget(){pointers.clear();if(pinch){pinch=null;if(z<SNAP)reset(true);}}
  function down(e){
    if(e.pointerType==='mouse')return;
    // A primary touch starts a new interaction: no earlier finger can remain.
    if(e.isPrimary)forget();
    // The first finger starts on the resident window. The second may rest on
    // any non-control part of the screen, where the same world shows through.
    if(!active()||e.target.closest?.('button,a,input,select,textarea'))return;
    if(!pointers.size&&!frame()?.contains(e.target))return;
    pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
    if(pointers.size===2){
      cancelAnimationFrame(anim);anim=0;
      // The home listens for its one-finger gesture on the stage only. End it
      // here so a resident under the first finger is never dragged by a pinch.
      cancelling=true;try{stage()?.dispatchEvent(new root.PointerEvent('pointercancel',{bubbles:false,cancelable:false}));}finally{cancelling=false;}
      const g=pair();pinch={d:g.d,z,wx:(g.mx-cx)/z,wy:(g.my-cy)/z,moved:false,t:performance.now(),mx:g.mx,my:g.my};
    }else if(pointers.size>2)pinch=null;
  }
  function move(e){
    const p=pointers.get(e.pointerId);if(!p)return;p.x=e.clientX;p.y=e.clientY;
    if(!pinch||pointers.size!==2)return;
    const g=pair();
    if(!pinch.moved&&Math.abs(g.d-pinch.d)<6&&Math.hypot(g.mx-pinch.mx,g.my-pinch.my)<6)return;
    pinch.moved=true;
    const nz=Math.max(MIN,Math.min(MAX,pinch.z*g.d/pinch.d));
    set(nz,g.mx-nz*pinch.wx,g.my-nz*pinch.wy);
    if(e.cancelable)e.preventDefault();
  }
  function up(e){
    if(cancelling||!pointers.delete(e.pointerId))return;
    if(pinch){
      // A still two-finger tap returns to the normal view.
      const tap=!pinch.moved&&performance.now()-pinch.t<350;
      pinch=null;
      if(tap||z<SNAP)reset(true);
    }
  }
  function wheel(e){
    if(!e.ctrlKey||!active()||!frame()?.contains(e.target))return;
    e.preventDefault();zoomAt(e.clientX,e.clientY,z*Math.exp(-e.deltaY*.01));if(z<SNAP)reset(false);
  }
  // ---- keep the camera simple and safe around layout changes ----
  // A new region is a new place: start it from the normal view.
  function regionCheck(){
    const key=(doc.body?.className.match(/region-[\w-]+/)||[''])[0];
    if(key!==regionKey){regionKey=key;if(zoomed())reset(false);}
  }
  function watch(){
    regionCheck();
    if(zoomed()&&!active())reset(false);
    // Safety net: if the layout ever changed under the view, return to 1.0x
    // and let the home lay itself out again from clean measurements.
    if(zoomed()&&!suspended&&guard!==null&&layoutState()!==guard){reset(false);stage()?.dispatchEvent(new root.CustomEvent('home-paint-envelope'));}
    // New backdrop children (a rebuilt world) join the current view.
    if(zoomed()&&layers&&!suspended)pinLabel();
    if(zoomed()&&layers){const list=targets();if(list.length!==layers.list.length||list.some((e,i)=>e!==layers.list[i]))apply();}
    root.requestAnimationFrame(watch);
  }
  function observe(){
    const s=stage(),device=doc.getElementById('device'),info=doc.getElementById('homeInformation'),invite=doc.getElementById('companionInviteOverlay');
    if(!s||!device||!root.MutationObserver)return;
    // Mirror every trigger of the home layout pass (home-production-touch.js).
    s.addEventListener('home-paint-envelope',suspend);
    // The home re-lays itself out on these two only when its own "home is
    // showing" condition flips; residents change classes all the time.
    const normal=doc.getElementById('screenNormal');
    const showing=()=>doc.body.dataset.homeProduction==='true'&&doc.body.dataset.homeTerrain==='true'&&device.dataset.homeFixed==='true'&&device.classList.contains('ui-home-active')&&!normal?.classList.contains('hidden');
    let shown=showing();const flipped=()=>{const now=showing();if(now!==shown){shown=now;suspend();}};
    new MutationObserver(flipped).observe(device,{attributes:true,attributeFilter:['class','data-home-fixed'],subtree:true});
    new MutationObserver(flipped).observe(doc.body,{attributes:true,attributeFilter:['data-home-production','data-home-terrain']});
    new MutationObserver(regionCheck).observe(doc.body,{attributes:true,attributeFilter:['class']});
    if(info)new MutationObserver(suspend).observe(info,{childList:true,characterData:true,subtree:true});
    if(invite)new MutationObserver(suspend).observe(invite,{attributes:true,attributeFilter:['class','data-companion-id']});
  }
  if(doc){
    if(doc.readyState==='loading')doc.addEventListener('DOMContentLoaded',observe);else observe();
    doc.addEventListener('pointerdown',down,{capture:true,passive:true});
    doc.addEventListener('pointermove',move,{capture:true,passive:false});
    doc.addEventListener('pointerup',up,{capture:true,passive:true});
    doc.addEventListener('pointercancel',up,{capture:true,passive:true});
    doc.addEventListener('wheel',wheel,{capture:true,passive:false});
    const lifted=e=>{if(!e.touches||!e.touches.length)forget();};
    doc.addEventListener('touchend',lifted,{capture:true,passive:true});
    doc.addEventListener('touchcancel',lifted,{capture:true,passive:true});
    doc.addEventListener('visibilitychange',()=>{if(doc.visibilityState==='hidden')forget();});
    root.addEventListener('blur',forget);
    root.addEventListener('resize',()=>reset(false));
    root.visualViewport?.addEventListener('resize',()=>reset(false));
    root.requestAnimationFrame(watch);
  }
  root.NaotocchiHomeZoom={point,rect,reset,zoomAt,state:()=>({zoom:z,x:cx,y:cy,max:MAX,min:MIN,fingers:pointers.size,active:active()}),set};
})(typeof window==='object'?window:globalThis);
