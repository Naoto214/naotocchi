import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL,fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import geometry from './geometry.cjs';
import reflow from '../home-mobility-v12/reflow.cjs';
import pairAdapter from './geometry-pairs.cjs';
const here=path.dirname(fileURLToPath(import.meta.url));
const [gameDir,widthArg,output]=process.argv.slice(2);
if(!output)throw Error('Usage: node geometry-survey.mjs PACKAGE_GAME WIDTH OUTPUT');
const game=pathToFileURL(path.resolve(gameDir)+'/').href;
const width=Number(widthArg);
const cameraPath=[320,390].includes(width)?'../home-mobility-v10/evidence/native-scene-'+width+'.json':'../home-mobility-v12/evidence/performance-scene-'+width+'.json';
const read=f=>fs.readFileSync(path.join(here,f),'utf8');
const data=s=>'data:text/javascript;base64,'+Buffer.from(s).toString('base64');
const payload=JSON.parse(read(cameraPath));
const camera=payload.camera||payload;
const navSrc=fs.readFileSync(new URL('home-visible-ground-navigation-finish.mjs',game),'utf8');
const ext=data(geometry.patchNavigation(navSrc).replaceAll("from './","from '"+game));
const adapter=read('../home-mobility-v11/goal-owl-scene.mjs')
 .replace("'../game/home-visible-ground-navigation-finish.mjs'","'"+ext+"'")
 .replaceAll("'../game/","'"+game)
 .replace('function forest(config){','export function forest(config,patches=[]){')
 .replace('presentation:p,cover}','presentation:p,cover,patches}');
const {forest}=await import(data(adapter));
const src=reflow.patchReflow(fs.readFileSync(new URL('home-production-model-mobility-v11-foot.js',game),'utf8'));
const marker='    return {metrics:';
const pairMode=process.argv[5]==='pairs';
const pairProbe=pairMode?pairAdapter.grassPairProbe(read('../home-mobility-v11/seats_pair_probe.js')).replace('return {pairSurvey};',''):'';
const survey=read('../home-mobility-v11/space-probe.js').replace('return {geometry,rays,passing};',
 read('../home-mobility-v11/seats_probe.js')+pairProbe+'\nreturn {rays,screenSeats'+(pairMode?',pairSurvey':'')+'};');
const m={exports:{}};
new Function('module',src.replace(marker,' const installSurvey=()=>{'+survey+'};\n'+marker.replace('{metrics:','{installSurvey,quiet:()=>{for(const a of actors)a.nextAt=clock+60;},metrics:')))(m);
const feet=camera.actors.map(a=>[a.key,a.x,a.y,a.w,a.h]);
const metrics=(summary)=>({
 contacts:summary.reduce((n,r)=>n+r.contacts.length,0)/2,
 residentsWithExit:[0,1,2].map(i=>summary.filter(r=>r.result[i].safe.length).length),
 focus:Object.fromEntries(summary.filter(r=>/tanuki|panda|box/.test(r.key)).map(r=>[r.key,r.result.map(q=>[q.legal,q.safe.length])]))
});
const recording={width,modelSHA256:createHash('sha256').update(src).digest('hex'),sha256:createHash('sha256').update(read(cameraPath)).digest('hex'),units:'CSS px',bearings:96,distances:[3,8,16],arms:{}};
const trial=forest(camera);
let original;
for(const arm of ['a','b','c']){
 const {scene,placed}=forest(camera,geometry.polygons[arm]);
 const model=m.exports.createModel({random:()=>.5});model.sync(camera.actors,scene);placed();model.installSurvey();
 const q=globalThis.forestSpaceSurvey,settings={sectors:96,distances:[3,8,16]};
 const before=q.rays({feet,...settings});
 if(!original)original=before;
 const nav=scene.navigation,base=trial.scene.navigation,{x:sx,y:sy}=nav.intentScale;
 const additions=before.map((r,i)=>({key:r.key,opened:r.result.map((d,j)=>
    !original[i].result[j].safe.length&&d.safe.length?d.safe[0]*3.75:null)}))
    .filter(r=>r.opened.some(v=>v!==null));
 const lostDirections=before.reduce((n,r,i)=>n+r.result.reduce((k,d,j)=>
    k+original[i].result[j].safe.filter(v=>!d.safe.includes(v)).length,0),0);
 if(lostDirections)throw Error('Additive ground removed an old safe ray');

 const {rect,p,cover}=camera.nav;
 const site=(x,z)=>({x:p.x+(cover.left+cover.width*x-p.x)/sx-rect.left,y:p.y+(cover.top+cover.height*z-p.y)/sy-rect.top});
 const candidates=[],sites=[];
 let area=0,bounded=0;
 for(let y=.5/sy;y<scene.height;y+=1/sy)for(let x=.5/sx;x<scene.width;x+=1/sx){
  const point={x,y};if(nav.valid(point)&&!base.valid(point)){area++;if(camera.actors.some(a=>x>=a.bounds.left&&x<=a.bounds.right&&y>=a.bounds.top&&y<=a.bounds.bottom&&scene.planVisibility(a)(point)))bounded++;}
 }
 recording.arms[arm]={...metrics(before),newWalkerFirstBearingFromA:additions,lostDirections,newTerrainCSS2:area,reachableByBoundsAndInkCSS2:bounded};
 if(width===320){
  // Same recorded feet and CSS target in each arm. This short counterfactual
  // delays unrelated new autonomous requests, then uses the unmodified move and step.
  model.quiet();
  const actor=camera.actors.find(a=>a.key==='companion:clock'),angle=345*Math.PI/180;
  const goal={x:actor.x+8*Math.cos(angle)/sx,y:actor.y+8*Math.sin(angle)/sy};
  const origin={x:actor.x,y:actor.y};
  const accepted=model.move(actor.key,goal,'drag',{pointerDrop:true});
  let foot=origin,travel=0,unsafeGround=0,elapsed=0;
  for(let i=0;i<100;i++){
   model.step(.05);elapsed+=.05;
   const a=model.snapshot().find(a=>a.key===actor.key);
   const step=Math.hypot((a.x-foot.x)*sx,(a.y-foot.y)*sy);
   if(step>1e-7&&!nav.segmentSafe(foot,a,scene.planVisibility(a)))unsafeGround++;
   travel+=step;foot={x:a.x,y:a.y};
   if(Math.hypot((foot.x-goal.x)*sx,(foot.y-goal.y)*sy)<.001)break;
  }
  recording.arms[arm].shortClockDrag={bearing:345,distanceCSS:8,accepted,elapsed,
    travel,remaining:Math.hypot((foot.x-goal.x)*sx,(foot.y-goal.y)*sy),unsafeGround,
    displacement:Math.hypot((foot.x-origin.x)*sx,(foot.y-origin.y)*sy)};
 }
 if(arm!=='c')continue;
 for(const poly of geometry.polygons.c){
  const xs=poly.map(p=>p[0]),zs=poly.map(p=>p[1]);
  for(let z=Math.min(...zs);z<=Math.max(...zs);z+=2/cover.height)for(let x=Math.min(...xs);x<=Math.max(...xs);x+=2/cover.width){
   const s=site(x,z);if(base.valid(s)||!nav.valid(s))continue;
   sites.push([x,z]);for(const a of camera.actors.filter(a=>a.kind==='companion')){
    const dx=(s.x-a.x)*sx,dy=(s.y-a.y)*sy;
    if(Math.hypot(dx,dy)<=180)candidates.push({key:a.key,dx,dy});
   }
  }
 }
 // Search small offsets only where the actor can reach the boundary of new ground.
 // This excludes unrelated V12 two-seat translations on the old map.
 for(const a of camera.actors.filter(a=>a.kind==='companion')){
  if(!sites.some(([x,z])=>{const t=site(x,z);return Math.hypot((t.x-a.x)*sx,(t.y-a.y)*sy)<=28;}))continue;
  for(const length of [1,2,3,4,6,8,12])for(let i=0;i<32;i++){
   const dx=length*Math.cos(i*Math.PI/16),dy=length*Math.sin(i*Math.PI/16);
   candidates.push({key:a.key,dx,dy});
  }
 }
 if(pairMode){
  const baySites=[];
  const step=Number(process.argv[6]||4);
  if(![2,4].includes(step))throw Error('Use a two- or four-CSS-pixel bay grid');
  for(let y=step/2/sy;y<scene.height;y+=step/sy)for(let x=step/2/sx;x<scene.width;x+=step/sx){
   const pt={x,y};if(!base.valid(pt)&&nav.valid(pt))baySites.push(pt);
  }
  const target=['companion:tanuki','companion:box'];
  const design={target,nearDistance:180,localRadii:[1,2,4,8,12,16],localAngles:32};
  const pairs=q.pairSurvey({feet,angles:96,ranges:[3,8,16],headings:{...design,baySites}});
  const candidates=pairs.candidates.map(item=>{
   const next=feet.map(row=>{
    const move=item.moves.find(m=>m.key===row[0]);
    return move?[row[0],row[1]+move.dx/sx,row[2]+move.dy/sy,...row.slice(3)]:row;
   });
   const audit=q.rays({feet:next,...settings});
   const lost=before.reduce((n,b,i)=>n+b.result.reduce((s,r,j)=>
     s+r.safe.filter(v=>!audit[i].result[j].safe.includes(v)).length,0),0);
   return {...item,...metrics(audit),lost};
  });
  const focused=candidates.filter(c=>c.opened.some(key=>target.includes(key)));
  const cost=r=>r.moves.reduce((n,m)=>n+Math.hypot(m.dx,m.dy),0);
  recording.pairs={design,gridSpacingCSS:step,baySites:baySites.length,hadEight:pairs.hadEight,
    counts:pairs.counts,distinctClasses:candidates.length,focusExamples:focused.sort((a,b)=>cost(a)-cost(b)).slice(0,4),
    otherExamples:candidates.filter(c=>!c.opened.some(key=>target.includes(key))).sort((a,b)=>cost(a)-cost(b)).slice(0,2)};
  if(step===2&&candidates.length){
   const first=recording.pairs.otherExamples[0]?.moves[0];
   if(first){
    const local=[];
    for(let x=-8;x<=8;x+=.25)for(let y=-8;y<=8;y+=.25){
     const dx=first.dx+x,dy=first.dy+y;
     const a=camera.actors.find(a=>a.key===first.key);
     const pt={x:a.x+dx/sx,y:a.y+dy/sy};
     if(!base.valid(pt)&&nav.valid(pt))local.push({key:first.key,dx,dy});
    }
    const scan=q.screenSeats({feet,stages:[settings],restricted:local});
    scan.survivors.sort((a,b)=>Math.hypot(a.dx,a.dy)-Math.hypot(b.dx,b.dy));
    const {dx,dy}=first;
    const distances=scan.survivors.map(m=>Math.hypot(m.dx,m.dy));
    recording.pairs.oneSeatRefinement={centre:first,extentCSS:8,stepCSS:.25,counts:scan.counts,
      survivorDistanceRangeCSS:distances.length?[Math.min(...distances),Math.max(...distances)]:null,
      shortest:scan.survivors[0]||null,atCentre:scan.survivors.find(m=>m.dx===dx&&m.dy===dy)||null};
   }
  }
  continue;
 }
 const search=q.screenSeats({feet,stages:[settings],restricted:candidates});
 const ranked=search.survivors.sort((a,b)=>b.opened.length-a.opened.length||Math.hypot(a.dx,a.dy)-Math.hypot(b.dx,b.dy));
 const distinct=ranked.filter((r,i)=>ranked.findIndex(s=>s.key===r.key)===i).slice(0,8);
 recording.seatSearch={gridSpacingCSS:2,radiusCSS:180,nearBoundaryCSS:28,localDistancesCSS:[1,2,3,4,6,8,12],localBearings:32,newSites:sites.length,counts:search.counts,best:distinct.map(r=>{
  const a=camera.actors.find(a=>a.key===r.key),moved={x:a.x+r.dx/sx,y:a.y+r.dy/sy},paint=nav.visibleGround.point(moved);
  const next=feet.map(p=>p[0]===r.key?[r.key,moved.x,moved.y,p[3],p[4]]:p);
  return {key:r.key,offsetCSS:[r.dx,r.dy],painted:[paint.x,paint.z],opened:r.opened,...metrics(q.rays({feet:next,...settings}))};
 })};
}
fs.writeFileSync(output,JSON.stringify(recording,null,2)+'\n');
