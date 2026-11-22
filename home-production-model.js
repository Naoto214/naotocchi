/* Ephemeral presentation only. Never receives saved entities or gameplay RNG. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;if(root)root.NaotocchiHomeDioramaModel=api;})(typeof window!=='undefined'?window:null,function(){
  'use strict';
  const supported=region=>['forest','river_lake','city','countryside','sea','snow','mountain','jungle','desert','deepsea','star_stop','memory_lake','home'].includes(region);
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  function bounds(a,s){
    const ext=a.extent||{},bottom=Math.max(24,s.height-12-(ext.bottom||0)),top=Math.min(bottom,Math.max((ext.top||a.h)+18,s.groundTop||s.height*.51));
    const left=Math.min(s.width/2,(ext.left||a.w/2)+12),right=Math.max(left,s.width-(ext.right||a.w/2)-12);
    const b={left,right,top,bottom};return s.actorBounds?s.actorBounds(a,b):b;
  }
  function limit(a,p,s){const b=bounds(a,s);return {x:clamp(p.x,b.left,b.right),y:clamp(p.y,b.top,b.bottom)};}
  function clearance(a,p,b){return Math.hypot((p.x-b.x)/((a.w+b.w)*.5+10),(p.y-b.y)/((a.h+b.h)*.38+10));}
  function separated(a,p,b){return clearance(a,p,b)>=1;}
  // In unit-ellipse coordinates the squared distance is convex along a line.
  // From inside, a nonnegative initial derivative guarantees continuous escape.
  function contactSegmentSafe(from,to,peer,rx,ry){
    const x=(from.x-peer.x)/rx,y=(from.y-peer.y)/ry;
    const dx=(to.x-from.x)/rx,dy=(to.y-from.y)/ry,dot=x*dx+y*dy;
    if(x*x+y*y<1)return dot>=0;
    const t=clamp(-dot/(dx*dx+dy*dy||1),0,1);
    return (x+t*dx)**2+(y+t*dy)**2>=1;
  }
  // Production packing owns every regional seat. If navigation separated the
  // partner, try the original cast offset against the already seated household.
  function seatInitialPartner(actors,lead,mate,offset,scene,exit,painted,view){
    const nav=scene.navigation,box=bounds(mate,scene);
    const sees=scene.planVisibility?.(mate)||(p=>!scene.visible||scene.visible(p,mate));
    const scale=view?.x>0&&view?.y>0&&view?.body>0?view:null;
    const side=offset.x<0?-1:1;
    const spacing=Math.max(Math.hypot(offset.x,offset.y),(lead.w+mate.w)*.5+10);
    const goal={x:lead.x+side*spacing,y:lead.y};
    const distance=(a,b)=>Math.hypot(a.x-b.x,(a.y-b.y)*(scale?scale.y/scale.x:1));
    const checkPaint=!!(painted?.(lead)||painted?.(mate));
    function inkGap(p){
      if(!scale)return 0;
      const a=(nav.depthScale?.(lead)||1)*scale.body,b=(nav.depthScale?.(p)||1)*scale.body;
      const dy=(p.y-lead.y)*scale.y;
      return dy>=mate.h*b||dy<=-lead.h*a?0:(lead.w*a+mate.w*b)*.5/scale.x;
    }
    if(scale&&Math.abs(offset.y)>Math.abs(offset.x)&&spacing-distance(offset,{x:0,y:0})>10){
      goal.y=lead.y+offset.y;
      goal.x=lead.x+side*Math.max(Math.abs(offset.x),inkGap(goal)+.5/scale.x);
    }
    function fits(p){
      return p.x>=box.left&&p.x<=box.right&&p.y>=box.top&&p.y<=box.bottom&&
        actors.every(a=>a===mate||separated(mate,p,a))&&
        Math.abs(p.x-lead.x)>=inkGap(p)&&nav.valid(p)&&sees(p)&&(!checkPaint||painted(p));
    }
    // Leave a safe, already-close regional seat untouched. Only consider
    // alternatives closer to the lead than the partner's packed position.
    const start=distance(lead,mate),intended=distance(lead,goal);
    if(start<=intended+1&&fits(mate))return;
    let best=null,score=Infinity;
    function consider(p){
      let d=distance(p,goal);
      if(d>=score||distance(lead,p)>start||!fits(p))return;
      // Favor an open exit between similarly close seats. A possible future
      // walk must not force the partner to open on the opposite side of the scene.
      if(exit.length&&!contactSegmentSafe(exit[0],exit.at(-1),p,(mate.w+lead.w)*.5+10,(mate.h+lead.h)*.38+10))d+=4;
      if(d<score){best=p;score=d;}
    }
    consider(goal);
    if(score>0){
      // A portrait camera compresses depth. Include the whole painted
      // neighborhood and the exact ink bounds, even when a grid step misses an edge.
      const radius=spacing*1.5,depthRadius=scale?radius*scale.x/scale.y:radius;
      const left=Math.max(box.left,lead.x-radius),right=Math.min(box.right,lead.x+radius);
      const top=Math.max(box.top,lead.y-depthRadius),bottom=Math.min(box.bottom,lead.y+depthRadius);
      for(let y=top;y<bottom+2;y+=2)for(let x=left;x<right+2;x+=2){
        const p={x:Math.min(x,right),y:Math.min(y,bottom)};
        if(distance(lead,p)<=radius)consider(p);
      }
    }
    if(best){mate.x=best.x;mate.y=best.y;}
  }
  function privateRandom(){const bytes=new Uint32Array(1);if(typeof crypto!=='undefined'&&crypto.getRandomValues)crypto.getRandomValues(bytes);let seed=bytes[0]||Date.now()>>>0||1;return ()=>{seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;return (seed>>>0)/4294967296;};}
  function createModel({random=privateRandom(),onEvent=()=>{}}={}){
    let actors=[],scene={},selected=null,clock=0,idleAt=5,paused=false;
    const manualGoals=new Map();let retryingKey=null;
    const cooldown=new Map(),stats={distance:0,moves:0,turns:0,activities:{}};
    function activity(a,name){a.activity=name;if(name!=='observe'&&name!=='rest'&&name!=='walk'){a.visualReaction=undefined;a.visualTarget=null;}stats.activities[name]=(stats.activities[name]||0)+1;a.recent=[...(a.recent||[]),name].slice(-2);}
    function defer(a,seconds){a.nextAt=clock+seconds;}
    function trait(a,key){return clamp(Number(a.temperament?.[key])||3,1,5);}
    const actor=key=>actors.find(a=>a.key===key);
    function tagsAt(a){return (scene.tags||[]).filter(t=>Math.hypot(a.x-t.x,a.y-t.y)<66).map(t=>t.tag);}
    function emit(type,a,source='ambient',listener=null){
      const key=a.key+':'+type,delay=source==='ambient'?6:.65;
      if(clock-(cooldown.get(key)??-Infinity)<delay)return;
      cooldown.set(key,clock);
      const near=actors.filter(b=>b!==a&&Math.hypot(a.x-b.x,a.y-b.y)<100).map(b=>Object.freeze({key:b.key,id:b.id,kind:b.kind,relationship:b.kind==='pet'?'self':b.kind}));
      onEvent(Object.freeze({version:1,type,source,actor:Object.freeze({key:a.key,id:a.id,kind:a.kind}),region:scene.region,
        listener:listener&&Object.freeze({key:listener.key,id:listener.id,kind:listener.kind}),
        environmentTags:Object.freeze(tagsAt(a)),nearby:Object.freeze(near),relationship:a.kind==='pet'?'self':a.kind,silent:true}));
    }
    function visible(a,p){return !scene.visible||scene.visible(p,a);}
    function free(a,p){return visible(a,p)&&actors.every(b=>b===a||separated(a,p,b));}
    function socialDestination(a,b,preferred){
      // Arrival emits social only inside 100 native pixels. The old width-based
      // approach could end outside that circle even on an unobstructed floor.
      // Keep the same contact ellipse and let the normal planner/stepper walk
      // there; never move the listener or substitute a nearby bystander.
      const box=bounds(a,scene);
      const fits=p=>Math.hypot(p.x-b.x,p.y-b.y)<100&&p.x>=box.left&&p.x<=box.right&&p.y>=box.top&&p.y<=box.bottom&&free(a,p)&&(!scene.navigation||scene.navigation.valid(p));
      if(fits(preferred))return preferred;
      const dx=preferred.x-b.x,dy=preferred.y-b.y,angle=Math.atan2(dy,dx),distance=Math.hypot(dx,dy);
      for(let i=0;i<16;i++){
        // Prefer the original side; a wide resident may only fit above/below.
        const offset=i===0?0:Math.ceil(i/2)*(i%2?1:-1)*Math.PI/8;
        const ux=Math.cos(angle+offset),uy=Math.sin(angle+offset);
        const contact=1/clearance(a,{x:b.x+ux,y:b.y+uy},b);
        if(contact+1>99)continue;
        // One pixel of clearance at each boundary exceeds the stepper's 0.5px
        // arrival tolerance without changing either collision or speech range.
        const radius=clamp(distance,contact+1,99),p={x:b.x+ux*radius,y:b.y+uy*radius};
        if(fits(p))return p;
      }
      return null;
    }
    function referenceDestination(a,p,b=scene.referenceBounds?.(a),nav=scene.navigation,freePoint){
      if(!b||!nav?.referenceNearest)return null;
      const point=nav.referenceNearest({x:clamp(p.x,b.left,b.right),y:clamp(p.y,b.top,b.bottom)},b,freePoint);
      const safe=bounds(a,scene);if(!point||point.x<safe.left||point.x>safe.right||point.y<safe.top||point.y>safe.bottom||!freePoint(point))return null;
      return {point,bounds:b};
    }
    function destination(a,p,nav=scene.navigation,freePoint){
      if(nav)return nav.nearest(nav.rawDestination?p:limit(a,p,scene),bounds(a,scene),freePoint);
      const q=limit(a,p,scene);if(freePoint(q))return q;
      let best=null,dist=Infinity;
      for(let r=20;r<=120;r+=20)for(let i=0;i<16;i++){
        const c=limit(a,{x:q.x+Math.cos(i*Math.PI/8)*r,y:q.y+Math.sin(i*Math.PI/8)*r*.6},scene);
        const d=Math.hypot(c.x-q.x,c.y-q.y);if(d<dist&&freePoint(c)){best=c;dist=d;}
      }
      return best;
    }
    function cancel(){manualGoals.clear();for(const a of actors){if(a.target)a.target=null;a.route=[];a.activity='rest';a.visualReaction=undefined;a.visualTarget=null;a.nextAt=Math.min(a.nextAt||clock+2,clock+2);}idleAt=clock+2;}
    let pendingPair=null;
    function finishSeating(painted,view){const pending=pendingPair;pendingPair=null;pending?.place?.(painted,view);}
    function sync(list,next,deferPair=false){
      const changed=next.region!==scene.region||next.width!==scene.width||next.height!==scene.height||next.navigation!==scene.navigation;
      const previousScene=scene,previousActors=actors;
      const exitPolicyChanged=!!next.fiveResidentExit!==!!scene.fiveResidentExit;
      // Returning from the preview's reserved lane uses the regular terrain
      // seats again. Ordinary syncs keep residents where the player left them.
      const restoreSeats=exitPolicyChanged&&!next.fiveResidentExit&&list.length===5;
      const retained=new Set(next.region===scene.region?actors.map(a=>a.key):[]);
      scene={...next,tags:(next.tags||[]).map(t=>({...t}))};
      // Centre first seating in the actually walkable band (water/roads may cut
      // away the upper screen). Never re-centre an established player's position.
      let terrainCentre=null;
      const main=list.find(a=>a.kind==='pet');
      if(scene.centerInitialCast&&scene.navigation&&!scene.navigation.initialPoint&&main&&(!previousActors.length||previousScene.region!==scene.region)){
        const b=bounds(main,scene),points=[];
        for(let y=b.top;y<=b.bottom;y+=12)for(let x=b.left;x<=b.right;x+=20)if(scene.navigation.valid({x,y})&&visible(main,{x,y}))points.push({x,y});
        if(points.length){const ys=points.map(p=>p.y);terrainCentre=scene.navigation.nearest({x:scene.width/2,y:(Math.min(...ys)+Math.max(...ys))/2},b,p=>visible(main,p));}
      }
      const enteringTerrain=!previousScene.navigation||previousScene.region!==scene.region;
      // Additional painted paths extend walking. Opening feet and the lead's
      // reserved exit still use the regional floor on which the cast was laid out.
      const packingNav=(enteringTerrain&&scene.navigation?.layoutNavigation)||scene.navigation;
      const partner=list.find(a=>a.kind==='partner');
      const seatPair=main&&partner&&packingNav?.initialPoint&&(enteringTerrain||!retained.has(partner.key));
      actors=list.filter(a=>['pet','companion','partner'].includes(a.kind)&&Number.isFinite(a.x+a.y+a.w+a.h)).map((a,index)=>{
        const reflow=list.length>5&&(next.width!==previousScene.width||next.height!==previousScene.height||list.length!==previousActors.length||list.some(a=>previousActors.find(b=>b.key===a.key)?.w!==a.w));
        const initial=packingNav?.initialPoint&&(restoreSeats||enteringTerrain||((!partner||a.kind==='companion')&&list.length>5&&list.length!==previousActors.length)||!previousActors.some(b=>b.key===a.key));
        const seed=initial?(a.kind==='pet'&&scene.newbornPoint&&(!previousScene.navigation||!previousActors.some(b=>b.key===a.key))?scene.newbornPoint:packingNav.initialPoint(index,list.length)):null;
        const old=!initial&&!changed&&!reflow&&actor(a.key),previous=!initial&&previousScene.region===scene.region?previousActors.find(b=>b.key===a.key):null,worldPoint=previous&&previousScene.navigation?.unproject(previous),preserved=worldPoint&&scene.navigation?scene.navigation.project(worldPoint):previous,limited=limit(a,old||preserved||seed||(a.kind==='pet'&&terrainCentre)||a,scene),p=previous&&scene.navigation?.reachable&&scene.navigation.valid(limited)&&visible(a,limited)?limited:packingNav?.nearest(limited,bounds(a,scene))||limited;
        return {...a,...p,route:old?.route?.map(p=>({...p}))||[],temperament:{...a.temperament},target:old&&old.w===a.w&&old.h===a.h&&old.target?limit(a,old.target,scene):null,activity:old?.activity||'rest',direction:old?.direction||1,source:old?.source||'ambient',pointerDrop:!!old?.pointerDrop,yieldFor:old?.yieldFor,yieldAfter:old?.yieldAfter,manualUntil:previousActors.find(b=>b.key===a.key)?.manualUntil??0,nextAt:old?.nextAt??clock+1+random()*3,lastWalk:old?.lastWalk??clock-12,recent:old?.recent||[],after:old?.after||'observe',faceKey:old?.faceKey||null,visualReaction:old?.visualReaction,visualTarget:old?.visualTarget,nextVisualAt:old?.nextVisualAt||0};
      });
      // At capacity, individually separated seats can still form a closed ring
      // around the main character. Reserve one short, terrain-safe exit while
      // arranging a new/reflowed cast. Ordinary syncs never move established
      // residents merely to recreate this initial corridor.
      let exit=[];
      const lead=actors.find(a=>a.kind==='pet');
      const arrange=changed||exitPolicyChanged||actors.length!==previousActors.length||actors.some(a=>{const b=previousActors.find(b=>b.key===a.key);return !b||a.w!==b.w||a.h!==b.h;});
      if(lead&&(actors.length>5||scene.fiveResidentExit)&&arrange&&packingNav?.segmentSafe){
        const length=Math.max(40,lead.w*1.2),options=[];
        for(let i=0;i<8;i++){
          const end=limit(lead,{x:lead.x+Math.cos(i*Math.PI/4)*length,y:lead.y+Math.sin(i*Math.PI/4)*length},scene);
          if(Math.hypot(end.x-lead.x,end.y-lead.y)<length*.8||!packingNav.segmentSafe(lead,end,p=>visible(lead,p)))continue;
          const points=[];
          // Sample the same three-pixel spacing used by terrain routes.
          for(let j=0,n=Math.ceil(length/3);j<=n;j++)points[j]={x:lead.x+(end.x-lead.x)*j/n,y:lead.y+(end.y-lead.y)*j/n};
          options.push({points,cost:actors.filter(a=>a!==lead&&points.some(p=>!separated(lead,p,a))).length});
        }
        options.sort((a,b)=>a.cost-b.cost);exit=options[0]?.points||[];
      }
      // Keep established actors stable; seat new/reshaped arrivals in the nearest free spot.
      const seated=[];
      for(const a of [...actors].sort((a,b)=>Number(retained.has(b.key))-Number(retained.has(a.key)))){
        const fits=p=>(!packingNav||packingNav.valid(p))&&seated.every(b=>separated(a,p,b))&&visible(a,p)&&(a===lead||exit.every(q=>separated(lead,q,{...a,x:p.x,y:p.y})));
        if(!fits(a)&&(arrange||!retained.has(a.key)||!visible(a,a)||scene.navigation&&!scene.navigation.valid(a))){
          const b=bounds(a,scene),candidates=[];
          for(let y=b.top;y<=b.bottom+7;y+=8)for(let x=b.left;x<=b.right+7;x+=8){
            const p=limit(a,{x,y},scene);candidates.push({...p,d:Math.hypot(p.x-a.x,p.y-a.y)});
          }
          // Test nearest candidates first. Visibility involves projected mesh
          // triangles; scanning every closer candidate from the top was costly
          // for 28 residents, while the chosen nearest legal seat is identical.
          candidates.sort((a,b)=>a.d-b.d);let best=candidates.find(fits);
          // A narrow painted path cannot always fit 28 fully separated bodies.
          // Keep every foot on the path and preserve the pet's reserved exit;
          // among those seats minimize overlap with already seated residents.
          if(!best&&a!==lead&&exit.length){
            const allowed=candidates.filter(p=>(!packingNav||packingNav.valid(p))&&visible(a,p)&&exit.every(q=>separated(lead,q,{...a,x:p.x,y:p.y})));
            const overlap=p=>seated.reduce((sum,b)=>sum+Math.max(0,1-clearance(a,p,b))**2,0);
            allowed.sort((p,q)=>overlap(p)-overlap(q)||p.d-q.d);best=allowed[0];
          }
          if(best){Object.assign(a,{x:best.x,y:best.y});a.target=null;a.activity='rest';}
        }
        seated.push(a);
      }
      // The first viewport fit may still replace both camera and ink bounds.
      // Keep the regional pack intact until the controller is ready to paint.
      if(seatPair)pendingPair={key:partner.key,region:scene.region,exit:[]};
      const mate=pendingPair&&lead&&actor(pendingPair.key);
      if(!mate||pendingPair.region!==scene.region)pendingPair=null;
      if(pendingPair){
        if(arrange)pendingPair.exit=exit;
        const reservedExit=pendingPair.exit;
        const offset={x:partner.x-main.x,y:partner.y-main.y};
        pendingPair.place=(painted,view)=>seatInitialPartner(actors,lead,mate,offset,scene,reservedExit,painted,view);
        if(!deferPair)finishSeating();
      }
      if(!actor(selected))selected=null;
      if(changed){cancel();cooldown.clear();}
      else for(const [key,request] of manualGoals){
        if(!request.pointerDrop)continue;
        const resident=actor(key);
        if(!resident){stopYield(key);manualGoals.delete(key);continue;}
        // A native sync can change ink bounds, body sizes or ground while all
        // feet stay put. Recheck at the scheduled time using the original goal.
        request.peers=null;
        if(!resident.target&&request.nextAt===Infinity){resident.route=[];request.nextAt=clock+1;}
      }
    }
    function stopYield(key){
      const helper=manualGoals.get(key)?.yieldPeer;
      if(!helper)return;
      const peer=actor(helper);
      if(peer?.yieldFor!==key)return;
      peer.yieldFor=null;
      if(peer.target&&peer.source==='yield'){peer.target=null;peer.route=[];activity(peer,'rest');defer(peer,2);}
    }
    function releaseHelper(a){
      if(!a.yieldFor)return;
      a.yieldFor=null;
      if(a.source==='yield'){a.target=null;a.route=[];a.source='ambient';activity(a,'rest');}
    }
    function select(key){const a=actor(key);if(!a||paused)return false;releaseHelper(a);stopYield(key);manualGoals.delete(key);selected=key;a.visualReaction=undefined;a.visualTarget=null;a.target=null;a.route=[];a.manualUntil=clock+12;defer(a,4);emit('tap',a,'tap');idleAt=clock+4;return true;}
    function dragDestination(a,goal,box,routeFree,freePoint,handoff,findRoute){
      const nav=scene.navigation,{x:sx,y:sy}=nav.intentScale||{x:1,y:1};
      const distance=(p,q)=>Math.hypot((p.x-q.x)*sx,(p.y-q.y)*sy);
      const length=distance(a,goal);
      const peers=actors.filter(b=>b!==a).map(b=>({x:b.x,y:b.y,rx:(a.w+b.w)*.5+10,ry:(a.h+b.h)*.38+10}));
      // Across each complete segment, a new contact is forbidden. Inside an
      // existing ellipse the squared distance must increase from the start.
      function safe(from,to){
        if(to.x<box.left||to.x>box.right||to.y<box.top||to.y>box.bottom)return false;
        return peers.every(b=>contactSegmentSafe(from,to,b,b.rx,b.ry))&&nav.segmentSafe(from,to,routeFree);
      }
      const target=limit(a,goal,scene);
      const error=q=>distance(q,goal);
      function cost(q){
        if(!q||distance(a,q)<2)return Infinity;
        const miss=error(q),gain=length-miss;
        const forward=((q.x-a.x)*(goal.x-a.x)*sx*sx+(q.y-a.y)*(goal.y-a.y)*sy*sy)/length;
        // A remote partial must close at least one quarter of the gap, and
        // most of its motion must follow the finger rather than slip sideways.
        return gain>1e-5&&(miss<=24||gain>=length/4&&forward>=distance(a,q)*.75)?miss:Infinity;
      }
      function routeLength(path){
        let total=0,from=a;
        for(const to of path){total+=distance(from,to);from=to;}
        return total;
      }
      function prefer(candidate,other){
        if(!candidate.length)return false;
        const end=candidate.at(-1),miss=cost(end);
        if(!Number.isFinite(miss))return false;
        if(!other.length)return true;
        const prior=other.at(-1),before=cost(prior);
        if(Math.abs(miss-before)>.75)return miss<before;
        const progress=q=>((q.x-a.x)*(goal.x-a.x)*sx*sx+(q.y-a.y)*(goal.y-a.y)*sy*sy)/length;
        const gain=Math.min(length,progress(end))-Math.min(length,progress(prior));
        if(Math.abs(gain)>.75)return gain>0;
        const travel=routeLength(candidate)-routeLength(other);
        if(Math.abs(travel)>.75)return travel<0;
        const gap=q=>peers.reduce((g,b)=>Math.min(g,Math.hypot((q.x-b.x)/b.rx,(q.y-b.y)/b.ry)),Infinity);
        const clearanceGain=gap(end)-gap(prior);
        if(Math.abs(clearanceGain)>.01)return clearanceGain>0;
        return miss<before;
      }
      const result=(path,closest=false,verifiedHandoff=false)=>({point:path.at(-1),path,closest,verifiedHandoff,cost,safe,prefer});
      const checkedRoute=q=>{
        const path=findRoute(q);
        return path.length&&distance(path.at(-1),q)<1e-5&&path.every((end,i)=>safe(i?path[i-1]:a,end))?path:[];
      };
      let path=[],best=length;
      if(Number.isFinite(cost(target))){
        if(safe(a,target))return result([target],true);
        if(nav.valid(target)&&routeFree(target)){
          path=checkedRoute(target);if(path.length)return result(path,true);
        }
      }
      // A neighbor may have opened the previously checked handoff. Revalidate
      // the whole segment against live feet; another resident can have entered.
      const handoffOpen=handoff&&Number.isFinite(cost(handoff))&&safe(a,handoff);
      if(handoffOpen){path=[handoff];best=error(handoff);}
      // On each ray the projection is the point closest to the release.
      // Bisect the continuous safe prefix, including narrow sub-grid gaps.
      const angle=Math.atan2((goal.y-a.y)*sy,(goal.x-a.x)*sx);
      for(let i=-11;i<=11;i++){
        const turn=i*Math.PI/24,heading=angle+turn;
        const at=r=>({x:a.x+Math.cos(heading)*r/sx,y:a.y+Math.sin(heading)*r/sy});
        let hi=length*Math.cos(turn),lo=0,q=at(hi);
        if(error(q)>=best||hi<2)continue;
        if(!safe(a,q)){
          for(let j=0;j<10;j++){const mid=(lo+hi)/2;if(safe(a,at(mid)))lo=mid;else hi=mid;}
          q=at(lo);
        }
        const score=cost(q);if(score<best){path=[q];best=score;}
      }
      // A nearby free seat can require a detour even when the requested foot
      // was occupied. Let the normal graph find that route and verify its end.
      const nearest=nav.nearest(target,box,freePoint);
      if(cost(nearest)<best){
        const detour=checkedRoute(nearest);if(detour.length)path=detour;
      }
      // Inspect a bounded neighborhood of the released foot. The nearest
      // connected off-grid point can lie around a corner, away from all the
      // direct rays and on the far side of the nearest free grid node.
      let pivots;
      function shortPivots(){
        if(pivots)return pivots;
        pivots=[];
        const reach=Math.min(20,length);
        for(const fraction of [.3,.6,1])for(let j=0;j<24;j++){
          const theta=angle+j*Math.PI/12,r=fraction*reach;
          if(r*Math.cos(theta-angle)<-Math.min(4,length/3))continue;
          const q={x:a.x+r*Math.cos(theta)/sx,y:a.y+r*Math.sin(theta)/sy};
          if(safe(a,q))pivots.push(q);
        }
        return pivots;
      }
      const radius=Math.min(24,length);
      for(const r of [2,4,7,11,16,24]){
        if(r>=radius||path.length&&r>error(path.at(-1))+.75)break;
        for(let j=0;j<16;j++){
          const direction=angle+j*Math.PI/8;
          const q={x:goal.x+r*Math.cos(direction)/sx,y:goal.y+r*Math.sin(direction)/sy};
          const forward=((q.x-a.x)*(goal.x-a.x)*sx*sx+(q.y-a.y)*(goal.y-a.y)*sy*sy)/length;
          if(!Number.isFinite(cost(q))||r>4&&(distance(a,q)<3||forward<2||length-r<.75)||!routeFree(q)||!nav.valid(q))continue;
          if(safe(a,q)){if(prefer([q],path))path=[q];continue;}
          for(const pivot of shortPivots()){
            const walk=[pivot,q];
            if(routeLength(walk)>length+Math.min(24,length))continue;
            if(prefer(walk,path)&&safe(pivot,q))path=walk;
          }
        }
      }
      return result(path,false,!!handoffOpen&&path.length&&error(path.at(-1))<=error(handoff)+.75);
    }
    // A manual drop may ask one idle neighbor to make room. Both routes are
    // checked without changing a foot; only the normal stepper moves residents.
    function offerYield(a,request){
      if(request.yieldTried||a.target||request.expires<=clock||actors.some(b=>b.source==='yield'&&b.target))return false;
      request.yieldTried=true;
      const nav=scene.navigation,scale=nav?.intentScale;
      if(!nav?.segmentSafe||!scale)return false;
      const sx=scale.x,sy=scale.y,goal=request.point;
      const dx=(goal.x-a.x)*sx,dy=(goal.y-a.y)*sy,length=Math.hypot(dx,dy);
      if(length<4)return false;
      const box=bounds(a,scene),canSee=scene.planVisibility?.(a)||(q=>visible(a,q));
      const inside=(q,b)=>q.x>=b.left&&q.x<=b.right&&q.y>=b.top&&q.y<=b.bottom;
      const obstacles=actors.filter(b=>b!==a).map(b=>({actor:b,rx:(a.w+b.w)*.5+10,ry:(a.h+b.h)*.38+10}));
      const heading=Math.atan2(dy,dx),options=[];
      // Probe the exact point first, then nearer forward projections. Sub-grid
      // positions matter when the desired step is smaller than a terrain cell.
      const distances=[1,.75,.5,.375];
      for(let turn=-16;turn<=16;turn++){
        const angle=turn*Math.PI/36,ux=Math.cos(heading+angle),uy=Math.sin(heading+angle);
        for(const fraction of distances){
          const r=length*Math.cos(angle)*fraction;
          const q={x:a.x+ux*r/sx,y:a.y+uy*r/sy};
          const miss=Math.hypot((q.x-goal.x)*sx,(q.y-goal.y)*sy);
          const forward=r*Math.cos(angle),gain=length-miss;
          if(r<3||gain<Math.min(3,length/4)||miss>24&&(gain<length/4||forward<r*.75)||!inside(q,box))continue;
          let only=null;
          for(const o of obstacles)if(!contactSegmentSafe(a,q,o.actor,o.rx,o.ry)){
            if(only){only=null;break;}only=o;
          }
          if(!only)continue;
          const peer=only.actor;
          if(peer.target||peer.key===selected||clock<peer.manualUntil||clock<(peer.yieldAfter||0)||manualGoals.has(peer.key))continue;
          options.push({q,miss,forward,length:r,only});
        }
      }
      options.sort((u,v)=>u.miss-v.miss||v.forward-u.forward||u.length-v.length);
      const clearances=new Map();
      function possibleSteps(b){
        if(clearances.has(b))return clearances.get(b);
        const limits=bounds(b,scene),items=[];
        const see=scene.planVisibility?.(b)||(q=>visible(b,q));
        const others=actors.filter(o=>o!==b).map(o=>({actor:o,rx:(b.w+o.w)*.5+10,ry:(b.h+o.h)*.38+10}))
          .filter(o=>Math.abs(b.x-o.actor.x)<=o.rx+24/sx&&Math.abs(b.y-o.actor.y)<=o.ry+24/sy);
        for(const r of [3,6,9,12,15,18,21,24])for(let i=0;i<48;i++){
          const angle=i*Math.PI/24;
          const p={x:b.x+r*Math.cos(angle)/sx,y:b.y+r*Math.sin(angle)/sy};
          if(!inside(p,limits)||!others.every(o=>contactSegmentSafe(b,p,o.actor,o.rx,o.ry)))continue;
          items.push({p,r,clear:null});
        }
        const moves={items,see};clearances.set(b,moves);return moves;
      }
      let best=null;
      for(const option of options){
        if(best&&option.miss>best.miss+1)break;
        const {q,only,miss}=option,b=only.actor;
        if(!nav.segmentSafe(a,q,canSee))continue;
        const {items,see}=possibleSteps(b);
        for(const item of items){
          if(best&&miss>=best.miss-1&&item.r>best.r)break;
          if(!contactSegmentSafe(a,q,item.p,only.rx,only.ry))continue;
          item.clear??=nav.segmentSafe(b,item.p,see);
          if(!item.clear)continue;
          const gap=Math.hypot((q.x-item.p.x)/only.rx,(q.y-item.p.y)/only.ry);
          if(!best||miss<best.miss-1||item.r<best.r||item.r===best.r&&(miss<best.miss||miss===best.miss&&gap>best.gap))
            best={peer:b,p:item.p,q,r:item.r,miss,gap};
        }
      }
      if(!best)return false;
      const b=best.peer;
      b.faceKey=null;b.visualTarget=null;b.visualReaction=undefined;b.pointerDrop=true;
      b.route=[];b.target=best.p;b.source='yield';b.yieldFor=a.key;b.yieldAfter=clock+3;activity(b,'walk');b.lastWalk=clock;
      defer(b,2);stats.moves++;
      request.yieldPeer=b.key;request.handoff=best.q;request.nextAt=clock+.15;
      return true;
    }
    function move(key,p,source='tap',{pointerDrop=false}={}){
      const a=actor(key);if(!a||paused||!Number.isFinite(p?.x+p?.y))return false;
      if(source==='ambient'&&(clock<a.manualUntil||a.target&&a.source!=='ambient'))return false;
      if(source!=='ambient'&&retryingKey!==key){releaseHelper(a);stopYield(key);a.manualUntil=clock+12;}
      if(source!=='ambient'&&scene.navigation?.intentAware&&retryingKey!==key)manualGoals.set(key,{point:{x:p.x,y:p.y},direction:{x:Math.sign(p.x-a.x),y:Math.sign(p.y-a.y)},source,pointerDrop,expires:clock+12,retries:0,nextAt:clock+1});
      if(source==='ambient'&&actors.filter(b=>b.target&&b.source==='ambient').length>=(actors.length>15?2:actors.length>5?3:5))return false;
      const retreats=(q,r)=>['x','y'].some(axis=>(q[axis]-r[axis])*Math.sign(p[axis]-a[axis])< -1e-7);
      // A cramped fallback seat may already overlap. Allow only escape that
      // does not worsen that overlap; step() still requires strict improvement.
      const canSee=scene.planVisibility?.(a)||((point)=>visible(a,point));
      // Only this synchronous plan shares occupancy results. A retry, another
      // resident's plan, and every accepted motion step see the live cast again.
      const obstacles=actors.filter(b=>b!==a).map(b=>({x:b.x,y:b.y,rx:(a.w+b.w)*.5+10,ry:(a.h+b.h)*.38+10,initial:clearance(a,a,b)}));
      const occupancy=new Map();
      function available(point){
        let row=occupancy.get(point.y);
        if(!row){row=new Map();occupancy.set(point.y,row);}
        if(row.has(point.x))return row.get(point.x);
        // 2 is strictly clear. 1 permits only escape from existing contact.
        let result=2;
        for(const item of obstacles){
          const dx=(point.x-item.x)/item.rx,dy=(point.y-item.y)/item.ry;
          if(Math.abs(dx)>=1||Math.abs(dy)>=1)continue;
          const separation=Math.hypot(dx,dy);
          if(separation>=1)continue;
          if(!(item.initial<1&&separation>=item.initial-1e-9)){result=0;break;}
          result=1;
        }
        if(result&&!canSee(point))result=0;
        row.set(point.x,result);return result;
      }
      const freePoint=point=>available(point)===2,routeFree=point=>available(point)>0;
      const safeBounds=bounds(a,scene),referenceFree=p=>p.x>=safeBounds.left&&p.x<=safeBounds.right&&p.y>=safeBounds.top&&p.y<=safeBounds.bottom&&routeFree(p);
      // Different fallback branches can ask for the identical failed route.
      // Only this synchronous pointer command shares results, including [].
      // Distinct reference grids, bounds and passability predicates stay separate.
      const queries=pointerDrop?[]:null;
      function routeQuery(nav,method,point,box,check){
        if(!queries)return nav[method](a,point,box,check);
        const prior=queries.find(r=>r.nav===nav&&r.method===method&&r.check===check&&r.x===point.x&&r.y===point.y&&
          r.box.left===box.left&&r.box.right===box.right&&r.box.top===box.top&&r.box.bottom===box.bottom);
        if(prior)return prior.path;
        const path=nav[method](a,point,box,check);
        queries.push({nav,method,check,x:point.x,y:point.y,box,path});
        return path;
      }
      const currentRoute=(point,nav=scene.navigation)=>nav?routeQuery(nav,'route',point,safeBounds,pointerDrop?referenceFree:routeFree):[point];
      const referenceRoute=(nav,point,box)=>routeQuery(nav,'referenceRoute',point,box,referenceFree);
      // Pure planning permits a complete V4 comparison, including its stable
      // grid and supplemental route, without changing scene or actor state.
      const plan=nav=>{
        const proposal=destination(a,p,nav,freePoint),originalReference=referenceDestination(a,p,undefined,nav,freePoint);
        const expandedReference=scene.referenceBounds?.(a)?referenceDestination(a,p,safeBounds,nav,freePoint):null;
        const reference=expandedReference&&(!originalReference||!retreats(expandedReference.point,originalReference.point))?expandedReference:originalReference;
        const preferReference=reference&&(!proposal||Math.hypot(proposal.x-reference.point.x,proposal.y-reference.point.y)<1e-7||retreats(proposal,reference.point));
        let q=preferReference?reference.point:proposal;
        const oldRoute=()=>referenceRoute(nav,reference.point,reference.bounds);
        let path=preferReference?oldRoute():q?currentRoute(q,nav):[];
        if(!path.length&&preferReference)path=currentRoute(q,nav);
        if(!path.length&&preferReference&&proposal){q=proposal;path=currentRoute(q,nav);}
        if(!path.length&&!preferReference&&reference){q=reference.point;path=oldRoute();if(!path.length)path=currentRoute(q,nav);}
        if(!path.length&&originalReference&&originalReference!==reference){q=originalReference.point;path=referenceRoute(nav,q,originalReference.bounds);if(!path.length)path=currentRoute(q,nav);}
        if(nav?.reachable){
          const prior=path.length?q:null,score=prior?Math.hypot(prior.x-p.x,prior.y-p.y):Infinity;
          const better=score>1e-5?nav.reachable(a,p,safeBounds,referenceFree,point=>Math.hypot(point.x-a.x,point.y-a.y)>=3&&freePoint(point)&&(!prior||!retreats(point,prior))&&Math.hypot(point.x-p.x,point.y-p.y)<score-1e-5):[];
          if(better.length){path=better;q=better[better.length-1];}
        }
        return {point:q,path,originalReference,expandedReference};
      };
      const scale=scene.navigation?.intentScale||{},sx=scale.x||1,sy=scale.y||1;
      const dx=(p.x-a.x)*sx,dy=(p.y-a.y)*sy;
      const request=manualGoals.get(key);
      const drag=pointerDrop&&source==='drag'&&scene.navigation?.intentAware&&scene.navigation.segmentSafe
        ?dragDestination(a,p,safeBounds,referenceFree,freePoint,request?.handoff,currentRoute):null;
      // An exact checked foot goal is already optimal. Otherwise compare the
      // local correction with the original V5 route and its forward floor.
      const fullSearch=!drag||(!drag.closest&&!drag.verifiedHandoff);
      const result=fullSearch?plan(scene.navigation):drag;
      const {originalReference,expandedReference}=result;
      let q=result.point,path=result.path;
      // Compare direction in actual screen units. A hard dominant-axis test
      // rejects useful diagonal routes around the 45-degree dividing line.
      const forward=point=>point&&((point.x-a.x)*sx*dx+(point.y-a.y)*sy*dy)>1e-7;
      const legacy=scene.navigation?.layoutNavigation;
      if(fullSearch&&legacy&&legacy!==scene.navigation){
        const prior=plan(legacy);
        // A sampled legacy shortcut can cross a thin terrain gap. Preserve its
        // endpoint through a current safe detour, never the unsafe old segment.
        if(prior.path.length&&!prior.path.every((to,i)=>scene.navigation.segmentSafe(i?prior.path[i-1]:a,to,referenceFree))){
          prior.path=currentRoute(prior.point);
          if(prior.path.length&&Math.hypot(prior.path.at(-1).x-prior.point.x,prior.path.at(-1).y-prior.point.y)>1e-6)prior.path=[];
        }
        if(prior.path.length&&Math.hypot(prior.point.x-a.x,prior.point.y-a.y)>=3&&(!scene.navigation.intentAware||forward(prior.point))&&(!path.length||retreats(q,prior.point))){
          q=prior.point;path=prior.path;
          const score=Math.hypot(q.x-p.x,q.y-p.y),floor=q;
          const better=scene.navigation.reachable?.(a,p,safeBounds,referenceFree,point=>Math.hypot(point.x-a.x,point.y-a.y)>=3&&freePoint(point)&&!retreats(point,floor)&&Math.hypot(point.x-p.x,point.y-p.y)<score-1e-5)||[];
          if(better.length){path=better;q=better.at(-1);}
        }
      }
      if(fullSearch&&scene.navigation?.intentAware){
        if(!path.length||!forward(q)){
          // A reachable fallback can otherwise send a downward drag upwards.
          // Keep any safe legacy endpoint that follows the request, and compare
          // it with the reachable forward component before deciding to stay put.
          const eligible=point=>forward(point)&&Math.hypot(point.x-a.x,point.y-a.y)>=3&&referenceFree(point)&&freePoint(point);
          const options=[];
          for(const candidate of [originalReference,expandedReference])if(candidate&&eligible(candidate.point)){
            let route=referenceRoute(scene.navigation,candidate.point,candidate.bounds);
            if(!route.length)route=currentRoute(candidate.point);
            if(route.length)options.push(route);
          }
          const route=scene.navigation.reachable?.(a,p,safeBounds,referenceFree,eligible)||[];
          if(route.length)options.push(route);
          options.sort((u,v)=>{const cost=r=>Math.hypot((r.at(-1).x-p.x)*sx,(r.at(-1).y-p.y)*sy);return cost(u)-cost(v);});
          path=options[0]||[];q=path.at(-1)||null;
        }
      }
      if(drag&&fullSearch){
        const score=drag.cost(q);
        const valid=path.length&&Number.isFinite(score)&&path.every((end,i)=>drag.safe(i?path[i-1]:a,end));
        const floor=valid?{x:clamp(q.x,Math.min(a.x,p.x),Math.max(a.x,p.x)),y:clamp(q.y,Math.min(a.y,p.y),Math.max(a.y,p.y))}:null;
        // A subpixel inverse projection must not invent a second requested
        // direction on a horizontal/vertical drop. Preserve intended component
        // progress up to the finger, allowing subpixel rounding of the floor.
        const keepsFloor=point=>['x','y'].every(axis=>{
          const unit=axis==='x'?sx:sy,delta=(p[axis]-a[axis])*unit;
          return Math.abs(delta)<1||(point[axis]-floor[axis])*unit*Math.sign(delta)>=-.75;
        });
        if(!valid||(drag.prefer(drag.path,path)&&keepsFloor(drag.point))){q=drag.point;path=drag.path;}
      }
      // Between native syncs, stationary peers cannot open a checked route.
      // Moving peers or a sync allow the original bounded retry with fresh data.
      if(drag&&request)request.peers=actors.filter(b=>b!==a).map(b=>[b.key,b.x,b.y]);
      if(!path.length||(!drag&&Math.hypot(q.x-a.x,q.y-a.y)<3)){
        if(pointerDrop){
          if(Math.abs(dx)>.3)a.direction=dx<0?-1:1;
          activity(a,'look');
          if(request&&drag)offerYield(a,request);
        }
        return false;
      }
      if(request?.floor&&['x','y'].some(axis=>(q[axis]-request.floor[axis])*request.direction[axis]<-1e-7))return false;
      if(request){
        request.nextAt=Infinity;request.floor={...q};
        // A detour can end beyond the finger on one axis. Keep progress up
        // to the release so a later opening can still reach the exact foot.
        if(drag)for(const axis of ['x','y']){
          if((q[axis]-request.point[axis])*request.direction[axis]>0)request.floor[axis]=request.point[axis];
        }
      }
      a.pointerDrop=pointerDrop;
      a.route=path.slice(1);a.target=path[0];a.source=source;if(source!=='ambient'){a.faceKey=null;a.visualReaction=undefined;a.visualTarget=null;}activity(a,'walk');a.lastWalk=clock;stats.moves++;defer(a,4);idleAt=clock+4;emit('move',a,source);return true;
    }
    function idle(a){
      a.visualReaction=undefined;a.visualTarget=null;
      const rain=['rain','snow'].includes(scene.weather),night=scene.time==='night';
      const social=actors.filter(b=>b!==a),tags=scene.tags||[],pet=a.kind==='partner'?actors.find(b=>b.kind==='pet'):null;
      const apart=pet&&Math.hypot(a.x-pet.x,a.y-pet.y)>Math.max(110,(a.w+pet.w)*.8+40);
      let choices=[['walk',1+trait(a,'boldness')*.4],['turn',1],['look',1],['sit',night?3:1],['rest',night?3:1],['observe',trait(a,'curiosity')],['solitude',6-trait(a,'sociability')]];
      if(social.length)choices.push(['approach',trait(a,'sociability')+(apart?12:0)],['together',trait(a,'sociability')+(apart?18:0)]);
      if(rain)choices.push(['shelter',8]);
      choices=choices.filter(([k])=>!a.recent.includes(k));
      let roll=random()*choices.reduce((n,c)=>n+c[1],0),name=choices[0]?.[0]||'look';
      for(const [k,w]of choices){roll-=w;if(roll<=0){name=k;break;}}
      const dense=actors.length>15,medium=actors.length>5;
      if(clock-a.lastWalk>(dense?70:medium?35:18))name=apart?'together':'walk';
      const budget=dense?2:medium?3:5;
      if(actors.filter(b=>b.target&&b.source==='ambient').length>=budget)name=['rest','look','sit','turn'][Math.floor(random()*4)];
      const duration=(dense?9:medium?5:night?6:3)+random()*(dense?12:5)+trait(a,'persistence')*.35;
      if(['turn','look','sit','rest'].includes(name)){activity(a,name);if(name==='turn'||name==='look'){a.direction*=-1;stats.turns++;emit('look',a);}defer(a,duration);return;}
      let p=null;a.faceKey=null;
      if(['approach','together'].includes(name)&&pet){
        // Choose a comfortable place near the pet; the usual route/collision code
        // still decides whether it is reachable. Other idle choices remain free.
        const angle=random()*Math.PI*2,space=1.2+random()*.65;
        p=socialDestination(a,pet,{x:pet.x+Math.cos(angle)*((a.w+pet.w)*.5+10)*space,y:pet.y+Math.sin(angle)*((a.h+pet.h)*.38+10)*space});a.faceKey=pet.key;
      }
      else if(['approach','together'].includes(name)&&social.length){const b=social[Math.floor(random()*social.length)%social.length];p=socialDestination(a,b,{x:b.x+(a.x<b.x?-1:1)*((a.w+b.w)*.55+14),y:b.y+(random()-.5)*32});a.faceKey=b.key;}
      else if(name==='observe'&&clock>=a.nextVisualAt&&(scene.visualPoints||[]).length&&random()<.35){
        const pool=scene.visualPoints;p=pool[Math.floor(random()*pool.length)];a.visualReaction=p.id;a.visualTarget=p.target;a.nextVisualAt=clock+35+random()*20;
      }
      else if(['observe','shelter'].includes(name)){const pool=tags.filter(t=>name!=='shelter'||t.tag==='shelter');p=pool[Math.floor(random()*pool.length)%pool.length];}
      else {const b=bounds(a,scene);p={x:b.left+random()*(b.right-b.left),y:b.top+random()*(b.bottom-b.top)};if(Math.abs(p.x-a.x)<35)p.x=a.x<scene.width/2?b.right:b.left;}
      a.after=p?.activity||(name==='walk'?'look':name==='shelter'?'rest':name);
      if(!p||!move(a.key,p,'ambient')){activity(a,a.after);if(a.visualTarget)a.direction=a.visualTarget.x<a.x?-1:1;defer(a,duration);}else defer(a,duration);
    }
    function step(dt,flags={}){
      if(!Number.isFinite(dt)||dt<0)return;
      dt=Math.min(.1,dt);paused=!!flags.blocked;
      if(paused){cancel();return;}
      clock+=dt;
      // A moving resident may close a route after planning. Retry the same
      // manual intention briefly; every new route uses the unchanged predicates.
      for(const [key,request] of manualGoals){
        const a=actor(key);
        if(!a||clock>request.expires||request.retries>=4){stopYield(key);manualGoals.delete(key);continue;}
        if(!a.target&&a.key!==flags.heldActor&&clock>=request.nextAt){
          const helper=request.yieldPeer&&actor(request.yieldPeer);
          if(helper?.yieldFor===key&&helper.target)continue;
          if(request.peers&&request.peers.length===actors.length-1&&request.peers.every(([key,x,y])=>{const peer=actor(key);return peer&&peer.x===x&&peer.y===y;})){
            request.nextAt=clock+1;continue;
          }
          request.retries++;request.nextAt=clock+1;retryingKey=key;
          try{move(key,request.point,request.source,{pointerDrop:request.pointerDrop});}finally{retryingKey=null;}
        }
      }
      if(!flags.reducedMotion&&flags.autonomy!==false)for(const a of actors)if(!a.target&&a.key!==flags.heldActor&&clock>=a.nextAt&&clock>=a.manualUntil)idle(a);
      for(const a of actors){
        if(flags.reducedMotion&&a.source==='ambient'){a.target=null;a.route=[];}
        if(!a.target)continue;
        const dx=a.target.x-a.x,dy=a.target.y-a.y,dist=Math.hypot(dx,dy),speed=(flags.reducedMotion?28:42)*(scene.time==='night'?.75:1),step=Math.min(dist,speed*dt);
        // Finish a drag waypoint before turning around a painted corner.
        if(dist<(a.pointerDrop?1e-7:.5)){
          if(a.route?.length){a.target=a.route.shift();continue;}
          a.target=null;activity(a,a.source==='ambient'?a.after:'rest');
          if(a.source==='yield'){a.yieldFor=null;defer(a,3);continue;}
          const request=manualGoals.get(a.key);
          if(request){
            const scale=request.pointerDrop?scene.navigation?.intentScale:null;
            const remaining=Math.hypot((a.x-request.point.x)*(scale?.x||1),(a.y-request.point.y)*(scale?.y||1));
            if(remaining<(request.pointerDrop?2:3))manualGoals.delete(a.key);
            else {request.nextAt=clock+1;if(request.pointerDrop&&remaining>4)offerYield(a,request);}
          }
          if(a.source==='ambient'&&a.visualTarget)a.direction=a.visualTarget.x<a.x?-1:1;
          defer(a,3+random()*5);
          const b=actor(a.faceKey);
          if(b){
            a.direction=b.x<a.x?-1:1;
            if(!b.target&&b.source==='ambient'&&clock>=b.manualUntil&&b.key!==flags.heldActor){
              b.direction=-a.direction;activity(b,'together');defer(b,4);
              // The target of this completed approach is the other participant.
              // A bystander inside the proximity radius did not take part.
              if(a.source==='ambient'&&['approach','together'].includes(a.after)&&Math.hypot(a.x-b.x,a.y-b.y)<100)emit('social',a,'ambient',b);
            }
          }
          emit('arrive',a,a.source);if(tagsAt(a).length)emit('environment',a);
          if(actors.some(b=>b!==a&&Math.hypot(a.x-b.x,a.y-b.y)<100))emit('proximity',a);
          continue;
        }
        const p=limit(a,{x:a.x+dx/dist*step,y:a.y+dy/dist*step},scene);
        // If a very crowded/short viewport cannot seat everyone, permit escape only
        // when every existing overlap shrinks; never enter a new overlap.
        const safe=visible(a,p)&&(!scene.navigation||scene.navigation.segmentSafe(a,p))&&actors.every(b=>{
          if(b===a)return true;
          const rx=(a.w+b.w)*.5+10,ry=(a.h+b.h)*.38+10;
          // An entire step on one side of the enclosing box cannot enter the ellipse.
          if(Math.max(a.x,p.x)<=b.x-rx||Math.min(a.x,p.x)>=b.x+rx||
             Math.max(a.y,p.y)<=b.y-ry||Math.min(a.y,p.y)>=b.y+ry)return true;
          if(!contactSegmentSafe(a,p,b,rx,ry))return false;
          const end=clearance(a,p,b);
          return end>=1||end>clearance(a,a,b)+1e-6;
        });
        if(!safe){a.target=null;a.route=[];a.activity='look';const request=manualGoals.get(a.key);if(request)request.nextAt=clock+1;defer(a,1+random()*2);continue;}
        stats.distance+=Math.hypot(p.x-a.x,p.y-a.y);a.x=p.x;a.y=p.y;if(Math.abs(dx)>.3)a.direction=dx<0?-1:1;
      }
    }
    return {metrics:()=>({...stats,activities:{...stats.activities},clock}),sync,seatingPending:()=>!!pendingPair,finishSeating,select,selected:()=>selected,move,step,cancel,bounds:a=>bounds(a,scene),snapshot:()=>actors.map(a=>({...a,route:(a.route||[]).map(p=>({...p})),target:a.target?{...a.target}:null}))};
  }
  return {supported,bounds,createModel};
});
