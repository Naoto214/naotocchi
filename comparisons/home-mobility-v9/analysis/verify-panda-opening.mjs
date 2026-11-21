// Run from the repository root with MOBILITY_GAME set to the comparison game directory.
// Usage: node this-script.mjs path/to/forest-937-panda-micro.json
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {forest,modelApi,sx,sy} from '../movement-scene.mjs';
import {pathToFileURL} from 'node:url';
const load=f=>import(pathToFileURL(path.resolve(f)));
const {selectRecoveredScene}=await load(path.join(process.env.MOBILITY_GAME,'home-production-manifest.mjs'));
const {scene}=forest(modelApi(true)), nav=scene.navigation, art=selectRecoveredScene('forest');
const fixture=JSON.parse(fs.readFileSync(process.argv[2]));
const screen=p=>({x:p.x*sx,y:p.y*sy});
const paintPoint=nav.visibleGround.point;
const zero=paintPoint({x:0,y:0}), scaleX=paintPoint({x:1,y:0}).x-zero.x, scaleY=paintPoint({x:0,y:1}).z-zero.z;
const projectPaint=([x,z])=>screen({x:(x-zero.x)/scaleX,y:(z-zero.z)/scaleY});
const projectLegacy=([x,z])=>screen(nav.project({x,z}));
const polygons=[projectLegacy,projectPaint].map(proj=>[art.ground,...art.exclude].map(poly=>poly.map(proj)));
const minPaintY=projectPaint([0,nav.visibleGround.rule.minZ]).y;
function inside(p,poly){
 let hit=false;
 for(let i=0,j=poly.length-1;i<poly.length;j=i++){
  const a=poly[i],b=poly[j];
  if((a.y>p.y)!==(b.y>p.y)&&p.x<(b.x-a.x)*(p.y-a.y)/(b.y-a.y)+a.x)hit=!hit;
 }
 return hit;
}
function distanceToSegment(p,a,b){
 const dx=b.x-a.x,dy=b.y-a.y,divisor=dx*dx+dy*dy||1;
 const t=Math.min(1,Math.max(0,((p.x-a.x)*dx+(p.y-a.y)*dy)/divisor));
 return Math.hypot(p.x-a.x-t*dx,p.y-a.y-t*dy);
}
function outsideGroundDisk(p,r,polyList,paint){
 if(paint&&minPaintY-p.y>r+1e-7)return true;
 return polyList.some((poly,i)=>{
  if(inside(p,poly)===(i===0))return false;
  return poly.every((a,j)=>distanceToSegment(p,a,poly[(j+1)%poly.length])>r+1e-7);
 });
}
// Replay the three proposed legs against live feet in walk order. A leg from
// an existing contact must increase its separation continuously. A new contact
// is rejected at the closest point of the segment, including its interior.
function validateStages(row){
 const cast=row.peers.map(([key,x,y,w,h,target,source,manualUntil,yieldAfter,manualGoal,yieldFor,activity])=>
   ({key,x,y,w,h,target,manualUntil,yieldAfter,manualGoal,yieldFor,activity}));
 assert.equal(new Set(row.stages.map(leg=>leg.key)).size,row.stages.length);
 assert.ok(row.stages.length<=3);
 for(const [i,leg] of row.stages.entries()){
  const a=cast.find(b=>b.key===leg.key),to={x:leg.to[0],y:leg.to[1]},box=scene.actorBounds(a);
  assert.ok(Math.hypot(a.x-leg.from[0],a.y-leg.from[1])<1e-6);
  if(i<row.stages.length-1){
   assert.ok(!a.target&&!a.manualGoal&&!a.yieldFor&&a.key!==row.selected);
   assert.ok(row.clock>=a.manualUntil&&row.clock>=a.yieldAfter&&!['together','approach'].includes(a.activity));
  }
  assert.ok(to.x>=box.left&&to.x<=box.right&&to.y>=box.top&&to.y<=box.bottom);
  assert.ok(nav.segmentSafe(a,to,scene.planVisibility(a)));
  for(const b of cast)if(b!==a){
   const rx=(a.w+b.w)*.5+10,ry=(a.h+b.h)*.38+10;
   const x=(a.x-b.x)/rx,y=(a.y-b.y)/ry,dx=(to.x-a.x)/rx,dy=(to.y-a.y)/ry;
   const dot=x*dx+y*dy,t=Math.max(0,Math.min(1,-dot/(dx*dx+dy*dy||1)));
   if(x*x+y*y<1){assert.ok(dot>=0);assert.ok((x+dx)**2+(y+dy)**2>x*x+y*y);}
   else assert.ok((x+t*dx)**2+(y+t*dy)**2>=1);
  }
  if(i===row.stages.length-1){
   const distance=p=>Math.hypot((p.x-row.rawGoal[0])*sx,(p.y-row.rawGoal[1])*sy);
   assert.ok(Math.abs(Math.hypot((to.x-a.x)*sx,(to.y-a.y)*sy)-row.ownerNetCSS)<1e-6);
   assert.ok(Math.abs(distance(a)-distance(to)-row.ownerGain)<1e-6);
  }
  Object.assign(a,to);
 }
}
function certify(row,radius){
 const ends=new Map(row.stages.map(({key,to})=>[key,to]));
 const feet=row.peers.map(([key,x,y,w,h])=>{
  const p=ends.get(key)||[x,y];return {key,x:p[0],y:p[1],w,h};
 });
 const owner=feet.find(f=>f.key===row.stages.at(-1).key),x=screen(owner);
 const contacts=feet.filter(b=>b!==owner).map(b=>{
  const rx=(owner.w+b.w)*.5+10,ry=(owner.h+b.h)*.38+10;
  const clearance=p=>Math.hypot((p.x-b.x*sx)/(rx*sx),(p.y-b.y*sy)/(ry*sy));
  // No new intersection is permitted. An existing intersection must strictly improve until it ends.
  return {key:b.key,clearance,minRadius:Math.min(rx*sx,ry*sy),floor:Math.min(1,clearance(x))};
 });
 const arcs=[];
 function visit(lo,hi,depth){
  const mid=(lo+hi)/2,p={x:x.x+radius*Math.cos(mid),y:x.y+radius*Math.sin(mid)};
  // Every point of the arc lies within this screen-space disk about its midpoint.
  const disk=radius*(hi-lo)/2;
  const foot=contacts.find(b=>b.floor-b.clearance(p)>disk/b.minRadius+1e-9);
  if(foot){arcs.push([lo,hi,foot.key]);return;}
  if(!nav.valid({x:p.x/sx,y:p.y/sy})&&outsideGroundDisk(p,disk,polygons[0],false)&&outsideGroundDisk(p,disk,polygons[1],true)){
   arcs.push([lo,hi,'terrain']);return;
  }
  if(depth>=22){arcs.push([lo,hi,null]);return;}
  visit(lo,mid,depth+1);visit(mid,hi,depth+1);
 }
 for(let i=0;i<16;i++)visit(i*Math.PI/8,(i+1)*Math.PI/8,0);
 return {index:row.index,clock:row.clock,radius,fullyClosed:arcs.every(a=>a[2]),arcs};
}
const proofs=[];
for(const row of fixture.requests){
 validateStages(row);
 for(const radius of [5,8]){
  const proof=certify(row,radius);assert.ok(proof.fullyClosed);proofs.push(proof);
 }
}
console.log(JSON.stringify(proofs));
