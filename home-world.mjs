import { createHomeNavigation } from './home-terrain-navigation.mjs';
export {createHomeNavigation,createTerrainNavigation} from './home-terrain-navigation.mjs';
import { createHomeEnvironmentRenderer } from './meguru-3d.mjs';
import { HOME_ROUTES,createWorldLife } from './world-life.mjs';
// Layout is Home-owned. Mesh parts and materials are always the official Meguru source.
const LAYOUTS={
 forest:[['bigtree',-420,1150],['bigtree',470,1330],['broadleaf',-480,1700],['broadleaf',460,1850],['conifer',-1000,2200],['conifer',900,2250],['bigtree',-250,2400],['broadleaf',300,2600],['log',-100,650],['flower',540,1050],['mushrooms',-520,1120]],
 river_lake:[['broadleaf',-850,1100],['broadleaf',1030,2450],['broadleaf',-800,2500],['broadleaf',550,2450],['rock',-1050,1120],['rock',160,700],['grass',-500,1220],['grass',550,1240],['flower',-650,1040],['flower',620,1050],['grass',-1000,1900]],
 city:[['house',-580,1900],['house',-250,1950],['house',400,1850],['tower',850,2200],['tower',-950,2300],['broadleaf',-740,1080],['broadleaf',740,1120],['lamp',-490,1140],['lamp',480,1140],['signal',-800,1510],['flower',630,1010],['flower',-620,1010]]
};
export function composeHomeWorld(M,region){
 if(!LAYOUTS[region])throw Error('Unsupported Home region');
 const source=M.buildWorld(region,M.buildRegistry(),{world3d:true});const catalogue=M.worldObjects3d(source).objects;
 const placements=[...LAYOUTS[region]];
 if(region!=='city')for(let i=0;i<12;i++)placements.push([i%3?'broadleaf':'conifer',-1700+i*310,(region==='river_lake'?2750:2400)+(i%3)*220]);
 const objects=placements.map(([type,x,z],i)=>{const candidates=catalogue.filter(o=>o.type===type),o=candidates[i%candidates.length];if(!o)return null;return {...o,id:'home:'+region+':'+i,sourceId:o.id,x,z,collision:o.collision?{...o.collision,x,z,hw:o.collision.hw*(['bigtree','broadleaf','conifer','house','tower'].includes(type)?1.9:1),hd:o.collision.hd*(['bigtree','broadleaf','conifer','house','tower'].includes(type)?1.9:1)}:null,parts:o.parts.map(p=>{const q={...p};const k=['bigtree','broadleaf','conifer','house','tower'].includes(type)?1.9:1;for(const key of ['r','rx','rz','h','y','dx','dz','len','w'])if(typeof q[key]==='number')q[key]*=k;return q;})};}).filter(Boolean);
 // Low cover is reusable official geometry; leave the care clearing empty.
 const cover=catalogue.filter(o=>o.type==='grass'||o.type==='flower'||o.type==='dressing').slice(0,18);
 cover.forEach((o,i)=>objects.push({...o,id:'home:cover:'+i,sourceId:o.id,x:(i%2?-1:1)*(720+(i%4)*100),z:region==='river_lake'?880+(i%3)*55:850+Math.floor(i/2)*140,solid:false,collision:null,parts:o.parts.map(p=>({...p}))}));
 if(region==='city'){const car=catalogue.find(o=>o.type==='car');if(car)objects.push({...car,id:'home:car',sourceId:car.id,x:0,z:1400,solid:false,collision:null,parts:car.parts.map(p=>({...p}))});}
 const pathPoints=region==='river_lake'?[[-1600,620],[0,680],[1600,600]]:region==='city'?[[-100,-300],[-100,1150]]:[[-170,-300],[-100,400],[100,1100],[60,2700]];
 const segments=pathPoints.slice(1).map(([x,z],i)=>{const a={x:pathPoints[i][0],z:pathPoints[i][1]},b={x,z};return {a,b,kind:'wide',half:region==='city'?240:52,len:Math.hypot(b.x-a.x,b.z-a.z)};});
 if(region==='city')segments.push({a:{x:-2000,z:1400},b:{x:2000,z:1400},kind:'wide',half:110,len:4000});
 const world={...source,len:3000,halfW:1800,minX:-1800,maxX:1800,spots:[],segments,paths:[],props:[],marks:[],residents:[],areas:[],collision:null,obstacles:objects.filter(o=>o.collision).map(o=>({...o.collision,r:Math.hypot(o.collision.hw,o.collision.hd),role:'solid'})),_streams3d:undefined,terrain:region==='river_lake'?{kind:'river',half:620,pts:[[-2200,1650],[-700,1650],[700,1650],[2200,1650]]}:null};
 world.collision=M.buildCollisionGrid(world.obstacles);
 if(region!=='river_lake')world._streams3d=[];
 return {world,objects,routes:HOME_ROUTES[region],sourceRegion:region};
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
   renderer.draw({world:composition.world,player:{x:0,z:550,heading:0},camera:{x:0,z:550,dist:950,yaw:0,height:1},homeGroundY:getGroundAnchor(),env,mood:{},frame:Math.floor(time/33),party:[],residents:[],homeLife:life.snapshot()},time);
   const key=JSON.stringify([width,height,getGroundAnchor(),composition.sourceRegion,recoveryAttempts]);if(key!==projectionKey){projectionKey=key;projectionRevision++;}}
  catch(error){fail(error);}
 }
 function resizeIfNeeded(){const r=container.getBoundingClientRect();if(Math.abs(r.width-width)>1||Math.abs(r.height-height)>1)resize();}
 return {setEnvironment,draw,occlusion(point){return renderer?.homeOcclusion?.(point)||[];},navigation(rect){if(!composition)return null;const r=container.getBoundingClientRect(),params={width:r.width,height:r.height,anchorY:getGroundAnchor(),offsetX:rect.left-r.left,offsetY:rect.top-r.top,stageWidth:rect.width,stageHeight:rect.height};const key=JSON.stringify(params);if(key!==navigationKey){navigation=createHomeNavigation(M,composition,params);navigationKey=key;}return navigation;},stats:()=>({projectionRevision,mode:failed?'unavailable':renderer?.stats().mode||'loading',region:composition?.sourceRegion,life:life?.metrics(),recoveryAttempts,renderer:renderer?.stats()}),destroy(){dead=true;release();canvas.remove();}};
}
