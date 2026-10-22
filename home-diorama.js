/* Lightweight Home adapter. Existing code owns attendance, art and all care. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;if(root)root.NaotocchiHomeDiorama=api;})(typeof window!=='undefined'?window:null,function(){
  'use strict';
  function sceneFor(e,width,height,profile={},world={}){
    const floor=Math.max(45,height-54),back=Math.max(32,height*.48);
    return {...e,width,height,floor,back,groundTop:e.region==='river_lake'?Math.min(floor,back+34):back+16,crown:profile.foliage?.crown?.[1]||'#58a666',crownLight:profile.foliage?.crown?.[2]||'#7cc082',
      water:profile.water?.shallow||'#8fd0da',waterDeep:profile.water?.deep||'#2a6f98',ground:profile.ground3d?.[0]||world.ground?.[0]||'#7fb26b',
      path:world.path||'#b7a27a',wall:profile.arch?.palette?.[0]||'#e9e2d4',flowers:profile.cover?.flowers||['#f2a6c0','#ffffff'],
      tags:[{tag:e.region==='city'?'building':'tree',x:width*.22,y:Math.min(floor,back+25)},
        {tag:'shelter',x:width*.22,y:Math.min(floor,back+25)},
        {tag:e.region==='river_lake'?'water':'flower',x:width*.78,y:Math.min(floor,back+32)}]};
  }
  const color=x=>/^#[0-9a-f]{3,8}$/i.test(x)?x:'#7fb26b';
  function landscape(s){
    const w=s.width,h=s.height,f=s.floor,b=s.back;
    const winter=s.season==='winter',autumn=s.season==='autumn';
    const grass=winter?'#dce6e0':autumn?'#a6ad76':color(s.ground),leaf=winter?'#a8c9b6':autumn?'#b68c49':color(s.crown),light=winter?'#e9f2ea':autumn?'#dfb465':color(s.crownLight);
    function tree(x,y,k=1){return `<g transform="translate(${x} ${y}) scale(${k})"><ellipse cy="4" rx="28" ry="7" fill="#213f3e" opacity=".14"/><path d="M-4 0L-3 -53L3 -56L5 0" fill="#78654d"/><g class="diorama-leaves"><path d="M-31 -39L-28 -66L-8 -85L14 -78L32 -56L25 -35L3 -29Z" fill="${leaf}"/><path d="M-28 -66L-8 -85L14 -78L3 -48L-22 -46Z" fill="${light}"/><path d="M3 -48L32 -56L25 -35L3 -29Z" fill="${leaf}"/></g></g>`;}
    const city=s.region==='city',water=s.region==='river_lake';
    const prop=city?`<g transform="translate(${w*.05} ${b-7})"><path d="M0 0V-57L46 -66L70 -54V0Z" fill="${color(s.wall)}"/><path d="M46 -66L70 -54V0H46Z" fill="#b3b5ad"/><path d="M7 -48H35V-27H7Z" fill="#9cb8c1"/><path d="M4 -20H45L50 -8H0Z" fill="#658c89"/><path d="M7 -4H18V0H7M30 -4H41V0H30" fill="#6e785c"/></g>`:tree(w*.1,b+8,.88);
    const bank=water?`<path d="M${w*.56} ${b-15}Q${w*.75} ${b-31} ${w} ${b-9}V${b+16}Q${w*.77} ${b+33} ${w*.60} ${b+14}Z" fill="${color(s.waterDeep)}"/><path d="M${w*.57} ${b-9}Q${w*.78} ${b-25} ${w} ${b-4}V${b+10}Q${w*.78} ${b+28} ${w*.61} ${b+9}Z" fill="${color(s.water)}"/><g class="diorama-ripples" fill="none" stroke="#e7ffff" opacity=".5"><path d="M${w*.67} ${b}q20 -4 40 0M${w*.81} ${b+10}q22 -4 44 0"/></g>`:'';
    const flowers=Array.from({length:7},(_,i)=>{const x=w*(.76+(i%3)*.055),y=b+22+Math.floor(i/3)*9;return `<g class="diorama-grass" style="animation-delay:-${i}s"><path d="M${x} ${y+5}v-10m0 7l-4 -5" stroke="${leaf}" fill="none"/><circle cx="${x}" cy="${y-5}" r="2.5" fill="${winter?'#e9f1ed':color(s.flowers[i%s.flowers.length])}"/></g>`;}).join('');
    return `<svg class="diorama-landscape" viewBox="0 0 ${w} ${h}" aria-hidden="true"><defs><linearGradient id="diorama-ground" x2="0" y2="1"><stop stop-color="${grass}"/><stop offset="1" stop-color="${grass}" stop-opacity=".65"/></linearGradient></defs>
      <g class="diorama-far" opacity=".52">${tree(w*.86,b-30,.65)}${tree(w*.70,b-33,.48)}</g>
      <path d="M12 ${b}Q${w*.43} ${b-26} ${w-12} ${b+8}L${w-3} ${f+8}Q${w*.52} ${f+33} 3 ${f+4}Z" fill="#526e58" opacity=".27"/>
      <path d="M12 ${b-5}Q${w*.43} ${b-31} ${w-12} ${b+3}L${w-3} ${f}Q${w*.52} ${f+25} 3 ${f-4}Z" fill="url(#diorama-ground)"/>
      <path d="M${w*.27} ${b-12}Q${w*.46} ${b+30} ${w*.7} ${f+9}L${w*.91} ${f+3}Q${w*.57} ${b+15} ${w*.42} ${b-14}Z" fill="${color(s.path)}" opacity=".78"/>
      ${bank}${prop}${flowers}<g opacity=".7">${tree(w*.96,f+7,.45)}</g>
      <g class="diorama-cloud" fill="#eff9f6" opacity=".16"><ellipse cx="${w*.4}" cy="28" rx="43" ry="9"/><ellipse cx="${w*.45}" cy="23" rx="24" ry="11"/></g>
      <g class="diorama-visitor" fill="${s.time==='night'?'#f4eab5':'#fff2b8'}"><ellipse cx="${w*.6}" cy="${b-10}" rx="4" ry="2"/><ellipse cx="${w*.6+4}" cy="${b-13}" rx="2" ry="4"/></g>
      <path class="diorama-light" d="M${w*.4} 0L${w*.12} ${f}H${w*.7}L${w*.6} 0Z" fill="#fff8d8" opacity=".07"/>
    </svg>`;
  }
  function createController({stage,document:doc,env=window,getActors,isBlocked=()=>false,onGesture=()=>{},onPosition=()=>{},getProfile=()=>({}),getWorld=()=>({})}){
    const modelAPI=env.NaotocchiHomeDioramaModel;if(!stage||!modelAPI)return null;
    let enabled=false,dead=false,scene=null,environment=null,flags={},rows=new Map(),raf=0,last=0,gesture=null,sceneKey='',wasBlocked=false;
    const media=env.matchMedia?.('(prefers-reduced-motion: reduce)');
    const art=doc.createElement('div'),overlay=doc.createElement('div'),marker=doc.createElement('span'),hint=doc.createElement('span');
    art.className='diorama-art';overlay.className='diorama-overlay';marker.className='diorama-target';hint.className='diorama-hint';
    art.setAttribute('aria-hidden','true');overlay.setAttribute('aria-hidden','true');marker.hidden=true;hint.textContent='キャラをえらんで、地面をタップ';
    stage.appendChild(art);stage.appendChild(overlay);overlay.appendChild(marker);stage.appendChild(hint);
    function emit(event){if(event.type==='tap'||event.type==='environment')onGesture(event.actor,event.environmentTags.includes('tree')?'curious':'look');
      if(env.CustomEvent)stage.dispatchEvent(new env.CustomEvent('naotocchi:home-reaction',{detail:event}));}
    const model=modelAPI.createModel({onEvent:emit});
    const blocked=()=>!enabled||doc.visibilityState==='hidden'||!!flags.paused||isBlocked();
    function clearGesture(){if(gesture){try{stage.releasePointerCapture(gesture.pointerId);}catch(_){}gesture=null;}marker.hidden=true;}
    function interrupt(){clearGesture();model.cancel();paint();}
    function clearStage(){for(const k of Object.keys(stage.dataset))if(k.startsWith('diorama'))delete stage.dataset[k];}
    function restore(row){onPosition(row,0,0);for(const n of [row.owner,...(row.attachments||[])]){n.style.translate='';n.style.zIndex='';delete n.dataset.dioramaActor;delete n.dataset.dioramaSelected;delete n.dataset.dioramaWalking;}
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
      rows=next;model.sync([...rows.values()].map(({key,kind,id,x,y,w,h,extent})=>({key,kind,id,x,y,w,h,extent})),scene);paint();
    }
    function paint(){
      for(const a of model.snapshot()){
        const row=rows.get(a.key);if(!row)continue;
        const dx=a.x-row.x,dy=a.y-row.y;
        for(const n of [row.owner,...(row.attachments||[])])n.style.translate=`${dx.toFixed(2)}px ${dy.toFixed(2)}px`;
        row.owner.style.zIndex=String(Math.round(a.y));
        row.owner.dataset.dioramaSelected=String(model.selected()===a.key);row.owner.setAttribute('aria-pressed',String(model.selected()===a.key));
        row.owner.dataset.dioramaWalking=String(!!a.target&&!blocked()&&!media?.matches);row.owner.dataset.dioramaDirection=String(a.direction);
        row.shadow.style.left=a.x+'px';row.shadow.style.top=a.y+'px';row.shadow.style.width=Math.max(20,a.w*.8)+'px';row.shadow.dataset.selected=String(model.selected()===a.key);
        onPosition(a,dx,dy);
      }
      const selected=model.snapshot().find(a=>a.key===model.selected());
      if(!gesture?.drag&&selected?.target){marker.hidden=false;marker.style.left=selected.target.x+'px';marker.style.top=selected.target.y+'px';}else if(!gesture?.drag)marker.hidden=true;
    }
    function stop(){if(raf)env.cancelAnimationFrame(raf);raf=0;last=0;}
    function frame(now){raf=0;if(dead||!enabled||doc.visibilityState==='hidden')return;
      const busy=blocked();stage.dataset.dioramaPaused=String(busy);if(busy){if(!wasBlocked)interrupt();wasBlocked=true;last=0;return;}wasBlocked=false;
      if(!last)last=now;
      const interval=flags.tier>=2?66:33;
      if(now-last>=interval){model.step((now-last)/1000,{blocked:false,reducedMotion:!!media?.matches});last=now;paint();}
      raf=env.requestAnimationFrame(frame);
    }
    function resume(){if(!raf&&!dead&&enabled&&!blocked())raf=env.requestAnimationFrame(frame);}
    function update(e,f={}){
      environment=e;flags=f;
      const next=modelAPI.supported(e.region)&&f.available!==false;
      if(!next){enabled=false;stop();clearGesture();for(const row of rows.values())restore(row);rows.clear();model.sync([],{...e,width:350,height:240,tags:[]});clearStage();art.hidden=true;overlay.hidden=true;hint.hidden=true;return;}
      enabled=true;stage.dataset.diorama=e.region;stage.dataset.dioramaReduced=String(!!media?.matches);stage.dataset.dioramaTier=String(f.tier||0);stage.dataset.dioramaTime=e.time;stage.dataset.dioramaWeather=e.weather;
      art.hidden=false;overlay.hidden=false;hint.hidden=false;
      const r=stage.getBoundingClientRect();scene=sceneFor(e,r.width,r.height,getProfile(e.region),getWorld(e.region));
      const key=JSON.stringify([e,r.width,r.height,f.tier]);if(key!==sceneKey){sceneKey=key;art.innerHTML=landscape(scene);clearGesture();}
      sync();stage.dataset.dioramaPaused=String(blocked());
      if(blocked()){interrupt();stop();}else resume();
    }
    function point(e){const r=stage.getBoundingClientRect();return {x:e.clientX-r.left,y:e.clientY-r.top};}
    function hit(p,target){
      const items=model.snapshot();let best=null,distance=Infinity;
      for(const a of items){const row=rows.get(a.key);if(target===row.owner||target?.closest?.('[data-diorama-actor]')===row.owner)return a.key;
        const d=Math.hypot(p.x-a.x,p.y-(a.y-a.h/2));if(Math.abs(p.x-a.x)<=Math.max(22,a.w/2)&&p.y>=a.y-Math.max(44,a.h)&&p.y<=a.y+10&&d<distance){best=a.key;distance=d;}}
      return best;
    }
    function down(e){if(!enabled)return;if(e.isPrimary===false){clearGesture();return;}if(blocked()||e.button>0||e.target?.closest?.('button,a,input,select,textarea'))return;
      const p=point(e),key=hit(p,e.target);if(!key&&!model.selected())return;
      gesture={pointerId:e.pointerId,start:p,key,drag:false};try{stage.setPointerCapture(e.pointerId);}catch(_){}e.preventDefault();}
    function move(e){if(!gesture||gesture.pointerId!==e.pointerId)return;if(blocked()){clearGesture();return;}
      const p=point(e);if(Math.hypot(p.x-gesture.start.x,p.y-gesture.start.y)>=8)gesture.drag=true;
      if(gesture.drag){const key=gesture.key||model.selected(),a=model.snapshot().find(a=>a.key===key);if(a){const b=model.bounds(a);marker.hidden=false;marker.style.left=Math.max(b.left,Math.min(b.right,p.x))+'px';marker.style.top=Math.max(b.top,Math.min(b.bottom,p.y))+'px';}}
      e.preventDefault();}
    function up(e){if(!gesture||gesture.pointerId!==e.pointerId)return;const g=gesture,p=point(e);clearGesture();if(blocked())return;
      if(g.key)model.select(g.key);
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
    return {model,update,sync,interrupt,destroy(){dead=true;stop();clearGesture();for(const row of rows.values())restore(row);rows.clear();for(const [n,fn]of Object.entries(listeners))stage.removeEventListener(n,fn);doc.removeEventListener('visibilitychange',visibility);media?.removeEventListener?.('change',preference);art.remove();overlay.remove();hint.remove();clearStage();}};
  }
  return {sceneFor,landscape,createController};
});
