export {projectHomeOcclusion} from './home-occlusion.mjs';
// Presentation-only routes. Screen bounds protect UI; world geometry decides traversability.
import {configureHomeCamera} from './home-scenery.mjs';
import * as THREE from './vendor/three-0.170.0/three.module.min.js';
import {terrainGrid,alignHomeGround} from './meguru-3d.mjs';
import {createTerrainNavigation} from './home-route-navigation.mjs';
export {createTerrainNavigation} from './home-route-navigation.mjs';
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
  const bounds=composition.scenery?.activityBounds;
  if(bounds&&(p.x<bounds.minX||p.x>bounds.maxX||p.z<bounds.minZ||p.z>bounds.maxZ))return false;
  const T=world.terrain;
  if(T?.kind==='coast'){const shore=M.shoreX(world,p.z);if(shore!=null&&((T.side||-1)<0?p.x<shore+60:p.x>shore-60))return false;}
  if(T?.kind==='chasm'&&T.pts?.some((a,i)=>i&&distanceToSegment(p,{a:{x:T.pts[i-1][0],z:T.pts[i-1][1]},b:{x:a[0],z:a[1]}})<(T.half||230)+55))return false;
  const water=terr.sDist(p.x,p.z);if(water.d<water.w+48)return false;
  if(terr.ponds.some(q=>Math.hypot(q.x-p.x,q.z-p.z)<q.r+24))return false;
  if(world.regionId==='city'&&world.segments.some(s=>['road','distant-road'].includes(s.surface)&&(world.homeCityParcels?distanceToRoadRectangle(p,s)<45:distanceToSegment(p,s)<s.half+45)))return false;
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

// Distance to the finite road footprint, not rounded segment caps. At the
// raised pedestrian crossing a character can approach the real pavement edge.
function distanceToRoadRectangle(p,s){const dx=s.b.x-s.a.x,dz=s.b.z-s.a.z,L=Math.hypot(dx,dz)||1,x=p.x-(s.a.x+s.b.x)/2,z=p.z-(s.a.z+s.b.z)/2;return Math.hypot(Math.max(0,Math.abs((x*dx+z*dz)/L)-L/2),Math.max(0,Math.abs((x*dz-z*dx)/L)-s.half));}
