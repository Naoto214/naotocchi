// Movement-only 600 s comparison using the geometry read from the native V9 game.
import fs from 'node:fs';
import {inspectCorridors} from './corridor-scan.mjs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';
const require=createRequire(import.meta.url);
const [width,arm,seedArg,transform]=process.argv.slice(2);
if(!['320','390'].includes(width)||!['v9','v10'].includes(arm)||!/^\d+$/.test(seedArg)){
  throw Error('Usage: MOBILITY_GAME=... node native-preflight.mjs 320|390 v9|v10 SEED [optional-transform.cjs]');
}
const config=JSON.parse(fs.readFileSync(new URL(`./evidence/native-scene-${width}.json`,import.meta.url)));
const game=process.env.MOBILITY_GAME;
const load=name=>import(pathToFileURL(path.resolve(game,name)));
const {createRecoveredNavigation}=await load('home-recovered-navigation-finish.mjs');
const {extendVisibleGroundNavigation}=await load('home-visible-ground-navigation-finish.mjs');
const {insidePolygon}=await load('home-art-navigation-finish.mjs');
const {selectRecoveredScene}=await load('home-production-manifest.mjs');
const spec=selectRecoveredScene('forest');
const {stage,rect,p,host,cover,stableGrid,addVisible}=config.nav;
const base=createRecoveredNavigation(spec,host,stage,{stableGrid,expandCity:stableGrid});
const nav=addVisible?extendVisibleGroundNavigation(base,{spec,stage:rect,presentation:p,cover}):base;
const {x:sx,y:sy}=nav.intentScale;
if(Math.abs(sx-config.baseline.x)>1e-7||Math.abs(sy-config.baseline.y)>1e-7)throw Error('Unexpected native projection');
const polygons=spec.foreground.map(poly=>poly.map(([u,v])=>[
  p.x+(cover.left+cover.width*u-p.x)/sx-rect.left,
  p.y+(cover.top+cover.height*v-p.y)/sy-rect.top,
]));
const distance=(a,b)=>Math.hypot((a.x-b.x)*sx,(a.y-b.y)*sy);
const rows=new Map(config.actors.map(a=>[a.key,a]));
function visible(a,z){
  return [-.3,0,.3].every(x=>[.22,.5,.8].every(y=>
    polygons.every(poly=>!insidePolygon(z.x+x*a.w,z.y-y*a.h,poly))));
}
let placing=true;
const scene={...config.scene,region:'forest',time:'day',weather:'sunny',
  navigation:{...nav,initialPoint:i=>config.actors[i]},actorBounds:a=>rows.get(a.key).bounds,
  referenceBounds:a=>rows.get(a.key).reference,planVisibility:a=>z=>visible(a,z),
  visible:(z,a)=>placing?distance(rows.get(a.key),z)<1e-6:visible(a,z)};
let source=fs.readFileSync(path.join(game,'home-production-model-mobility-v9.js'),'utf8');
if(arm==='v10')source=require(transform?path.resolve(transform):'./movement.cjs').patchMovement(source);
// Only the offline ablation selects another threshold; the game always uses its compiled source.
const age=process.env.PROBE_FAILURE_AGE;
if(age){
  if(arm!=='v10'||!['70','180','240'].includes(age)||!source.includes('clock-misses.since<240'))throw Error('Unknown ablation');
  source=source.replace('clock-misses.since<240','clock-misses.since<'+age);
}
const hash=createHash('sha256').update(source).digest('hex');
const {replaceExact}=require('../home-finish-v5/native-hooks.cjs');
source=replaceExact(source,'if(!mobility?.enabled)return executeMove(key,p,source,{pointerDrop});',`if(!mobility?.enabled){
        const ok=executeMove(key,p,source,{pointerDrop});
        if(source==='ambient')observe.request(actor(key),p,ok,clock);return ok;
      }`);
source=replaceExact(source,'if(mobility?.enabled)mobility.hop(a,p,clock);','observe.hop(a,p,clock);if(mobility?.enabled)mobility.hop(a,p,clock);');
source=replaceExact(source,"if(mobility?.enabled)mobility.arrival(a,clock);emit('arrive'", "observe.arrive(a);if(mobility?.enabled)mobility.arrival(a,clock);emit('arrive'");
const keys=new Set((process.env.CORRIDOR_KEYS||'').split(',').filter(Boolean));
const corridors=[];
if(keys.size){
  source=replaceExact(source,"if(source==='ambient')observe.request(actor(key),p,ok,clock);",
    "if(!ok&&source==='ambient'&&observe.keys.has(key))observe.scan(actor(key),p,clock,actors,scene,bounds(actor(key),scene),contactSegmentSafe,canHelpAmbient,()=>intentPlan(actor(key),p));\n        if(source==='ambient')observe.request(actor(key),p,ok,clock);");
}
const residents=new Map(),legs=new Map();
function resident(a){
  if(!residents.has(a.key))residents.set(a.key,{key:a.key,requests:0,plans:0,walks:0,distance:0,failedAt:null,longest:0});
  return residents.get(a.key);
}
const observe={
  keys,scan(a,goal,clock,cast,scene,box,segment,canHelp,attempt){
    const row=inspectCorridors(a,goal,clock,cast,scene,box,segment,canHelp);
    if(!corridors.some(r=>r.key===a.key)){
      row.peers=cast.map(b=>[b.key,b.x,b.y,b.w,b.h,canHelp(b)]);
      const search=attempt();let stage;
      do{stage=search.next();}while(!stage.done);
      row.completeNativeUpToTwo=stage.value;
    }
    corridors.push(row);
  },
  request(a,goal,ok,clock){
    const r=resident(a);r.requests++;
    if(ok){r.plans++;legs.set(a.key,{from:{x:a.x,y:a.y},goal});}
    else r.failedAt??=clock;
  },
  hop(a,z,clock){
    const r=resident(a);if(a.source!=='ambient')return;
    r.distance+=distance(a,z);
    if(r.failedAt!==null){r.longest=Math.max(r.longest,clock-r.failedAt);r.failedAt=null;}
  },
  arrive(a){
    if(a.source!=='ambient')return;
    const r=resident(a),leg=legs.get(a.key);legs.delete(a.key);
    if(leg&&!a.ambientEscape&&distance(a,leg.from)>=8-1e-6&&distance(leg.from,leg.goal)-distance(a,leg.goal)>.75)r.walks++;
  },
};
const mod={exports:{}};new Function('module','observe',source)(mod,observe);
let seed=Number(seedArg);
const model=mod.exports.createModel({random:()=>{seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;return (seed>>>0)/4294967296;}});
model.sync(config.actors,scene);placing=false;
if(!model.snapshot().every((a,i)=>distance(a,config.actors[i])<1e-6))throw Error('Captured opening changed');
for(let n=0;n<12000;n++)model.step(.05);
const records=[...residents.values()].map(({failedAt,...r})=>({...r,longest:Math.max(r.longest,failedAt===null?0:600-failedAt)}));
console.log(JSON.stringify({width:Number(width),seed:Number(seedArg),arm,sourceSHA256:hash,strict:records.filter(r=>r.walks>0).length,
  repeated:records.filter(r=>r.walks>=2).length,walks:records.reduce((sum,r)=>sum+r.walks,0),records,...(keys.size?{corridors}:{})}));
