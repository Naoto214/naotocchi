// The observer gets the actual native planner's grid nodes and validated edges.
// Dynamic permission is applied afresh for the actor's ink and the other feet.
function graphCounts({feet, key, step, includePeers}) {
  const actors=roster(feet);
  const a=key?actors.find(row=>row.key===key):null;
  const box=a?a.box:{left:0,right:scene.width,top:0,bottom:scene.height};
  const peers=a&&includePeers?actors.filter(row=>row!==a):[];
  const grid=nav.spatialGrid(box,step), nodes=grid.nodes, links=grid.neighbors;
  const okay=nodes.map(point=>(!a||a.ink(point))&&peers.every(b=>clearance(a,point,b)>=1));
  const edges=nodes.map((point,i)=>!okay[i]?[]:links(i).filter(j=>{
    if(!okay[j])return false;
    const to=nodes[j];
    if(a && !nav.segmentSafe(point,to,a.ink))return false;
    return peers.every(b=>contactSegmentSafe(point,to,b,...radii(a,b)));
  }));
  const reached=new Set(), components=[],dead=[],isolated=[];
  for(let i=0;i<nodes.length;i++){
    if(!okay[i]) continue;
    if(!edges[i].length)isolated.push(nodes[i]);
    else if(edges[i].length===1)dead.push(nodes[i]);
    if(reached.has(i))continue;
    const todo=[i];reached.add(i);
    for(let k=0;k<todo.length;k++)for(const j of edges[todo[k]])if(!reached.has(j)){reached.add(j);todo.push(j);}
    components.push(todo.length);
  }
  return {key,includePeers,modelGridStep:step,nodes:okay.filter(Boolean).length,components:components.sort((a,b)=>b-a),
    degreeOne:dead.length,isolated:isolated.length,firstDeadEnds:dead.slice(0,6)};
}
return {graphCounts};
