// Replay the shipping V5 model with the bounds and projections captured at
// each native Chromium seating pass. Expected feet are the browser's output.
import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';
import {gunzipSync} from 'node:zlib';

const [game, samples, target, trial] = process.argv.slice(2);
const require = createRequire(import.meta.url);
const modelAPI = require(path.resolve(game, 'home-production-model.js'));
const load = name => import(pathToFileURL(path.resolve(game, name)));
const {ART_SCENES} = await load('home-production-manifest.mjs');
const {createRecoveredNavigation} = await load('home-recovered-navigation.mjs');
const {extendVisibleGroundNavigation} = await load('home-visible-ground-navigation.mjs');
const {insidePolygon} = await load('home-art-navigation.mjs');
const seating = require(trial ? path.resolve(trial) : './seating.js');
const cases = JSON.parse(gunzipSync(fs.readFileSync(samples)));

function replay(sample, mode) {
  const {width,height,region,actors,stages} = sample;
  const spec=ART_SCENES[region];
  const model=modelAPI.createModel({random:()=>.5});
  let scene;
  for (const pass of stages) {
    const {o,t,pa,pb,bs,uv} = pass;
    const dx=t.x-o.x, dy=t.y-o.y;
    const stage={left:1000,top:0,width:2*o.x+dx,height:o.y+dy*.94};
    let nav=createRecoveredNavigation(spec,{width:dx},stage,{stableGrid:true,expandCity:true});
    const sx=pb.x-pa.x, sy=pb.z-pa.z;
    nav=extendVisibleGroundNavigation(nav,{spec,stage:{left:pa.x/sx,top:pa.z/sy},
      presentation:{x:0,y:0,scaleX:sx,scaleY:sy},cover:{left:0,top:0,width:1,height:1}});
    // Use the actually projected V2 hints for this pass (including its partner).
    const baseNav=nav;
    nav={...nav,initialPoint:index=>baseNav.project(uv[index])};
    const query=new URLSearchParams({count:actors.length,policy:'B',curve:'linear',layout:mode});
    nav=seating.withOpeningSeats(nav,spec,width,height,'?'+query);
    const byKey=new Map(actors.map((a,i)=>[a.key,bs[i]]));
    const visible=(p,a)=>{
      for(const poly of spec.foreground) for(const f of [.22,.5,.8]) for(const l of [-.3,0,.3]) {
        if(insidePolygon(pa.x+(p.x+a.w*l)*sx,pa.z+(p.y-a.h*f)*sy,poly)) return false;
      }
      return true;
    };
    scene={region,width:stage.width,height:stage.height,navigation:nav,
      actorBounds:a=>byKey.get(a.key),visible};
    model.sync(actors,scene);
  }
  const poses=model.snapshot();
  const invalid=poses.filter(a=>{
    const b=model.bounds(a);
    return !scene.navigation.valid(a)||!scene.visible(a,a)||
      a.x<b.left-1e-6||a.x>b.right+1e-6||a.y<b.top-1e-6||a.y>b.bottom+1e-6;
  });
  return {feet:poses.map(a=>[a.x,a.y]),invalid:invalid.map(a=>a.key)};
}
const result=[];
for(const sample of cases) {
  const fixed=replay(sample,'fixed');
  const hints=seating.openingFor(sample.width,sample.height,sample.region,sample.actors.length);
  const optimized=hints?.length ? replay(sample,'optimized') : fixed;
  const distance=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1]);
  const drift=Math.max(...fixed.feet.map((p,i)=>distance(p,[sample.actors[i].x,sample.actors[i].y])));
  const moved=fixed.feet.map((p,i)=>distance(p,optimized.feet[i]));
  const xs=fixed.feet.map(p=>p[0]), ys=fixed.feet.map(p=>p[1]);
  const x0=Math.min(...xs), y0=Math.min(...ys), spanX=Math.max(...xs)-x0, spanY=Math.max(...ys)-y0;
  function distribution(points) {
    const zones=new Set(points.map(([x,y])=>{
      const col=Math.max(0,Math.min(2,Math.floor(3*(x-x0)/spanX)));
      const row=Math.max(0,Math.min(1,Math.floor(2*(y-y0)/spanY)));
      return col+3*row;
    }));
    const x=points.map(p=>p[0]), y=points.map(p=>p[1]);
    const maxBand=Math.max(...y.map(base=>y.filter(value=>value>=base&&value<=base+4).length));
    return {zones:zones.size,xSpan:Math.round(Math.max(...x)-Math.min(...x)),
      ySpan:Math.round(Math.max(...y)-Math.min(...y)),maxFourPixelDepthBand:maxBand};
  }
  result.push({width:sample.width,height:sample.height,region:sample.region,count:sample.actors.length,
    stages:sample.stages.length,maxFixedDrift:Math.round(drift*10000)/10000,
    changed:moved.map((v,i)=>v>.05?i:null).filter(i=>i!==null),
    fixedDistribution:distribution(fixed.feet),optimizedDistribution:distribution(optimized.feet),
    fixedInvalid:fixed.invalid,optimizedInvalid:optimized.invalid,
    optimizedFeet:optimized.feet.map(p=>p.map(x=>Math.round(x*1000)/1000))});
}
fs.writeFileSync(target,JSON.stringify(result)+'\n');
const failures=result.filter(c=>c.maxFixedDrift>.05 || c.fixedInvalid.length || c.optimizedInvalid.length || c.changed.some(i=>i<2));
console.log(result.length+' native opening replays, '+failures.length+' failures');
if(failures.length) process.exitCode=1;
