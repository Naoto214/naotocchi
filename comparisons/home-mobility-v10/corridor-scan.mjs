// Count simultaneous blockers on direct native 8 CSS px segments. A small
// count allows a cooperative search; it does not prove that the helpers fit.
export function inspectCorridors(a,goal,clock,actors,scene,box,segment,canHelp){
  const {x:sx,y:sy}=scene.navigation.intentScale;
  const nearby=actors.filter(b=>b!==a).map(b=>({b,rx:(a.w+b.w)*.5+10,ry:(a.h+b.h)*.38+10}));
  const contacts=nearby.filter(({b,rx,ry})=>Math.hypot((a.x-b.x)/rx,(a.y-b.y)/ry)<1).map(({b})=>b.key);
  const distance=p=>Math.hypot((p.x-goal.x)*sx,(p.y-goal.y)*sy);
  const ink=scene.planVisibility(a),start=distance(a);
  const summary=()=>({boundsOK:0,terrainOK:0,blockerCounts:[0,0,0,0],eligibleAtMostTwo:0});
  const all=summary(),toward=summary(),blockers=new Map(),blockerSets=new Map();
  for(let i=0;i<96;i++){
    const theta=i*Math.PI/48,q={x:a.x+8*Math.cos(theta)/sx,y:a.y+8*Math.sin(theta)/sy};
    const relevant=start-distance(q)>.75?[all,toward]:[all];
    if(q.x<box.left||q.x>box.right||q.y<box.top||q.y>box.bottom)continue;
    for(const tally of relevant)tally.boundsOK++;
    if(!scene.navigation.segmentSafe(a,q,ink))continue;
    const blocked=nearby.filter(({b,rx,ry})=>!segment(a,q,b,rx,ry));
    for(const tally of relevant){
      tally.terrainOK++;tally.blockerCounts[Math.min(3,blocked.length)]++;
      if(blocked.length<=2&&blocked.every(({b})=>canHelp(b)))tally.eligibleAtMostTwo++;
    }
    if(relevant.length===2){
      const group=blocked.map(({b})=>b.key).sort().join('|');
      blockerSets.set(group,(blockerSets.get(group)||0)+1);
      for(const {b} of blocked)blockers.set(b.key,(blockers.get(b.key)||0)+1);
    }
  }
  return {key:a.key,clock,from:[a.x,a.y],goal:[goal.x,goal.y],contacts,
    edgeCss:Math.min((a.x-box.left)*sx,(box.right-a.x)*sx,(a.y-box.top)*sy,(box.bottom-a.y)*sy),
    all,toward,blockers:Object.fromEntries(blockers),blockerSets:Object.fromEntries(blockerSets)};
}
