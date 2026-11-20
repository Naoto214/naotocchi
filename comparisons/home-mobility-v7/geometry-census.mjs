// node comparisons/home-mobility-v7/geometry-census.mjs [--write]
// This counts sampled geometric opportunities. Only the archived pointer/step
// harness can establish that the game actually issued and completed a walk.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {selectRecoveredScene} from '../../home-production-manifest.mjs';
import native from '../home-finish-v5/native-source.cjs';

const fixture=JSON.parse(fs.readFileSync(new URL('./geometry-fixture.json',import.meta.url)));
const root=native.nativeFixture();
fs.copyFileSync(new URL('../../home-ground-expansion.mjs',import.meta.url),path.join(root,'home-ground-expansion.mjs'));
const moduleAt=name=>import(pathToFileURL(path.join(root,name)));
const {createRecoveredNavigation}=await moduleAt('home-recovered-navigation.mjs');
const {extendVisibleGroundNavigation}=await moduleAt('home-visible-ground-navigation.mjs');
const {insidePolygon}=await moduleAt('home-art-navigation.mjs');
const residents=fixture.residents, transform=fixture.stageToCss, sx=transform.scaleX, sy=transform.scaleY;
const stage=fixture.nativeStage, spec=selectRecoveredScene('forest'), cover=fixture.cover;
const legacy=createRecoveredNavigation(spec,stage,stage,{stableGrid:true});
const nav=extendVisibleGroundNavigation(legacy,{spec,stage:{left:transform.left/sx,top:transform.top/sy},
  presentation:{x:0,y:0,scaleX:sx,scaleY:sy},cover});
const polygons=spec.foreground.map(poly=>poly.map(([u,v])=>[
  (cover.left+u*cover.width-transform.left)/sx,(cover.top+v*cover.height-transform.top)/sy]));
const opening=residents.map(({x,y})=>({x,y}));
const radius=residents.map(a=>residents.map(b=>({x:(a.w+b.w)*.5+10,y:(a.h+b.h)*.38+10})));
const short=i=>residents[i].key.split(':').at(-1);
const indices=mask=>residents.flatMap((_,i)=>(mask&(1<<i))?[i]:[]);
const bits=mask=>{let n=0;for(;mask;mask&=mask-1)n++;return n;};
const distance=(p,q)=>Math.hypot((p.x-q.x)*sx,(p.y-q.y)*sy);
const round=n=>Math.round(n*100)/100;

function within(i,p) {
  const b=residents[i].bounds;
  return p.x>=b.left&&p.x<=b.right&&p.y>=b.top&&p.y<=b.bottom;
}
function visible(i,p) {
  const a=residents[i];
  for(const dx of [-.3*a.w,0,.3*a.w])for(const dy of [.22*a.h,.5*a.h,.8*a.h])
    if(polygons.some(poly=>insidePolygon(p.x+dx,p.y-dy,poly)))return false;
  return true;
}
function contacts(i,p,feet) {
  return feet.flatMap((peer,j)=>i!==j&&Math.hypot((p.x-peer.x)/radius[i][j].x,(p.y-peer.y)/radius[i][j].y)<1
    ?[residents[j].key]:[]);
}
// Test the entire segment in the peer's unit ellipse. For an existing overlap,
// a nonnegative initial derivative guarantees increasing distance along the line.
function clears(i,from,to,j,peer) {
  const r=radius[i][j], x=(from.x-peer.x)/r.x, y=(from.y-peer.y)/r.y;
  const dx=(to.x-from.x)/r.x, dy=(to.y-from.y)/r.y, dot=x*dx+y*dy;
  if(x*x+y*y<1)return dot>=0;
  const t=Math.max(0,Math.min(1,-dot/(dx*dx+dy*dy||1)));
  return (x+t*dx)**2+(y+t*dy)**2>=1;
}
function classify(i,p) {
  return {insideBounds:within(i,p),terrain:nav.valid(p),visible:visible(i,p),contacts:contacts(i,p,opening)};
}
function matchClass(measured,expected) {
  for(const [key,value] of Object.entries(measured))assert.deepEqual(value,expected[key],key);
}
function validate(r,i) {
  const point=opening[i], goal={x:r.releaseNative[0],y:r.releaseNative[1]};
  const start=classify(i,point), release=classify(i,goal);
  matchClass(start,r.observedStart);
  matchClass(release,r.observedGoal);
  assert.ok(Math.abs(legacy.depthScale(point)-r.depth)<1e-7);
  assert.ok(Math.hypot(transform.left+point.x*sx-r.footCss[0],transform.top+point.y*sy-r.footCss[1])<1e-6);
  return {key:r.key,start,release,depthMatched:true,paintedFootMatched:true,
    measuredV6Arrival:r.terminalArrived,measuredV6Within4:r.terminalNear4};
}

// Midpoint quadrature over clipped two-native-unit cells, converted to displayed
// CSS-pixel area. A legal point is not necessarily connected to the current foot.
function estimateArea(box,classifier) {
  const sums={};
  for(let y=box.top;y<box.bottom;y+=2)for(let x=box.left;x<box.right;x+=2){
    const w=Math.min(2,box.right-x),h=Math.min(2,box.bottom-y);
    const flags=classifier({x:x+w/2,y:y+h/2});
    for(const [key,ok] of Object.entries(flags))sums[key]=(sums[key]||0)+(ok?w*h*sx*sy:0);
  }
  return Object.fromEntries(Object.entries(sums).map(([k,v])=>[k,round(v)]));
}
function areaFor(i) {
  return estimateArea(residents[i].bounds,p=>{
    const ground=nav.valid(p), ink=ground&&visible(i,p);
    return {terrain:ground,terrainAndInk:ink,clearOfOtherFeet:ink&&!contacts(i,p,opening).length};
  });
}

function census(feet,useTerrain,headingStep,{diagnose=true}={}) {
  function terrain(i,from,to) {
    return within(i,from)&&within(i,to)&&(!useTerrain||nav.segmentSafe(from,to,p=>visible(i,p)));
  }
  function blockedBy(i,from,to) {
    let mask=0;
    feet.forEach((peer,j)=>{if(j!==i&&!clears(i,from,to,j,peer))mask|=1<<j;});
    return mask;
  }
  function samples(i,radii,step=headingStep) {
    const p=feet[i],output=[];
    for(const r of radii)for(let deg=0;deg<360;deg+=step){
      const a=deg*Math.PI/180;
      output.push({x:p.x+r*Math.cos(a)/sx,y:p.y+r*Math.sin(a)/sy});
    }
    return output;
  }
  // Keep the three shortest alternatives for each endpoint and identical set of
  // blockers. A moved helper may open a different straight or bent path.
  function pathsFrom(i,ends,maxTravel,maxBlockers,maxPivot) {
    const from=feet[i],out=[];
    const pivots=samples(i,[3,6,10,14].filter(r=>r<=maxPivot)).filter(p=>terrain(i,from,p))
      .map(p=>({p,mask:blockedBy(i,from,p),len:distance(from,p)})).filter(o=>bits(o.mask)<=maxBlockers);
    for(const to of ends){
      if(!within(i,to)||useTerrain&&(!nav.valid(to)||!visible(i,to)))continue;
      const direct=distance(from,to),byMask=new Map();
      function add(mask,via,len) {
        if(bits(mask)>maxBlockers)return;
        const cluster=byMask.get(mask)||[];
        if(cluster.length===3&&len>=cluster[2].len)return;
        cluster.push({i,to,mask,via,len});
        cluster.sort((a,b)=>a.len-b.len);
        byMask.set(mask,cluster.slice(0,3));
      }
      if(terrain(i,from,to))add(blockedBy(i,from,to),null,direct);
      for(const pivot of pivots){
        const last=distance(pivot.p,to),travel=pivot.len+last;
        if(travel>maxTravel||travel<direct+.2||last<2)continue;
        const mask=pivot.mask|blockedBy(i,pivot.p,to),prior=byMask.get(mask);
        if(bits(mask)>maxBlockers||prior?.length===3&&prior[2].len<=travel)continue;
        if(terrain(i,pivot.p,to))add(mask,pivot.p,travel);
      }
      for(const cluster of byMask.values())out.push(...cluster);
    }
    return out;
  }
  const helpers=feet.map((_,i)=>pathsFrom(i,samples(i,[3,5,8,12,16,20,24]),29,1,12)
    .sort((a,b)=>a.len-b.len));
  function clearAfter(p,j,to) {
    return (!p.via||clears(p.i,feet[p.i],p.via,j,to))&&clears(p.i,p.via||feet[p.i],p.to,j,to);
  }
  function record(p) {
    const from=feet[p.i],offset=q=>[round((q.x-from.x)*sx),round((q.y-from.y)*sy)];
    return {resident:short(p.i),waypointsCss:[...(p.via?[offset(p.via)]:[]),offset(p.to)],travelCss:round(p.len)};
  }
  function cooperative(p,includeTwo) {
    const ids=indices(p.mask),answers={};
    if(!ids.length)return {solo:[record(p)]};
    if(ids.length===1){
      const clean=helpers[ids[0]].find(first=>!first.mask&&clearAfter(p,first.i,first.to));
      if(clean)answers.one=[record(clean),record(p)];
    }
    if(includeTwo){
      for(const lastId of ids){
        const other=ids.find(i=>i!==lastId);
        for(const last of helpers[lastId]){
          if(last.mask&(1<<p.i)||!clearAfter(p,last.i,last.to))continue;
          const id=other??indices(last.mask)[0];
          if(id==null||id===p.i||last.mask&~(1<<id))continue;
          const first=helpers[id].find(v=>!v.mask&&clearAfter(last,id,v.to)&&clearAfter(p,id,v.to));
          if(first){answers.two=[record(first),record(last),record(p)];return answers;}
        }
      }
    }
    return answers;
  }
  function shortRelease(i) {
    const from=feet[i],g={x:residents[i].releaseNative[0],y:residents[i].releaseNative[1]},sign=Math.sign(g.x-from.x);
    const ends=[g,...samples(i,[3,4,6,8,10,12,14,16,20])].filter(p=>(p.x-from.x)*sx*sign>=4&&distance(p,g)<=9);
    const paths=pathsFrom(i,ends,26,2,14).sort((a,b)=>distance(a.to,g)-distance(b.to,g)||a.len-b.len);
    const result={solo:null,one:null,two:null};
    for(const p of paths){
      const options=cooperative(p,!result.two);
      for(const [className,walks] of Object.entries(options)){
        if(!result[className])result[className]={missCss:round(distance(p.to,g)),walks};
      }
      if(result.solo&&result.one&&result.two)break;
    }
    return result;
  }
  function anyHeading(i,includeTwo) {
    const from=feet[i],paths=pathsFrom(i,samples(i,[8,10,12,16,20,24]),30,includeTwo?2:1,14);
    const counts=new Map(),best={solo:null,one:null,two:null},max={solo:0,one:0,two:0};
    for(const p of paths){
      const displacement=distance(from,p.to);
      const angle=Math.round(((Math.atan2((p.to.y-from.y)*sy,(p.to.x-from.x)*sx)*180/Math.PI+360)%360)*10)/10;
      for(const [kind,walks] of Object.entries(cooperative(p,includeTwo&&!best.two))){
        if(kind!=='two')counts.set(angle,Math.min(counts.get(angle)??1,kind==='solo'?0:1));
        const cost=Math.abs(displacement-12)+.15*p.len+(kind==='one'?.45*walks[0].travelCss:0);
        if(!best[kind]||cost<best[kind].cost)best[kind]={cost,walks};
        max[kind]=Math.max(max[kind],displacement);
      }
    }
    return {soloBearings:[...counts.values()].filter(v=>v===0).length,extraHelpedBearings:[...counts.values()].filter(v=>v===1).length,
      maxSoloCss:round(max.solo),maxHelpedCss:round(max.one),solo:best.solo?.walks??null,one:best.one?.walks??null,...(includeTwo?{two:best.two?.walks??null}:{})};
  }
  function bottleneck(i) {
    const possible=samples(i,[8],2.5).filter(q=>terrain(i,feet[i],q));
    const masks=possible.map(q=>blockedBy(i,feet[i],q)),min=Math.min(...masks.map(bits));
    return {bearings:144,terrainInkAllowed:possible.length,minBlockers:min,
      minimalBlockingSets:[...new Set(masks.filter(v=>bits(v)===min))].map(v=>indices(v).map(short))};
  }
  const persistent=new Set(['cat_friend','tanuki','watcher','rabbit_friend','chicken','many_tail_fox','box']);
  const rows=residents.map((a,i)=>({key:a.key,...(diagnose&&!a.terminalArrived?{shortDrop:shortRelease(i)}:{}),
    ...(useTerrain?{anyHeading:anyHeading(i,diagnose&&persistent.has(short(i)))}:{}),...(diagnose&&useTerrain&&persistent.has(short(i))?{bottleneck:bottleneck(i)}:{})}));
  const count=(field,fn)=>rows.filter(r=>r[field]&&fn(r[field])).length;
  return {headingStepDegrees:headingStep,rows,
    totals:{shortSolo:count('shortDrop',r=>r.solo),shortOne:count('shortDrop',r=>r.one),shortTwo:count('shortDrop',r=>r.two),
      anySolo:count('anyHeading',r=>r.solo),anySoloOrOne:count('anyHeading',r=>r.solo||r.one)}};
}

// Independently evaluate the strict optional first-seat selector. Every peer
// keeps all previously open 8-CSS-pixel bearings. The served V7 uses no new seat.
function localSeatAblation() {
  function allowed(i,from,to,feet) {
    return within(i,to)&&feet.every((b,j)=>i===j||clears(i,from,to,j,b))&&nav.segmentSafe(from,to,p=>visible(i,p));
  }
  function sectors(i,feet) {
    let mask=0;
    for(let j=0;j<16;j++){
      const from=feet[i],r=j*Math.PI/8,to={x:from.x+8*Math.cos(r)/sx,y:from.y+8*Math.sin(r)/sy};
      if(allowed(i,from,to,feet))mask|=1<<j;
    }
    return mask;
  }
  const before=opening.map((_,i)=>sectors(i,opening)),choices=[];
  for(const [i,a] of residents.entries()){
    if(!a.key.startsWith('companion:'))continue;
    const b=a.bounds,from=opening[i];
    for(let y=b.top;y<=b.bottom+7;y+=8)for(let x=b.left;x<=b.right+7;x+=8){
      const to={x:Math.min(x,b.right),y:Math.min(y,b.bottom)},dist=distance(from,to);
      if(dist<.01||dist>16||!allowed(i,from,to,opening))continue;
      const feet=opening.slice();feet[i]=to;
      const after=feet.map((_,j)=>sectors(j,feet));
      if(after.some((m,j)=>before[j]&~m))continue;
      const opened=after.filter((m,j)=>!before[j]&&m).length;
      if(!opened)continue;
      const changes=after.flatMap((m,j)=>m===before[j]?[]:[{resident:short(j),newBearings:bits(m&~before[j])}]);
      const gain=changes.reduce((n,r)=>n+r.newBearings,0);
      choices.push({resident:a.key,from,to,seatShiftCss:round(dist),opened,gain,changes});
    }
  }
  choices.sort((a,b)=>b.opened-a.opened||b.gain-a.gain||a.seatShiftCss-b.seatShiftCss);
  return {bearings:16,radiusCss:8,maxSeatShiftCss:16,candidatesPreservingAllBearingsAndOpeningSomeone:choices};
}

const validation=residents.map(validate);
const areaCss2={nativeStage:estimateArea({left:0,top:0,right:stage.width,bottom:stage.height},p=>({terrain:nav.valid(p)})),
  cellEdgeNative:2,perResident:residents.map((r,i)=>({key:r.key,...areaFor(i)}))};
const out={kind:'Geometric opportunity sample; no gestures dispatched',fixture:'geometry-fixture.json',
  parameters:{shortForwardMinimumCss:4,shortGoalErrorMaximumCss:9,shortActorTravelMaximumCss:26,anyActorTravelMaximumCss:30,
    helperEndpointMaximumCss:24,helperTravelMaximumCss:29,maximumSegmentsPerResident:2,anyHeadingDisplacementsCss:[8,10,12,16,20,24]},
  validation,areaCss2,localSeatAblation:localSeatAblation(),opening:census(opening,true,7.5),contactOnly:census(opening,false,15),
  after300:census(residents.map(r=>({x:r.agedFoot[0],y:r.agedFoot[1]})),true,7.5,{diagnose:false})};
const dest=new URL('./evidence/forest-geometry.json',import.meta.url);
if(process.argv.includes('--write'))fs.writeFileSync(dest,JSON.stringify(out,null,2)+'\n');
else assert.deepEqual(out,JSON.parse(fs.readFileSync(dest)),'committed geometry census changed');
console.log(JSON.stringify({stageTerrainCss2:areaCss2.nativeStage.terrain,opening:out.opening.totals,after300:out.after300.totals}));
