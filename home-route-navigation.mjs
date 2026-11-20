// Pure presentation routes, independent of the optional 3D renderer.
export function createTerrainNavigation({width,height,project,unproject,walkable,segmentWalkable=null,cell=12,gridOrigin=null,staticGeometry=false}){
 const valid=p=>{const q=unproject(p);return !!q&&Number.isFinite(q.x+q.y+q.z)&&walkable(q);};
 function sampleSegment(a,b,accept){
  const n=Math.max(1,Math.ceil(Math.hypot(a.x-b.x,a.y-b.y)/3));
  for(let i=0;i<=n;i++)if(!accept({x:a.x+(b.x-a.x)*i/n,y:a.y+(b.y-a.y)*i/n}))return false;
  return true;
 }
 const segmentSafe=(a,b,predicate=()=>true)=>(!segmentWalkable||segmentWalkable(a,b))&&sampleSegment(a,b,p=>predicate(p)&&valid(p));
 // Immutable art grids already approved each directed edge with the same
 // 3px samples. Resident/ink predicates are supplied anew for each search.
 const edgeSafe=staticGeometry?sampleSegment:segmentSafe;
 const stable=!!gridOrigin&&Number.isFinite(gridOrigin.x+gridOrigin.y);
 const reference=stable?createTerrainNavigation({width,height,project,unproject,walkable,segmentWalkable,cell,staticGeometry}):null;
 const cache=new Map();
 function grid(bounds,spacing=cell){const key=JSON.stringify([bounds,spacing]);if(cache.has(key))return cache.get(key);const nodes=[];
  const ox=stable?gridOrigin.x:bounds.left,oy=stable?gridOrigin.y:bounds.top;
  const firstX=ox+Math.ceil((bounds.left-ox)/spacing)*spacing,firstY=oy+Math.ceil((bounds.top-oy)/spacing)*spacing;
  for(let y=firstY;y<=bounds.bottom;y+=spacing)for(let x=firstX;x<=bounds.right;x+=spacing)if(valid({x,y}))nodes.push({x,y});
  let byKey,fullyBuilt=false;
  const edges=[];
  function neighbors(i){
   if(edges[i])return edges[i];
   byKey??=new Map(nodes.map((p,j)=>[Math.round((p.x-ox)/spacing)+','+Math.round((p.y-oy)/spacing),j]));
   const p=nodes[i],out=[],gx=Math.round((p.x-ox)/spacing),gy=Math.round((p.y-oy)/spacing);
   for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){
    if(!dx&&!dy)continue;
    const j=byKey.get((gx+dx)+','+(gy+dy));
    if(j!==undefined&&segmentSafe(p,nodes[j]))out.push(j);
   }
   return edges[i]=out;
  }
  const g={nodes,get neighbors(){
   // A caller with mutable terrain retains the original eager edge snapshot
   // and the full live validation on every traversal.
   if(!staticGeometry&&!fullyBuilt){for(let i=0;i<nodes.length;i++)neighbors(i);fullyBuilt=true;}
   return neighbors;
  }};if(cache.size>16)cache.clear();cache.set(key,g);return g;
 }
 function nearest(p,bounds,predicate=()=>true){const q={x:Math.max(bounds.left,Math.min(bounds.right,p.x)),y:Math.max(bounds.top,Math.min(bounds.bottom,p.y))};if(valid(q)&&predicate(q))return q;let best=null,d=Infinity;for(const n of grid(bounds).nodes){const dist=Math.hypot(n.x-(stable?p.x:q.x),n.y-(stable?p.y:q.y));if(dist<d&&predicate(n)){best=n;d=dist;}}return best?{...best}:null;}
 function route(from,to,bounds,predicate=()=>true){
  if(!valid(from))return [];
  const safe=(a,b)=>segmentSafe(a,b,predicate);
  const goal=nearest(to,bounds,predicate);if(!goal)return [];
  if(safe(from,goal))return [goal];
  const {nodes,neighbors}=grid(bounds),dist=new Float64Array(nodes.length).fill(Infinity),prev=new Int32Array(nodes.length).fill(-1),open=new Set();
  const starts=nodes.map((p,i)=>({i,d:Math.hypot(p.x-from.x,p.y-from.y)})).sort((a,b)=>a.d-b.d).slice(0,12);
  for(const s of starts)if(safe(from,nodes[s.i])){dist[s.i]=s.d;open.add(s.i);}
  let end=-1;
  while(open.size){let k=-1,best=Infinity;for(const i of open){const f=dist[i]+Math.hypot(nodes[i].x-goal.x,nodes[i].y-goal.y);if(f<best){best=f;k=i;}}open.delete(k);
   if(Math.hypot(nodes[k].x-goal.x,nodes[k].y-goal.y)<cell*2&&safe(nodes[k],goal)){end=k;break;}
   for(const j of neighbors(k)){if(!predicate(nodes[j])||!edgeSafe(nodes[k],nodes[j],predicate))continue;const d=dist[k]+Math.hypot(nodes[k].x-nodes[j].x,nodes[k].y-nodes[j].y);if(d+1e-5<dist[j]){dist[j]=d;prev[j]=k;open.add(j);}}
  }
  if(end<0)return [];
  const path=[goal];for(let i=end;i>=0;i=prev[i])path.push(nodes[i]);path.reverse();
  // Only remove a waypoint when the complete replacement segment is safe.
  const smooth=[];let a=from;for(let i=0;i<path.length;){let j=path.length-1;while(j>i&&!safe(a,path[j]))j--;smooth.push({...path[j]});a=path[j];i=j+1;}return smooth;
 }
 // Search the reachable component, rather than committing to an unreachable
 // nearest point. This supplementary grid has a fixed origin and half spacing.
 function reachable(from,requested,bounds,predicate=()=>true,accept=()=>true){
  if(!stable||!valid(from))return [];
  const {nodes,neighbors}=grid(bounds,cell/2);if(nodes.length>20000)return [];
  const safe=(a,b)=>segmentSafe(a,b,predicate),allowed=new Int8Array(nodes.length);
  const ok=i=>{if(!allowed[i])allowed[i]=predicate(nodes[i])?1:-1;return allowed[i]===1;};
  const prev=new Int32Array(nodes.length).fill(-2),queue=[];
  const starts=nodes.map((p,i)=>({i,d:Math.hypot(p.x-from.x,p.y-from.y)})).sort((a,b)=>a.d-b.d);
  for(const {i} of starts){if(ok(i)&&safe(from,nodes[i])){prev[i]=-1;queue.push(i);if(queue.length===12)break;}}
  let best=-1,score=Infinity;
  for(let head=0;head<queue.length;head++){
   const i=queue[head],p=nodes[i],d=Math.hypot(p.x-requested.x,p.y-requested.y);
   if(d<score&&accept(p)){score=d;best=i;}
   for(const j of neighbors(i))if(prev[j]===-2&&ok(j)&&edgeSafe(p,nodes[j],predicate)){prev[j]=i;queue.push(j);}
  }
  if(best<0)return [];
  const path=[];for(let i=best;i>=0;i=prev[i])path.push(nodes[i]);path.reverse();
  const smooth=[];let a=from;for(let i=0;i<path.length;){let j=path.length-1;while(j>i&&!safe(a,path[j]))j--;smooth.push({...path[j]});a=path[j];i=j+1;}return smooth;
 }

 return {staticGeometry,reachable:stable?reachable:null,referenceNearest:reference?.nearest,referenceRoute:reference?.route,rawDestination:stable,project,unproject,valid,segmentSafe,nearest,route,width,height};
}
