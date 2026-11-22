// Classify actual free-walk draws in the preserved 320px and 390px browser records.
import fs from 'node:fs';
import path from 'node:path';
import {gunzipSync} from 'node:zlib';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const game=process.env.MOBILITY_GAME;
const load=name=>import(pathToFileURL(path.join(game,name)));
const {selectRecoveredScene}=await load('home-production-manifest.mjs');
const {createRecoveredNavigation}=await load('home-recovered-navigation-finish.mjs');
const {extendVisibleGroundNavigation}=await load('home-visible-ground-navigation-finish.mjs');
const {insidePolygon}=await load('home-art-navigation-finish.mjs');
const scene=selectRecoveredScene('forest');
function geometry(width){
  const c=JSON.parse(fs.readFileSync(new URL('../home-mobility-v10/evidence/native-scene-'+width+'.json',import.meta.url)));
  const {stage,rect,p,host,cover,stableGrid,addVisible}=c.nav;
  const base=createRecoveredNavigation(scene,host,stage,{stableGrid,expandCity:stableGrid});
  const nav=addVisible?extendVisibleGroundNavigation(base,{spec:scene,stage:rect,presentation:p,cover}):base;
  const {x:sx,y:sy}=nav.intentScale;
  const polys=scene.foreground.map(poly=>poly.map(([u,v])=>[p.x+(cover.left+cover.width*u-p.x)/sx-rect.left,p.y+(cover.top+cover.height*v-p.y)/sy-rect.top]));
  return {nav,sx,sy,bodies:new Map(c.actors.map(a=>[a.key,a])),
    ink:(x,y,w,h)=>[-.3,0,.3].every(u=>[.22,.5,.8].every(v=>polys.every(poly=>!insidePolygon(x+u*w,y-v*h,poly))))};
}
const maps=new Map([320,390].map(w=>[w,geometry(w)]));
const pos=p=>({x:p[0],y:p[1]});
const close=(a,b)=>a&&b&&Math.hypot(a.x-b.x,a.y-b.y)<1e-5;
const totals=[],cells=[],otherProjection=[];
const unique=new Set();
for(const file of process.argv.slice(2)){
  const bytes=fs.readFileSync(file),digest=createHash('sha256').update(bytes).digest('hex');
  if(unique.has(digest))continue;unique.add(digest);
  const d=JSON.parse(gunzipSync(bytes)),{width,arm,seed,order}=d;
  if(!maps.has(width))continue;
  const {nav,sx,sy,bodies,ink}=maps.get(width);
  const lookup=(k,t)=>k+'|'+t.toFixed(4);
  const decisions=new Map(d.log.choices.map(([t,k,name])=>[lookup(k,t),name]));
  const residentData=new Map(d.baseline.residents.map(r=>[r.key,r]));
  const p0=d.log.requests[0].scale;
  if(Math.abs(sx-p0[0])+Math.abs(sy-p0[1])>=1e-5){
    otherProjection.push({digest,width,order,scale:p0}); continue;
  }
  const counter={digest,arm,width,seed,order,draws:0,offTerrain:0,occludedOnTerrain:0,occupied:0,
    legalFree:0,staticReachable:0,staticUnresolved:0,accepted:0,exactRouted:0,
    actualRawArrivals:0,denied:0,recordedSamplesCrossChecked:0,recordedGeometryDisagrees:0};
  for(const [index,r] of d.log.requests.entries()){
    if(!['walk','solitude'].includes(decisions.get(lookup(r.key,r.clock))) || r.early || r.resumed || r.assisted || r.source!=='ambient')continue;
    const who=r.peers.find(b=>b[0]===r.key),w=who[3],h=who[4],raw=pos(r.goal),from=pos(r.from);
    const terrain=nav.valid(raw),shown=ink(raw.x,raw.y,w,h);
    const overlaps=r.peers.filter(b=>b!==who && Math.hypot((raw.x-b[1])/((w+b[3])*.5+10),(raw.y-b[2])/((h+b[4])*.38+10))<1);
    const samples=residentData.get(r.key)?.failureSamples||[];
    const check=samples.find(s=>s.source==='ambient'&&s.from&&Math.hypot(s.from[0]-from.x,s.from[1]-from.y)<1e-5&&Math.hypot(s.to[0]-raw.x,s.to[1]-raw.y)<1e-5);
    if(check){
      counter.recordedSamplesCrossChecked++;
      if(check.terrain!==terrain || check.visible!==shown || (!!check.goal.length)!==!!overlaps.length)counter.recordedGeometryDisagrees++;
    }
    counter.draws++;
    if(!terrain){counter.offTerrain++;continue;}
    if(!shown){counter.occludedOnTerrain++;continue;}
    if(overlaps.length){counter.occupied++;continue;}
    counter.legalFree++;
    const box=bodies.get(r.key).bounds, visible=p=>ink(p.x,p.y,w,h);
    const exactRoute=route=>route?.length && close(route.at(-1),raw) && route.every((q,i)=>nav.segmentSafe(i?route[i-1]:from,q,visible));
    const direct=nav.segmentSafe(from,raw,visible);
    const connected=direct||!!exactRoute(nav.route(from,raw,box,visible))||
      !!exactRoute(nav.referenceRoute?.(from,raw,box,visible))||
      !!exactRoute(nav.reachable?.(from,raw,box,visible,p=>Math.hypot((p.x-raw.x)*sx,(p.y-raw.y)*sy)<.5));
    if(connected)counter.staticReachable++;else counter.staticUnresolved++;
    const endpoint=r.accepted?(r.route?.at(-1)||r.target):null;
    const m=d.log.motions.find(m=>m.request===index&&m.key===r.key);
    const net=m?Math.hypot((m.last[0]-from.x)*sx,(m.last[1]-from.y)*sy):0;
    const err=m?Math.hypot((m.last[0]-raw.x)*sx,(m.last[1]-raw.y)*sy):null;
    if(r.accepted)counter.accepted++;else counter.denied++;
    if(endpoint && close(pos(endpoint),raw))counter.exactRouted++;
    if(m?.status==='arrival' && err<=1)counter.actualRawArrivals++;
    cells.push({digest,arm,width,seed,order,index,key:r.key,clock:r.clock,from:r.from,raw:r.goal,
      staticRoute:connected,direct,accepted:r.accepted,endpoint,net,finalError:err,arrival:m?.status==='arrival'});
  }
  totals.push(counter);
}
console.log(JSON.stringify({method:'Stored native Chromium requests at ordinary decisions (walk/solitude; no retries, assistance or resume), reconstructed with V10 native art terrain and body foreground. Current peer geometry comes from each individual browser request. Exact static route requires a continuous foreground-safe native route to that raw point without peers. Cross-check against actual native telemetry failure samples where both foot and target match.',totals,otherProjection,cells},null,2));
