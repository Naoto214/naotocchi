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
  function safeMovementStep(a,p,b){
    const rx=(a.w+b.w)*.5+10,ry=(a.h+b.h)*.38+10;
    if(Math.max(a.x,p.x)<=b.x-rx||Math.min(a.x,p.x)>=b.x+rx||
       Math.max(a.y,p.y)<=b.y-ry||Math.min(a.y,p.y)>=b.y+ry)return true;
    // In unit-circle coordinates, the projection is the point of closest contact.
    const x=(a.x-b.x)/rx,y=(a.y-b.y)/ry,dx=(p.x-a.x)/rx,dy=(p.y-a.y)/ry;
    const dot=x*dx+y*dy,start=Math.hypot(x,y);
    if(start<1){
      const end=Math.hypot(x+dx,y+dy);
      return dot>=0&&(end>=1||end>start+1e-6);
    }
    const t=clamp(-dot/(dx*dx+dy*dy||1),0,1);
    return Math.hypot(x+t*dx,y+t*dy)>=1;
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
    function referenceDestination(a,p,b=scene.referenceBounds?.(a),nav=scene.navigation){
      if(!b||!nav?.referenceNearest)return null;
      const point=nav.referenceNearest({x:clamp(p.x,b.left,b.right),y:clamp(p.y,b.top,b.bottom)},b,q=>free(a,q));
      const safe=bounds(a,scene);if(!point||point.x<safe.left||point.x>safe.right||point.y<safe.top||point.y>safe.bottom||!free(a,point))return null;
      return {point,bounds:b};
    }
    function destination(a,p,nav=scene.navigation){
      if(nav)return nav.nearest(nav.rawDestination?p:limit(a,p,scene),bounds(a,scene),q=>free(a,q));
      const q=limit(a,p,scene);if(free(a,q))return q;
      let best=null,dist=Infinity;
      for(let r=20;r<=120;r+=20)for(let i=0;i<16;i++){
        const c=limit(a,{x:q.x+Math.cos(i*Math.PI/8)*r,y:q.y+Math.sin(i*Math.PI/8)*r*.6},scene);
        const d=Math.hypot(c.x-q.x,c.y-q.y);if(d<dist&&free(a,c)){best=c;dist=d;}
      }
      return best;
    }
    function cancel(){manualGoals.clear();for(const a of actors){if(a.target)a.target=null;a.route=[];a.activity='rest';a.visualReaction=undefined;a.visualTarget=null;a.nextAt=Math.min(a.nextAt||clock+2,clock+2);}idleAt=clock+2;}
    function sync(list,next){
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
      actors=list.filter(a=>['pet','companion','partner'].includes(a.kind)&&Number.isFinite(a.x+a.y+a.w+a.h)).map((a,index)=>{
        const reflow=list.length>5&&(next.width!==previousScene.width||next.height!==previousScene.height||list.length!==previousActors.length||list.some(a=>previousActors.find(b=>b.key===a.key)?.w!==a.w));
        const initial=scene.navigation?.initialPoint&&(restoreSeats||!previousScene.navigation||previousScene.region!==scene.region||(list.length>5&&list.length!==previousActors.length)||!previousActors.some(b=>b.key===a.key));
        const seed=initial?(a.kind==='pet'&&scene.newbornPoint&&(!previousScene.navigation||!previousActors.some(b=>b.key===a.key))?scene.newbornPoint:scene.navigation.initialPoint(index,list.length)):null;
        const old=!initial&&!changed&&!reflow&&actor(a.key),previous=!initial&&previousScene.region===scene.region?previousActors.find(b=>b.key===a.key):null,worldPoint=previous&&previousScene.navigation?.unproject(previous),preserved=worldPoint&&scene.navigation?scene.navigation.project(worldPoint):previous,limited=limit(a,old||preserved||seed||(a.kind==='pet'&&terrainCentre)||a,scene),p=previous&&scene.navigation?.reachable&&scene.navigation.valid(limited)&&visible(a,limited)?limited:scene.navigation?.nearest(limited,bounds(a,scene))||limited;
        return {...a,...p,route:old?.route?.map(p=>({...p}))||[],temperament:{...a.temperament},target:old&&old.w===a.w&&old.h===a.h&&old.target?limit(a,old.target,scene):null,activity:old?.activity||'rest',direction:old?.direction||1,source:old?.source||'ambient',manualUntil:previousActors.find(b=>b.key===a.key)?.manualUntil??0,nextAt:old?.nextAt??clock+1+random()*3,lastWalk:old?.lastWalk??clock-12,recent:old?.recent||[],after:old?.after||'observe',faceKey:old?.faceKey||null,visualReaction:old?.visualReaction,visualTarget:old?.visualTarget,nextVisualAt:old?.nextVisualAt||0};
      });
      // At capacity, individually separated seats can still form a closed ring
      // around the main character. Reserve one short, terrain-safe exit while
      // arranging a new/reflowed cast. Ordinary syncs never move established
      // residents merely to recreate this initial corridor.
      let exit=[];
      const lead=actors.find(a=>a.kind==='pet');
      const arrange=changed||exitPolicyChanged||actors.length!==previousActors.length||actors.some(a=>{const b=previousActors.find(b=>b.key===a.key);return !b||a.w!==b.w||a.h!==b.h;});
      if(lead&&(actors.length>5||scene.fiveResidentExit)&&arrange&&scene.navigation?.segmentSafe){
        const length=Math.max(40,lead.w*1.2),options=[];
        for(let i=0;i<8;i++){
          const end=limit(lead,{x:lead.x+Math.cos(i*Math.PI/4)*length,y:lead.y+Math.sin(i*Math.PI/4)*length},scene);
          if(Math.hypot(end.x-lead.x,end.y-lead.y)<length*.8||!scene.navigation.segmentSafe(lead,end,p=>visible(lead,p)))continue;
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
        const fits=p=>(!scene.navigation||scene.navigation.valid(p))&&seated.every(b=>separated(a,p,b))&&visible(a,p)&&(a===lead||exit.every(q=>separated(lead,q,{...a,x:p.x,y:p.y})));
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
            const allowed=candidates.filter(p=>(!scene.navigation||scene.navigation.valid(p))&&visible(a,p)&&exit.every(q=>separated(lead,q,{...a,x:p.x,y:p.y})));
            const overlap=p=>seated.reduce((sum,b)=>sum+Math.max(0,1-clearance(a,p,b))**2,0);
            allowed.sort((p,q)=>overlap(p)-overlap(q)||p.d-q.d);best=allowed[0];
          }
          if(best){Object.assign(a,{x:best.x,y:best.y});a.target=null;a.activity='rest';}
        }
        seated.push(a);
      }
      if(!actor(selected))selected=null;
      if(changed){cancel();cooldown.clear();}
    }
    function select(key){const a=actor(key);if(!a||paused)return false;manualGoals.delete(key);selected=key;a.visualReaction=undefined;a.visualTarget=null;a.target=null;a.route=[];a.manualUntil=clock+12;defer(a,4);emit('tap',a,'tap');idleAt=clock+4;return true;}
    function move(key,p,source='tap'){
      const a=actor(key);if(!a||paused||!Number.isFinite(p?.x+p?.y))return false;
      if(source==='ambient'&&(clock<a.manualUntil||a.target&&a.source!=='ambient'))return false;
      if(source!=='ambient'&&retryingKey!==key)a.manualUntil=clock+12;
      if(source!=='ambient'&&scene.navigation?.intentAware&&retryingKey!==key)manualGoals.set(key,{point:{x:p.x,y:p.y},direction:{x:Math.sign(p.x-a.x),y:Math.sign(p.y-a.y)},source,expires:clock+12,retries:0,nextAt:clock+1});
      if(source==='ambient'&&actors.filter(b=>b.target&&b.source==='ambient').length>=(actors.length>15?2:actors.length>5?3:5))return false;
      const retreats=(q,r)=>['x','y'].some(axis=>(q[axis]-r[axis])*Math.sign(p[axis]-a[axis])< -1e-7);
      // A cramped fallback seat may already overlap. Allow only escape that
      // does not worsen that overlap; step() still requires strict improvement.
      const routeFree=p=>visible(a,p)&&actors.every(b=>b===a||separated(a,p,b)||clearance(a,a,b)<1&&clearance(a,p,b)>=clearance(a,a,b)-1e-9);
      const safeBounds=bounds(a,scene),referenceFree=p=>p.x>=safeBounds.left&&p.x<=safeBounds.right&&p.y>=safeBounds.top&&p.y<=safeBounds.bottom&&routeFree(p);
      const currentRoute=(point,nav=scene.navigation)=>nav?nav.route(a,point,safeBounds,routeFree):[point];
      // Pure planning permits a complete V4 comparison, including its stable
      // grid and supplemental route, without changing scene or actor state.
      const plan=nav=>{
        const proposal=destination(a,p,nav),originalReference=referenceDestination(a,p,undefined,nav);
        const expandedReference=scene.referenceBounds?.(a)?referenceDestination(a,p,safeBounds,nav):null;
        const reference=expandedReference&&(!originalReference||!retreats(expandedReference.point,originalReference.point))?expandedReference:originalReference;
        const preferReference=reference&&(!proposal||Math.hypot(proposal.x-reference.point.x,proposal.y-reference.point.y)<1e-7||retreats(proposal,reference.point));
        let q=preferReference?reference.point:proposal;
        const oldRoute=()=>nav.referenceRoute(a,reference.point,reference.bounds,referenceFree);
        let path=preferReference?oldRoute():q?currentRoute(q,nav):[];
        if(!path.length&&preferReference)path=currentRoute(q,nav);
        if(!path.length&&preferReference&&proposal){q=proposal;path=currentRoute(q,nav);}
        if(!path.length&&!preferReference&&reference){q=reference.point;path=oldRoute();if(!path.length)path=currentRoute(q,nav);}
        if(!path.length&&originalReference&&originalReference!==reference){q=originalReference.point;path=nav.referenceRoute(a,q,originalReference.bounds,referenceFree);if(!path.length)path=currentRoute(q,nav);}
        if(nav?.reachable){
          const prior=path.length?q:null,score=prior?Math.hypot(prior.x-p.x,prior.y-p.y):Infinity;
          const better=score>1e-5?nav.reachable(a,p,safeBounds,referenceFree,point=>Math.hypot(point.x-a.x,point.y-a.y)>=3&&free(a,point)&&(!prior||!retreats(point,prior))&&Math.hypot(point.x-p.x,point.y-p.y)<score-1e-5):[];
          if(better.length){path=better;q=better[better.length-1];}
        }
        return {point:q,path,originalReference,expandedReference};
      };
      const result=plan(scene.navigation),{originalReference,expandedReference}=result;
      let q=result.point,path=result.path;
      // Compare direction in actual screen units. A hard dominant-axis test
      // rejects useful diagonal routes around the 45-degree dividing line.
      const scale=scene.navigation?.intentScale||{},sx=scale.x||1,sy=scale.y||1;
      const dx=(p.x-a.x)*sx,dy=(p.y-a.y)*sy;
      const forward=point=>point&&((point.x-a.x)*sx*dx+(point.y-a.y)*sy*dy)>1e-7;
      const legacy=scene.navigation?.layoutNavigation;
      if(legacy&&legacy!==scene.navigation){
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
          const better=scene.navigation.reachable?.(a,p,safeBounds,referenceFree,point=>Math.hypot(point.x-a.x,point.y-a.y)>=3&&free(a,point)&&!retreats(point,floor)&&Math.hypot(point.x-p.x,point.y-p.y)<score-1e-5)||[];
          if(better.length){path=better;q=better.at(-1);}
        }
      }
      if(scene.navigation?.intentAware){
        if(!path.length||!forward(q)){
          // A reachable fallback can otherwise send a downward drag upwards.
          // Keep any safe legacy endpoint that follows the request, and compare
          // it with the reachable forward component before deciding to stay put.
          const eligible=point=>forward(point)&&Math.hypot(point.x-a.x,point.y-a.y)>=3&&referenceFree(point)&&free(a,point);
          const options=[];
          for(const candidate of [originalReference,expandedReference])if(candidate&&eligible(candidate.point)){
            let route=scene.navigation.referenceRoute(a,candidate.point,candidate.bounds,referenceFree);
            if(!route.length)route=currentRoute(candidate.point);
            if(route.length)options.push(route);
          }
          const route=scene.navigation.reachable?.(a,p,safeBounds,referenceFree,eligible)||[];
          if(route.length)options.push(route);
          options.sort((u,v)=>{const cost=r=>Math.hypot((r.at(-1).x-p.x)*sx,(r.at(-1).y-p.y)*sy);return cost(u)-cost(v);});
          path=options[0]||[];q=path.at(-1)||null;
        }
      }
      if(!path.length||Math.hypot(q.x-a.x,q.y-a.y)<3)return false;
      const request=manualGoals.get(key);
      if(request?.floor&&['x','y'].some(axis=>(q[axis]-request.floor[axis])*request.direction[axis]<-1e-7))return false;
      if(request){request.nextAt=Infinity;request.floor={...q};}
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
        if(!a||clock>request.expires||request.retries>=4){manualGoals.delete(key);continue;}
        if(!a.target&&a.key!==flags.heldActor&&clock>=request.nextAt){
          request.retries++;request.nextAt=clock+1;retryingKey=key;
          try{move(key,request.point,request.source);}finally{retryingKey=null;}
        }
      }
      if(!flags.reducedMotion&&flags.autonomy!==false)for(const a of actors)if(!a.target&&a.key!==flags.heldActor&&clock>=a.nextAt&&clock>=a.manualUntil)idle(a);
      for(const a of actors){
        if(flags.reducedMotion&&a.source==='ambient'){a.target=null;a.route=[];}
        if(!a.target)continue;
        const dx=a.target.x-a.x,dy=a.target.y-a.y,dist=Math.hypot(dx,dy),speed=(flags.reducedMotion?28:42)*(scene.time==='night'?.75:1),step=Math.min(dist,speed*dt);
        if(dist<.5){
          if(a.route?.length){a.target=a.route.shift();continue;}
          a.target=null;activity(a,a.source==='ambient'?a.after:'rest');
          const request=manualGoals.get(a.key);if(request){if(Math.hypot(a.x-request.point.x,a.y-request.point.y)<3)manualGoals.delete(a.key);else request.nextAt=clock+1;}
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
        const safe=visible(a,p)&&(!scene.navigation||scene.navigation.segmentSafe(a,p))&&actors.every(b=>b===a||safeMovementStep(a,p,b));
        if(!safe){a.target=null;a.route=[];a.activity='look';const request=manualGoals.get(a.key);if(request)request.nextAt=clock+1;defer(a,1+random()*2);continue;}
        stats.distance+=Math.hypot(p.x-a.x,p.y-a.y);a.x=p.x;a.y=p.y;if(Math.abs(dx)>.3)a.direction=dx<0?-1:1;
      }
    }
    return {metrics:()=>({...stats,activities:{...stats.activities},clock}),sync,select,selected:()=>selected,move,step,cancel,bounds:a=>bounds(a,scene),snapshot:()=>actors.map(a=>({...a,route:(a.route||[]).map(p=>({...p})),target:a.target?{...a.target}:null}))};
  }
  return {supported,bounds,createModel};
});
