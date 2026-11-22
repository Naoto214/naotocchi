import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import geometry from './geometry.cjs';

const here=path.dirname(fileURLToPath(import.meta.url));
const [gameDir,firstPassFile,output]=process.argv.slice(2);
if(!output)throw Error('Usage: node geometry-segments.test.mjs V12_GAME ARCHIVED_FIRST_PASS_NAV OUTPUT.json');
const game=pathToFileURL(path.resolve(gameDir)+'/').href;
const text=file=>fs.readFileSync(file,'utf8');
const sha=s=>createHash('sha256').update(s).digest('hex');
const read=s=>text(path.join(here,s));
const moduleFor=s=>import('data:text/javascript;base64,'+Buffer.from(s.replaceAll("from './","from '"+game)).toString('base64'));
const {createRecoveredNavigation}=await import(game+'home-recovered-navigation-finish.mjs');
const {selectRecoveredScene}=await import(game+'home-production-manifest.mjs');
const {insidePolygon}=await import(game+'home-art-navigation-finish.mjs');
const original=text(new URL('home-visible-ground-navigation-finish.mjs',game)),before=text(firstPassFile),strict=geometry.patchNavigation(original);
assert.equal(sha(before),'ad5799057e9e9cd43f6cb57b22e27c1b635d648d1fe4d8d682fbc8b6278ad538');
const navs=await Promise.all([original,before,strict].map(moduleFor));
const model=text(new URL('home-production-model-mobility-v11-foot.js',game));
const nativeContact=model.match(/  function contactSegmentSafe[\s\S]+?\n  }/)[0];
const contact=new Function('clamp',nativeContact+'\nreturn contactSegmentSafe;')((n,lo,hi)=>Math.max(lo,Math.min(hi,n)));
const forest=selectRecoveredScene('forest');

// Independent intersection oracle; classifies the open intervals between
// crossings without using polygonCuts or the candidate's private helpers.
function hit(a,b,poly){
 const ts=[0,1],cross=(x,y,u,v)=>x*v-y*u;
 for(let i=0;i<poly.length;i++){
  const [x,y]=poly[i],[u,v]=poly[(i+1)%poly.length],dx=b.x-a.x,dz=b.z-a.z;
  const den=cross(dx,dz,u-x,v-y);
  if(Math.abs(den)<1e-15)continue;
  const t=cross(x-a.x,y-a.z,u-x,v-y)/den,f=cross(x-a.x,y-a.z,dx,dz)/den;
  if(t>=0&&t<=1&&f>=0&&f<=1)ts.push(t);
 }
 ts.sort((u,v)=>u-v);
 for(let i=1;i<ts.length;i++){
  const t=(ts[i-1]+ts[i])/2,x=a.x+t*(b.x-a.x),z=a.z+t*(b.z-a.z);
  if(insidePolygon(x,z,poly))return {x,z,t};
 }
 return null;
}
function enter(spec,point,from,to,body){
 const a=point(from),b=point(to);
 for(const group of ['exclude','foreground'])for(const [index,poly] of spec[group].entries()){
  const entrance=hit(a,b,poly);
  if(entrance)return {group,index,entrance};
 }
 for(const x of [-.3,0,.3])for(const y of [.22,.5,.8]){
  const offset=q=>point({x:q.x+x*body.w,y:q.y-y*body.h});
  for(const [index,poly] of spec.foreground.entries()){
   const entrance=hit(offset(from),offset(to),poly);
   if(entrance)return {group:'ink',index,probe:[x,y],entrance};
  }
 }
 return null;
}
function setup(camera,arm,spec=forest){
 const {host,stage,rect,p,cover,stableGrid}=camera.nav;
 const legacy=createRecoveredNavigation(spec,host,stage,{stableGrid,expandCity:stableGrid});
 const options={spec,stage:rect,presentation:p,cover};
 return navs.map(({extendVisibleGroundNavigation:extend},i)=>extend(legacy,{...options,
   patches:i?geometry.polygons[arm]:[],inkBodies:camera.actors}));
}
function contactSafe(a,from,to,actors){
 return actors.every(b=>a.key===b.key||contact(from,to,b,(a.w+b.w)*.5+10,(a.h+b.h)*.38+10));
}
const originCaseName=(w)=>[320,390].includes(w)?'../home-mobility-v10/evidence/native-scene-'+w+'.json':'../home-mobility-v12/evidence/performance-scene-'+w+'.json';
const cameras=[320,375,390,430].map(width=>{
 const location=originCaseName(width),raw=read(location),data=JSON.parse(raw);
 return {camera:data.camera||data,source:location,sourceSHA:sha(raw),width,height:792};
});
const sparseFile='evidence/terrain-segment-sparse-camera.json';
const sparse=JSON.parse(read(sparseFile));
cameras.push(...sparse.cases.map(camera=>({camera,source:sparseFile,sourceSHA:sha(read(sparseFile)),width:camera.width,height:camera.height})));
function* grid(box,sx,sy,step){
 for(let y=box.top;y<box.bottom;y+=step/sy)for(let x=box.left;x<box.right;x+=step/sx)yield {x,y};
}
const samples=[];
for(const {camera,source,sourceSHA,width,height} of cameras){
 const [base,first,final]=setup(camera,'c'),point=final.visibleGround.point;
 const {x:sx,y:sy}=final.intentScale;
 const stats={width,height,count:camera.actors.length,source,sourceSHA,examined:0,nativeAccepted:0,nativeLost:0,
   firstAdded:0,strictAdded:0,firstForbidden:0,strictForbidden:0,firstForbiddenPeerClear:0,strictForbiddenPeerClear:0,
   firstWitness:null,firstPeerClearWitness:null,approachWitness:null};
 const unpaint=s=>{
  const {p,rect,cover}=camera.nav;
  return [p.x+(cover.left+s[0]*cover.width-p.x)/sx-rect.left,p.y+(cover.top+s[1]*cover.height-p.y)/sy-rect.top];
 };
 const foreground=forest.foreground.map(poly=>poly.map(unpaint));
 for(const a of camera.actors){
  const visible=q=>[-.3,0,.3].every(dx=>[.22,.5,.8].every(dy=>{
   return foreground.every(poly=>!insidePolygon(q.x+dx*a.w,q.y-dy*a.h,poly));
  }));
  function classify(from,to,record=true){
   const A=base.segmentSafe(from,to,visible),old=first.segmentSafe(from,to,visible),now=final.segmentSafe(from,to,visible);
   if(record){stats.examined++;stats.nativeAccepted+=+A;stats.nativeLost+=+(A&&!now);stats.firstAdded+=+(!A&&old);stats.strictAdded+=+(!A&&now);}
   if(A||!old&&!now)return null;
   const reason=enter(forest,point,from,to,a);
   if(!reason)return null;
   const peerClear=contactSafe(a,from,to,camera.actors);
   const row={key:a.key,w:a.w,h:a.h,from:{x:from.x,y:from.y},to,paintedFrom:point(from),paintedTo:point(to),
    reason,peerClear,A,first:old,corrected:now,cssDistance:Math.hypot((to.x-from.x)*sx,(to.y-from.y)*sy)};
   if(record){
    stats.firstForbidden+=+old;stats.strictForbidden+=+now;
    stats.firstForbiddenPeerClear+=+(old&&peerClear);stats.strictForbiddenPeerClear+=+(now&&peerClear);
    if(old){stats.firstWitness??=row;if(peerClear)stats.firstPeerClearWitness??=row;}
   }
   return row;
  }
  for(const to of grid(a.bounds,sx,sy,6))if(first.valid(to)||final.valid(to))classify(a,to);
  // Sparse residents start from their measured opening foot. Also check a
  // reachable alternative start: every approach leg uses original A, the
  // unmodified bounds, visibility predicates and continuous peer contact.
  if(camera.actors.length<=4&&!stats.approachWitness&&!stats.firstPeerClearWitness){
   const goals=[...grid(a.bounds,sx,sy,6)].filter(q=>first.valid(q)&&!base.valid(q));
   for(const start of grid(a.bounds,sx,sy,5)){
    if(!base.valid(start)||!visible(start)||[...forest.foreground,...forest.exclude].some(poly=>insidePolygon(point(start).x,point(start).z,poly)))continue;
    let bad;
    for(const goal of goals){
     if(!contactSafe(a,start,goal,camera.actors)||!enter(forest,point,start,goal,a))continue;
     const candidate=classify(start,goal,false);
     if(candidate?.first&&!candidate.corrected){bad=candidate;break;}
    }
    if(!bad)continue;
    const approach=base.route(a,start,a.bounds,visible);
    if(!approach.length||Math.hypot(approach.at(-1).x-start.x,approach.at(-1).y-start.y)>1e-5)continue;
    if(!approach.every((p,i)=>contactSafe(a,i?approach[i-1]:a,p,camera.actors)&&base.segmentSafe(i?approach[i-1]:a,p,visible)))continue;
    stats.approachWitness={openingFoot:{x:a.x,y:a.y},originalApproach:approach,...bad};break;
   }
  }
 }
 if(camera.shown){
  // Native painter's CSS pixel position uses the displayed stage origin and
  // independent HomeBeauty paintRect. The crop and native projected feet must agree.
  assert.deepEqual(camera.paint,camera.nav.cover);
  stats.maximumProjectionErrorCSS=Math.max(...camera.actors.map((a,i)=>{
   assert.deepEqual(camera.shown[i].slice(2,6),[a.x,a.y,a.w,a.h]);
   const s=point(a);
   return Math.hypot(s.x*camera.paint.width+camera.paint.left-(camera.stageDOM.left+a.x*sx),
    s.z*camera.paint.height+camera.paint.top-(camera.stageDOM.top+a.y*sy));
  }));
  assert.ok(stats.maximumProjectionErrorCSS<.1,JSON.stringify(stats));
 }
 assert.equal(stats.nativeLost,0);
 assert.equal(stats.strictForbidden,0);
 console.log(JSON.stringify({width,count:stats.count,old:stats.firstForbidden,strict:stats.strictForbidden,sparse:!!stats.approachWitness,kept:stats.nativeAccepted}));
 samples.push(stats);
}
assert.ok(samples.some(v=>v.count===28&&v.firstForbidden>0));
assert.ok(samples.some(v=>v.count<=4&&(v.approachWitness||v.firstPeerClearWitness)), 'No contact-clear sparse reproduction');

// Narrow foreground intersected by a required ink probe between native 3px
// samples; its foot and sampled ink remain clear. The first pass admitted
// the path while the corrected version resolves actual polygon edges.
const spec={...forest,ground:[[0,0],[.45,0],[.45,1],[0,1]],exclude:[],foreground:[[[.4613,.595],[.4614,.595],[.4614,.605],[.4613,.605]]]};
const legacy={width:100,height:100,staticGeometry:true,project:({x,z})=>({x:x*100,y:z*100}),unproject:q=>({x:q.x/100,z:q.y/100}),valid:()=>false};
const options={spec,stage:{left:0,top:0,width:100,height:100},presentation:{x:0,y:0,scaleX:1,scaleY:1},cover:{left:0,top:0,width:100,height:100},patches:[[[.4,.65],[.8,.65],[.8,.75],[.4,.75]]],inkBodies:[{w:3,h:20}]};
const from={x:44,y:70},to={x:50,y:70},probe=q=>[-.3,0,.3].every(x=>[.22,.5,.8].every(y=>!insidePolygon((q.x+3*x)/100,(q.y-20*y)/100,spec.foreground[0])));
const test=(i,opts=options)=>navs[i].extendVisibleGroundNavigation(legacy,{...opts,patches:i?opts.patches:[]}).segmentSafe(from,to,probe);
const narrow={oldA:test(0),first:test(1),strict:test(2),emptyRoster:test(2,{...options,inkBodies:[]}),from,to,foreground:spec.foreground};
assert.deepEqual([narrow.oldA,narrow.first,narrow.strict,narrow.emptyRoster],[false,true,false,false]);
// Both endpoints of the old floor segment lie in A. A painted foreground
// touches its foot, but the native renderer's required ink lies above it.
const legacyForeground={...options,spec:{...spec,foreground:[[[.393,.695],[.413,.695],[.413,.705],[.393,.705]]]}};
const oldFrom={x:38,y:70},oldTo={x:43,y:70};
const retained=navs.map(({extendVisibleGroundNavigation:extend},i)=>extend(legacy,{...legacyForeground,
 patches:i?legacyForeground.patches:[]}).segmentSafe(oldFrom,oldTo));
assert.deepEqual(retained,[true,true,true]);
// A newly added subinterval may not borrow A's permission to cross a tiny
// excluded strip earlier along the same path, even parallel to its border.
const strip=[[.4413,.699],[.4414,.699],[.4414,.705],[.4413,.705]];
const mixed={...options,spec:{...spec,exclude:[strip],foreground:[]}};
const legacyMouth={...legacy,valid:q=>q.x<=45};
const samplesAt=(left,right)=>navs.map(({extendVisibleGroundNavigation:extend},i)=>
 extend(legacyMouth,{...mixed,patches:i?mixed.patches:[]}).segmentSafe(left,right));
const mixedInterior=samplesAt(from,to),boundary=samplesAt({...from,y:69.9},{...to,y:69.9});
assert.deepEqual(mixedInterior,[false,true,false]);
assert.deepEqual(boundary,[false,true,false]);
const regressionCases={narrow,retained,mixedInterior,boundary};
fs.writeFileSync(output,JSON.stringify({originalNavigation:sha(original),firstNavigation:sha(before),correctedNavigation:sha(strict),
 contactImplementation:sha(nativeContact),spacingCSS:6,art:'forest-waterfall',arm:'C',DHasSameTerrain:JSON.stringify(geometry.polygons.c)===JSON.stringify(geometry.polygons.d),
 sparseBrowser:sparse.browser,rows:samples,regressionCases},null,2)+'\n');
