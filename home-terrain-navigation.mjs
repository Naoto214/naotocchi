export {projectHomeOcclusion} from './home-occlusion.mjs';
// Presentation-only routes. Screen bounds protect UI; world geometry decides traversability.
import {configureHomeCamera} from './home-scenery.mjs';
import * as THREE from './vendor/three-0.170.0/three.module.min.js';
import {terrainGrid,alignHomeGround} from './meguru-3d.mjs';
export function createTerrainNavigation({width,height,project,unproject,walkable,cell=12}){
 const valid=p=>{const q=unproject(p);return !!q&&Number.isFinite(q.x+q.y+q.z)&&walkable(q);};
 const segmentSafe=(a,b,predicate=()=>true)=>{const n=Math.max(1,Math.ceil(Math.hypot(a.x-b.x,a.y-b.y)/3));for(let i=0;i<=n;i++){const p={x:a.x+(b.x-a.x)*i/n,y:a.y+(b.y-a.y)*i/n};if(!predicate(p)||!valid(p))return false;}return true;};
 const cache=new Map();
 function grid(bounds){const key=JSON.stringify(bounds);if(cache.has(key))return cache.get(key);const nodes=[];
  for(let y=bounds.top;y<=bounds.bottom;y+=cell)for(let x=bounds.left;x<=bounds.right;x+=cell)if(valid({x,y}))nodes.push({x,y});
  const byKey=new Map(nodes.map((p,i)=>[Math.round((p.x-bounds.left)/cell)+','+Math.round((p.y-bounds.top)/cell),i]));
  const edges=nodes.map(p=>{const out=[],gx=Math.round((p.x-bounds.left)/cell),gy=Math.round((p.y-bounds.top)/cell);for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){if(!dx&&!dy)continue;const i=byKey.get((gx+dx)+','+(gy+dy));if(i!==undefined&&segmentSafe(p,nodes[i]))out.push(i);}return out;});
  const g={nodes,edges};if(cache.size>16)cache.clear();cache.set(key,g);return g;
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
export function createHomeNavigation(M,composition,{width,height,anchorY,offsetX=0,offsetY=0,stageWidth=width,stageHeight=height}){
 const {world,objects}=composition,terr=terrainGrid(world,M,objects),camera=new THREE.PerspectiveCamera(46,width/height,20,12000);
 configureHomeCamera(camera,width,height,composition.scenery?.camera);alignHomeGround(camera,width,height,anchorY);camera.updateMatrixWorld();
 const v=new THREE.Vector3(),ray=new THREE.Raycaster();
 const project=p=>{v.set(p.x,terr.walkY(p.x,p.z),-p.z).project(camera);return {x:(v.x+1)*width/2-offsetX,y:(1-v.y)*height/2-offsetY};};
 const unproject=p=>{
  ray.setFromCamera({x:2*(p.x+offsetX)/width-1,y:1-2*(p.y+offsetY)/height},camera);
  const {origin:o,direction:d}=ray.ray;if(d.y>=-.01)return null;
  // Root solve against the very same terrain sampler as the renderer.
  let lo=Math.max(0,(o.y-200)/-d.y),hi=(o.y+200)/-d.y;
  for(let i=0;i<22;i++){const t=(lo+hi)/2,x=o.x+d.x*t,z=-(o.z+d.z*t),y=o.y+d.y*t;if(y>terr.walkY(x,z))lo=t;else hi=t;}
  const t=(lo+hi)/2,x=o.x+d.x*t,z=-(o.z+d.z*t);return {x,z,y:terr.walkY(x,z)};
 };
 const walkable=p=>{
  if(p.x<world.minX+24||p.x>world.maxX-24||p.z<0||p.z>world.len)return false;
  const water=terr.sDist(p.x,p.z);if(water.d<water.w+48)return false;
  if(terr.ponds.some(q=>Math.hypot(q.x-p.x,q.z-p.z)<q.r+24))return false;
  if(world.regionId==='city'&&world.segments.some(s=>['road','distant-road'].includes(s.surface)&&distanceToSegment(p,s)<s.half+45))return false;
  return !M.collidesAt(world,p.x,p.z,28);
 };
 const seats=composition.scenery?.seats||[[0,550]];
 const initialPoint=(index,count)=>{
  if(index===0||count<=6){const [x,z]=seats[index%seats.length];return project({x,z});}
  // Depth-first staggered seats; the existing visible/safe separation solver
  // selects the nearest legal point for each individual body and attachment.
  const columns=Math.ceil(Math.sqrt(count)),row=Math.floor(index/columns),col=index%columns;
  const depth=[550,1250,100,900,300,1650][row%6];
  return project({x:(col-(columns-1)/2)*230+(row%2?65:-25),z:depth});
 };
 const reference=new THREE.Vector3(0,0,-550).applyMatrix4(camera.matrixWorldInverse).z;
 const depthScale=p=>{const q=unproject(p);if(!q)return 1;const z=new THREE.Vector3(q.x,q.y,-q.z).applyMatrix4(camera.matrixWorldInverse).z;return Math.max(.8,Math.min(1,reference/z));};
 return {...createTerrainNavigation({width:stageWidth,height:stageHeight,project,unproject,walkable}),initialPoint,depthScale,terrain:terr,camera};
}

function distanceToSegment(p,s){const dx=s.b.x-s.a.x,dz=s.b.z-s.a.z,t=Math.max(0,Math.min(1,((p.x-s.a.x)*dx+(p.z-s.a.z)*dz)/(dx*dx+dz*dz||1)));return Math.hypot(p.x-s.a.x-dx*t,p.z-s.a.z-dz*t);}
