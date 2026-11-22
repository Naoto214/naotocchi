// Counterfactual geometric check at archived feet. No controller or game state is mutated.
function openWithTwo({feet,key,angles=48,distances=[1,3,6,8,12,16,24]}) {
  const list=roster(feet),owner=list.find(a=>a.key===key);
  const paths=new Map();
  function path(a,dx,dy) {
    const t=Math.min(1,.35/Math.hypot(dx,dy));
    return {a,q:{...a,x:a.x+dx,y:a.y+dy},first:{x:a.x+t*dx,y:a.y+t*dy}};
  }
  function touched(r,b){
    const [rx,ry]=radii(r.a,b);
    const before=clearance(r.a,r.a,b),after=clearance(r.a,r.first,b);
    return !contactSegmentSafe(r.a,r.q,b,rx,ry)||(before<1&&after<1&&after<=before+1e-6);
  }
  function moves(a) {
    if(paths.has(a.key))return paths.get(a.key);
    const choices=[];
    for(const dist of distances)for(let i=0;i<angles;i++) {
      const t=2*Math.PI*i/angles;
      const r=path(a,dist*Math.cos(t)/scale.x,dist*Math.sin(t)/scale.y);
      if(!inBox(r.q,a.box)||!nav.segmentSafe(a,r.q,a.ink))continue;
      const blockers=list.filter(b=>b!==a&&touched(r,b));
      if(blockers.length<=1)choices.push({...r,dist,dir:i,blockers});
    }
    paths.set(a.key,choices);return choices;
  }
  const simple=r=>({who:r.a.key,from:[r.a.x,r.a.y],to:[r.q.x,r.q.y],distanceCss:r.dist});
  function verify(leg,steps) {
    let state=list;
    for(const step of steps) {
      const blocked=decide(step.a,step.q,state.filter(b=>b.key!==step.a.key));
      if(!blocked||blocked.length)throw Error('Unverified helper step');
      state=state.map(b=>b.key===step.a.key?step.q:b);
    }
    const permitted=decide(leg.a,leg.q,state.filter(b=>b.key!==leg.a.key));
    if(!permitted||permitted.length)throw Error('Unverified resident step');
    return steps.map(simple);
  }
  function solve(leg,blockers) {
    if(blockers.length===0)return [];
    if(blockers.length===1) {
      const direct=moves(blockers[0]).find(p=>!p.blockers.length&&!touched(leg,p.q));
      if(direct)return verify(leg,[direct]);
    }
    // Move the last blocking peer. It may itself require a single preceding neighbor to walk.
    for(const one of blockers){
      for(const helper of moves(one)){
        if(touched(leg,helper.q))continue;
        const required=new Set([...blockers.filter(b=>b!==one), ...helper.blockers]);
        if(required.size!==1)continue;
        const prior=[...required][0];
        if(prior===owner)continue;
        for(const first of moves(prior)){
          if(first.blockers.length || touched(helper,first.q) || touched(leg,first.q))continue;
          return verify(leg,[first,helper]);
        }
      }
    }
    return null;
  }
  const counts={offGround:0,independent:0,oneHelper:0,twoHelpers:0,stillClosed:0,needsAtLeastThreeBlockersToLeaveThisRay:0},examples={};
  for(let i=0;i<96;i++){
    const theta=2*Math.PI*i/96,r=path(owner,8*Math.cos(theta)/scale.x,8*Math.sin(theta)/scale.y);
    const hit=decide(owner,r.q,list.filter(b=>b!==owner));
    if(hit===null){counts.offGround++;continue;}
    if(hit.length>2){counts.needsAtLeastThreeBlockersToLeaveThisRay++;continue;}
    const sequence=solve(r,hit);
    const label=sequence===null?'stillClosed':['independent','oneHelper','twoHelpers'][sequence.length];
    counts[label]++;
    if(sequence && sequence.length&&!examples[label])examples[label]={directionDeg:i*3.75,steps:sequence,ownerFrom:[owner.x,owner.y],ownerTo:[r.q.x,r.q.y]};
  }
  return {key,counts,examples};
}
return {openWithTwo};
