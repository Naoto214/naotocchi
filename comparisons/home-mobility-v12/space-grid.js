// Counterfactual grid walks on the true forest navigation. A pair can take
// alternating steps. At all times every other foot, including the receiver's,
// stays at its measured position. No gameplay planner calls this function.
function ordering({feet,key,spacing=2,extent=48,stateBudget=80000}) {
  const list=roster(feet),who=list.findIndex(a=>a.key===key),owner=list[who];
  const bit=i=>1<<i;
  const points=[],directions=[],grids=new Map(),masks=[],evidence=[];
  const dim=2*Math.floor(extent/spacing)+1, center=(dim-1)/2;
  const offsets=[[1,0],[1,1],[0,1],[-1,1],[-1,0],[-1,-1],[0,-1],[1,-1]];
  const index=(x,y)=>(y+center)*dim+x+center;
  const start=index(0,0);
  function motion(a,b) {
    const dx=b.x-a.x,dy=b.y-a.y,t=Math.min(1,.35/Math.hypot(dx,dy));
    return {a,b,first:{x:a.x+t*dx,y:a.y+t*dy}};
  }
  function blocks(leg,peer) {
    const [rx,ry]=radii(leg.a,peer);
    const before=clearance(leg.a,leg.a,peer),first=clearance(leg.a,leg.first,peer);
    return !contactSegmentSafe(leg.a,leg.b,peer,rx,ry) || (before<1&&first<1&&first<=before+1e-6);
  }
  function occupied(leg,skip) {
    let bits=0;
    for(let i=0;i<list.length;i++)if(i!==skip&&blocks(leg,list[i]))bits|=bit(i);
    return bits;
  }
  for(let i=0;i<96;i++){
    const angle=i*Math.PI/48,to={...owner,x:owner.x+8*Math.cos(angle)/scale.x,y:owner.y+8*Math.sin(angle)/scale.y};
    const leg=motion(owner,to);
    if(!inBox(to,owner.box)||!nav.segmentSafe(owner,to,owner.ink))continue;
    points.push(leg);directions.push(i*3.75);masks.push(occupied(leg,who));
  }
  function grid(slot) {
    if(grids.has(slot))return grids.get(slot);
    const a=list[slot],sites=new Array(dim*dim),edgeCache=new Map(),floodCache=new Map();
    const toSite=n=>{
      if(sites[n])return sites[n];
      return sites[n]={...a,x:a.x+((n%dim)-center)*spacing/scale.x,y:a.y+(Math.floor(n/dim)-center)*spacing/scale.y};
    };
    function edges(n) {
      if(edgeCache.has(n))return edgeCache.get(n);
      const x=n%dim,y=Math.floor(n/dim),from=toSite(n),result=[];
      for(const [dx,dy] of offsets) {
        if(x+dx<0||x+dx>=dim||y+dy<0||y+dy>=dim)continue;
        const m=n+dx+dy*dim,to=toSite(m);
        const leg=motion(from,to);
        const blocks=occupied(leg,slot);
        // One and only one other helper can change position.
        if((blocks&(blocks-1))!==0 || blocks===bit(who))continue;
        if(!inBox(to,a.box)||!nav.segmentSafe(from,to,a.ink))continue;
        result.push({m,leg,blocks});
      }
      edgeCache.set(n,result);return result;
    }
    function flood(ignored){
      if(floodCache.has(ignored))return floodCache.get(ignored);
      const reached=new Set([start]),queue=[start];
      for(let k=0;k<queue.length;k++)for(const e of edges(queue[k])){
        if((e.blocks & ~ignored)!==0 || reached.has(e.m))continue;
        reached.add(e.m);queue.push(e.m);
      }
      const item={reached};floodCache.set(ignored,item);return item;
    }
    const result={toSite,edges,flood};grids.set(slot,result);return result;
  }
  const ids=mask=>list.map((_,i)=>i).filter(i=>mask&bit(i));
  const focusAngle=owner.key==='companion:tanuki'?180:288.75,focusIndex=directions.indexOf(focusAngle);
  const direct=focusIndex<0?[]:ids(masks[focusIndex]);
  let focused=null;
  if(direct.length===1) {
    const helper=direct[0],g=grid(helper),groups=[];
    for(let ignored=-1;ignored<list.length;ignored++) {
      if(ignored===helper||ignored===who)continue;
      const f=g.flood(ignored<0?0:bit(ignored)),possible=[...f.reached];
      const endpoints=possible.filter(n=>!blocks(points[focusIndex],g.toSite(n)));
      const disp=n=>Math.hypot(((n%dim)-center)*spacing,(Math.floor(n/dim)-center)*spacing);
      groups.push({absent:ignored<0?null:list[ignored].key,nodes:possible.length,
        maxRadius:Math.max(...possible.map(disp)),clearingNodes:endpoints.length,
        closest:endpoints.length?Math.min(...endpoints.map(disp)):null});
    }
    focused={degrees:focusAngle,helper:list[helper].key,groups};
  }
  const stats={single:0,pairsScreened:0,pairsWithConditionalRefuge:0,jointStates:0,truncatedPairs:0};
  const statsByDirection=points.map((_,i)=>({degrees:directions[i],directBlockers:ids(masks[i]).map(j=>list[j].key),
    oneCanLeave:false,conditionalPairs:0,successfulPairs:0,unresolvedPairs:0}));
  const targets=masks.map((mask,i)=>({mask,i,ids:ids(mask)})).filter(t=>t.ids.length>0&&t.ids.length<=2);
  for(const {i,ids:needed} of targets)if(needed.length===1){
    const g=grid(needed[0]),f=g.flood(0);
    if([...f.reached].some(n=>!blocks(points[i],g.toSite(n)))) {
      stats.single++;statsByDirection[i].oneCanLeave=true;
    }
  }
  for(let h=0;h<list.length;h++)for(let k=h+1;k<list.length;k++){
    if(h===who||k===who)continue;
    const group=targets.filter(t=>(t.mask&~(bit(h)|bit(k)))===0);
    if(!group.length)continue;
    stats.pairsScreened++;
    const g=grid(h),j=grid(k),f=g.flood(bit(k)),u=j.flood(bit(h));
    const conditional=group.filter(t=>[...f.reached].some(n=>!blocks(points[t.i],g.toSite(n)))&&
      [...u.reached].some(n=>!blocks(points[t.i],j.toSite(n))));
    if(!conditional.length)continue;
    conditional.forEach(t=>statsByDirection[t.i].conditionalPairs++);
    stats.pairsWithConditionalRefuge++;
    const pairSize=dim*dim;
    const code=(m,n)=>m*pairSize+n;
    const root=code(start,start),visited=new Map([[root,null]]),queue=[root];
    const solved=new Map();
    let tested=0;
    for(;tested<queue.length && tested<stateBudget;tested++){
      const raw=queue[tested],m=Math.floor(raw/pairSize),n=raw%pairSize,am=g.toSite(m),bn=j.toSite(n);
      for(const t of conditional)if(!solved.has(t.i)&&!blocks(points[t.i],am)&&!blocks(points[t.i],bn))solved.set(t.i,raw);
      if(solved.size===conditional.length)break;
      for(const edge of g.edges(m)) {
        const next=code(edge.m,n);
        if(!visited.has(next)&&(edge.blocks&~bit(k))===0&&!blocks(edge.leg,bn)) {visited.set(next,raw);queue.push(next);}
      }
      for(const edge of j.edges(n)) {
        const next=code(m,edge.m);
        if(!visited.has(next)&&(edge.blocks&~bit(h))===0&&!blocks(edge.leg,am)) {visited.set(next,raw);queue.push(next);}
      }
    }
    const truncated=tested>=stateBudget && tested<queue.length;
    if(truncated)stats.truncatedPairs++;
    stats.jointStates+=tested;
    for(const t of conditional){
      if(solved.has(t.i))statsByDirection[t.i].successfulPairs++;
      else if(truncated)statsByDirection[t.i].unresolvedPairs++;
    }
    const sample=[];
    // Preserve each solved route in turn so its every step can later be replayed.
    for(const [direction,at] of solved) {
      const moves=[];
      for(let n=at;visited.get(n)!==null;n=visited.get(n)){
        const old=visited.get(n),pair=[Math.floor(n/pairSize),n%pairSize],prior=[Math.floor(old/pairSize),old%pairSize];
        const first=prior[0]!==pair[0],actor=first?g.toSite(pair[0]):j.toSite(pair[1]);
        moves.push({key:actor.key,x:actor.x,y:actor.y});
      }
      sample.push({degrees:directions[direction],moves:moves.reverse()});
    }
    evidence.push({pair:[list[h].key,list[k].key],conditional:conditional.length,reached:tested,truncated,solutions:sample});
  }
  return {key,spacing,extent,stateBudget,stats,focused,statsByDirection,evidence};
}
return {ordering};
