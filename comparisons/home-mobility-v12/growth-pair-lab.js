// Test-only body, inserted into the measured private care model's lexical scope.
// All speculative positions belong to private copies and are restored before
// yielding the event loop. No real actor's position or target is written.
function makePairStudy(house,sc,original,lost,bodyRows) {
  const copies=house.map(a=>({...a}));
  const eligible=copies.filter(a=>a.kind!=='pet'&&!a.target&&!bodyRows.find(b=>b.key===a.key)?.target&&!manualGoals.has(a.key));
  const s=sc.navigation.intentScale;
  let legacy=null;
  const lossIndices=new Map(copies.map(a=>[a.key,new Set(lost[a.key].lost)]));
  const required=new Map([...original].map(([key,r])=>[key,r.directions]));
  const getPoint=a=>({x:a.x,y:a.y});
  const start=new Map(copies.map(a=>[a.key,getPoint(a)]));
  const within=(a,b)=>Math.abs(a.x-b.x)<=16/s.x+(a.w+b.w)*.5+10+1e-6 && Math.abs(a.y-b.y)<=16/s.y+(a.h+b.h)*.38+10+1e-6;
  const nav=sc.navigation;
  const result={width:innerWidth,maxHelpers:2,pivots:0,trials:0,firstNativeLeg:0,secondNativeLeg:0,full:0,mid:0,plan:null,reason:null};
  function* search() {
    const initial=growthWitness({directions:lost});
    result.lowerBound=initial;
    for(const item of initial.obligations){
      const a=copies.find(p=>p.key===item.owner),[vx,vy]=bearings[item.k];
      const end={x:a.x+vx/s.x,y:a.y+vy/s.y},b=bounds(a,sc);
      item.insideBounds=end.x>=b.left&&end.x<=b.right&&end.y>=b.top&&end.y<=b.bottom;
      item.terrainOnly=nav.segmentSafe(a,end,()=>true);
      item.endpointGround=nav.valid(end);
    }
    const partial={changed:copies.filter(a=>!sameFoot(a,legacy.get(a.key))).map(a=>a.key),tested:0,holdsAll:0,bestLost:null};
    result.nativeSeatSubsets=partial;
    if(initial.minimum<=2){
      for(const group of initial.coveringSets.filter(group=>group.length<=2)){
        const proposals=[group,...(group.length===1?copies.filter(a=>a.key!==group[0]).map(a=>[...group,a.key]):[])];
        for(const subset of proposals){
          partial.tested++;
          const movers=subset.map(k=>copies.find(a=>a.key===k));
          for(const a of movers)Object.assign(a,legacy.get(a.key));
          const missed=losses(movers).length;
          if(!missed)partial.holdsAll++;
          partial.bestLost=partial.bestLost==null?missed:Math.min(partial.bestLost,missed);
          for(const a of movers)Object.assign(a,start.get(a.key));
          yield;
        }
      }
    }
    if(initial.minimum>2){result.reason='more-than-two-endpoints-required';return;}
    const clear=(a,to,others)=>others.every(peer=>peer===a||contactSegmentSafe(a,to,peer,(a.w+peer.w)*.5+10,(a.h+peer.h)*.38+10));
    const headings=[];
    for(const length of [.25,.5,1,2,4,8])for(let i=0;i<16;i++)headings.push([length,Math.cos(i*Math.PI/8)/s.x,Math.sin(i*Math.PI/8)/s.y]);
    function losses(moved,tolerateInitial=false,limit=Infinity){
      const missing=[];
      for(const a of copies){
        const prior=required.get(a.key);
        if(!moved.some(b=>b===a||within(a,b)||within(a,{...b,...start.get(b.key)}))) {
          if(!tolerateInitial)for(const i of lossIndices.get(a.key))missing.push([a,i]);
        }else{
          const mask=legalDirections(a,prior);
          for(let i=0;i<prior.length;i++)if(prior[i]&&!mask[i]&&!(tolerateInitial&&lossIndices.get(a.key).has(i)))missing.push([a,i]);
        }
        if(missing.length>=limit)return missing;
      }
      return missing;
    }
    const candidates=eligible.filter(a=>initial.coveringSets.some(group=>group.includes(a.key)));
    const empty=new Map();
    for(const primary of candidates)for(const [d,dx,dy] of headings){
      const from=start.get(primary.key),to={x:from.x+d*dx,y:from.y+d*dy};
      const b=bounds(primary,sc);
      if(to.x<b.left||to.x>b.right||to.y<b.top||to.y>b.bottom||!nav.segmentSafe(from,to,sc.planVisibility?.(primary)||(p=>visible(primary,p))))continue;
      result.pivots++;
      const blockers=copies.filter(a=>a!==primary&&!clear(primary,to,[a]));
      if(blockers.length>1)continue;
      Object.assign(primary,to);
      const remaining=losses([primary],false,15);
      if(!remaining.length&&!blockers.length){
        Object.assign(primary,from);
        result.plan=[{key:primary.key,from,to}];result.reason='verified-single-endpoint';return;
      }
      const canBeHelper=new Set(eligible.filter(a=>a!==primary&&(blockers.length===0||blockers.includes(a))));
      for(const [a,k] of remaining){
        const [vx,vy]=bearings[k],end={x:a.x+vx/s.x,y:a.y+vy/s.y},bound=bounds(a,sc);
        const inside=end.x>=bound.left&&end.x<=bound.right&&end.y>=bound.top&&end.y<=bound.bottom;
        const ground=inside&&nav.segmentSafe(a,end,sc.planVisibility?.(a)||(p=>visible(a,p)));
        const blocking=copies.filter(c=>c!==a&&!clear(a,end,[c]));
        for(const peer of canBeHelper)if(peer!==a&&(!ground||blocking.length!==1||blocking[0]!==peer))canBeHelper.delete(peer);
        if(!canBeHelper.size)break;
      }
      Object.assign(primary,from);
      yield;
      for(const helper of canBeHelper)for(const [e,ex,ey] of headings){
        if(++result.trials>3600){result.reason='bounded-search';return;}
        const h=start.get(helper.key),q={x:h.x+e*ex,y:h.y+e*ey};
        if(!yieldLeg(helper,h,q,empty))continue;
        result.firstNativeLeg++;Object.assign(helper,q);
        if(!yieldLeg(primary,from,to,empty)){Object.assign(helper,h);continue;}
        result.secondNativeLeg++;Object.assign(primary,to);
        const fail=losses([primary,helper],false,1).length;
        result.full++;
        Object.assign(primary,from);
        if(!fail){
          result.mid++;
          if(!losses([helper],true,1).length){
            Object.assign(helper,h);
            result.plan=[{key:helper.key,from:h,to:q},{key:primary.key,from,to}];result.reason='verified-endpoints';return;
          }
        }
        Object.assign(helper,h);
        if(result.full%3===0)yield;
      }
    }
    result.reason='no-two-leg-solution-on-sampled-lattice';
  }
  return async()=>{
    legacy=new Map(actors.map(a=>[a.key,getPoint(a)]));
    const run=search();
    while(true){
      const real=actors,current=scene;
      if(current.navigation!==sc.navigation)throw Error('投影が変わりました。');
      try{
        actors=copies;scene=sc;
        if(run.next().done)return result;
      }finally{actors=real;scene=current;}
      await new Promise(resolve=>setTimeout(resolve,0));
    }
  };
}
