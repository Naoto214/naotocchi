// Measure only. Equal treatment of every unordered pair; no saved or live coordinates are assigned.
function pairSurvey({feet,angles,ranges,headings,lengths,restricted}) {
  const base=roster(feet), bySlot=new Map(base.map((a,i)=>[a.key,i]));
  function pathAt(actor,offset) {
    const p={x:actor.x+offset.dx,y:actor.y+offset.dy};
    return {actor,p,first:{x:actor.x+offset.fx,y:actor.y+offset.fy},offset};
  }
  const offsets=ranges.flatMap(d=>Array.from({length:angles},(_,i)=>{
    const t=2*Math.PI*i/angles,dx=d*Math.cos(t)/scale.x,dy=d*Math.sin(t)/scale.y;
    const f=Math.min(1,.35/Math.hypot(dx,dy));
    return {d,i,dx,dy,fx:f*dx,fy:f*dy};
  }));
  function blocked(path,peer) {
    const a=path.actor,[rx,ry]=radii(a,peer);
    if (Math.abs(a.x-peer.x)>rx+Math.abs(path.offset.dx) ||
        Math.abs(a.y-peer.y)>ry+Math.abs(path.offset.dy))return false;
    const prior=clearance(a,a,peer),f=clearance(a,path.first,peer);
    return !contactSegmentSafe(a,path.p,peer,rx,ry)||(prior<1 && f<1 && f<=prior+1e-6);
  }
  // Check the ground and the original nine-point ink predicate on the complete line segment.
  const onGround=path=>inBox(path.p,path.actor.box)&&nav.segmentSafe(path.actor,path.p,path.actor.ink);
  const streams=base.map((a,slot)=>{
    const oldSafe=[],goals=[];
    for(const offset of offsets){
      const p=pathAt(a,offset);
      if(!onGround(p))continue;
      const obstacles=[];
      for(let n=0;n<base.length;n++)if(n!==slot && blocked(p,base[n]))obstacles.push(n);
      if(!obstacles.length)oldSafe.push(p);
      if(offset.d===8 && obstacles.length<=2)goals.push({p,obstacles});
    }
    return {oldSafe,goals,hadEight:goals.some(o=>o.obstacles.length===0)};
  });
  function compile(slot,dx,dy){
    const old=base[slot], moved={...old,x:old.x+dx/scale.x,y:old.y+dy/scale.y};
    // As an initial position, the endpoint and art must be valid. No teleport is performed.
    if(!inBox(moved,old.box)||!nav.valid(moved)||!old.ink(moved))return null;
    const needed=new Set(), oldOwn=[];
    for(let k=0;k<base.length;k++){
      if(k===slot)continue;
      if(clearance(moved,moved,base[k])+1e-9 < Math.min(1,clearance(old,old,base[k])) ||
         streams[k].oldSafe.some(p=>blocked(p,moved)))needed.add(k);
      if(needed.size>1)return null;
    }
    for(const oldPath of streams[slot].oldSafe){
      const p=pathAt(moved,oldPath.offset);
      if(!onGround(p))return null;
      for(let k=0;k<base.length;k++)if(k!==slot&&blocked(p,base[k]))needed.add(k);
      if(needed.size>1)return null;
      oldOwn.push(p);
    }
    const workable=[]; // New 8px own exits with at most the movable partner in their way.
    if(!streams[slot].hadEight){
      for(const offset of offsets){
        if(offset.d!==8)continue;
        const p=pathAt(moved,offset);
        if(!onGround(p))continue;
        const obstacles=[];
        for(let k=0;k<base.length&&obstacles.length<=1;k++)if(k!==slot&&blocked(p,base[k]))obstacles.push(k);
        if(obstacles.length<=1)workable.push({p,obstacle:obstacles[0]??null});
      }
    }
    return {slot,dx,dy,moved,required:needed.size?[...needed][0]:null,oldOwn,workable};
  }
  const counts={singleEndpointsConstructed:0,singleEndpointsEligibleForSomePartner:0,pairsConsidered:0,compatibleEndpointPairs:0,
    newOrWorseContact:0,lostOwnDirection:0,protectedButNoNewWalker:0,improved:0};
  const all=[],bestByOpened=new Map();
  function check(a,b){
    counts.compatibleEndpointPairs++;
    const i=a.slot,j=b.slot;
    if(clearance(a.moved,a.moved,b.moved)+1e-9<Math.min(1,clearance(base[i],base[i],base[j]))){counts.newOrWorseContact++;return;}
    if(a.oldOwn.some(p=>blocked(p,b.moved))||b.oldOwn.some(p=>blocked(p,a.moved))){counts.lostOwnDirection++;return;}
    const opened=[];
    for(let k=0;k<base.length;k++){
      if(streams[k].hadEight)continue;
      if(k===i||k===j){
        const actor=k===i?a:b,peer=k===i?b:a;
        if(actor.workable.some(({p,obstacle})=>(obstacle===null||obstacle===peer.slot)&&!blocked(p,peer.moved)))opened.push(base[k].key);
      }else if(streams[k].goals.some(({p,obstacles})=>
        obstacles.every(n=>n===i||n===j)&&!blocked(p,a.moved)&&!blocked(p,b.moved)))opened.push(base[k].key);
    }
    if(!opened.length){counts.protectedButNoNewWalker++;return;}
    counts.improved++;
    const item={moves:[a,b].map(o=>({key:base[o.slot].key,dx:o.dx,dy:o.dy})),opened};
    if(restricted)all.push(item);
    else{
      // Compact equivalent candidate classes. Keep a breadth of short moves for fine validation.
      const code=i+':'+j+':'+opened.join(',');
      const score=Math.hypot(a.dx,a.dy)+Math.hypot(b.dx,b.dy);
      const arr=bestByOpened.get(code)||[];
      arr.push({score,item});arr.sort((a,b)=>a.score-b.score);if(arr.length>6)arr.pop();
      bestByOpened.set(code,arr);
    }
  }
  const memo=new Map();
  function endpoint(i,dx,dy){
    const id=[i,dx,dy].join('/');
    if(!memo.has(id)){
      counts.singleEndpointsConstructed++;
      const move=compile(i,dx,dy);
      if(move)counts.singleEndpointsEligibleForSomePartner++;
      memo.set(id,move);
    }
    return memo.get(id);
  }
  if(restricted){
    for(const item of restricted){
      const [a,b]=item.moves.map(o=>endpoint(bySlot.get(o.key),o.dx,o.dy));
      counts.pairsConsidered++;
      if(a&&b&&(a.required===null||a.required===b.slot)&&(b.required===null||b.required===a.slot))check(a,b);
    }
  }else{
    const shifts=lengths.flatMap(d=>Array.from({length:headings},(_,n)=>{
      const t=n*2*Math.PI/headings;return [d*Math.cos(t),d*Math.sin(t)];
    }));
    const choices=base.map((a,i)=>shifts.map(([dx,dy])=>endpoint(i,dx,dy)).filter(Boolean));
    for(let i=0;i<base.length;i++)for(let j=i+1;j<base.length;j++){
      counts.pairsConsidered+=shifts.length**2;
      const aa=choices[i].filter(a=>a.required===null||a.required===j);
      const bb=choices[j].filter(b=>b.required===null||b.required===i);
      for(const a of aa)for(const b of bb)check(a,b);
    }
    for(const group of bestByOpened.values())for(const proposal of group)all.push(proposal.item);
  }
  return {counts,candidates:all,hadEight:streams.filter(s=>s.hadEight).length};
}
return {pairSurvey};
