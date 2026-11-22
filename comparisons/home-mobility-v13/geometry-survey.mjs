import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL,fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import geometry from './geometry.cjs';
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
const src=fs.readFileSync(new URL('home-production-model-mobility-v12.js',game),'utf8');
const marker='    return {metrics:';
const survey=read('../home-mobility-v11/space-probe.js').replace('return {geometry,rays,passing};',
 read('../home-mobility-v11/seats_probe.js')+'\nreturn {rays,screenSeats};');
const m={exports:{}};
new Function('module',src.replace(marker,' const installSurvey=()=>{'+survey+'};\n'+marker.replace('{metrics:','{installSurvey,metrics:')))(m);
const feet=camera.actors.map(a=>[a.key,a.x,a.y,a.w,a.h]);
const metrics=(summary)=>({
 contacts:summary.reduce((n,r)=>n+r.contacts.length,0)/2,
 residentsWithExit:[0,1,2].map(i=>summary.filter(r=>r.result[i].safe.length).length),
 focus:Object.fromEntries(summary.filter(r=>/tanuki|panda|box/.test(r.key)).map(r=>[r.key,r.result.map(q=>[q.legal,q.safe.length])]))
});
const recording={width,sha256:createHash('sha256').update(read(cameraPath)).digest('hex'),units:'CSS px',bearings:96,distances:[3,8,16],arms:{}};
const trial=forest(camera);
for(const arm of ['a','b','c']){
 const {scene,placed}=forest(camera,geometry.polygons[arm]);
 const model=m.exports.createModel({random:()=>.5});model.sync(camera.actors,scene);placed();model.installSurvey();
 const q=globalThis.forestSpaceSurvey,settings={sectors:96,distances:[3,8,16]};
 const before=q.rays({feet,...settings});
 const nav=scene.navigation,base=trial.scene.navigation,{x:sx,y:sy}=nav.intentScale;
 const {rect,p,cover}=camera.nav;
 const site=(x,z)=>({x:p.x+(cover.left+cover.width*x-p.x)/sx-rect.left,y:p.y+(cover.top+cover.height*z-p.y)/sy-rect.top});
 const candidates=[],sites=[];
 let area=0,bounded=0;
 for(let y=.5/sy;y<scene.height;y+=1/sy)for(let x=.5/sx;x<scene.width;x+=1/sx){
  const point={x,y};if(nav.valid(point)&&!base.valid(point)){area++;if(camera.actors.some(a=>x>=a.bounds.left&&x<=a.bounds.right&&y>=a.bounds.top&&y<=a.bounds.bottom&&scene.planVisibility(a)(point)))bounded++;}
 }
 recording.arms[arm]={...metrics(before),newTerrainCSS2:area,reachableByBoundsAndInkCSS2:bounded};
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
