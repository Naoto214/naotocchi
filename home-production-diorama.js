/* Lightweight Home adapter. Existing code owns attendance, art and all care. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;if(root)root.NaotocchiHomeDiorama=api;})(typeof window!=='undefined'?window:null,function(){
  'use strict';
  // Invert the complete painted affine transform, including facing and Motion
  // v2. Only the mask moves in local space; the foreground stays on the artwork.
  function localOcclusionPolygons(polygons,rect,width,height,[a,b,c,d]){
    const x=rect.left-Math.min(0,a*width,c*height,a*width+c*height);
    const y=rect.top-Math.min(0,b*width,d*height,b*width+d*height),det=a*d-b*c;
    if(Math.abs(det)<1e-9)return [];
    return polygons.map(poly=>poly.map(([px,py])=>[(d*(px-x)-c*(py-y))/det,(-b*(px-x)+a*(py-y))/det]));
  }
  function portraitWalkingBounds(b,scene,landscape){
    // Only the home portrait presentation opts out of the legacy body-height
    // screen guard. The original floor polygons and path planner still apply.
    return scene.region==='home'&&!landscape?{...b,top:24,bottom:scene.height-4}:b;
  }
  function residentPaintExtent(actor,height,foot,boxes,fallback){
    if(!boxes?.length||boxes.some(b=>!Number.isFinite(b.y+b.height)||b.height<=0))return fallback;
    return {up:Math.max((actor.extent?.top||actor.h)+12,actor.h*1.08+(actor.w||0)*.12,...boxes.map(b=>foot-(b.y-3)*height/104)),
      down:Math.max(8,actor.extent?.bottom||0,...boxes.map(b=>(b.y+b.height+3)*height/104-foot))};
  }
  function residentInkBand({x,y,top,bottom,up,down},navigation){
    // Continuous drag endpoints can lie anywhere in the original 8px grid cell.
    return [Math.max(top,y-8),y,Math.min(bottom,y+8)].map(y=>{const depth=navigation?.depthScale?.({x,y})||1;return [y,up*depth+5,down*depth+3];});
  }
  // Home presentation boundary. Raw feedback, history and state remain canonical.
  function homeText(text, preserveMilestone = false, hideTransientCounts = false) {
    const prose = String(text || '').replace(hideTransientCounts ? /(?:うんち|おかね|コイン)\s*[+＋−-]\s*\d+(?:\.\d+)?/g : /$^/g, '');
    return prose
      .replace(/そだち\s*[+＋−-]\s*\d+(?:\.\d+)?[：:]\s*(せいちょうした|おとろえでさがった)/g, (_, prose) => preserveMilestone ? prose : '')
      .replace(/(?:おなか|ごきげん|げんき|けんこう|いのち|せいちょう|おとろえ|へんしん|そだち)\s*(?:[+＋−-]|[↑↓])\s*\d+(?:\.\d+)?\s*[%％]?/g, '')
      .replace(/(?:\s*[/／、]\s*){2,}/g, ' / ').replace(/^[\s/／、]+|[\s/／、]+$/g, '').replace(hideTransientCounts ? /変化[：:]\s*$/ : /$^/, '').trim();
  }
  function homeWarnings(state, current) {
    if (!state || ['egg','dead','farewell'].includes(state.stage)) return '';
    const lines=[];
    if (current && ['life','health'].includes(current.kind)) lines.push(current.title+'。'+current.detail);
    if (state.isSick) lines.push('びょうき。くすりでなおそう');
    return lines.join('\n');
  }

  // Presentation only: retain short Japanese grammatical groups as inline
  // boxes. Each box may still wrap when narrower than the available lane.
  // No source text is removed, normalized or stored back into game state.
  let noticeSegmenter;
  function noticeChunks(text) {
    text=String(text??'');
    if(typeof Intl==='undefined'||typeof Intl.Segmenter!=='function')return [text];
    noticeSegmenter ||= new Intl.Segmenter('ja',{granularity:'word'});
    const chunks=[];
    for(const {segment} of noticeSegmenter.segment(text)){
      const last=chunks[chunks.length-1];
      const suffix=/^[ぁ-ゖー]{1,2}$/.test(segment)||/^(から|まで|だけ|けれど|ながら|ので|のに)$/.test(segment);
      const closing=/^[、。，．！？!?：:；;…」』）】〉》]+$/.test(segment);
      const open=last&&/^[「『（【〈《]+$/.test(last);
      if(last&&!/[\s。！？!?]$/.test(last)&&(suffix||closing||open))chunks[chunks.length-1]+=segment;
      else chunks.push(segment);
    }
    return chunks;
  }

  // Display-only sizing. The browser supplies font measurements, not character counts.
  function textLayout(text,width,kind,measure){
    width=Math.max(1,width);text=String(text||'');
    const candidates=kind==='speech'?[[18,1],[17,1],[16,1],[17,2],[16,3],[14,3]]:[[17,1],[16,1],[15,1],[15,2],[14,2],[13,2]];
    let size=candidates[candidates.length-1][0],lines=1;
    for(const [font,maxLines]of candidates){
      let count=1,line='';
      for(const char of text){if(char==='\n'){count++;line='';continue;}
        if(line&&measure(line+char,font)>width){count++;line=char;}else line+=char;}
      size=font;lines=count;if(count<=maxLines)break;
    }
    const natural=Math.max(1,...text.split('\n').map(t=>measure(t,size)));
    return {size,lines,width:Math.min(width,natural+2),compact:lines===1};
  }
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
  // Preserve the official alpha bounds and attachments; seat larger households
  // across depth bands before the shared terrain solver finds walkable ground.
  function layoutTerrainCast(args,k=.8){
    // On short screens the existing document scrolls; keep bodies recognizable.
    if(args.height<380)args={...args,height:380};
    const cast=typeof module==='object'&&module.exports?require('./cast-layout.js'):window.NaotocchiCast;
    const raw=cast.layoutHomeCast(args),boxes=typeof module==='object'&&module.exports?require('./cast-bounds.js'):window.NaotocchiCastBounds;
    const count=1+Number(!!args.hasPartner)+(args.companions?.length||0),crowded=count>5;
    const mainScale=Number.isFinite(args.mainScale)?Math.max(.8,Math.min(1,args.mainScale)):(crowded?1:.85),curved=args.formation!=='distributed',natural=!args.formation||args.formation==='natural';
    const size=Math.min(220,args.width*.62)*k,view=args.overview?.84:1;
    const box=path=>boxes?.[path]?.box||[0,0,128,128];
    const resized=(f,w,path,point)=>{if(!f)return null;const b=box(path),fx=f.x+f.w*(b[0]+b[2])/256,fy=f.y+f.h*b[3]/128+(f.artOffsetY||0),r=w/f.w;return {...f,x:(point?.x??fx)+(f.x-fx)*r,y:(point?.y??fy)+(f.y-fy)*r,w:f.w*r,h:f.h*r,...(f.artOffsetY!==undefined?{artOffsetY:f.artOffsetY*r}:{})};};
    const height=args.height||raw.height,top=30,bottom=Math.max(100,height-64),usable=bottom-top;
    const columns=Math.max(2,Math.round(Math.sqrt(count*(args.width-32)/Math.max(100,usable)))),rows=Math.ceil(count/columns);
    const cw=(args.width-32)/columns,ch=usable/rows,slots=[];
    for(let row=0;row<rows;row++){
      const n=Math.min(columns,count-row*columns),offset=(args.width-n*cw)/2;
      for(let col=0;col<n;col++)slots.push({x:offset+(col+.5)*cw+(row%2?2:-2),y:top+(row+1)*ch-3-(curved?Math.min(9,ch*.12)*(1-Math.pow((col+.5)/n*2-1,2)):0),depth:row/Math.max(1,rows-1)});
    }
    // Foreground centre belongs to the protagonist, then the current partner.
    slots.sort((a,b)=>(bottom-a.y)*2+Math.abs(a.x-args.width/2)-((bottom-b.y)*2+Math.abs(b.x-args.width/2)));
    const sizingSlots=slots.map(p=>({...p}));
    if(natural&&crowded){
      const low=height-16,high=top+ch-3;
      for(const q of slots){const row=q.depth*(rows-1);q.y=rows===1?(high+low)/2:high+(low-high)*q.depth;
        q.x+=row%2?2:-2;q.y+=Math.sin(q.x*.09+row)*2;}
      const centre={x:args.width/2,y:(high+low)/2};
      slots.sort((a,b)=>Math.hypot(a.x-centre.x,(a.y-centre.y)*1.1)-Math.hypot(b.x-centre.x,(b.y-centre.y)*1.1));
      if(count===6){
        const maxBody=Math.min(cw-10,ch-7),upper=maxBody*.8+8,cy=Math.max(height*.6,upper+maxBody+4),rx=(args.width-32)*.37;
        const points=[{x:args.width/2,y:cy},{x:args.width/2-rx,y:cy},{x:args.width/2+rx,y:cy},
          {x:args.width/2,y:upper},{x:args.width/2-rx*.65,y:height-16},{x:args.width/2+rx*.65,y:height-16}];
        slots.splice(0,slots.length,...points);
      }
      // Assign the partner next to the protagonist. The other seats span all depths.
      if(args.hasPartner){const pet=slots[0],rest=slots.splice(1);rest.sort((a,b)=>Math.hypot(a.x-pet.x,a.y-pet.y)-Math.hypot(b.x-pet.x,b.y-pet.y));slots.push(...rest);}
    }
    let index=0;
    function frame(f,path,relative){
      if(!crowded){
        const order=index++,factor=relative===1?mainScale:1;
        // Keep established small casts stable as visitors arrive or leave.
        const density=1;
        const n=count-1,slot=order===0?null:(order-1),angle=n<=1?-.75:Math.PI*(.12+.76*slot/Math.max(1,n-1));
        let point=!curved?null:order===0?{x:args.width/2,y:bottom-12}:{x:args.width/2+Math.cos(angle)*Math.min(args.width*.32,120),y:bottom-28-Math.sin(Math.abs(angle))*Math.min(usable*.26,70)};
        if(natural){
          const cy=Math.max(size*.72, height*.55),rx=Math.min(args.width*.32,120);
          const angles=[.28,Math.PI+ .3,-.85,Math.PI*.72];
          const theta=angles[Math.max(0,order-1)];
          point=order===0?{x:args.width/2,y:cy}:{x:args.width/2+Math.cos(theta)*rx,y:cy+Math.sin(theta)*Math.min(65,height*.22)};
        }
        return resized(f,size*relative*view*density*factor,path,point);
      }
      const sizeSlot=sizingSlots[index],q=slots[index++],b=box(path),body=Math.max(b[2]-b[0],b[3]-b[1])/128;
      const target=Math.min(cw-10,ch-7)*(relative===1?1:.80)*(.94+.06*sizeSlot.depth)*view;
      return resized(f,target/Math.max(.1,body)*(relative===1?mainScale:1),path,q);
    }
    const main=frame(raw.main,args.mainAsset,1),partner=raw.partner?frame(raw.partner,args.partnerAsset,.5):null;
    const attached=(f,old,next)=>f&&old&&next?{...f,x:next.x+(f.x-old.x)*next.w/old.w,y:next.y+(f.y-old.y)*next.w/old.w,w:f.w*next.w/old.w,h:f.h*next.w/old.w}:null;
    return {...raw,height,dioramaScale:k,main,partner,accessory:attached(raw.accessory,raw.main,main),ring:attached(raw.ring,raw.partner,partner),hearts:raw.hearts.map(f=>attached(f,raw.partner,partner)),companions:raw.companions.map((f,i)=>frame(f,args.companions[i],.55))};
  }
  // The accent renderer owns per-stage placement. Read its approved translation
  // in 104-unit SVG coordinates rather than duplicating its private anchor table.
  function sleepAccentShift(transform, originX=50, facing=1) {
    const match=typeof transform==='string'&&transform.match(/^translate\(\s*([-\d.]+)/);
    if(facing!==-1||!match||!Number.isFinite(Number(match[1])))return 0;
    const anchor=(71+Number(match[1]))/104*100;
    return (1-facing)*(originX-anchor);
  }
  function effectPosition(anchor,origin,facing){return origin+(anchor-origin)*(facing<0?-1:1);}
  function effectTrajectory(distance,direction){return distance*(direction<0?-1:1);}
  // Use the existing approved SVG placement; never reflect glyph outlines.
  const accentCenters={sleeping:71,sick:80.5,sulky:79,happy:82,strained:26,hungry:80,tired:80,weak:77.5,critical:76.5,wantsPlay:82};
  const effectPaints=new WeakMap();
  function placeActorEffects(owner,origin,facing,direction){
    const first=owner.querySelector?.('.pet-expression-accent'),old=effectPaints.get(owner);
    if(old&&old.first===first&&old.origin===origin&&old.facing===facing&&old.direction===direction)return;
    effectPaints.set(owner,{first,origin,facing,direction});
    for(const accent of owner.querySelectorAll?.('.pet-expression-accent')||[]){
      if(owner.ownerDocument?.body?.dataset.homeViewportVersion==='12'){const svg=accent.querySelector('svg');if(svg?.getAttribute('viewBox')==='0 0 104 104'){svg.setAttribute('viewBox','-52 -52 208 208');svg.setAttribute('data-home-effect-canvas','expanded');}}
      const kind=Object.keys(accentCenters).find(k=>accent.classList.contains('pet-expression-accent--'+k));
      const group=accent.querySelector('svg > g'),match=group?.getAttribute('transform')?.match(/^translate\(\s*([-\d.]+)/);
      if(!kind||!match)continue;
      const anchor=(accentCenters[kind]+Number(match[1]))/104*100;
      accent.style.translate=(effectPosition(anchor,origin,facing)-anchor)+'% 0';
      if(kind==='sleeping'){
        // Native art keeps the approved right-up design. Reflect positions, not glyphs.
        const paths=group.querySelectorAll('path');
        paths.forEach((path,i)=>path.setAttribute('transform','translate('+((facing<0?-2:0)*[0,11,22.5][Math.floor(i/2)])+' 0)'));
        accent.style.setProperty('--sleep-drift',effectTrajectory(3,facing)+'px');
      }
    }
    owner.dataset.effectFlipped=String(facing<0);
    owner.style.setProperty('--effect-reflect-offset',(2*origin-100)+'%');
  }
  // Transient overlay geometry; neither helper receives or changes a saved entity.
  function speechPlacement({speaker,width,height,bubbleWidth,bubbleHeight,choicesHeight=0}){
    const w=Math.min(bubbleWidth,width-12),h=Math.min(bubbleHeight,height-12),ch=Math.min(choicesHeight,Math.max(0,height-h-12));
    const x=Math.max(6,Math.min(width-w-6,speaker.x-w/2));
    const above=speaker.y-speaker.h-h-12;
    const y=Math.max(6+ch,Math.min(height-h-6,above>=6+ch?above:speaker.y+12));
    return {x,y,w,side:y+h<=speaker.y-speaker.h?'above':'below',choicesMaxHeight:Math.max(0,ch-5),tail:Math.max(12,Math.min(w-12,speaker.x-x))};
  }
  function speechTail(slotTail,slotWidth,bubbleWidth){
    return Math.max(12,Math.min(bubbleWidth-12,slotTail-Math.max(0,(slotWidth-bubbleWidth)/2)));
  }
  function placeGroundProps(count,actors,scene){
    const pet=actors.find(a=>a.kind==='pet');if(!pet||!count)return [];
    const points=[],size=18,limits={left:16,right:scene.width-16,top:Math.max(24,scene.groundTop||24),bottom:scene.height-12};
    const valid=p=>p.x>=limits.left&&p.x<=limits.right&&p.y>=limits.top&&p.y<=limits.bottom&&(!scene.navigation||scene.navigation.valid(p))&&(!scene.visible||scene.visible(p,{w:size,h:size}));
    const free=p=>valid(p)&&actors.every(a=>Math.abs(p.x-a.x)>a.w/2+10||p.y<a.y-a.h-2||p.y-size>a.y+2)&&points.every(q=>Math.hypot(p.x-q.x,p.y-q.y)>size+4);
    const candidates=[];
    for(let r=28;r<=150;r+=20)for(let i=0;i<16;i++)candidates.push({x:pet.x+Math.cos(i*Math.PI/8)*r,y:pet.y+Math.sin(i*Math.PI/8)*r});
    for(let y=limits.bottom;y>=limits.top;y-=20)for(let x=limits.left;x<=limits.right;x+=20)candidates.push({x,y});
    candidates.sort((a,b)=>Math.hypot(a.x-pet.x,a.y-pet.y)-Math.hypot(b.x-pet.x,b.y-pet.y));
    for(const p of candidates)if(free(p)){points.push(p);if(points.length>=count)break;}
    return points;
  }
  function sceneFor(e,width,height,profile={},world={}){
    const floor=Math.max(45,height-12),back=Math.max(32,height*.48);
    return {...e,width,height,floor,back,groundTop:24,centerInitialCast:true,crown:profile.foliage?.crown?.[1]||'#58a666',crownLight:profile.foliage?.crown?.[2]||'#7cc082',
      water:profile.water?.shallow||'#8fd0da',waterDeep:profile.water?.deep||'#2a6f98',ground:profile.ground3d?.[0]||world.ground?.[0]||'#7fb26b',
      path:world.path||'#b7a27a',wall:profile.arch?.palette?.[0]||'#e9e2d4',flowers:profile.cover?.flowers||['#f2a6c0','#ffffff'],
      tags:[{tag:e.region==='city'?'building':'tree',x:width*.22,y:Math.min(floor,back+25)},
        {tag:'shelter',x:width*.22,y:Math.min(floor,back+25)},
        {tag:e.region==='river_lake'?'water':'flower',x:width*.78,y:Math.min(floor,back+32)}]};
  }
  // Device UI preference only: never write the care save or relationship state.
  function createGestureGuide({storage,key='naotocchi-home-guide-v1'}={}){
    let completed=false,replaying=false;
    try{completed=storage?.getItem(key)==='done';}catch(_){}
    const finish=()=>{completed=true;replaying=false;try{storage?.setItem(key,'done');}catch(_){}};
    return {visible:()=>!completed||replaying,replay(){replaying=true;},dismiss:finish,
      drag({actor,success}){if(actor&&success)finish();}};
  }
  function createController({stage,document:doc,env=window,getActors,isBlocked=()=>false,isVisible=()=>true,onGesture=()=>{},onPosition=()=>{},onViewChange=()=>{},getProfile=()=>({}),getWorld=()=>({}),getMeguru=()=>null,guideKey='naotocchi-home-guide-v1'}){
    const displayRect=e=>env.NaotocchiHomeViewport?.presentationRect?.(e)||e.getBoundingClientRect();
    const modelAPI=env.NaotocchiHomeDioramaModel;if(!stage||!modelAPI)return null;
    let enabled=false,dead=false,scene=null,environment=null,flags={},rows=new Map(),raf=0,last=0,gesture=null,sceneKey='',wasBlocked=false;
    let propNodes=[],world=null,worldLoading=false,worldHost=null,activeTime=0,frames=0,frameGaps=[],loadGeneration=0;
    const movedHomeElements=[];
    function placeHomeSlots(on){
      const slot=doc.getElementById?.('homeEventSlot');if(!slot)return;
      if(on){
        // The shared markup keeps the legacy 4+5 meter layout. Only terrain
        // presentation moves the same life node into its daily 5+4 row.
        for(const [id,target]of [['storyFlash',slot],['message',slot],['deathMeterItem',doc.getElementById('careMeters')],['individualityDialog',doc.getElementById('speechSlot')]]){
          const n=doc.getElementById(id);
          if(n?.parentNode&&target&&!movedHomeElements.some(row=>row.n===n)){movedHomeElements.push({n,parent:n.parentNode,next:n.nextSibling});target.appendChild(n);}
        }
      }else if(!on){
        for(const {n,parent,next}of movedHomeElements)parent.insertBefore?parent.insertBefore(n,next?.parentNode===parent?next:null):parent.appendChild?.(n);
        movedHomeElements.length=0;
      }
      if(doc.body)doc.body.dataset.homeTerrain=on?'true':'';
    }
    let guideStorage;try{guideStorage=env.localStorage;}catch(_){}
    const guide=createGestureGuide({storage:guideStorage,key:guideKey});let guideWalk=null;
    const media=env.matchMedia?.('(prefers-reduced-motion: reduce)');
    let overview=false;
    const view=doc.createElement('button'),selectedLabel=doc.createElement('span');
    view.className='diorama-view';view.type='button';view.textContent='みんなを見る';view.hidden=true;
    selectedLabel.className='diorama-selected-label';selectedLabel.hidden=true;
    stage.appendChild(view);stage.appendChild(selectedLabel);
    view.addEventListener('click',()=>{overview=!overview;view.textContent=overview?'いつもの表示':'みんなを見る';view.setAttribute('aria-pressed',String(overview));onViewChange(overview);});
    const art=doc.createElement('div'),overlay=doc.createElement('div'),marker=doc.createElement('span'),hint=doc.createElement('span');
    art.className='diorama-art';overlay.className='diorama-overlay';marker.className='diorama-target';hint.className='diorama-hint';
    art.setAttribute('aria-hidden','true');overlay.setAttribute('aria-hidden','true');marker.hidden=true;hint.textContent='タップで選択・ドラッグでおさんぽ';
    stage.appendChild(art);stage.appendChild(overlay);overlay.appendChild(marker);(doc.getElementById?.('homeGestureGuide')||stage).appendChild(hint);
    function showGuide(){const walking=guideWalk&&model.snapshot().some(a=>a.key===guideWalk&&a.target&&a.source==='drag');if(!walking)guideWalk=null;hint.hidden=!enabled||(!guide.visible()&&!walking);const slot=doc.getElementById?.('homeGestureGuide');if(slot)slot.hidden=hint.hidden;}
    function emit(event){if(event.type==='tap'||event.type==='environment')onGesture(event.actor,event.environmentTags.includes('tree')?'curious':'look');
      if(env.CustomEvent)stage.dispatchEvent(new env.CustomEvent('naotocchi:home-reaction',{detail:event}));}
    const model=modelAPI.createModel({onEvent:emit});
    // One-shot presentation request from a real hatch, never inferred from save age.
    let newbornPending=false;
    function ensureWorld(){
      const M=getMeguru();if(!M||worldLoading||world||!doc.body)return;
      worldLoading=true;const generation=++loadGeneration;worldHost=doc.createElement('div');worldHost.className='home-living-world';worldHost.setAttribute('aria-hidden','true');doc.body.appendChild(worldHost);
      import('./home-production-world.mjs').then(mod=>{if(generation!==loadGeneration||dead||!enabled)return;
        world=mod.createHomeWorld({M,container:worldHost,document:doc,window:env,
          getGroundAnchor:()=>scene?displayRect(stage).top-displayRect(worldHost).top+scene.floor*.8:undefined,
          onStatus:(mode,error)=>{stage.dataset.worldRenderer=mode;if(error)stage.dataset.worldError=error;else delete stage.dataset.worldError;doc.body.dataset.livingHome=mode;}});
        worldLoading=false;world.setEnvironment(environment);if(scene){scene.navigation=world.navigation(displayRect(stage));scene.visualPoints=world.observationPoints?.(scene.navigation)||[];scene.visible=visibleAt;sync();}
      }).catch(error=>{if(generation!==loadGeneration)return;worldLoading=false;stage.dataset.worldRenderer='unavailable';stage.dataset.worldError=String(error.message);});
    }
    function clearWorld(){loadGeneration++;worldLoading=false;world?.destroy();world=null;worldHost?.remove();worldHost=null;if(doc.body)delete doc.body.dataset.livingHome;}

    const blocked=()=>!enabled||doc.visibilityState==='hidden'||!!flags.paused||isBlocked();
    function clearGesture(){if(gesture){try{stage.releasePointerCapture(gesture.pointerId);}catch(_){}gesture=null;}marker.hidden=true;}
    function interrupt(){clearGesture();model.cancel();paint();}
    function clearStage(){const poop=doc.getElementById?.('poopRow');if(poop){delete poop.dataset.groundKey;for(const n of [...poop.children]){n.style.left='';n.style.top='';n.style.visibility='';n.style.scale='';n.style.transformOrigin='';}}for(const k of Object.keys(stage.dataset))if(k.startsWith('diorama')||k.startsWith('world')||k==='livingMetrics')delete stage.dataset[k];}
    function restore(row){for(const image of row.owner.querySelectorAll?.('.character-asset')||[]){for(const key of ['mask-image','-webkit-mask-image','mask-position','-webkit-mask-position','mask-size','-webkit-mask-size','mask-repeat','-webkit-mask-repeat','mask-clip','-webkit-mask-clip'])image.style.removeProperty(key);}effectPaints.delete(row.owner);for(const accent of row.owner.querySelectorAll?.('.pet-expression-accent')||[]){accent.style.translate='';accent.style.removeProperty('--sleep-drift');const svg=accent.querySelector('svg[data-home-effect-canvas]');if(svg){svg.setAttribute('viewBox','0 0 104 104');svg.removeAttribute('data-home-effect-canvas');}for(const path of accent.querySelectorAll('path'))path.removeAttribute('transform');}delete row.owner.dataset.effectFlipped;row.owner.style.removeProperty('--effect-reflect-offset');onPosition(row,0,0);for(const n of [row.owner,...(row.attachments||[])]){n.style.translate='';n.style.scale='';n.style.transformOrigin='';n.style.zIndex='';n.style.maskImage='';n.style.webkitMaskImage='';n.style.maskPosition='';n.style.webkitMaskPosition='';n.style.maskClip='';n.style.webkitMaskClip='';delete n.dataset.dioramaActor;delete n.dataset.dioramaSelected;delete n.dataset.dioramaWalking;delete n.dataset.dioramaActivity;delete n.dataset.dioramaDirection;n.style.removeProperty('--diorama-facing');n.style.removeProperty('--diorama-origin');n.style.removeProperty('--diorama-sleep-shift');}
      for(const [k,v]of Object.entries(row.original||{}))v===null?row.owner.removeAttribute?.(k):row.owner.setAttribute(k,v);row.shadow.remove();}
    const occlusionCache=new Map();
    function polygonsAt(p){
      const q=scene?.navigation?.unproject(p);if(!q||!world)return [];
      const key=[scene.region,world.stats().projectionRevision,Math.round(q.x/24),Math.round(q.z/24)].join(':');
      if(!occlusionCache.has(key)){if(occlusionCache.size>1200)occlusionCache.clear();occlusionCache.set(key,world.occlusion(q));}
      return occlusionCache.get(key);
    }
    const displayBoundsCache=new Map();
    function actorBounds(a,b){
      const v=env.NaotocchiHomeViewport,p=v?.residentPresentation?.(),row=rows.get(a.key),ink=row?.paintExtent;
      if(doc.body?.dataset.homeDisplayVersion==='18'&&p&&!p.landscape)return portraitWalkingBounds(b,scene,false);
      if(!['17','18'].includes(doc.body?.dataset.homeDisplayVersion)||!p?.landscape||!ink||!scene?.navigation||!Number.isFinite(p.safeTop+p.safeBottom))return b;
      const r=displayRect(stage),key=JSON.stringify([a.key,b,ink,p,r.left,r.top]);
      if(displayBoundsCache.has(key))return displayBoundsCache.get(key);
      const at=y=>{const depth=scene.navigation.depthScale({x:(b.left+b.right)/2,y}),foot=p.y+(r.top+y-p.y)*p.scaleY;return {depth,top:foot-(ink.up*depth+5)*p.bodyScale,bottom:foot+(ink.down*depth+3)*p.bodyScale};};
      let top=null,bottom=null,maxDepth=0;
      // The old body-height clamp is a portrait screen guard, not a floor edge.
      // Landscape may use the existing floor above it; navigation still rejects
      // walls/furniture and the permanent display lanes remain authoritative.
      const start=Math.min(b.top,scene.navigation.project({x:.5,z:0}).y);
      for(let y=start;y<=b.bottom+.001;y=Math.min(b.bottom,y+1)){
        const q=at(y);if(q.top>=p.safeTop&&q.bottom<=p.safeBottom){top??=y;bottom=y;maxDepth=Math.max(maxDepth,q.depth);}
        if(y===b.bottom)break;
      }
      // Keep the original bounds if no full-body interval exists. Such a viewport
      // is unsupported; do not silently shrink the approved resident size.
      if(top===null)return b;
      const side=(ink.side*maxDepth+5)*p.bodyScale;
      const left=Math.max(b.left,(p.safeLeft+side-p.x)/p.scaleX-(r.left-p.x));
      const right=Math.min(b.right,(p.safeRight-side-p.x)/p.scaleX-(r.left-p.x));
      const result={left:Math.min(left,right),right:Math.max(left,right),top,bottom};
      if(displayBoundsCache.size>128)displayBoundsCache.clear();displayBoundsCache.set(key,result);return result;
    }
    function paintForeground(a,row){
      if(!world||!scene?.navigation||!env.DOMMatrix)return;
      const vp=env.NaotocchiHomeViewport,p=vp?.residentPresentation?.(),host=displayRect(worldHost);
      const polygons=polygonsAt(a).map(poly=>poly.map(([x,y])=>p?[p.x+(host.left+x-p.x)*p.scaleX,p.y+(host.top+y-p.y)*p.scaleY]:[host.left+x,host.top+y]));
      for(const n of [...row.owner.querySelectorAll('.character-asset'),...(row.attachments||[])]){
        const r=n.getBoundingClientRect();
        const near=polygons.filter(poly=>Math.max(...poly.map(q=>q[0]))>=r.left&&Math.min(...poly.map(q=>q[0]))<=r.right&&Math.max(...poly.map(q=>q[1]))>=r.top&&Math.min(...poly.map(q=>q[1]))<=r.bottom);
        if(!near.length){if(n.style.maskImage){n.style.maskImage=n.style.webkitMaskImage='';}continue;}
        let m=new env.DOMMatrix();
        for(let e=n;e&&e.nodeType===1;e=e.parentElement){
          const css=env.getComputedStyle(e),scale=css.scale==='none'||!css.scale?[1,1]:css.scale.split(/\s+/).map(Number);
          const angle=css.rotate==='none'?0:parseFloat(css.rotate)||0,deg=css.rotate?.endsWith('rad')?angle*180/Math.PI:css.rotate?.endsWith('turn')?angle*360:angle;
          const zoom=parseFloat(css.zoom)||1;
          const own=new env.DOMMatrix().rotate(deg).scale((scale[0]||1)*zoom,(scale[1]??scale[0]??1)*zoom).multiply(new env.DOMMatrix(css.transform==='none'?undefined:css.transform));
          m=own.multiply(m);
        }
        const css=env.getComputedStyle(n),w=parseFloat(css.width)||n.offsetWidth,h=parseFloat(css.height)||n.offsetHeight;
        const local=localOcclusionPolygons(near,r,w,h,[m.a,m.b,m.c,m.d]);
        const svg='<svg xmlns="http://www.w3.org/2000/svg" width="'+w+'" height="'+h+'" viewBox="0 0 '+w+' '+h+'"><defs><mask id="m"><rect width="100%" height="100%" fill="white"/>'+local.map(ps=>'<polygon fill="black" points="'+ps.map(q=>q.map(v=>v.toFixed(3)).join(',')).join(' ')+'"/>').join('')+'</mask></defs><rect width="100%" height="100%" fill="white" mask="url(#m)"/></svg>';
        const url='url("data:image/svg+xml,'+encodeURIComponent(svg)+'")';
        n.style.maskImage=n.style.webkitMaskImage=url;n.style.maskSize=n.style.webkitMaskSize='100% 100%';n.style.maskPosition=n.style.webkitMaskPosition='0px 0px';n.style.maskRepeat=n.style.webkitMaskRepeat='no-repeat';n.style.maskClip=n.style.webkitMaskClip='no-clip';
      }
    }
    function visibleAt(p,a){
      if(!world||!scene?.navigation)return true;
      const polys=polygonsAt(p);if(!polys.length)return true;
      const stageRect=displayRect(stage),host=displayRect(worldHost);
      const inside=(x,y,poly)=>{let yes=false;for(let i=0,j=poly.length-1;i<poly.length;j=i++){const u=poly[i],v=poly[j];if((u[1]>y)!==(v[1]>y)&&x<(v[0]-u[0])*(y-u[1])/(v[1]-u[1])+u[0])yes=!yes;}return yes;};
      // Keep the face and body centre visible; true triangle masks still cover feet/edges.
      return [.22,.5,.8].every(f=>[-.3,0,.3].every(x=>!polys.some(poly=>inside(p.x+a.w*x+stageRect.left-host.left,p.y-a.h*f+stageRect.top-host.top,poly))));
    }
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
      let newbornPoint=null;
      const newborn=list.find(a=>a.kind==='pet');
      if(newbornPending&&newborn&&scene.navigation){
        const r=displayRect(stage),pane=stage.closest?.('.screen-frame')?.getBoundingClientRect()||r;
        const x=(Math.max(r.left,pane.left)+Math.min(r.right,pane.right))/2-r.left;
        const y=(Math.max(r.top,pane.top)+Math.min(r.bottom,pane.bottom))/2-r.top;
        newbornPoint={x,y:y+newborn.h/2};
        // Depth scales about the foot. Include it when centring the painted body.
        for(let i=0;i<3;i++)newbornPoint.y=y+newborn.h*(scene.navigation.depthScale?.(newbornPoint)||1)/2;
      }
      rows=next;view.hidden=!enabled||rows.size<=5;model.sync([...rows.values()].map(({key,kind,id,x,y,w,h,extent,temperament})=>({key,kind,id,x,y,w,h,extent:{...extent,top:Math.max(extent?.top||h,h)+12},temperament})),{...scene,newbornPoint});
      if(newbornPoint)newbornPending=false;
      publishPaintEnvelope();
      // A newly rendered shape has no measured ink until the pass above. Seat
      // it against that ink before its first paint, not at the next UI update.
      if(['17','18'].includes(doc.body?.dataset.homeDisplayVersion)&&env.NaotocchiHomeViewport?.residentPresentation?.()?.landscape&&model.snapshot().some(a=>{const b=model.bounds(a);return a.x<b.left||a.x>b.right||a.y<b.top||a.y>b.bottom;})){
        model.sync([...rows.values()].map(({key,kind,id,x,y,w,h,extent,temperament})=>({key,kind,id,x,y,w,h,extent:{...extent,top:Math.max(extent?.top||h,h)+12},temperament})),{...scene,newbornPoint:null});
      }
      paint();
    }
    let residentEnvelopeKey='';
    function publishResidentEnvelope(){
      if(!['13','14','15','16','17','18'].includes(doc.body?.dataset.homeDisplayVersion))return;
      const v15=['15','16','17','18'].includes(doc.body.dataset.homeDisplayVersion),depthAware=v15||doc.body.dataset.homeDisplayVersion==='14',vertical=new Map(),fitVertical=new Map();
      const key=JSON.stringify([doc.body.dataset.homeDisplayVersion==='18'?env.NaotocchiHomeViewport?.residentPresentation?.()?.landscape:null,scene.width,scene.height,world?.stats().projectionRevision,...[...rows.values()].map(r=>[r.key,r.asset,r.w,r.h,r.extent])]);
      if(key===residentEnvelopeKey)return;residentEnvelopeKey=key;
      let left=Infinity,right=-Infinity,top=Infinity,bottom=-Infinity,above=0,below=0,side=0;
      for(const a of model.snapshot()){
        const row=rows.get(a.key);if(!row)continue;
        const base=modelAPI.bounds(a,{...scene,actorBounds:null}),b=doc.body.dataset.homeDisplayVersion==='18'?portraitWalkingBounds(base,scene,env.NaotocchiHomeViewport?.residentPresentation?.()?.landscape!==false):base,h=parseFloat(row.owner.style.height)||row.h,foot=row.y-(parseFloat(row.owner.style.top)||0);
        let up=Math.max(a.extent?.top||a.h,a.h*1.08+a.w*.12),down=Math.max(8,a.extent?.bottom||0),wide=Math.max(a.extent?.left||a.w/2,a.extent?.right||a.w/2);
        if(a.kind==='pet')for(const kind of Object.keys(accentCenters)){
          const html=env.NaotocchiPetExpression?.accentFor?.(row.asset,kind)||'',m=html.match(/translate\(\s*[-\d.]+[ ,]+([-\d.]+)/);if(!m)continue;
          up=Math.max(up,foot-(2+Number(m[1]))*h/104);down=Math.max(down,(46+Number(m[1]))*h/104-foot);
          wide=Math.max(wide,h*.55);
        }
        let paint={up,down};
        if(v15&&a.kind==='pet'&&doc.createElement){
          // Measure the approved SVG paths, including their existing translations.
          // Keep this independent of the currently visible expression and model bounds.
          const probe=doc.createElement('div');probe.style.cssText='position:absolute;visibility:hidden;pointer-events:none';
          const boxes=[];let measurable=true;stage.appendChild(probe);
          try{for(const kind of Object.keys(accentCenters)){
            const html=env.NaotocchiPetExpression?.accentFor?.(row.asset,kind)||'';if(!html)continue;
            probe.innerHTML=html;const svg=probe.querySelector?.('svg');if(!svg?.getBBox){measurable=false;break;}
            const b=svg.getBBox();boxes.push({y:b.y,height:b.height});
          }}catch(_){measurable=false;}finally{probe.remove();}
          paint=residentPaintExtent(row,h,foot,measurable?boxes:null,paint);
        }
        row.paintExtent={...paint,side:wide};
        let maxDepth=1;
        // Read the existing navigation grid, without making a new walkable region.
        for(let y=b.top;y<=b.bottom+.001;y+=Math.min(8,Math.max(1,b.bottom-y))) {
          for(let x=b.left;x<=b.right+.001;x+=Math.min(8,Math.max(1,b.right-x))){
            if(!scene.navigation||scene.navigation.valid({x,y})){
              left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);
              const depth=scene.navigation?.depthScale?.({x,y})||1;
              maxDepth=Math.max(maxDepth,depth);
              if(v15)for(const [sy,sup,sdown]of residentInkBand({x,y,top:b.top,bottom:b.bottom,up:paint.up,down:paint.down},scene.navigation)){
                const ink=fitVertical.get(sy)||[0,0];fitVertical.set(sy,[Math.max(ink[0],sup),Math.max(ink[1],sdown)]);
              }
              if(depthAware)for(const [sy,sup,sdown]of residentInkBand({x,y,top:b.top,bottom:b.bottom,up,down},scene.navigation)){
                const ink=vertical.get(sy)||[0,0];vertical.set(sy,[Math.max(ink[0],sup),Math.max(ink[1],sdown)]);top=Math.min(top,sy);bottom=Math.max(bottom,sy);
              }
            }
          }
        }
        above=Math.max(above,up*maxDepth+5);below=Math.max(below,down*maxDepth+3);side=Math.max(side,wide*maxDepth+5);
      }
      if(!Number.isFinite(left))return;
      const value={left,right,top,bottom,above,below,side,width:scene.width,height:scene.height,count:rows.size};
      if(v15)value.fitVertical=[...fitVertical].sort((a,b)=>a[0]-b[0]).map(([y,ink])=>[y,...ink]);
      if(depthAware)value.vertical=[...vertical].sort((a,b)=>a[0]-b[0]).map(([y,ink])=>[y,...ink]);
      if(JSON.stringify(value)===JSON.stringify(stage.__homeResidentEnvelope))return;
      stage.__homeResidentEnvelope=value;
      if(env.CustomEvent)stage.dispatchEvent(new env.CustomEvent('home-paint-envelope'));
    }
    function publishPaintEnvelope(){
      publishResidentEnvelope();
      if(doc.body?.dataset.homeViewportVersion!=='12')return;
      let top=Infinity,bottom=-Infinity;
      for(const a of model.snapshot()){
        const row=rows.get(a.key);if(!row)continue;
        const b=modelAPI.bounds(a,{...scene,actorBounds:null}),frameHeight=parseFloat(row.owner.style.height)||row.h;
        const foot=row.y-(parseFloat(row.owner.style.top)||0);
        let above=Math.max(a.extent?.top||a.h,a.h*1.08+a.w*.12),below=Math.max(6,a.extent?.bottom||0);
        // Reserve every expression, not just the currently visible mark.
        if(a.kind==='pet')for(const kind of Object.keys(accentCenters)){
          const html=env.NaotocchiPetExpression?.accentFor?.(row.asset,kind)||'';
          const m=html.match(/translate\(\s*[-\d.]+[ ,]+([-\d.]+)/);if(!m)continue;
          const dy=Number(m[1]);
          above=Math.max(above,foot-(2+dy)*frameHeight/104);
          below=Math.max(below,(46+dy)*frameHeight/104-foot);
        }
        for(const y of [b.top,(b.top+b.bottom)/2,b.bottom]){
          const d=scene.navigation?.depthScale?.({x:(b.left+b.right)/2,y})||1;
          top=Math.min(top,y-above*d-24);bottom=Math.max(bottom,y+below*d+24);
        }
      }
      if(!Number.isFinite(top))return;
      const value={top:Math.floor(top+1e-4),bottom:Math.ceil(bottom-1e-4),width:Math.round(scene.width*100)/100,height:Math.round(scene.height*100)/100};
      if(JSON.stringify(value)===JSON.stringify(stage.__homePaintEnvelope))return;
      stage.__homePaintEnvelope=value;
      if(env.CustomEvent)stage.dispatchEvent(new env.CustomEvent('home-paint-envelope'));
    }
    let paintedBodyScale=null,bodyScaleTime=0,paintedLandscape=null;
    function paint(){
      // Care and visibility changes can interrupt before activation or after exit.
      // In those states the legacy Home owns the cast and poop presentation.
      if(dead||!enabled||!scene)return;
      showGuide();
      const snapshot=model.snapshot(),chosen=snapshot.find(a=>a.key===model.selected()),isPaused=blocked(),revision=world?.stats().projectionRevision||0;
      selectedLabel.hidden=!chosen||!enabled;selectedLabel.textContent=chosen?(rows.get(chosen.key)?.label||chosen.id):'';
      const presentation=env.NaotocchiHomeViewport?.residentPresentation?.();
      if(presentation){
        const now=env.performance?.now?.()||Date.now(),elapsed=now-bodyScaleTime;bodyScaleTime=now;
        if(paintedBodyScale===null||paintedLandscape!==presentation.landscape||Math.abs(paintedBodyScale-presentation.bodyScale)<.001)paintedBodyScale=presentation.bodyScale;
        else paintedBodyScale+=(presentation.bodyScale-paintedBodyScale)*Math.min(1,elapsed/120);
        paintedLandscape=presentation.landscape;paintedBodyScale=Math.min(paintedBodyScale,presentation.bodyScaleLimit);
      }else {paintedBodyScale=null;paintedLandscape=null;}
      const sx=presentation?.scaleX||1,sy=presentation?.scaleY||1,bod=paintedBodyScale??1;
      for(const a of snapshot){
        const row=rows.get(a.key);if(!row)continue;
        const dx=a.x-row.x,dy=a.y-row.y,depthScale=scene.navigation?.depthScale?.(a)||1;
        // A visual can be replaced on sleep/wake without moving its actor.
        const sleep=row.owner.querySelector?.('.pet-expression-accent--sleeping > svg > g');
        row.owner.style.setProperty('--diorama-sleep-shift',sleepAccentShift(sleep?.getAttribute?.('transform'),row.originX??50,facingScale(row,a.direction))+'%');
        placeActorEffects(row.owner,row.originX??50,facingScale(row,a.direction),a.direction);
        const stamp=[sx,sy,bod,depthScale.toFixed(4),dx.toFixed(2),dy.toFixed(2),a.activity,a.direction,!!a.target,model.selected()===a.key,isPaused,revision,row.x,row.y,row.w,row.h].join(':');
        if(row.paintStamp===stamp){if(['17','18'].includes(doc.body?.dataset.homeDisplayVersion))paintForeground(a,row);onPosition(a,dx,dy);continue;}row.paintStamp=stamp;
        for(const n of [row.owner,...(row.attachments||[])]){
          n.style.translate=`${dx.toFixed(2)}px ${dy.toFixed(2)}px`;
          // Individual scale composes with Motion v2's transform. Pin every
          // sibling attachment to the same painted foot in stage coordinates.
          n.style.transformOrigin=(row.x-(parseFloat(n.style.left)||0))+'px '+(row.y-(parseFloat(n.style.top)||0))+'px';
          n.style.scale=presentation?`${depthScale*bod/sx} ${depthScale*bod/sy}`:String(depthScale);
        }
        row.owner.style.zIndex=String(Math.round(a.y));
        row.owner.dataset.dioramaSelected=String(model.selected()===a.key);row.owner.setAttribute('aria-pressed',String(model.selected()===a.key));
        row.owner.dataset.dioramaActivity=a.activity;
        row.owner.style.setProperty('--diorama-facing',String(facingScale(row,a.direction)));
        row.owner.style.setProperty('--diorama-origin',(row.originX??50)+'% 100%');
        row.owner.dataset.dioramaWalking=String(!!a.target&&!isPaused&&!media?.matches);row.owner.dataset.dioramaDirection=String(a.direction);
        row.shadow.style.scale=presentation?`${bod/sx} ${bod/sy}`:'';row.shadow.style.transformOrigin='0 0';
        row.shadow.style.left=a.x+'px';row.shadow.style.top=a.y+'px';row.shadow.style.width=Math.max(20,a.w*.8*depthScale)+'px';row.shadow.dataset.selected=String(model.selected()===a.key);
        if(['17','18'].includes(doc.body?.dataset.homeDisplayVersion))paintForeground(a,row);
        else if(world&&scene.navigation&&doc.createElementNS&&world.stats().renderer?.objects>0){
          const point=scene.navigation.unproject(a),host=displayRect(worldHost);
          const cacheKey=point?[Math.round(point.x/24),Math.round(point.z/24),host.width,host.height,scene.region,world.stats().projectionRevision,scene.groundTop,scene.floor].join(':'):'';
          if(point&&row.maskKey!==cacheKey){
            row.maskKey=cacheKey;const polygons=polygonsAt(a);
            // Extend only the transparent mask canvas, preserving world polygon coordinates.
            const maskPad=doc.body?.dataset.homeViewportVersion==='12'?256:0;row.maskPad=maskPad;
            row.maskURL=polygons.length?'url("data:image/svg+xml,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="'+(host.width+2*maskPad)+'" height="'+(host.height+2*maskPad)+'" viewBox="'+(-maskPad)+' '+(-maskPad)+' '+(host.width+2*maskPad)+' '+(host.height+2*maskPad)+'"><defs><mask id="m"><rect x="'+(-maskPad)+'" y="'+(-maskPad)+'" width="'+(host.width+2*maskPad)+'" height="'+(host.height+2*maskPad)+'" fill="white"/>'+polygons.map(ps=>'<polygon fill="black" points="'+ps.map(p=>p.map(v=>v.toFixed(1)).join(',')).join(' ')+'"/>').join('')+'</mask></defs><rect x="'+(-maskPad)+'" y="'+(-maskPad)+'" width="'+(host.width+2*maskPad)+'" height="'+(host.height+2*maskPad)+'" fill="white" mask="url(#m)"/></svg>')+'")':'';
          }
          const maskPose=[sx,sy,bod,depthScale.toFixed(4),cacheKey,dx.toFixed(2),dy.toFixed(2),row.x,row.y,row.w,row.h].join(':');
          if(row.lastMaskPose!==maskPose){row.lastMaskPose=maskPose;
          for(const n of (doc.body?.dataset.homeViewportVersion==='12'?[...row.owner.querySelectorAll('.character-asset'),...(row.attachments||[])]:[row.owner,...(row.attachments||[])])){const r=displayRect(n);n.style.maskImage=n.style.webkitMaskImage=row.maskURL||'';n.style.maskSize=n.style.webkitMaskSize=((host.width+2*(row.maskPad||0))/(depthScale*bod/sx))+'px '+((host.height+2*(row.maskPad||0))/(depthScale*bod/sy))+'px';n.style.maskPosition=n.style.webkitMaskPosition=((host.left-r.left-(row.maskPad||0))/(depthScale*bod/sx))+'px '+((host.top-r.top-(row.maskPad||0))/(depthScale*bod/sy))+'px';n.style.maskRepeat=n.style.webkitMaskRepeat='no-repeat';n.style.maskClip=n.style.webkitMaskClip='no-clip';}}
        }
        onPosition(a,dx,dy);
      }
      const poop=doc.getElementById?.('poopRow');
      if(poop?.children?.length){
        const key=[revision,scene.width,scene.height,poop.children.length,...snapshot.map(a=>[a.key,Math.round(a.x/4),Math.round(a.y/4),a.w,a.h].join(','))].join(':');
        if(poop.dataset.groundKey!==key||propNodes.length!==poop.children.length||propNodes.some((n,i)=>n!==poop.children[i])){
          propNodes=[...poop.children];
          poop.dataset.groundKey=key;const points=placeGroundProps(poop.children.length,snapshot,scene);
          [...poop.children].forEach((n,i)=>{const p=points[i];n.style.visibility=p?'visible':'hidden';if(p){n.style.left=(p.x-9)+'px';n.style.top=(p.y-18)+'px';}});
        }
      }
      if(poop&&!poop.children.length){propNodes=[];delete poop.dataset.groundKey;}
      if(presentation){marker.style.scale=`${bod/sx} ${bod/sy}`;marker.style.transformOrigin='0 0';selectedLabel.style.scale=`${1/sx} ${1/sy}`;selectedLabel.style.transformOrigin='0 0';for(const n of poop?.children||[]){n.style.scale=`${bod/sx} ${bod/sy}`;n.style.transformOrigin='9px 18px';}}else {marker.style.scale='';selectedLabel.style.scale='';for(const n of poop?.children||[])n.style.scale='';}
      const selected=chosen;
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
      if(!next){placeHomeSlots(false);enabled=false;view.hidden=true;selectedLabel.hidden=true;showGuide();stop();clearWorld();clearGesture();for(const row of rows.values())restore(row);rows.clear();model.sync([],{...e,width:350,height:240,tags:[]});clearStage();art.hidden=true;overlay.hidden=true;hint.hidden=true;return;}
      enabled=true;placeHomeSlots(true);stage.dataset.diorama=e.region;stage.dataset.dioramaReduced=String(!!media?.matches);stage.dataset.dioramaTier=String(f.tier||0);stage.dataset.dioramaTime=e.time;stage.dataset.dioramaWeather=e.weather;
      art.hidden=false;overlay.hidden=false;showGuide();
      const r=displayRect(stage);scene=sceneFor(e,r.width,r.height,getProfile(e.region),getWorld(e.region));
      const key=JSON.stringify([e,r.width,r.height,f.tier]);if(key!==sceneKey){sceneKey=key;art.innerHTML='';clearGesture();}
      ensureWorld();world?.setEnvironment(e);if(world){scene.navigation=world.navigation(displayRect(stage));scene.visualPoints=world.observationPoints?.(scene.navigation)||[];}scene.visible=visibleAt;scene.actorBounds=actorBounds;sync();stage.dataset.dioramaPaused=String(blocked());
      if(blocked()&&!wasBlocked){interrupt();wasBlocked=true;}
      if(!blocked()){wasBlocked=false;model.step(0,{blocked:false,reducedMotion:!!media?.matches,heldActor:gesture?(gesture.key||model.selected()):null});}resume();
    }
    function point(e){const r=displayRect(stage);const p=env.NaotocchiHomeViewport?.unscalePoint?.({x:e.clientX,y:e.clientY})||{x:e.clientX,y:e.clientY};return {x:p.x-r.left,y:p.y-r.top};}
    function hit(p,target){
      const items=model.snapshot().sort((a,b)=>b.y-a.y);
      const owner=target?.closest?.('[data-diorama-actor]');
      const v=env.NaotocchiHomeViewport?.residentPresentation?.(),kx=v?(paintedBodyScale??v.bodyScale)/v.scaleX:1,ky=v?(paintedBodyScale??v.bodyScale)/v.scaleY:1;
      const bodyHit=a=>Math.abs(p.x-a.x)<=a.w*kx/2&&p.y>=a.y-a.h*ky&&p.y<=a.y;
      // PNG frames include transparent padding. A foreground frame must not steal a visible visitor.
      for(const a of items){const row=rows.get(a.key);if(bodyHit(a)&&(target===row.owner||owner===row.owner))return a.key;}
      for(const a of items)if(bodyHit(a))return a.key;
      const padded=items.filter(a=>Math.abs(p.x-a.x)<=Math.max(22,a.w/2)&&p.y>=a.y-Math.max(44,a.h)&&p.y<=a.y+10);
      padded.sort((a,b)=>Math.hypot(p.x-a.x,p.y-a.y+a.h/2)-Math.hypot(p.x-b.x,p.y-b.y+b.h/2));
      if(padded.length)return padded[0].key;
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
      if(g.drag||!g.key){const success=model.move(g.key||model.selected(),p,g.drag?'drag':'ground');if(g.drag){if(g.key&&success&&guide.visible())guideWalk=g.key;guide.drag({actor:!!g.key,success});showGuide();}}
      paint();resume();e.preventDefault();}
    function keydown(e){if(blocked())return;const owner=e.target?.closest?.('[data-diorama-actor]');const key=[...rows.values()].find(row=>e.target===row.owner||owner===row.owner)?.key;if(!key)return;
      if(e.key==='Enter'||e.key===' '){model.select(key);paint();e.preventDefault();return;}
      const delta={ArrowLeft:[-24,0],ArrowRight:[24,0],ArrowUp:[0,-16],ArrowDown:[0,16]}[e.key];
      if(delta){const a=model.snapshot().find(a=>a.key===key);model.select(key);model.move(key,{x:a.x+delta[0],y:a.y+delta[1]},'keyboard');paint();resume();e.preventDefault();}}
    function visibility(){if(doc.visibilityState==='hidden'){interrupt();stop();stage.dataset.dioramaPaused='true';}else if(environment)update(environment,flags);}
    function preference(){if(environment)update(environment,flags);}
    let lastSafePresentation='';
    function presentationChanged(){
      const p=env.NaotocchiHomeViewport?.residentPresentation?.();
      const key=['17','18'].includes(doc.body?.dataset.homeDisplayVersion)?JSON.stringify([p?.landscape,p?.safeTop,p?.safeBottom,p?.scaleX,p?.scaleY,p?.bodyScale,p?.world,[...rows.values()].map(r=>[r.key,r.w,r.h,r.paintExtent])]):'';
      if(key!==lastSafePresentation){lastSafePresentation=key;displayBoundsCache.clear();occlusionCache.clear();for(const row of rows.values()){row.maskKey='';row.paintStamp='';}sync();}else paint();
    }
    const listeners={'home-presentation':presentationChanged,pointerdown:down,pointermove:move,pointerup:up,pointercancel:clearGesture,lostpointercapture:clearGesture,keydown};
    for(const [name,fn]of Object.entries(listeners))stage.addEventListener(name,fn);
    doc.addEventListener('visibilitychange',visibility);media?.addEventListener?.('change',preference);
    return {model,update,sync,interrupt,prepareNewborn(){newbornPending=true;},overview:()=>overview,replayGuide(){guideWalk=null;guide.replay();showGuide();},dismissGuide(){guideWalk=null;guide.dismiss();showGuide();},destroy(){placeHomeSlots(false);dead=true;stop();clearWorld();clearGesture();for(const row of rows.values())restore(row);rows.clear();for(const [n,fn]of Object.entries(listeners))stage.removeEventListener(n,fn);doc.removeEventListener('visibilitychange',visibility);media?.removeEventListener?.('change',preference);view.remove();selectedLabel.remove();art.remove();overlay.remove();hint.remove();clearStage();}};
  }
  return {portraitWalkingBounds,localOcclusionPolygons,residentPaintExtent,residentInkBand,noticeChunks,textLayout,homeText,homeWarnings,sceneFor,createGestureGuide,createController,facingScale,crowdScale,scaleLayout,layoutTerrainCast,sleepAccentShift,effectPosition,effectTrajectory,placeActorEffects,speechPlacement,speechTail,placeGroundProps};
});

