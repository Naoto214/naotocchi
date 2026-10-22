/* Ephemeral presentation only. Never receives saved entities or gameplay RNG. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;if(root)root.NaotocchiHomeDioramaModel=api;})(typeof window!=='undefined'?window:null,function(){
  'use strict';
  const supported=region=>['forest','river_lake','city'].includes(region);
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  function bounds(a,s){
    const ext=a.extent||{},bottom=Math.max(24,s.height-54-(ext.bottom||0)),top=Math.min(bottom,Math.max((ext.top||a.h)+18,s.groundTop||s.height*.51));
    const left=Math.min(s.width/2,(ext.left||a.w/2)+12),right=Math.max(left,s.width-(ext.right||a.w/2)-12);
    return {left,right,top,bottom};
  }
  function limit(a,p,s){const b=bounds(a,s);return {x:clamp(p.x,b.left,b.right),y:clamp(p.y,b.top,b.bottom)};}
  function separated(a,p,b){return Math.hypot((p.x-b.x)/((a.w+b.w)*.45+6),(p.y-b.y)/20)>=1;}
  function createModel({random=Math.random,onEvent=()=>{}}={}){
    let actors=[],scene={},selected=null,clock=0,idleAt=5,paused=false;
    const cooldown=new Map();
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
    function free(a,p){return actors.every(b=>b===a||separated(a,p,b));}
    function destination(a,p){
      const q=limit(a,p,scene);if(free(a,q))return q;
      let best=null,dist=Infinity;
      for(let r=20;r<=120;r+=20)for(let i=0;i<16;i++){
        const c=limit(a,{x:q.x+Math.cos(i*Math.PI/8)*r,y:q.y+Math.sin(i*Math.PI/8)*r*.6},scene);
        const d=Math.hypot(c.x-q.x,c.y-q.y);if(d<dist&&free(a,c)){best=c;dist=d;}
      }
      return best;
    }
    function cancel(){for(const a of actors){a.target=null;a.activity='rest';}idleAt=clock+7;}
    function sync(list,next){
      const changed=next.region!==scene.region||next.width!==scene.width||next.height!==scene.height;
      const retained=new Set(changed?[]:actors.map(a=>a.key));
      scene={...next,tags:(next.tags||[]).map(t=>({...t}))};
      actors=list.filter(a=>['pet','companion','partner'].includes(a.kind)&&Number.isFinite(a.x+a.y+a.w+a.h)).map(a=>{
        const old=!changed&&actor(a.key),p=limit(a,old||a,scene);
        return {...a,...p,target:old?.target||null,activity:old?.activity||'rest',direction:old?.direction||1,source:old?.source||'ambient'};
      });
      // Keep established actors stable; seat new/reshaped arrivals in the nearest free spot.
      const seated=[];
      for(const a of [...actors].sort((a,b)=>Number(retained.has(b.key))-Number(retained.has(a.key)))){
        const fits=p=>seated.every(b=>separated(a,p,b));
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
    function select(key){const a=actor(key);if(!a||paused)return false;selected=key;emit('tap',a,'tap');idleAt=clock+10;return true;}
    function move(key,p,source='tap'){
      const a=actor(key);if(!a||paused||!Number.isFinite(p?.x+p?.y))return false;
      const q=destination(a,p);if(!q)return false;
      a.target=q;a.source=source;a.activity='walk';idleAt=clock+10;emit('move',a,source);return true;
    }
    function idle(){
      if(!actors.length)return;
      const a=actors[Math.floor(random()*actors.length)%actors.length];
      if(a.target)return;
      const rain=scene.weather==='rain',pool=(scene.tags||[]).filter(t=>!rain||t.tag==='shelter');
      const neighbor=actors.find(b=>b!==a&&(a.kind==='partner'||b.kind==='partner'));
      let p;if(pool.length)p=pool[Math.floor(random()*pool.length)%pool.length];
      if(!rain&&neighbor&&random()<.35)p={x:neighbor.x+(neighbor.x<scene.width/2?1:-1)*(a.w+neighbor.w)*.55,y:neighbor.y};
      if(!p)p={x:a.x+(random()-.5)*100,y:a.y+(random()-.5)*40};
      move(a.key,p,'ambient');
    }
    function step(dt,flags={}){
      if(!Number.isFinite(dt)||dt<0)return;
      dt=Math.min(.1,dt);paused=!!flags.blocked;
      if(paused){cancel();return;}
      clock+=dt;
      if(!flags.reducedMotion&&flags.autonomy!==false&&clock>=idleAt){idle();idleAt=clock+(scene.time==='night'?20:8)+random()*7;}
      for(const a of actors){
        if(!a.target)continue;
        const dx=a.target.x-a.x,dy=a.target.y-a.y,dist=Math.hypot(dx,dy),speed=(flags.reducedMotion?28:42)*(scene.time==='night'?.75:1),step=Math.min(dist,speed*dt);
        if(dist<.5){a.target=null;a.activity=tagsAt(a).includes('water')?'observe':'rest';emit('arrive',a,a.source);if(tagsAt(a).length)emit('environment',a);if(actors.some(b=>b!==a&&Math.hypot(a.x-b.x,a.y-b.y)<100))emit('proximity',a);continue;}
        const p=limit(a,{x:a.x+dx/dist*step,y:a.y+dy/dist*step},scene);
        // If a very crowded/short viewport cannot seat everyone, permit escape only
        // when every existing overlap shrinks; never enter a new overlap.
        const clearance=(q,b)=>Math.hypot((q.x-b.x)/((a.w+b.w)*.45+6),(q.y-b.y)/20);
        const safe=actors.every(b=>b===a||separated(a,p,b)||clearance(a,b)<1&&clearance(p,b)>clearance(a,b)+1e-6);
        if(!safe){a.target=null;a.activity='rest';continue;}
        a.x=p.x;a.y=p.y;if(Math.abs(dx)>.3)a.direction=dx<0?-1:1;
      }
    }
    return {sync,select,selected:()=>selected,move,step,cancel,bounds:a=>bounds(a,scene),snapshot:()=>actors.map(a=>({...a,target:a.target?{...a.target}:null}))};
  }
  return {supported,bounds,createModel};
});
