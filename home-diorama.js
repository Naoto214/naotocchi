/* Lightweight Home adapter. Existing code owns attendance, art and all care. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;if(root)root.NaotocchiHomeDiorama=api;})(typeof window!=='undefined'?window:null,function(){
  'use strict';
  // Native direction of the approved PNGs; frontal art remains frontal.
  // Expression assets inherit their base silhouette, never a global right-facing assumption.
  function facingScale(a,direction){
    const path=(a.asset||'').replace('characters/expressions/','characters/');
    const line=path.match(/characters\/([^/]+)\//)?.[1],id=a.id||path.split('/').pop()?.split(/[.-]/)[0];
    const stage=Number(path.match(/\/(\d{2})(?:[.-])/)?.[1]);
    let native=0;
    if(['dog','cat','turtle','salmon','clownfish'].includes(line)||line==='frog'&&stage<=5)native=-1;
    if(['hermit_crab','dragon','phoenix'].includes(line))native=1;
    if(['shiba','cat_friend','squirrel','parrot'].includes(id))native=-1;
    if(['unicorn','high_eagle','snail','rabbit_friend','chameleon','penguin_friend','anglerfish','swamp_croc','field_cow'].includes(id))native=1;
    return native?native*(direction<0?-1:1):1;
  }
  // The official solver already shrinks crowded casts. Do not shrink them twice.
  function crowdScale(){return 1;}
  function scaleLayout(layout,args,k=crowdScale(1+(args.hasPartner?1:0)+(args.companions?.length||0))){
    k=Number.isFinite(k)?Math.max(.6,Math.min(1,k)):1;
    const boxes=typeof module==='object'&&module.exports?require('./cast-bounds.js'):window.NaotocchiCastBounds;
    const foot=(f,path)=>{const b=boxes?.[path]?.box||[0,0,128,128];return {x:f.x+f.w*(b[0]+b[2])/256,y:f.y+f.h*b[3]/128+(f.artOffsetY||0)};};
    const pet=foot(layout.main,args.mainAsset),partner=layout.partner?foot(layout.partner,args.partnerAsset):pet;
    const scale=(f,p)=>f?{...f,x:p.x+(f.x-p.x)*k,y:p.y+(f.y-p.y)*k,w:f.w*k,h:f.h*k,...(f.artOffsetY!==undefined?{artOffsetY:f.artOffsetY*k}:{})}:null;
    return {...layout,dioramaScale:k,main:scale(layout.main,pet),accessory:scale(layout.accessory,pet),partner:scale(layout.partner,partner),ring:scale(layout.ring,partner),hearts:layout.hearts.map(f=>scale(f,partner)),companions:layout.companions.map((f,i)=>scale(f,foot(f,args.companions[i]))),companionBodies:layout.companionBodies?.map(f=>scale(f,{x:f.x+f.w/2,y:f.y+f.h}))};
  }
  function sceneFor(e,width,height,profile={},world={}){
    const floor=Math.max(45,height-54),back=Math.max(32,height*.48);
    return {...e,width,height,floor,back,groundTop:Math.min(floor,height*.36+(e.region==='river_lake'?24:16)),crown:profile.foliage?.crown?.[1]||'#58a666',crownLight:profile.foliage?.crown?.[2]||'#7cc082',
      water:profile.water?.shallow||'#8fd0da',waterDeep:profile.water?.deep||'#2a6f98',ground:profile.ground3d?.[0]||world.ground?.[0]||'#7fb26b',
      path:world.path||'#b7a27a',wall:profile.arch?.palette?.[0]||'#e9e2d4',flowers:profile.cover?.flowers||['#f2a6c0','#ffffff'],
      tags:[{tag:e.region==='city'?'building':'tree',x:width*.22,y:Math.min(floor,back+25)},
        {tag:'shelter',x:width*.22,y:Math.min(floor,back+25)},
        {tag:e.region==='river_lake'?'water':'flower',x:width*.78,y:Math.min(floor,back+32)}]};
  }
  function createController({stage,document:doc,env=window,getActors,isBlocked=()=>false,isVisible=()=>true,onGesture=()=>{},onPosition=()=>{},getProfile=()=>({}),getWorld=()=>({}),getMeguru=()=>null}){
    const modelAPI=env.NaotocchiHomeDioramaModel;if(!stage||!modelAPI)return null;
    let enabled=false,dead=false,scene=null,environment=null,flags={},rows=new Map(),raf=0,last=0,gesture=null,sceneKey='',wasBlocked=false;
    let world=null,worldLoading=false,worldHost=null,activeTime=0,frames=0,frameGaps=[],loadGeneration=0;
    const media=env.matchMedia?.('(prefers-reduced-motion: reduce)');
    const art=doc.createElement('div'),overlay=doc.createElement('div'),marker=doc.createElement('span'),hint=doc.createElement('span');
    art.className='diorama-art';overlay.className='diorama-overlay';marker.className='diorama-target';hint.className='diorama-hint';
    art.setAttribute('aria-hidden','true');overlay.setAttribute('aria-hidden','true');marker.hidden=true;hint.textContent='タップで選択・ドラッグでおさんぽ';
    stage.appendChild(art);stage.appendChild(overlay);overlay.appendChild(marker);stage.appendChild(hint);
    function emit(event){if(event.type==='tap'||event.type==='environment')onGesture(event.actor,event.environmentTags.includes('tree')?'curious':'look');
      if(env.CustomEvent)stage.dispatchEvent(new env.CustomEvent('naotocchi:home-reaction',{detail:event}));}
    const model=modelAPI.createModel({onEvent:emit});
    function ensureWorld(){
      const M=getMeguru();if(!M||worldLoading||world||!doc.body)return;
      worldLoading=true;const generation=++loadGeneration;worldHost=doc.createElement('div');worldHost.className='home-living-world';worldHost.setAttribute('aria-hidden','true');doc.body.appendChild(worldHost);
      import('./home-world.mjs').then(mod=>{if(generation!==loadGeneration||dead||!enabled)return;
        world=mod.createHomeWorld({M,container:worldHost,document:doc,window:env,
          getGroundAnchor:()=>scene?stage.getBoundingClientRect().top-worldHost.getBoundingClientRect().top+(scene.groundTop+scene.floor)/2:undefined,
          onStatus:(mode,error)=>{stage.dataset.worldRenderer=mode;if(error)stage.dataset.worldError=error;else delete stage.dataset.worldError;doc.body.dataset.livingHome=mode;}});
        worldLoading=false;world.setEnvironment(environment);
      }).catch(error=>{if(generation!==loadGeneration)return;worldLoading=false;stage.dataset.worldRenderer='unavailable';stage.dataset.worldError=String(error.message);});
    }
    function clearWorld(){loadGeneration++;worldLoading=false;world?.destroy();world=null;worldHost?.remove();worldHost=null;if(doc.body)delete doc.body.dataset.livingHome;}

    const blocked=()=>!enabled||doc.visibilityState==='hidden'||!!flags.paused||isBlocked();
    function clearGesture(){if(gesture){try{stage.releasePointerCapture(gesture.pointerId);}catch(_){}gesture=null;}marker.hidden=true;}
    function interrupt(){clearGesture();model.cancel();paint();}
    function clearStage(){for(const k of Object.keys(stage.dataset))if(k.startsWith('diorama')||k.startsWith('world')||k==='livingMetrics')delete stage.dataset[k];}
    function restore(row){onPosition(row,0,0);for(const n of [row.owner,...(row.attachments||[])]){n.style.translate='';n.style.zIndex='';delete n.dataset.dioramaActor;delete n.dataset.dioramaSelected;delete n.dataset.dioramaWalking;delete n.dataset.dioramaActivity;delete n.dataset.dioramaDirection;n.style.removeProperty('--diorama-facing');n.style.removeProperty('--diorama-origin');}
      for(const [k,v]of Object.entries(row.original||{}))v===null?row.owner.removeAttribute?.(k):row.owner.setAttribute(k,v);row.shadow.remove();}
    function sync(){
      if(!enabled||!scene)return;
      const list=getActors(),next=new Map();
      for(const a of list){
        if(!a.owner?.isConnected)continue;
        let row=rows.get(a.key);
        if(row&&row.owner!==a.owner){restore(row);row=null;}
        if(!row){const shadow=doc.createElement('span');shadow.className='diorama-shadow';overlay.appendChild(shadow);row={shadow,original:Object.fromEntries(['role','tabindex','aria-label','aria-pressed'].map(k=>[k,a.owner.getAttribute?.(k)??null]))};}
        Object.assign(row,a);a.owner.dataset.dioramaActor=a.key;a.owner.setAttribute('role','button');a.owner.setAttribute('tabindex','0');a.owner.setAttribute('aria-label',`${a.label||a.id}をえらぶ`);
        next.set(a.key,row);
      }
      for(const [key,row]of rows)if(!next.has(key)){restore(row);if(gesture?.key===key)clearGesture();}
      rows=next;model.sync([...rows.values()].map(({key,kind,id,x,y,w,h,extent,temperament})=>({key,kind,id,x,y,w,h,extent,temperament})),scene);paint();
    }
    function paint(){
      for(const a of model.snapshot()){
        const row=rows.get(a.key);if(!row)continue;
        const dx=a.x-row.x,dy=a.y-row.y;
        for(const n of [row.owner,...(row.attachments||[])])n.style.translate=`${dx.toFixed(2)}px ${dy.toFixed(2)}px`;
        row.owner.style.zIndex=String(Math.round(a.y));
        row.owner.dataset.dioramaSelected=String(model.selected()===a.key);row.owner.setAttribute('aria-pressed',String(model.selected()===a.key));
        row.owner.dataset.dioramaActivity=a.activity;
        row.owner.style.setProperty('--diorama-facing',String(facingScale(row,a.direction)));
        row.owner.style.setProperty('--diorama-origin',(row.originX??50)+'% 100%');
        row.owner.dataset.dioramaWalking=String(!!a.target&&!blocked()&&!media?.matches);row.owner.dataset.dioramaDirection=String(a.direction);
        row.shadow.style.left=a.x+'px';row.shadow.style.top=a.y+'px';row.shadow.style.width=Math.max(20,a.w*.8)+'px';row.shadow.dataset.selected=String(model.selected()===a.key);
        onPosition(a,dx,dy);
      }
      const selected=model.snapshot().find(a=>a.key===model.selected());
      if(!gesture?.drag&&selected?.target){marker.hidden=false;marker.style.left=selected.target.x+'px';marker.style.top=selected.target.y+'px';}else if(!gesture?.drag)marker.hidden=true;
    }
    function stop(){if(raf)env.cancelAnimationFrame(raf);raf=0;last=0;}
    function frame(now){raf=0;if(dead||!enabled||doc.visibilityState==='hidden')return;
      if(!last)last=now;const gap=now-last,interval=flags.tier>=2?66:33;
      if(gap>=interval){const dt=Math.min(1,gap/1000);activeTime+=dt;frames++;frameGaps.push(gap);if(frameGaps.length>300)frameGaps.shift();last=now;
        const busy=blocked();stage.dataset.dioramaPaused=String(busy);
        if(busy&&!wasBlocked)interrupt();wasBlocked=busy;
        for(let remaining=dt;remaining>1e-8;remaining-=.1)model.step(Math.min(.1,remaining),{blocked:busy,reducedMotion:!!media?.matches,heldActor:gesture?(gesture.key||model.selected()):null});
        world?.draw(dt,{paused:!isVisible(),reducedMotion:!!media?.matches,tier:flags.tier||0});paint();
        if(frames%15===0){stage.dataset.livingMetrics=JSON.stringify({frames,seconds:Math.round(activeTime),fps:1000/(frameGaps.reduce((n,v)=>n+v,0)/frameGaps.length),heapBytes:doc.defaultView?.performance?.memory?.usedJSHeapSize??null,cast:model.metrics(),world:world?.stats()});}
      }
      raf=env.requestAnimationFrame(frame);
    }
    function resume(){if(!raf&&!dead&&enabled&&doc.visibilityState!=='hidden')raf=env.requestAnimationFrame(frame);}
    function update(e,f={}){
      environment=e;flags=f;
      const next=modelAPI.supported(e.region)&&f.available!==false;
      if(!next){enabled=false;stop();clearWorld();clearGesture();for(const row of rows.values())restore(row);rows.clear();model.sync([],{...e,width:350,height:240,tags:[]});clearStage();art.hidden=true;overlay.hidden=true;hint.hidden=true;return;}
      enabled=true;stage.dataset.diorama=e.region;stage.dataset.dioramaReduced=String(!!media?.matches);stage.dataset.dioramaTier=String(f.tier||0);stage.dataset.dioramaTime=e.time;stage.dataset.dioramaWeather=e.weather;
      art.hidden=false;overlay.hidden=false;hint.hidden=false;
      const r=stage.getBoundingClientRect();scene=sceneFor(e,r.width,r.height,getProfile(e.region),getWorld(e.region));
      const key=JSON.stringify([e,r.width,r.height,f.tier]);if(key!==sceneKey){sceneKey=key;art.innerHTML='';clearGesture();}
      ensureWorld();world?.setEnvironment(e);sync();stage.dataset.dioramaPaused=String(blocked());
      if(blocked()&&!wasBlocked){interrupt();wasBlocked=true;}
      if(!blocked()){wasBlocked=false;model.step(0,{blocked:false,reducedMotion:!!media?.matches,heldActor:gesture?(gesture.key||model.selected()):null});}resume();
    }
    function point(e){const r=stage.getBoundingClientRect();return {x:e.clientX-r.left,y:e.clientY-r.top};}
    function hit(p,target){
      const items=model.snapshot().sort((a,b)=>b.y-a.y);
      const owner=target?.closest?.('[data-diorama-actor]');
      for(const a of items){const row=rows.get(a.key);if(target===row.owner||owner===row.owner)return a.key;}
      for(const a of items)if(Math.abs(p.x-a.x)<=Math.max(22,a.w/2)&&p.y>=a.y-Math.max(44,a.h)&&p.y<=a.y+10)return a.key;
      return null;
    }
    function down(e){if(!enabled)return;if(e.isPrimary===false){clearGesture();return;}if(blocked()||e.button>0||e.target?.closest?.('button,a,input,select,textarea'))return;
      const p=point(e),key=hit(p,e.target);if(!key&&!model.selected())return;
      gesture={pointerId:e.pointerId,start:p,key,drag:false};if(key)model.select(key);paint();try{stage.setPointerCapture(e.pointerId);}catch(_){}e.preventDefault();}
    function move(e){if(!gesture||gesture.pointerId!==e.pointerId)return;if(blocked()){clearGesture();return;}
      const p=point(e);if(Math.hypot(p.x-gesture.start.x,p.y-gesture.start.y)>=8)gesture.drag=true;
      if(gesture.drag){const key=gesture.key||model.selected(),a=model.snapshot().find(a=>a.key===key);if(a){const b=model.bounds(a);marker.hidden=false;marker.style.left=Math.max(b.left,Math.min(b.right,p.x))+'px';marker.style.top=Math.max(b.top,Math.min(b.bottom,p.y))+'px';}}
      e.preventDefault();}
    function up(e){if(!gesture||gesture.pointerId!==e.pointerId)return;const g=gesture,p=point(e);clearGesture();if(blocked())return;
      if(g.key&&model.selected()!==g.key)model.select(g.key);
      if(g.drag||!g.key)model.move(g.key||model.selected(),p,g.drag?'drag':'ground');
      paint();resume();e.preventDefault();}
    function keydown(e){if(blocked())return;const key=hit({x:-999,y:-999},e.target);if(!key)return;
      if(e.key==='Enter'||e.key===' '){model.select(key);paint();e.preventDefault();return;}
      const delta={ArrowLeft:[-24,0],ArrowRight:[24,0],ArrowUp:[0,-16],ArrowDown:[0,16]}[e.key];
      if(delta){const a=model.snapshot().find(a=>a.key===key);model.select(key);model.move(key,{x:a.x+delta[0],y:a.y+delta[1]},'keyboard');paint();resume();e.preventDefault();}}
    function visibility(){if(doc.visibilityState==='hidden'){interrupt();stop();stage.dataset.dioramaPaused='true';}else if(environment)update(environment,flags);}
    function preference(){if(environment)update(environment,flags);}
    const listeners={pointerdown:down,pointermove:move,pointerup:up,pointercancel:clearGesture,lostpointercapture:clearGesture,keydown};
    for(const [name,fn]of Object.entries(listeners))stage.addEventListener(name,fn);
    doc.addEventListener('visibilitychange',visibility);media?.addEventListener?.('change',preference);
    return {model,update,sync,interrupt,destroy(){dead=true;stop();clearWorld();clearGesture();for(const row of rows.values())restore(row);rows.clear();for(const [n,fn]of Object.entries(listeners))stage.removeEventListener(n,fn);doc.removeEventListener('visibilitychange',visibility);media?.removeEventListener?.('change',preference);art.remove();overlay.remove();hint.remove();clearStage();}};
  }
  return {sceneFor,createController,facingScale,crowdScale,scaleLayout};
});
