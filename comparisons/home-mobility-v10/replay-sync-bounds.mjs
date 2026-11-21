import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
// Invoke with a generated V10 game directory, the tracked 320px scene capture
// and extracted V9/V10 forest28.json.gz files from the original workflow archives.
// Instrument only observations in memory. Never call step in this replay.
const [dir,sceneFile,...raws]=process.argv.slice(2);
if(!dir||!sceneFile||!raws.length)throw Error('Usage: node check.mjs GAME_DIR native-scene-320.json forest28.json.gz [...]');
const config=JSON.parse(fs.readFileSync(sceneFile));
const load=name=>import(pathToFileURL(path.join(dir,name)));
const {createRecoveredNavigation}=await load('home-recovered-navigation-finish.mjs');
const {extendVisibleGroundNavigation}=await load('home-visible-ground-navigation-finish.mjs');
const {insidePolygon}=await load('home-art-navigation-finish.mjs');
const {selectRecoveredScene}=await load('home-production-manifest.mjs');
const spec=selectRecoveredScene('forest');
const {stage,rect,p,host,cover,stableGrid}=config.nav;
const base=createRecoveredNavigation(spec,host,stage,{stableGrid,expandCity:stableGrid});
const nav=extendVisibleGroundNavigation(base,{spec,stage:rect,presentation:p,cover});
const {x:sx,y:sy}=nav.intentScale;
const polygons=spec.foreground.map(poly=>poly.map(([u,v])=>[
  p.x+(cover.left+cover.width*u-p.x)/sx-rect.left,
  p.y+(cover.top+cover.height*v-p.y)/sy-rect.top,
]));
function visible(z,a){return [-.3,0,.3].every(x=>[.22,.5,.8].every(y=>
  polygons.every(poly=>!insidePolygon(z.x+x*a.w,z.y-y*a.h,poly))));}
const key='companion:panda';
const rows=new Map(config.actors.map(a=>[a.key,a]));
const scene={...config.scene,region:'forest',time:'day',weather:'sunny',navigation:nav,
  actorBounds:a=>rows.get(a.key).bounds,referenceBounds:a=>rows.get(a.key).reference,
  planVisibility:a=>z=>visible(z,a),visible};
function scaleDist(a,b,s){return Math.hypot((a[0]-b[0])*s[0],(a[1]-b[1])*s[1]);}
function sha(z){return createHash('sha256').update(z).digest('hex');}
const cases=[];
for(const input of raws){
 const bytes=fs.readFileSync(input),d=JSON.parse(gunzipSync(bytes)),n=d.log.requests;
 const rawModel=fs.readFileSync(path.join(dir,'home-production-model-mobility-'+d.arm+'.js'),'utf8');
 const digest=sha(rawModel);
 if(d.width!==320||d.seed!==214||d.order!==0||!['v9','v10'].includes(d.arm))throw Error('Expected original 320/214 forest');
 if(digest!==d.sources['home-production-model-mobility-'+d.arm+'.js'].source)throw Error('Different runtime');
 const r=n.findIndex((q,i)=>i>0&&q.peers.find(a=>a[0]===key)[1]===120&&n[i-1].peers.find(a=>a[0]===key)[1]!==120);
 const prev=n[r-1],next=n[r],a=prev.peers.find(v=>v[0]===key),b=next.peers.find(v=>v[0]===key);
 const loc=q=>({x:q[1],y:q[2]}),point=loc(a),to=loc(b);
 const scenarios=[];
 for(const [label,after] of Object.entries({measuredInkBounds:scene,referenceBounds:{...scene,actorBounds:a=>rows.get(a.key).reference}})){
  const mod={exports:{}},observed=[];
  const code=rawModel.replace('    return {metrics:',`    return {restoreForTrace(saved,env){actors=saved;scene=env;},metrics:`)
  .replace('        return {...a,...p,route:','        if(a.key===watched)record({phase:"preserve-or-nearest",old:!!old,changed,reflow,limited,p,terrain:scene.navigation.valid(limited),visible:visible(a,limited),box:bounds(a,scene)});return {...a,...p,route:')
  .replace('          if(best){Object.assign(a,','          if(a.key===watched)record({phase:"seat",arrange,from:[a.x,a.y],best:best&&[best.x,best.y]});if(best){Object.assign(a,');
  new Function('module','watched','record',code)(mod,key,v=>observed.push(v));
  const model=mod.exports.createModel({random:()=>.5});
  model.restoreForTrace(prev.peers.map(([key,x,y,w,h,target,source,manualUntil,yieldAfter,manual,yieldFor,activity])=>({
   ...rows.get(key),key,x,y,w,h,target:target?{x:target[0],y:target[1]}:null,source,manualUntil,yieldAfter,yieldFor,activity,
  })),scene);
  model.sync(config.actors,after);
  const actor=model.snapshot().find(a=>a.key===key);
  const otherFeet=model.snapshot();
  const atHistorical=otherFeet.filter(r=>{const before=prev.peers.find(x=>x[0]===r.key),nextFoot=next.peers.find(x=>x[0]===r.key);return Math.hypot(before[1]-nextFoot[1],before[2]-nextFoot[2])>1e-5 && Math.hypot(r.x-nextFoot[1],r.y-nextFoot[2])<1e-7;}).map(r=>r.key);
  const matches=(x,y)=>Math.hypot(actor.x-x,actor.y-y)<1e-7;
  if(label==='measuredInkBounds'?!matches(a[1],a[2]):!matches(b[1],b[2]))throw Error('Native replay of original panda differs');
  scenarios.push({label,after:[actor.x,actor.y],equalsHistorical:matches(b[1],b[2]),otherHouseholdChangesMatching:atHistorical,observed});
 }
 const ts=d.trajectory.filter(t=>t.clock<=prev.clock);const before=ts[ts.length-1];
 const after=d.trajectory.find(t=>t.clock>=prev.clock&&t.actors.find(r=>r[0]===key)[1]===to.x);
 const trajectory=d.trajectory.filter(t=>t.clock>=before.clock&&t.clock<=after.clock)
 .map(t=>({wall:t.wall,clock:t.clock,gate:t.gate,panda:t.actors.find(a=>a[0]===key)}));
 const gates=d.events.gateTransitions.filter(t=>t.wallSeconds>=trajectory[0].wall-2&&t.wallSeconds<=after.wall+3);
 const changes=prev.peers.flatMap((p,i)=>{const q=next.peers[i];return p[1]!==q[1]||p[2]!==q[2]?[{key:p[0],before:p.slice(1,5),after:q.slice(1,5),oldActivity:p.at(-1),newActivity:q.at(-1)}]:[];});
 cases.push({arm:d.arm,sourceFile:path.basename(input),rawSHA256:sha(bytes),modelSHA256:digest,oldIndex:r-1,newIndex:r,
  oldClock:prev.clock,newClock:next.clock,oldFeet:a,newFeet:b,distanceCss:scaleDist(a.slice(1,3),b.slice(1,3),prev.scale),oldScale:prev.scale,newScale:next.scale,
  trajectory,gates,changes,scenarios});
}
console.log(JSON.stringify(cases,null,2));
