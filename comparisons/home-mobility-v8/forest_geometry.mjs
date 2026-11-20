// Research-only byte insertion inside the original createModel closure. The model
// remains paused; the scanner substitutes recorded feet without mutating its actors.
globalThis.forestDirections = function forestDirections(input) {
  const nav = scene.navigation, scale = nav.intentScale;
  const feet = input.peers.map(([key, x, y, w, h, target, source, manualUntil, yieldAfter, manualGoal,yieldFor,activity]) => {
    const a = {...actors.find(b => b.key === key),key,x,y,w,h};
    return {a,box:bounds(a,scene),ink:scene.planVisibility?.(a) || (q=>visible(a,q)),
      eligible:!target && key !== input.selected && input.clock >= (manualUntil || 0)
        && input.clock >= (yieldAfter || 0) && !manualGoal && !yieldFor && !['approach','together'].includes(activity)};
  });
  const who = feet.find(f => f.a.key === input.key), origin = who.a;
  const local = ({a},p,at,other) => contactSegmentSafe(a,p,at,
    (a.w + other.a.w) * .5 + 10, (a.h + other.a.h) * .38 + 10);
  const group = feet.filter(f => f !== who);
  const overlaps = group.filter(f => clearance(origin,origin,f.a) < 1);
  function packOption(i,q){return {who:i.a.key,r:q.r,deg:q.deg,from:[i.a.x,i.a.y],to:[q.x,q.y]};}
  function radians(angle){return angle*Math.PI/180;}
  function candidates(i,distances,step,summarize) {
    const result=[],b=i.box, neighbors=feet.filter(f=>f!==i);
    for(const r of distances)for(let deg=0;deg<360;deg+=step) {
      const p={x:i.a.x+r*Math.cos(radians(deg))/scale.x,y:i.a.y+r*Math.sin(radians(deg))/scale.y,r,deg};
      if(p.x<b.left||p.x>b.right||p.y<b.top||p.y>b.bottom)continue;
      if(summarize)counts.inBounds++;
      if(!nav.segmentSafe(i.a,p))continue;
      if(summarize)counts.ground++;
      if(!nav.segmentSafe(i.a,p,i.ink))continue;
      if(summarize)counts.ink++;
      const blockers=[];
      for(const f of neighbors)if(!local(i,p,f.a,f))blockers.push(f);
      if(summarize) {
        if(blockers.length===1)singleBlockers[blockers[0].a.key]=(singleBlockers[blockers[0].a.key]||0)+1;
        if(!blockers.length)(free[r]||=[]).push(deg);
      }
      if(blockers.length<=2)result.push({...p,blockers});
    }
    return result;
  }
  const free={},singleBlockers={},counts={inBounds:0,ground:0,ink:0},helpers=new Map();
  const distances=[3,4,5,6,8,12,18,24], soloStep=7.5;
  const rays=candidates(who,distances,soloStep,true);
  const safe=rays.filter(r=>!r.blockers.length);
  const norm=[...overlaps.map(f=>[(origin.x-f.a.x)/((origin.w+f.a.w)*.5+10)**2,
    (origin.y-f.a.y)/((origin.h+f.a.h)*.38+10)**2])];
  const {left,right,top,bottom}=who.box;
  for(const [distance,normal] of [[origin.x-left,[1,0]],[right-origin.x,[-1,0]],[origin.y-top,[0,1]],[bottom-origin.y,[0,-1]]]){
    if(Math.abs(distance)<1e-7)norm.push(normal);
  }
  const angles=norm.filter(n=>Math.hypot(...n)>1e-10).map(n=>Math.atan2(n[1],n[0])).sort((a,b)=>a-b);
  const gap=angles.length?Math.max(...angles.map((a,i)=>(angles[(i+1)%angles.length]+(i+1===angles.length?Math.PI*2:0))-a)):2*Math.PI;
  const miss=(p,g)=>Math.hypot((p.x-g.x)*scale.x,(p.y-g.y)*scale.y);
  const goal=input.goal&&{x:input.goal[0],y:input.goal[1]};
  const distance=goal?miss(origin,goal):0;
  const towards=goal?safe.filter(p=>miss(p,goal)<distance-.75):safe;
  const options=i=>{
    if(!helpers.has(i))helpers.set(i,candidates(i,[4,8,12,16,20,24],15,false));
    return helpers.get(i);
  };
  // Search for the smallest sufficient number of helpers. A real live offer
  // also requires the captured selection, manual, cooldown and target gates.
  function witness(policy) {
    const allowed=f=>!policy||f.eligible;
    const list=rays.filter(r=>r.blockers.length && r.blockers.every(allowed)
      && (!input.directional||!goal||miss(r,goal)<distance-.75)).sort((p,q)=>q.r-p.r);
    for(const r of list) {
      if(r.blockers.length!==1)continue;
      const [b]=r.blockers;
      for(const m of options(b)){
        if(!m.blockers.length&&local(who,r,m,b))return [packOption(b,m),packOption(who,r)];
      }
    }
    for(const r of list)for(const b of r.blockers) {
      for(const m of options(b)){
        if(m.blockers.length>1||!local(who,r,m,b))continue;
        const c=r.blockers.find(o=>o!==b)||m.blockers[0];
        if(!c||!allowed(c)||c===who||c===b||m.blockers.some(o=>o!==c))continue;
        for(const k of options(c)){
          if(!k.blockers.length&&local(who,r,k,c)&&local(b,m,k,c))return [packOption(c,k),packOption(b,m),packOption(who,r)];
        }
      }
    }
    return null;
  }
  const search=!(input.directional?towards:safe).length;
  const any=search?witness(false):null;
  const eligible=search&&any?(any.slice(0,-1).every(m=>feet.find(f=>f.a.key===m.who).eligible)?any:witness(true)):null;
  return {key:origin.key,from:[origin.x,origin.y],scale,bounds:who.box,edgeCss:{left:(origin.x-left)*scale.x,
    right:(right-origin.x)*scale.x,top:(origin.y-top)*scale.y,bottom:(bottom-origin.y)*scale.y},
    initialContacts:overlaps.map(f=>[f.a.key,clearance(origin,origin,f.a)]),counts,free,singleBlockers,allDirectionLock:gap<Math.PI-1e-6,
    goalGround:goal?nav.valid(goal):null,goalVisible:goal?who.ink(goal):null,
    towards:goal?towards.length:null,helperWitness:any,eligibleWitness:eligible};
};
