// Extract native feet, image frames, front-to-back order and foreground masks.
(() => {
  const inlineRect = n => {
    const r=n.getBoundingClientRect();
    return [r.x,r.y,r.width,r.height];
  };
  const projection = () => {
    const p=NaotocchiHomeViewport.residentPresentation();
    const stage=document.getElementById('castStage');
    return {region:HomeBeauty.settings.region,sx:p.scaleX,sy:p.scaleY,body:p.bodyScale,
      stage:inlineRect(stage),clip:inlineRect(stage.closest('.screen-frame')),
      viewport:[innerWidth,innerHeight],art:HomeBeauty.paintRect};
  };
  function maskPolygons(img) {
    const rule=img.style.maskImage || img.style.webkitMaskImage;
    if(!rule || rule==='none') return [];
    const decoded=decodeURIComponent(rule);
    return [...decoded.matchAll(/points="([^"]+)"/g)].map(([,ps])=>ps.trim().split(/\s+/).map(pt=>pt.split(',').map(Number)));
  }
  function actors() {
    const p=projection(), snaps=HomeCastTrial.inspect();
    const stage=document.getElementById('castStage');
    return snaps.map(a=>{
      const el=stage.querySelector('[data-diorama-actor="'+CSS.escape(a.key)+'"]');
      const img=el.querySelector('img.character-asset'), b=inlineRect(img);
      let flip=false;
      for(let n=img;n;n=n.parentElement){
        const style=getComputedStyle(n);
        if(parseFloat(style.scale)<0)flip=!flip;
        if(style.transform!=='none' && new DOMMatrix(style.transform).a<0)flip=!flip;
      }
      const native=window.qaNative.snapshot().find(o=>o.key===a.key);
      const nav=window.qaLastScene.navigation, uv=nav.unproject(a);
      const shadow=[...stage.querySelectorAll('.diorama-shadow')].find(el=>
        Math.abs(parseFloat(el.style.left)-a.x)<.01 && Math.abs(parseFloat(el.style.top)-a.y)<.01);
      return {key:a.key,kind:a.kind,asset:img.currentSrc.split('/game/').pop(),flip,frame:b,
        local:[parseFloat(getComputedStyle(img).width),parseFloat(getComputedStyle(img).height)],
        masks:maskPolygons(img),z:Number(el.style.zIndex),native:[a.x,a.y,a.w,a.h],
        bounds:window.qaNative.bounds(native),uv:[uv.x,uv.z],foot:[a.foot.x,a.foot.y],
        depth:a.depth,dir:a.direction,shadow:shadow?inlineRect(shadow):null};
    });
  }
  window.qaGeometryDump=()=>{
    const captures=qaSyncCaptures.filter(s=>s.list.length===HomeCastTrial.inspect().length);
    const stage=document.getElementById('castStage');
    const empty={initialPoint:()=>null,project:p=>[p.x,p.z],valid:()=>true};
    const proposed=window.HomeLimitSeats?.withOpeningSeats?.(empty,{region:HomeBeauty.settings.region},innerWidth,innerHeight,location.search);
    const hints=Array.from({length:HomeCastTrial.inspect().length},(_,i)=>proposed?.initialPoint(i,HomeCastTrial.inspect().length)??null);
    const paintedPassPoints=captures.map(({nav})=>[nav.visibleGround?.point?.({x:0,y:0})||null,nav.visibleGround?.point?.({x:1,y:1})||null]);
    return {p:projection(),actors:actors(),hints,passes:captures.map(s=>s.points),paintedPassPoints,
      equipment:[...stage.querySelectorAll('#petAccessory,.partner-ring,.partner-heart')].filter(n=>n.getBoundingClientRect().width>0).map(n=>[n.id||n.className,inlineRect(n)])};
  };
})();

// During an entirely synchronous hit-test or a block of native model updates there
// is no browser layout or camera change. Cache only repeated reads in that block.
// Invalidate before every native repaint and before measuring wall-clock frames.
(() => {
  function withReadCache(cb) {
    const ep=Element.prototype, getBox=ep.getBoundingClientRect, css=window.getComputedStyle;
    const vp=window.NaotocchiHomeViewport, present=vp?.residentPresentation, display=vp?.presentationRect;
    const boxes=new WeakMap(),presBoxes=new WeakMap(),styles=new WeakMap();
    const pose=present?.call(vp);
    ep.getBoundingClientRect=function() {
      if(!boxes.has(this))boxes.set(this,getBox.call(this));
      return boxes.get(this);
    };
    window.getComputedStyle=function(el,pseudo) {
      if(pseudo)return css.call(window,el,pseudo);
      if(!styles.has(el))styles.set(el,css.call(window,el));
      return styles.get(el);
    };
    if(present)vp.residentPresentation=()=>pose;
    if(display)vp.presentationRect=n=>{
      if(!presBoxes.has(n))presBoxes.set(n,display.call(vp,n));
      return presBoxes.get(n);
    };
    try{return cb();}finally{
      ep.getBoundingClientRect=getBox;window.getComputedStyle=css;
      if(present)vp.residentPresentation=present;if(display)vp.presentationRect=display;
    }
  }
  // Sampling taps occurs only after the role-size repaint has finished.
  let taps;
  Object.defineProperty(window,'qaTapHits',{
    configurable:true,set(fn){taps=()=>withReadCache(fn);},get(){return taps;}
  });
  // Controller paint is outside the model-only step block. Cache bounds during
  // a step using the same native coordinates and unchanged viewport.
  function staticModelGeometry() {
    if(!window.qaTerrainForSteps)return null;
    const list=qaNative.snapshot(),scene=qaLastScene;
    const polygons=qaTerrainForSteps().map(points=>({points,
      l:Math.min(...points.map(p=>p[0])),r:Math.max(...points.map(p=>p[0])),
      t:Math.min(...points.map(p=>p[1])),b:Math.max(...points.map(p=>p[1]))
    }));
    const inside=(x,y,shape)=>{
      if(x<shape.l||x>shape.r||y<shape.t||y>shape.b)return false;
      const poly=shape.points;
      let yes=false;
      for(let i=0,j=poly.length-1;i<poly.length;j=i++) {
        const u=poly[i],v=poly[j];
        if((u[1]>y)!==(v[1]>y)&&x<(v[0]-u[0])*(y-u[1])/(v[1]-u[1])+u[0])yes=!yes;
      }
      return yes;
    };
    function visible(p,a) {
      for(const shape of polygons) {
        if(p.x+a.w*.3<shape.l || p.x-a.w*.3>shape.r || p.y-a.h*.22<shape.t || p.y-a.h*.8>shape.b)continue;
        for(const f of [.22,.5,.8]) for(const x of [-.3,0,.3])
          if(inside(p.x+a.w*x,p.y-a.h*f,shape))return false;
      }
      return true;
    }
    const bounds=new Map(),refs=new Map();
    for(const a of list){
      const b=qaNative.bounds(a);
      bounds.set(a.key,b);refs.set(a.key,scene.referenceBounds?.(a));
      for(const dx of [.15,.55,.87]) for(const dy of [.08,.38,.67,.94]) {
        const q={x:b.left+dx*(b.right-b.left),y:b.top+dy*(b.bottom-b.top)};
        if(scene.visible(q,a)!==visible(q,a))return null;
      }
    }
    return {bounds,refs,visible};
  }
  const nativeStep=qaNative.step;
  let geometrySteps=false;
  let advance;
  Object.defineProperty(window,'qaAdvance',{
    configurable:true,set(fn){advance=(...args)=>{geometrySteps=true;window.qaStepGeometry=staticModelGeometry();try{return fn(...args);}finally{window.qaStepGeometry=null;geometrySteps=false;}};},
    get(){return advance;}
  });
  qaNative.step=(...args)=>geometrySteps&&!window.qaStepGeometry?withReadCache(()=>nativeStep(...args)):nativeStep(...args);
})();
