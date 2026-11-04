// Pure presentation routes, independent of the optional 3D renderer.
export function createTerrainNavigation({width,height,project,unproject,walkable,cell=12}){
 const valid=p=>{const q=unproject(p);return !!q&&Number.isFinite(q.x+q.y+q.z)&&walkable(q);};
 const segmentSafe=(a,b,predicate=()=>true)=>{const n=Math.max(1,Math.ceil(Math.hypot(a.x-b.x,a.y-b.y)/3));for(let i=0;i<=n;i++){const p={x:a.x+(b.x-a.x)*i/n,y:a.y+(b.y-a.y)*i/n};if(!predicate(p)||!valid(p))return false;}return true;};
 const cache=new Map();
 function grid(bounds){const key=JSON.stringify(bounds);if(cache.has(key))return cache.get(key);const nodes=[];
  for(let y=bounds.top;y<=bounds.bottom;y+=cell)for(let x=bounds.left;x<=bounds.right;x+=cell)if(valid({x,y}))nodes.push({x,y});
  let edges;const buildEdges=()=>{if(edges)return edges;
  const byKey=new Map(nodes.map((p,i)=>[Math.round((p.x-bounds.left)/cell)+','+Math.round((p.y-bounds.top)/cell),i]));
  edges=nodes.map(p=>{const out=[],gx=Math.round((p.x-bounds.left)/cell),gy=Math.round((p.y-bounds.top)/cell);for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){if(!dx&&!dy)continue;const i=byKey.get((gx+dx)+','+(gy+dy));if(i!==undefined&&segmentSafe(p,nodes[i]))out.push(i);}return out;});
  return edges;};
  const g={nodes,get edges(){return buildEdges();}};if(cache.size>16)cache.clear();cache.set(key,g);return g;
 }
 function nearest(p,bounds,predicate=()=>true){const q={x:Math.max(bounds.left,Math.min(bounds.right,p.x)),y:Math.max(bounds.top,Math.min(bounds.bottom,p.y))};if(valid(q)&&predicate(q))return q;let best=null,d=Infinity;for(const n of grid(bounds).nodes){const dist=Math.hypot(n.x-q.x,n.y-q.y);if(dist<d&&predicate(n)){best=n;d=dist;}}return best?{...best}:null;}
 function route(from,to,bounds,predicate=()=>true){
  if(!valid(from))return [];
  const safe=(a,b)=>segmentSafe(a,b,predicate);
  const goal=nearest(to,bounds,predicate);if(!goal)return [];
  if(safe(from,goal))return [goal];
  const {nodes,edges}=grid(bounds),dist=new Float64Array(nodes.length).fill(Infinity),prev=new Int32Array(nodes.length).fill(-1),open=new Set();
  const starts=nodes.map((p,i)=>({i,d:Math.hypot(p.x-from.x,p.y-from.y)})).sort((a,b)=>a.d-b.d).slice(0,12);
  for(const s of starts)if(safe(from,nodes[s.i])){dist[s.i]=s.d;open.add(s.i);}
  let end=-1;
  while(open.size){let k=-1,best=Infinity;for(const i of open){const f=dist[i]+Math.hypot(nodes[i].x-goal.x,nodes[i].y-goal.y);if(f<best){best=f;k=i;}}open.delete(k);
   if(Math.hypot(nodes[k].x-goal.x,nodes[k].y-goal.y)<cell*2&&safe(nodes[k],goal)){end=k;break;}
   for(const j of edges[k]){if(!predicate(nodes[j])||!safe(nodes[k],nodes[j]))continue;const d=dist[k]+Math.hypot(nodes[k].x-nodes[j].x,nodes[k].y-nodes[j].y);if(d+1e-5<dist[j]){dist[j]=d;prev[j]=k;open.add(j);}}
  }
  if(end<0)return [];
  const path=[goal];for(let i=end;i>=0;i=prev[i])path.push(nodes[i]);path.reverse();
  // Only remove a waypoint when the complete replacement segment is safe.
  const smooth=[];let a=from;for(let i=0;i<path.length;){let j=path.length-1;while(j>i&&!safe(a,path[j]))j--;smooth.push({...path[j]});a=path[j];i=j+1;}return smooth;
 }
 return {project,unproject,valid,segmentSafe,nearest,route,width,height};
}
