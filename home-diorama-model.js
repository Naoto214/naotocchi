/* Ephemeral presentation only. Never receives saved entities or gameplay RNG. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;if(root)root.NaotocchiHomeDioramaModel=api;})(typeof window!=='undefined'?window:null,function(){
  'use strict';
  const supported=region=>['forest','river_lake','city'].includes(region);
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  function bounds(a,s){
    const ext=a.extent||{},bottom=Math.max(24,s.height-12-(ext.bottom||0)),top=Math.min(bottom,Math.max((ext.top||a.h)+18,s.groundTop||s.height*.51));
    const left=Math.min(s.width/2,(ext.left||a.w/2)+12),right=Math.max(left,s.width-(ext.right||a.w/2)-12);
    return {left,right,top,bottom};
  }
  function limit(a,p,s){const b=bounds(a,s);return {x:clamp(p.x,b.left,b.right),y:clamp(p.y,b.top,b.bottom)};}
  function clearance(a,p,b){return Math.hypot((p.x-b.x)/((a.w+b.w)*.5+10),(p.y-b.y)/((a.h+b.h)*.38+10));}
  function separated(a,p,b){return clearance(a,p,b)>=1;}
  function privateRandom(){const bytes=new Uint32Array(1);if(typeof crypto!=='undefined'&&crypto.getRandomValues)crypto.getRandomValues(bytes);let seed=bytes[0]||Date.now()>>>0||1;return ()=>{seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;return (seed>>>0)/4294967296;};}
  function createModel({random=privateRandom(),onEvent=()=>{}}={}){
    let actors=[],scene={},selected=null,clock=0,idleAt=5,paused=false;
    const cooldown=new Map(),stats={distance:0,moves:0,turns:0,activities:{}};
    function activity(a,name){a.activity=name;stats.activities[name]=(stats.activities[name]||0)+1;a.recent=[...(a.recent||[]),name].slice(-2);}
    function defer(a,seconds){a.nextAt=clock+seconds;}
    function trait(a,key){return clamp(Number(a.temperament?.[key])||3,1,5);}
    const actor=key=>actors.find(a=>a.key===key);
    function tagsAt(a){return (scene.tags||[]).filter(t=>Math.hypot(a.x-t.x,a.y-t.y)<66).map(t=>t.tag);}
    function emit(type,a,source='ambient'){
      const key=a.key+':'+type,delay=source==='ambient'?6:.65;
      if(clock-(cooldown.get(key)??-Infinity)<delay)return;
      cooldown.set(key,clock);
      const near=actors.filter(b=>b!==a&&Math.hypot(a.x-b.x,a.y-b.y)<100).map(b=>Object.freeze({key:b.key,id:b.id,kind:b.kind,relationship:b.kind==='pet'?'self':b.kind}));
      onEvent(Object.freeze({version:1,type,source,actor:Object.freeze({key:a.key,id:a.id,kind:a.kind}),region:scene.region,
        environmentTags:Object.freeze(tagsAt(a)),nearby:Object.freeze(near),relationship:a.kind==='pet'?'self':a.kind,silent:true}));
    }
    function visible(a,p){return !scene.visible||scene.visible(p,a);}
    function free(a,p){return visible(a,p)&&actors.every(b=>b===a||separated(a,p,b));}
    function destination(a,p){
      if(scene.navigation)return scene.navigation.nearest(limit(a,p,scene),bounds(a,scene),q=>free(a,q));
      const q=limit(a,p,scene);if(free(a,q))return q;
      let best=null,dist=Infinity;
      for(let r=20;r<=120;r+=20)for(let i=0;i<16;i++){
        const c=limit(a,{x:q.x+Math.cos(i*Math.PI/8)*r,y:q.y+Math.sin(i*Math.PI/8)*r*.6},scene);
        const d=Math.hypot(c.x-q.x,c.y-q.y);if(d<dist&&free(a,c)){best=c;dist=d;}
      }
      return best;
    }
    function cancel(){for(const a of actors){if(a.target)a.target=null;a.route=[];a.activity='rest';a.nextAt=Math.min(a.nextAt||clock+2,clock+2);}idleAt=clock+2;}
    function sync(list,next){
      const changed=next.region!==scene.region||next.width!==scene.width||next.height!==scene.height||next.navigation!==scene.navigation;
      const previousScene=scene,previousActors=actors;
      const retained=new Set(next.region===scene.region?actors.map(a=>a.key):[]);
      scene={...next,tags:(next.tags||[]).map(t=>({...t}))};
      // Centre first seating in the actually walkable band (water/roads may cut
      // away the upper screen). Never re-centre an established player's position.
      let terrainCentre=null;
      const main=list.find(a=>a.kind==='pet');
      if(scene.centerInitialCast&&scene.navigation&&main&&(!previousActors.length||previousScene.region!==scene.region)){
        const b=bounds(main,scene),points=[];
        for(let y=b.top;y<=b.bottom;y+=12)for(let x=b.left;x<=b.right;x+=20)if(scene.navigation.valid({x,y})&&visible(main,{x,y}))points.push({x,y});
        if(points.length){const ys=points.map(p=>p.y);terrainCentre=scene.navigation.nearest({x:scene.width/2,y:(Math.min(...ys)+Math.max(...ys))/2},b,p=>visible(main,p));}
      }
      actors=list.filter(a=>['pet','companion','partner'].includes(a.kind)&&Number.isFinite(a.x+a.y+a.w+a.h)).map(a=>{
        const reflow=list.length>5&&(next.width!==previousScene.width||next.height!==previousScene.height||list.length!==previousActors.length||list.some(a=>previousActors.find(b=>b.key===a.key)?.w!==a.w));
        const old=!changed&&!reflow&&actor(a.key),previous=!reflow&&previousScene.region===scene.region?previousActors.find(b=>b.key===a.key):null,worldPoint=previous&&previousScene.navigation?.unproject(previous),preserved=worldPoint&&scene.navigation?scene.navigation.project(worldPoint):previous,limited=limit(a,old||preserved||(a.kind==='pet'&&terrainCentre)||a,scene),p=scene.navigation?.nearest(limited,bounds(a,scene))||limited;
        return {...a,...p,route:old?.route?.map(p=>({...p}))||[],temperament:{...a.temperament},target:old&&old.w===a.w&&old.h===a.h&&old.target?limit(a,old.target,scene):null,activity:old?.activity||'rest',direction:old?.direction||1,source:old?.source||'ambient',manualUntil:previousActors.find(b=>b.key===a.key)?.manualUntil??0,nextAt:old?.nextAt??clock+1+random()*3,lastWalk:old?.lastWalk??clock-12,recent:old?.recent||[],after:old?.after||'observe',faceKey:old?.faceKey||null};
      });
      // Keep established actors stable; seat new/reshaped arrivals in the nearest free spot.
      const seated=[];
      for(const a of [...actors].sort((a,b)=>Number(retained.has(b.key))-Number(retained.has(a.key)))){
        const fits=p=>(!scene.navigation||scene.navigation.valid(p))&&seated.every(b=>separated(a,p,b))&&visible(a,p);
        if(!fits(a)){
          const b=bounds(a,scene);let best=null,distance=Infinity;
          for(let y=b.top;y<=b.bottom+7;y+=8)for(let x=b.left;x<=b.right+7;x+=8){
            const p=limit(a,{x,y},scene),d=Math.hypot(p.x-a.x,p.y-a.y);
            if(d<distance&&fits(p)){best=p;distance=d;}
          }
          if(best){Object.assign(a,best);a.target=null;a.activity='rest';}
        }
        seated.push(a);
      }
      if(!actor(selected))selected=null;
      if(changed){cancel();cooldown.clear();}
    }
    function select(key){const a=actor(key);if(!a||paused)return false;selected=key;a.target=null;a.route=[];a.manualUntil=clock+12;defer(a,4);emit('tap',a,'tap');idleAt=clock+4;return true;}
    function move(key,p,source='tap'){
      const a=actor(key);if(!a||paused||!Number.isFinite(p?.x+p?.y))return false;
      if(source==='ambient'&&(clock<a.manualUntil||a.target&&a.source!=='ambient'))return false;
      if(source!=='ambient')a.manualUntil=clock+12;
      if(source==='ambient'&&actors.filter(b=>b.target&&b.source==='ambient').length>=(actors.length>15?2:actors.length>5?3:5))return false;
      const q=destination(a,p);if(!q)return false;
      if(Math.hypot(q.x-a.x,q.y-a.y)<3)return false;
      const path=scene.navigation?scene.navigation.route(a,q,bounds(a,scene),p=>free(a,p)):[q];if(!path.length)return false;
      a.route=path.slice(1);a.target=path[0];a.source=source;if(source!=='ambient')a.faceKey=null;activity(a,'walk');a.lastWalk=clock;stats.moves++;defer(a,4);idleAt=clock+4;emit('move',a,source);return true;
    }
    function idle(a){
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
        p={x:pet.x+Math.cos(angle)*((a.w+pet.w)*.5+10)*space,y:pet.y+Math.sin(angle)*((a.h+pet.h)*.38+10)*space};a.faceKey=pet.key;
      }
      else if(['approach','together'].includes(name)&&social.length){const b=social[Math.floor(random()*social.length)%social.length];p={x:b.x+(a.x<b.x?-1:1)*((a.w+b.w)*.55+14),y:b.y+(random()-.5)*32};a.faceKey=b.key;}
      else if(['observe','shelter'].includes(name)){const pool=tags.filter(t=>name!=='shelter'||t.tag==='shelter');p=pool[Math.floor(random()*pool.length)%pool.length];}
      else {const b=bounds(a,scene);p={x:b.left+random()*(b.right-b.left),y:b.top+random()*(b.bottom-b.top)};if(Math.abs(p.x-a.x)<35)p.x=a.x<scene.width/2?b.right:b.left;}
      a.after=name==='walk'?'look':name==='shelter'?'rest':name;
      if(!p||!move(a.key,p,'ambient')){activity(a,name==='walk'?'look':name);defer(a,duration);}else defer(a,duration);
    }
    function step(dt,flags={}){
      if(!Number.isFinite(dt)||dt<0)return;
      dt=Math.min(.1,dt);paused=!!flags.blocked;
      if(paused){cancel();return;}
      clock+=dt;
      if(!flags.reducedMotion&&flags.autonomy!==false)for(const a of actors)if(!a.target&&a.key!==flags.heldActor&&clock>=a.nextAt&&clock>=a.manualUntil)idle(a);
      for(const a of actors){
        if(flags.reducedMotion&&a.source==='ambient'){a.target=null;a.route=[];}
        if(!a.target)continue;
        const dx=a.target.x-a.x,dy=a.target.y-a.y,dist=Math.hypot(dx,dy),speed=(flags.reducedMotion?28:42)*(scene.time==='night'?.75:1),step=Math.min(dist,speed*dt);
        if(dist<.5){if(a.route?.length){a.target=a.route.shift();continue;}a.target=null;activity(a,a.source==='ambient'?a.after:'rest');defer(a,3+random()*5);if(a.faceKey){const b=actor(a.faceKey);if(b){a.direction=b.x<a.x?-1:1;if(!b.target&&b.source==='ambient'&&clock>=b.manualUntil&&b.key!==flags.heldActor){b.direction=-a.direction;activity(b,'together');defer(b,4);}}}emit('arrive',a,a.source);if(tagsAt(a).length)emit('environment',a);if(actors.some(b=>b!==a&&Math.hypot(a.x-b.x,a.y-b.y)<100))emit('proximity',a);continue;}
        const p=limit(a,{x:a.x+dx/dist*step,y:a.y+dy/dist*step},scene);
        // If a very crowded/short viewport cannot seat everyone, permit escape only
        // when every existing overlap shrinks; never enter a new overlap.
        const distance=(q,b)=>clearance(a,q,b);
        const safe=visible(a,p)&&(!scene.navigation||scene.navigation.segmentSafe(a,p))&&actors.every(b=>b===a||separated(a,p,b)||distance(a,b)<1&&distance(p,b)>distance(a,b)+1e-6);
        if(!safe){a.target=null;a.route=[];a.activity='look';defer(a,1+random()*2);continue;}
        stats.distance+=Math.hypot(p.x-a.x,p.y-a.y);a.x=p.x;a.y=p.y;if(Math.abs(dx)>.3)a.direction=dx<0?-1:1;
      }
    }
    return {metrics:()=>({...stats,activities:{...stats.activities},clock}),sync,select,selected:()=>selected,move,step,cancel,bounds:a=>bounds(a,scene),snapshot:()=>actors.map(a=>({...a,route:(a.route||[]).map(p=>({...p})),target:a.target?{...a.target}:null}))};
  }
  return {supported,bounds,createModel};
});
