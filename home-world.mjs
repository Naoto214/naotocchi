import { createHomeNavigation } from './home-terrain-navigation.mjs';
export {createHomeNavigation,createTerrainNavigation} from './home-terrain-navigation.mjs';
import { createHomeEnvironmentRenderer } from './meguru-3d.mjs';
import { HOME_ROUTES,createWorldLife } from './world-life.mjs';
// Home-owned layout reuses official Meguru meshes; benches use the same box kit.
import {HOME_SCENERY,cityGroundParcels} from './home-scenery.mjs';
export function composeHomeWorld(M,region){
 const scenery=HOME_SCENERY[region];if(scenery?.status!=='pilot')throw Error('Unsupported Home region');
 const source=M.buildWorld(region,M.buildRegistry(),{world3d:true});const catalogue=[...M.worldObjects3d(source).objects];
 // No bench exists in the city catalogue. A six-part Home bench uses the
 // established low-poly box primitive and wood/metal palette (no new textures).
 if(region==='city')catalogue.push({id:'home-kit:bench-v1',type:'bench',solid:true,collision:{hw:66,hd:27,ang:0},parts:[
  {shape:'box',rx:62,rz:20,h:7,y:30,ang:Math.PI/2,color:'#aa7951'},
  {shape:'box',rx:62,rz:4,h:25,y:39,dz:19,ang:Math.PI/2,color:'#aa7951'},
  ...[-46,46].flatMap(dx=>[{shape:'box',rx:5,rz:18,h:30,y:0,dx,ang:Math.PI/2,color:'#57686b'},{shape:'box',rx:4,rz:4,h:34,y:30,dx,dz:19,ang:Math.PI/2,color:'#57686b'}])
 ]});
 const placements=[...scenery.placements];
 if(['forest','river_lake'].includes(region))for(let i=0;i<12;i++)placements.push([i%3?'broadleaf':'conifer',-1700+i*310,(region==='river_lake'?3100:2850)+(i%3)*220,1.3+(i%3)*.25]);
 const objects=placements.map(([type,x,z,k=1,variant],i)=>{let candidates=catalogue.filter(o=>o.type===type);if(variant){const selected=candidates.filter(o=>{const f=o.parts[0]?.fl||0;return variant==='high'?f>=5:variant==='mid'?f===4:f<=3;});if(selected.length)candidates=selected;}const o=candidates[i%candidates.length];if(!o)return null;return {...o,id:'home:'+region+':'+i,sourceId:o.id,x,z,collision:o.collision?{...o.collision,x,z,hw:o.collision.hw*k,hd:o.collision.hd*k}:null,parts:o.parts.map(p=>{const q={...p};if(region==='city'&&['house','tower'].includes(type)&&['#b8d8e5','#cfe6f2'].includes(q.color))q.homeWindow=true;if(region==='city'&&q.win){q.homeWindow=true;q.color='#b8d8e5';}for(const key of ['r','rx','rz','h','y','dx','dz','len','w'])if(typeof q[key]==='number')q[key]*=k;return q;})};}).filter(Boolean);
 // Home mountain silhouettes retain the official peak parts with a broad footprint.
 for(const ob of objects.filter(o=>o.type==='lm_peak')){for(const p of ob.parts)for(const k of ['r','rx','rz','dx','dz'])if(typeof p[k]==='number')p[k]*=3.4;if(ob.collision){ob.collision.hw*=3.4;ob.collision.hd*=3.4;}}
 // The formal windmill boards become radial sails around one Home-only hub.
 for(const ob of objects.filter(o=>o.type==='lm_windmill'))for(const p of ob.parts.filter(p=>p.shape==='board')){p.dx=0;p.homeWind=true;}
 // Repeat the formal framed-window pair between existing levels for taller
 // Home buildings; bounded geometry, no textures or catalogue mutation.
 if(region==='city')for(const ob of objects.filter(o=>o.type==='tower')){
  const height=Math.max(...ob.parts.map(p=>(p.y||0)+(p.h||0)));
  if(height<=700)continue;
  const windows=ob.parts.filter(p=>p.win),levels=[...new Set(windows.map(p=>p.y))].sort((a,b)=>a-b);
  if(levels.length<2)continue;
  const step=(levels[1]-levels[0])/2,extra=[];
  for(const p of windows){const y=p.y+step;if(y+p.h>height-28)continue;
   extra.push({...p,rx:p.rx+3,rz:Math.max(.8,p.rz-.4),y:y-2,h:p.h+4,win:false,homeWindow:false,color:'#f1ebe0'}, {...p,y});
  }
  ob.parts.push(...extra);
 }
 // The official bridge was built for its original crossing. Rotate its long
 // axis across this Home river and extend the deck to both banks, not the art style.
 for(const ob of objects.filter(o=>o.type==='bridge')){
  const axis=ob.parts.find(p=>p.len)?.ang||0,angle=-Math.atan(scenery.river?.slope||0),turn=angle-axis;
  const reach=2*(scenery.river?.half||540)+120,span=Math.max(...ob.parts.map(p=>p.len||0)),k=reach/span;
  for(const p of ob.parts){
   // Undo the catalogue angle before stretching the longitudinal coordinate.
   // Scaling world dz would shear posts sideways away from the deck.
   const x=p.dx||0,z=p.dz||0,lx=x*Math.cos(axis)-z*Math.sin(axis),lz=(x*Math.sin(axis)+z*Math.cos(axis))*k;
   p.dx=lx*Math.cos(angle)+lz*Math.sin(angle);p.dz=-lx*Math.sin(angle)+lz*Math.cos(angle);
   if(p.len)p.len*=k;if(p.ang!=null)p.ang+=turn;
  }
 }
 // Reorient existing shopfront parts so their doors face the street, keeping collision aligned.
 if(region==='city')for(const ob of objects.filter(o=>o.type==='house'||o.type==='tower')){
  const door=ob.parts.find(p=>p.door);if(!door)continue;
  const a=door.ang||0,sign=(door.dx||0)*Math.cos(a)-(door.dz||0)*Math.sin(a)>=0?1:-1;
  const turn=sign*Math.PI/2-a,cs=Math.cos(turn),sn=Math.sin(turn);
  for(const p of ob.parts){const x=p.dx||0,z=p.dz||0;p.dx=x*cs+z*sn;p.dz=-x*sn+z*cs;if(p.ang!=null)p.ang+=turn;}
  ob.rot=(ob.rot||0)+turn;if(ob.collision)ob.collision.ang=(ob.collision.ang||0)+turn;
 }
 // Low cover is reusable official geometry; leave the care clearing empty.
 const cover=(region==='city'?[]:catalogue).filter(o=>o.type==='grass'||o.type==='flower'||o.type==='dressing').slice(0,18);
 cover.forEach((o,i)=>objects.push({...o,id:'home:cover:'+i,sourceId:o.id,x:(i%2?-1:1)*(720+(i%4)*100),z:region==='river_lake'?880+(i%3)*55:850+Math.floor(i/2)*140,solid:false,collision:null,parts:o.parts.map(p=>({...p}))}));

 const controls=scenery.path,pathPoints=[];
 // Sample the Home trail smoothly; the same segments flatten the terrain below it.
 for(let i=0;i<controls.length-1;i++)for(let j=0;j<6;j++){
  const t=j/6,p0=controls[Math.max(0,i-1)],p1=controls[i],p2=controls[i+1],p3=controls[Math.min(controls.length-1,i+2)];
  pathPoints.push([0,1].map(k=>.5*((2*p1[k])+(-p0[k]+p2[k])*t+(2*p0[k]-5*p1[k]+4*p2[k]-p3[k])*t*t+(-p0[k]+3*p1[k]-3*p2[k]+p3[k])*t*t*t)));
 }
 if(controls.length)pathPoints.push(controls.at(-1));
 const segments=pathPoints.slice(1).map(([x,z],i)=>{const a={x:pathPoints[i][0],z:pathPoints[i][1]},b={x,z};return {a,b,kind:'wide',half:scenery.pathHalf,len:Math.hypot(b.x-a.x,b.z-a.z)};});
 if(region==='city'){
  // Logical streets are independent of paving tessellation. The raised crossing
  // at z1150 keeps the official pedestrian route clear across the side avenue.
  const strip=(x,z,X,Z,half,surface)=>segments.push({a:{x,z},b:{x:X,z:Z},kind:'wide',half,len:Math.hypot(X-x,Z-z),surface});
  strip(-2200,1400,2200,1400,110,'road');
  strip(-700,-400,-700,1070,110,'distant-road');
  strip(-700,1510,-700,4400,110,'distant-road');
  strip(-2200,1150,2200,1150,80,'sidewalk');
  strip(-2200,1650,2200,1650,80,'sidewalk');
  strip(-2200,1260,2200,1260,30,'curb');
  strip(-2200,1540,2200,1540,30,'curb');
 }

 const world={...source,homeHabitat:true,...(region==='city'?{homeGround:['#bec5b9','#bdc3b9'],homeCityParcels:cityGroundParcels()}:{}),...(scenery.trailPartition?{homeTrail:pathPoints,homeTrailHalf:scenery.pathHalf}:{}),homeSky:scenery.sky,homeIsland:region==='star_stop',homeCamera:scenery.camera,len:region==='city'?4400:3400,halfW:1800,minX:-1800,maxX:1800,spots:scenery.ponds||[],segments,paths:[],props:[],marks:[],residents:[],areas:[],collision:null,obstacles:objects.filter(o=>o.collision).map(o=>({...o.collision,r:Math.hypot(o.collision.hw,o.collision.hd),role:'solid'})),_streams3d:undefined,terrain:scenery.river?{kind:'river',half:scenery.river.half,pts:[-2200,-700,700,2200].map(x=>[x,scenery.river.center+scenery.river.slope*x])}:null};
 // Wheel plane is the river tangent; its axle is the normal toward the hut.
 for(const ob of objects.filter(o=>o.type==='wheel')){
  // Locate the nearest actual stream segment; its varying width also builds the water mesh.
  let closest=null;for(const st of M.streams3d(world))for(let i=1;i<st.pts.length;i++){const a=st.pts[i-1],b=st.pts[i],dx=b.x-a.x,dz=b.z-a.z,L=Math.hypot(dx,dz),t=Math.max(0,Math.min(1,((ob.x-a.x)*dx+(ob.z-a.z)*dz)/(L*L))),x=a.x+dx*t,z=a.z+dz*t,d=Math.hypot(ob.x-x,ob.z-z);if(!closest||d<closest.d)closest={x,z,d,w:a.w+(b.w-a.w)*t,angle:Math.atan2(dx,dz)};}
  const arch=ob.parts.find(p=>p.shape==='arch'),angle=closest.angle,turn=angle-(arch.ang||0),cs=Math.cos(turn),sn=Math.sin(turn);
  for(const p of ob.parts){const x=p.dx||0,z=p.dz||0;p.dx=x*cs+z*sn;p.dz=-x*sn+z*cs;if(p.ang!=null)p.ang+=turn;if(p.toward){const [x,z]=p.toward;p.toward=[x*cs+z*sn,-x*sn+z*cs];}}
  const axle={x:Math.cos(angle),z:-Math.sin(angle)},hut=objects.find(o=>o.type==='house');
  const bank=closest.w*.88-8;ob.x=closest.x-axle.x*bank;ob.z=closest.z-axle.z*bank;if(ob.collision)Object.assign(ob.collision,{x:ob.x,z:ob.z});
  // Keep the mill on the far bank along the same axle, outside the paddle sweep.
  const reach=216;hut.x=ob.x-axle.x*reach;hut.z=ob.z-axle.z*reach;Object.assign(hut.collision,{x:hut.x,z:hut.z});
  const shaft=ob.parts.find(p=>p.shape==='log');Object.assign(shaft,{homeAxle:true,len:reach+34,dx:-axle.x*(reach-34)/2,dz:-axle.z*(reach-34)/2});
  ob.homeWheel={axle,angle,baseY:-18};ob.rot=angle;if(ob.collision)ob.collision.ang=angle;
 }
 world.obstacles=objects.filter(o=>o.collision).map(o=>({...o.collision,r:Math.hypot(o.collision.hw,o.collision.hd),role:'solid'}));
 world.collision=M.buildCollisionGrid(world.obstacles);
 if(region!=='river_lake')world._streams3d=[];
 if(scenery.terrain)world.terrain=structuredClone(scenery.terrain);
 return {world,objects,routes:HOME_ROUTES[region],sourceRegion:region,scenery};
}
export function createHomeWorld({M,container,document:doc,window:win=window,onStatus=()=>{},getGroundAnchor=()=>undefined,rendererFactory=createHomeEnvironmentRenderer}){
 const canvas=doc.createElement('canvas');canvas.className='home-world-overlay';container.appendChild(canvas);
 let renderer=null,composition=null,life=null,env={},time=0,width=0,height=0,dead=false,failed=false;
 let navigation=null,navigationKey='',projectionKey='',projectionRevision=0;
 let recoveryAttempts=0,recoveryWait=0;const recoveryDelays=[1,3,10];
 function resize(){const r=container.getBoundingClientRect();width=Math.max(1,r.width);height=Math.max(1,r.height);canvas.width=width;canvas.height=height;canvas.style.width=width+'px';canvas.style.height=height+'px';renderer?.resize({W:width,H:height,ctx:canvas.getContext('2d')});}
 function release(){const old=renderer;renderer=null;try{old?.destroy();}catch(_){} }
 function fail(error){failed=true;release();recoveryWait=recoveryDelays[recoveryAttempts]??Infinity;onStatus('unavailable',String(error?.message||error));}
 function initialize(){
  const scoped=Object.create(M);scoped.worldObjects3d=()=>({objects:composition.objects,skipped:{},unresolved:[]});
  try{resize();renderer=rendererFactory(scoped,{canvas,ctx:canvas.getContext('2d'),W:width,H:height,home:true});failed=false;onStatus(renderer.stats().mode==='canvas-3d'?'canvas-3d':'3d');}
  catch(error){fail(error);}
 }
 function setEnvironment(e){if(dead)return;env={...e};if(composition?.sourceRegion===e.region)return;
  release();failed=false;recoveryAttempts=0;recoveryWait=0;composition=composeHomeWorld(M,e.region);navigation=null;navigationKey='';life=createWorldLife(e.region);time=0;initialize();
 }
 function draw(dt,flags={}){if(dead||flags.paused||!composition)return;
  const elapsed=Number.isFinite(dt)?Math.max(0,Math.min(1,dt)):0;
  if(failed){recoveryWait-=elapsed;if(recoveryAttempts>=recoveryDelays.length||recoveryWait>0)return;recoveryAttempts++;initialize();}
  if(!renderer)return;
  try{resizeIfNeeded();if(!flags.reducedMotion){time+=elapsed*1000;for(let remaining=elapsed;remaining>1e-8;remaining-=.1)life.step(Math.min(.1,remaining),{...env,...flags});}renderer.setAnimLevel(flags.reducedMotion?0:flags.tier>=2?1:2);
   renderer.draw({world:composition.world,player:{x:0,z:550,heading:0},camera:{x:0,z:550,dist:950,yaw:0,height:1},homeGroundY:getGroundAnchor(),env,mood:{},frame:Math.floor(time/33),party:[],residents:[],homeLife:life.snapshot().map(a=>composition.scenery.river&&a.domain==='water'?{...a,z:a.z+composition.scenery.river.center-1650+composition.scenery.river.slope*a.x}:a)},time);
   const key=JSON.stringify([width,height,getGroundAnchor(),composition.sourceRegion,recoveryAttempts]);if(key!==projectionKey){projectionKey=key;projectionRevision++;}}
  catch(error){fail(error);}
 }
 function resizeIfNeeded(){const r=container.getBoundingClientRect();if(Math.abs(r.width-width)>1||Math.abs(r.height-height)>1)resize();}
 return {setEnvironment,draw,observationPoints(nav){return (composition?.scenery.observationPoints||[]).map(p=>({...p,...nav.project(p),target:nav.project(p.target)})).filter(p=>nav.valid(p));},occlusion(point){return renderer?.homeOcclusion?.(point)||[];},navigation(rect){if(!composition)return null;const r=container.getBoundingClientRect(),params={width:r.width,height:r.height,anchorY:getGroundAnchor(),offsetX:rect.left-r.left,offsetY:rect.top-r.top,stageWidth:rect.width,stageHeight:rect.height};const key=JSON.stringify(params);if(key!==navigationKey){navigation=createHomeNavigation(M,composition,params);navigationKey=key;}return navigation;},stats:()=>({animationTime:time,projectionRevision,mode:failed?'unavailable':renderer?.stats().mode||'loading',region:composition?.sourceRegion,life:life?.metrics(),recoveryAttempts,renderer:renderer?.stats()}),destroy(){dead=true;release();canvas.remove();}};
}
