import { createHomeEnvironmentRenderer } from './meguru-3d.mjs';
import { HOME_ROUTES,createWorldLife } from './world-life.mjs';
// Layout is Home-owned. Mesh parts and materials are always the official Meguru source.
const LAYOUTS={
 forest:[['bigtree',-750,1150],['bigtree',770,1330],['broadleaf',-480,1700],['broadleaf',460,1850],['conifer',-1000,2200],['conifer',900,2250],['bigtree',-250,2400],['broadleaf',300,2600],['log',-600,1050],['flower',540,1050],['mushrooms',-520,1120]],
 river_lake:[['broadleaf',-850,1100],['broadleaf',830,1900],['broadleaf',-450,2200],['broadleaf',550,2450],['rock',-800,1800],['rock',800,1150],['grass',-500,1220],['grass',550,1240],['flower',-650,1040],['flower',620,1050],['grass',-1000,1900]],
 city:[['house',-580,1900],['house',-250,1950],['house',400,1850],['tower',850,2200],['tower',-950,2300],['broadleaf',-740,1080],['broadleaf',740,1120],['lamp',-490,1140],['lamp',480,1140],['signal',-800,1510],['flower',630,1010],['flower',-620,1010]]
};
export function composeHomeWorld(M,region){
 if(!LAYOUTS[region])throw Error('Unsupported Home region');
 const source=M.buildWorld(region,M.buildRegistry(),{world3d:true});const catalogue=M.worldObjects3d(source).objects;
 const placements=[...LAYOUTS[region]];
 if(region!=='city')for(let i=0;i<12;i++)placements.push([i%3?'broadleaf':'conifer',-1700+i*310,2400+(i%3)*220]);
 const objects=placements.map(([type,x,z],i)=>{const candidates=catalogue.filter(o=>o.type===type),o=candidates[i%candidates.length];if(!o)return null;return {...o,id:'home:'+region+':'+i,sourceId:o.id,x,z,collision:o.collision?{...o.collision,x,z}:null,parts:o.parts.map(p=>{const q={...p};const k=['bigtree','broadleaf','conifer','house','tower'].includes(type)?1.9:1;for(const key of ['r','rx','rz','h','y','dx','dz','len','w'])if(typeof q[key]==='number')q[key]*=k;return q;})};}).filter(Boolean);
 // Low cover is reusable official geometry; leave the care clearing empty.
 const cover=catalogue.filter(o=>o.type==='grass'||o.type==='flower'||o.type==='dressing').slice(0,18);
 cover.forEach((o,i)=>objects.push({...o,id:'home:cover:'+i,sourceId:o.id,x:(i%2?-1:1)*(720+(i%4)*100),z:850+Math.floor(i/2)*140,solid:false,collision:null,parts:o.parts.map(p=>({...p}))}));
 if(region==='city'){const car=catalogue.find(o=>o.type==='car');if(car)objects.push({...car,id:'home:car',sourceId:car.id,x:0,z:1400,solid:false,collision:null,parts:car.parts.map(p=>({...p}))});}
 const a={id:'home-front',x:0,z:0,r:650,kind:'plaza'},b={id:'home-back',x:0,z:900,r:550,kind:'plaza'};
 const segments=[{a,b,kind:'wide',half:400,len:900}];
 if(region==='city')segments.push({a:{x:-2000,z:1400},b:{x:2000,z:1400},kind:'wide',half:110,len:4000});
 const world={...source,len:3000,halfW:1800,minX:-1800,maxX:1800,spots:[a,b],segments,paths:[],props:[],marks:[],residents:[],areas:[],obstacles:objects.filter(o=>o.collision).map(o=>({...o.collision,role:'solid'})),_streams3d:undefined,terrain:region==='river_lake'?{kind:'river',half:160,pts:[[-2200,1500],[-700,1500],[700,1500],[2200,1500]]}:null};
 if(region!=='river_lake')world._streams3d=[];
 return {world,objects,routes:HOME_ROUTES[region],sourceRegion:region};
}
export function createHomeWorld({M,container,document:doc,window:win=window,onStatus=()=>{}}){
 const canvas=doc.createElement('canvas');canvas.className='home-world-overlay';container.appendChild(canvas);
 let renderer=null,composition=null,life=null,env={},time=0,width=0,height=0,dead=false,failed=false;
 function resize(){const r=container.getBoundingClientRect();width=Math.max(1,r.width);height=Math.max(1,r.height);canvas.width=width;canvas.height=height;canvas.style.width=width+'px';canvas.style.height=height+'px';renderer?.resize({W:width,H:height,ctx:canvas.getContext('2d')});}
 function setEnvironment(e){env={...e};if(composition?.sourceRegion===e.region)return;
  renderer?.destroy();renderer=null;failed=false;composition=composeHomeWorld(M,e.region);life=createWorldLife(e.region);time=0;resize();
  const scoped=Object.create(M);scoped.worldObjects3d=()=>({objects:composition.objects,skipped:{},unresolved:[]});
  try{renderer=createHomeEnvironmentRenderer(scoped,{canvas,ctx:canvas.getContext('2d'),W:width,H:height,home:true});onStatus(renderer.stats().mode==='canvas-3d'?'canvas-3d':'3d');}
  catch(error){failed=true;onStatus('unavailable',String(error?.message||error));}
 }
 function draw(dt,flags={}){if(dead||failed||!renderer||flags.paused)return;resizeIfNeeded();if(!flags.reducedMotion){const elapsed=Math.min(1,dt);time+=elapsed*1000;for(let remaining=elapsed;remaining>1e-8;remaining-=.1)life.step(Math.min(.1,remaining),{...env,...flags});}renderer.setAnimLevel(flags.reducedMotion?0:flags.tier>=2?1:2);
  try{renderer.draw({world:composition.world,player:{x:0,z:550,heading:0},camera:{x:0,z:550,dist:950,yaw:0,height:1},env,mood:{},frame:Math.floor(time/33),party:[],residents:[],homeLife:life.snapshot()},time);}
  catch(error){failed=true;renderer.destroy();renderer=null;onStatus('unavailable',String(error?.message||error));}
 }
 function resizeIfNeeded(){const r=container.getBoundingClientRect();if(Math.abs(r.width-width)>1||Math.abs(r.height-height)>1)resize();}
 return {setEnvironment,draw,stats:()=>({mode:failed?'unavailable':renderer?.stats().mode||'loading',region:composition?.sourceRegion,life:life?.metrics(),renderer:renderer?.stats()}),destroy(){dead=true;renderer?.destroy();renderer=null;canvas.remove();}};
}
