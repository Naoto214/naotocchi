// Bounded, sequential counterfactuals at recorded feet. The solver never mutates active residents.
function openCurved({feet,key,angles=96,focus=true,lengths=[1,3,6,8,12,16,24],maxWalk=32}) {
  const list=roster(feet),owner=list.find(a=>a.key===key);
  const trig=Array.from({length:angles},(_,i)=>[Math.cos(2*Math.PI*i/angles)/scale.x,Math.sin(2*Math.PI*i/angles)/scale.y]);
  const stats={candidateLegs:0,groundCalls:0,permittedHelperRoutes:0,ownerBearings:0,bearingsAlreadyBlockedBy3Plus:0,helperRoutePairsExamined:0};
  const all=new Map(),witnesses=[],bearings=[];
  function candidate(a,end) {
    const k=Math.min(1,.35/Math.hypot(end.x-a.x,end.y-a.y));
    return {a,end,first:{x:a.x+k*(end.x-a.x),y:a.y+k*(end.y-a.y)}};
  }
  function blocked(r,b) {
    const [rx,ry]=radii(r.a,b);
    const before=clearance(r.a,r.a,b);
    return !contactSegmentSafe(r.a,r.end,b,rx,ry) || (before<1 && clearance(r.a,r.first,b)<1 && clearance(r.a,r.first,b)<=before+1e-6);
  }
  function paths(a,allowOne) {
    const cacheKey=a.key+'/'+allowOne;
    if(all.has(cacheKey))return all.get(cacheKey);
    const legal=[];
    const others=list.filter(b=>b.key!==a.key);
    function legs(from,walk,prior,blocker) {
      for(const size of lengths) {
        if(walk+size>maxWalk)continue;
        for(const [dx,dy] of trig) {
          stats.candidateLegs++;
          const end={...a,x:from.x+size*dx,y:from.y+size*dy};
          if(!inBox(end,a.box))continue;
          const leg=candidate(from,end);
          let only=blocker,failed=false;
          for(const peer of others)if(peer!==only && blocked(leg,peer)) {
            if(!allowOne || only || peer===owner){failed=true;break;}
            only=peer;
          }
          if(failed)continue;
          stats.groundCalls++;
          if(!nav.segmentSafe(from,end,a.ink))continue;
          const route={a,legs:prior?[prior,leg]:[leg],end,blockedBy:only,cssLength:walk+size};
          legal.push(route);
          if(!prior)legs(end,size,leg,only);
        }
      }
    }
    legs(a,0,null,null);
    stats.permittedHelperRoutes+=legal.length;
    all.set(cacheKey,legal);
    return legal;
  }
  function verify(r,steps) {
    let peers=list;
    for(const step of steps) {
      for(const leg of step.legs) {
        const other=peers.filter(b=>b.key!==leg.a.key);
        const hits=decide(leg.a,leg.end,other);
        if(!hits||hits.length)throw Error('first-pass helper leg verification failed');
        peers=peers.map(b=>b.key===leg.a.key?leg.end:b);
      }
    }
    const endHits=decide(r.a,r.end,peers.filter(b=>b.key!==r.a.key));
    if(!endHits || endHits.length)throw Error('first-pass owner verification failed');
    return [...steps.map(({a,legs,cssLength})=>({who:a.key,from:[a.x,a.y],ends:legs.map(l=>[l.end.x,l.end.y]),length:cssLength})),
      {who:owner.key,from:[owner.x,owner.y],ends:[[r.end.x,r.end.y]],length:8}];
  }
  function solve(r,initial) {
    if(!initial.length)return [];
    if(initial.length===1)for(const p of paths(initial[0],false))if(!blocked(r,p.end))return [p];
    for(const secondPerson of initial) {
      for(const second of paths(secondPerson,true)) {
        if(blocked(r,second.end))continue;
        const firstNeeded=new Set(initial.filter(b=>b!==secondPerson));
        if(second.blockedBy)firstNeeded.add(second.blockedBy);
        if(firstNeeded.size!==1)continue;
        const [firstPerson]=firstNeeded;
        if(firstPerson===owner)continue;
        for(const first of paths(firstPerson,false)) {
          stats.helperRoutePairsExamined++;
          if(blocked(r,first.end) || second.legs.some(l=>blocked(l,first.end)))continue;
          return [first,second];
        }
      }
    }
    return null;
  }
  // For the two specifically identified one-blocker bearings, separate floor limits
  // from the body that must be moved to make the route geometrically possible.
  function explain(r,helper) {
    const counts={firstLegsOnGround:0,clearingRoutesOnGround:0,receiverBlocks:0,
      thirdResidentsNeeded:{},minThirdResidents:null,example:null};
    const others=list.filter(b=>b.key!==helper.key);
    const field=(leg)=>inBox(leg.end,helper.box)&&nav.segmentSafe(leg.a,leg.end,helper.ink);
    function summarize(legs) {
      if(blocked(r,legs.at(-1).end))return;
      counts.clearingRoutesOnGround++;
      const conflicts=others.filter(b=>legs.some(leg=>blocked(leg,b)));
      if(conflicts.includes(owner)){counts.receiverBlocks++;return;}
      counts.thirdResidentsNeeded[conflicts.length]=(counts.thirdResidentsNeeded[conflicts.length]||0)+1;
      if(counts.minThirdResidents===null||conflicts.length<counts.minThirdResidents) {
        counts.minThirdResidents=conflicts.length;
        counts.example={blockedBy:conflicts.map(b=>b.key),feet:legs.map(l=>[l.end.x,l.end.y])};
      }
    }
    for(const size of lengths)for(const [dx,dy] of trig) {
      const mid={...helper,x:helper.x+dx*size,y:helper.y+dy*size};
      const first=candidate(helper,mid);
      if(!field(first))continue;
      counts.firstLegsOnGround++;
      summarize([first]);
      for(const secondSize of lengths) {
        if(size+secondSize>maxWalk)continue;
        for(const [vx,vy] of trig) {
          const end={...helper,x:mid.x+vx*secondSize,y:mid.y+vy*secondSize};
          if(blocked(r,end))continue;
          const second=candidate(mid,end);
          if(field(second))summarize([first,second]);
        }
      }
    }
    return counts;
  }
  let focusedGeometry=null;
  for(let i=0;i<96;i++){
    const theta=2*Math.PI*i/96;
    const r=candidate(owner,{...owner,x:owner.x+8*Math.cos(theta)/scale.x,y:owner.y+8*Math.sin(theta)/scale.y});
    const blockedAtStart=decide(owner,r.end,list.filter(b=>b!==owner));
    if(!blockedAtStart)continue;
    stats.ownerBearings++;
    if(focus && ((owner.key==='companion:tanuki' && i===48) || (owner.key==='companion:box' && i===77))) {
      if(blockedAtStart.length!==1)throw Error('The archived single-blocker bearing changed');
      focusedGeometry={bearing:i*3.75,helper:blockedAtStart[0].key,...explain(r,blockedAtStart[0])};
    }
    if(blockedAtStart.length>2){stats.bearingsAlreadyBlockedBy3Plus++;continue;}
    const result=solve(r,blockedAtStart);
    const bearing={degrees:i*3.75,directBlockers:blockedAtStart.map(b=>b.key),opens:result!==null};
    if(result!==null) {
      const witness=verify(r,result);
      bearing.helpers=result.length;
      witnesses.push({degrees:bearing.degrees,steps:witness});
    }
    bearings.push(bearing);
  }
  return {key,angles,lengths,maxWalk,stats,bearings,witnesses,focusedGeometry};
}
// This routine is called only in the isolated browser worker, after measurement.
// Supply each witness as waypoints to the unmodified stepper, without another
// wander draw. Other actors remain stationary for the conditional replay.
function replayCurved({feet,witnesses}) {
  return witnesses.map(w=>{
    for(const [key,x,y,width,height] of feet) {
      const live=actor(key);
      if(!live || live.w!==width || live.h!==height)throw Error('Resident mismatch');
      Object.assign(live,{x,y,route:[],target:null,faceKey:null,yieldFor:null,escapeIntent:null});
    }
    let checked=0,advances=0,maxSpeed=0;
    const dt=1/120;
    for(const hop of w.steps) {
      const live=actor(hop.who);
      if(Math.hypot(live.x-hop.from[0],live.y-hop.from[1])>1e-5)throw Error('Start mismatch');
      const points=hop.ends.map(([x,y])=>({x,y}));
      Object.assign(live,{target:points[0],route:points.slice(1),intentRoute:true,ambientEscape:false,faceKey:null,
        source:hop.who===w.steps.at(-1).who?'ambient':'yield',activity:'walk'});
      const bystanders=actors.filter(a=>a!==live).map(a=>[a,a.x,a.y]);
      let ticks=0;
      while(live.target && ticks++<1000) {
        const from={...live};
        step(dt,{autonomy:false});
        const moved=Math.hypot(live.x-from.x,live.y-from.y);
        if(moved>1e-10) {
          advances++;
          maxSpeed=Math.max(maxSpeed,moved/dt);
          const permission=scene.planVisibility(live);
          if(moved>42*dt+1e-7 || !nav.segmentSafe(from,live,permission) || !visible(live,live) || !inBox(live,bounds(live,scene)))throw Error('Native terrain, visibility, bounds or speed violation');
          for(const [b,x,y] of bystanders) {
            if(b.x!==x || b.y!==y)throw Error('Unexpected bystander movement');
            const [rx,ry]=radii(live,b),before=clearance(live,from,b),after=clearance(live,live,b);
            if(!contactSegmentSafe(from,live,b,rx,ry) || (after<1 && !(before<1 && after>before+1e-6)))throw Error('Native contact violation');
          }
        }
        checked++;
      }
      const end=points.at(-1);
      if(live.target||Math.hypot(live.x-end.x,live.y-end.y)>1e-5)throw Error('Native stepper refused witness');
    }
    return {degrees:w.degrees,checked,actualAdvances:advances,maxModelSpeed:maxSpeed};
  });
}
return {openCurved,replayCurved};
