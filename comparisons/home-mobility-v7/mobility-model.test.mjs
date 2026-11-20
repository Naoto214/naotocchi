import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';

const require=createRequire(import.meta.url);
const previous=require('../home-drag-v6/native-source.cjs').readNative('home-production-model.js');
const fixture=require('../home-finish-v5/native-source.cjs').nativeFixture();
const {createTerrainNavigation}=await import(pathToFileURL(path.join(fixture,'home-route-navigation.mjs')));
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'home-mobility-model-'));
process.once('exit',()=>fs.rmSync(temp,{recursive:true,force:true}));
const source=process.env.HOME_MOBILITY_TEST_V6?previous:require('./mobility-model.cjs').patchModel(previous);
const destination=path.join(temp,'model.cjs');
fs.writeFileSync(destination,source);
const {createModel}=require(destination);

function residents(points,{box,walkable=()=>true,scale={x:1,y:1}}){
  const model=createModel({random:()=>.5});
  const nav=createTerrainNavigation({width:700,height:400,cell:8,gridOrigin:{x:0,y:0},
    project:p=>p,unproject:p=>({...p,z:p.y}),walkable,
    segmentWalkable:(a,b)=>{
      const n=Math.ceil(Math.hypot(b.x-a.x,b.y-a.y)*2);
      for(let i=1;i<=n;i++)if(!walkable({x:a.x+(b.x-a.x)*i/n,y:a.y+(b.y-a.y)*i/n}))return false;
      return true;
    }});
  nav.intentAware=true;nav.intentScale=scale;
  const people=points.map(([x,y,w=10,h=10],i)=>({key:String(i),kind:i?'companion':'pet',x,y,w,h}));
  let seating=true;
  const scene={width:700,height:400,region:'forest',navigation:nav,actorBounds:box,
    visible:(p,a)=>!seating||(Math.abs(people[Number(a.key)].x-p.x)<1e-8&&Math.abs(people[Number(a.key)].y-p.y)<1e-8)};
  model.sync(people,scene);
  seating=false;
  const tick=(n,options={autonomy:false})=>{for(let i=0;i<n;i++)model.step(.05,options);};
  return {model,tick,people,nav,scene};
}

function crowdedLane(extra=[]){
  const points=[[40,40],[34,40],...extra];
  while(points.length<16)points.push([140+points.length*28,40]);
  return residents(points,{box:a=>({left:a.key==='0'?40:0,right:680,top:40,bottom:40}),
    walkable:p=>p.x<=52||p.x>=75});
}

test('a failed dense ambient intention can take the safe part of an overlapping lane',()=>{
  const {model,tick}=crowdedLane();
  tick(400);const before=model.snapshot();
  assert.equal(before[0].x,40);assert.equal(before[1].x,34);
  assert.ok(model.move('0',{x:100,y:40},'ambient'));
  assert.equal(model.snapshot()[0].x,40);
  const frames=[];
  for(let i=0;i<40;i++){tick(1);frames.push(model.snapshot()[0].x);}
  assert.ok(frames.at(-1)>=48&&frames.at(-1)<=52);
  assert.ok(frames.every((x,i)=>x>=40&&x<53&&(!i||x>=frames[i-1]&&x-frames[i-1]<=2.100001)));
  assert.deepEqual(model.snapshot().slice(1).map(a=>[a.x,a.y]),before.slice(1).map(a=>[a.x,a.y]));
});

test('a stationary resident surrounded on both sides stays in the lane until a real opening',()=>{
  const {model,tick}=crowdedLane([[46,40]]);
  tick(400);
  assert.equal(model.move('0',{x:100,y:40},'ambient'),false);
  tick(80);assert.equal(model.snapshot()[0].x,40);
  model.select('0');
  assert.equal(model.move('0',{x:100,y:40},'ambient'),false);
  tick(10,{blocked:true});assert.equal(model.snapshot()[0].x,40);
});

test('a horizontal touch with subpixel camera round-off can use the same cleared second leg',()=>{
  const points=[[240,307.22,34.48,35.47],[193.32,283.34,41.8,48.77],
    [223.93,341.52,33.52,34.93],[247.88,370.16,33.34,27.88]];
  const scale={x:1.3697220060064486,y:1.134232061136463},miss=[];
  for(const epsilon of [0,.00000402]){
    const {model,tick}=residents(points,{box:()=>({left:80,right:320,top:80,bottom:370.16}),scale});
    const a=model.snapshot()[0],goal={x:a.x-12/scale.x,y:a.y+epsilon};
    model.select(a.key);assert.ok(model.move(a.key,goal,'drag',{pointerDrop:true}));
    tick(245);
    const end=model.snapshot()[0];
    miss.push(Math.hypot((goal.x-end.x)*scale.x,(goal.y-end.y)*scale.y));
  }
  assert.ok(miss[0]<3&&miss[1]<3,JSON.stringify(miss));
  assert.ok(Math.abs(miss[0]-miss[1])<.01);
});

function queueLane(){
  const points=Array.from({length:16},(_,i)=>[i<3?40+20*i:140+28*i,40]);
  return residents(points,{box:()=>({left:0,right:680,top:40,bottom:40})});
}

test('two blocked neighbors make room one at a time before the selected resident walks',()=>{
  const {model,tick}=queueLane();model.select('0');
  model.move('0',{x:52,y:40},'drag',{pointerDrop:true});
  assert.deepEqual(model.snapshot().slice(0,3).map(a=>a.x),[40,60,80]);
  let last=[40,60,80],order=[];
  for(let i=0;i<245;i++){
    tick(1);const a=model.snapshot().slice(0,3).map(a=>a.x);
    assert.ok(a[1]-a[0]>=20-1e-6&&a[2]-a[1]>=20-1e-6);
    const moved=a.map((x,j)=>x>last[j]+1e-6?j:null).filter(j=>j!==null);
    assert.ok(moved.length<=1);
    if(moved.length&&!order.includes(moved[0]))order.push(moved[0]);last=a;
  }
  assert.deepEqual(order,[2,1,0]);assert.equal(last[0],52);
});

test('an ordinary autonomous step cannot cut through the edge of another footprint',()=>{
  const {model,tick}=residents([[40,40],[41,57.59]],{
    box:a=>({left:0,right:100,top:a.key==='0'?40:57.59,bottom:a.key==='0'?40:57.59})});
  model.move('0',{x:44.2,y:40},'ambient');
  const from=model.snapshot()[0];tick(1);const to=model.snapshot()[0];
  assert.equal(from.x,40);
  const closest=Math.min(to.x,Math.max(from.x,41));
  assert.ok(((closest-41)/20)**2+((to.y-57.59)/17.6)**2>=1);
});

for(const stop of ['cancel','select','leave','takeover','pause']){
  test('pending two-neighbor walk stops on '+stop,()=>{
    const {model,tick,people,scene}=queueLane();
    model.select('0');model.move('0',{x:52,y:40},'drag',{pointerDrop:true});
    for(let i=0;i<180&&!model.snapshot()[2].target;i++)tick(1);
    const active=model.snapshot();
    assert.ok(active[2].target);
    assert.equal(active[1].x,60);
    if(stop==='cancel')model.cancel();
    if(stop==='select')model.select('0');
    if(stop==='takeover')model.select('2');
    if(stop==='pause')tick(1,{blocked:true});
    if(stop==='leave'){
      // Removing the selected resident cancels its unstarted second stage.
      model.sync(people.slice(1),scene);
    }
    const stopped=model.snapshot();
    tick(250);
    const after=model.snapshot();
    for(const key of ['1','2']){
      const first=stopped.find(a=>a.key===key),last=after.find(a=>a.key===key);
      assert.equal(last.x,first.x);assert.equal(last.y,first.y);
      assert.ok(!last.target);
    }
  });
}

test('a same-position native sync lets an unfinished second-helper search finish',()=>{
  const fixed=JSON.parse(fs.readFileSync(new URL('./geometry-fixture.json',import.meta.url)));
  const rows=fixed.residents,points=rows.map(a=>[a.x,a.y,a.w,a.h]);
  const scale={x:fixed.stageToCss.scaleX,y:fixed.stageToCss.scaleY};
  for(const index of [5,24]){
    const {model,tick,people,scene}=residents(points,{box:a=>rows[Number(a.key)].bounds,scale});
    const key=String(index),goal={x:rows[index].releaseNative[0],y:rows[index].releaseNative[1]};
    model.select(key);model.move(key,goal,'drag',{pointerDrop:true});tick(6);
    const before=model.snapshot().map(a=>[a.x,a.y]);model.sync(people,scene);
    assert.deepEqual(model.snapshot().map(a=>[a.x,a.y]),before);
    tick(239);const after=model.snapshot();
    assert.equal(after.filter(a=>a.source==='yield').length,2);
    const stop=after[index];
    assert.ok(Math.hypot((stop.x-goal.x)*scale.x,(stop.y-goal.y)*scale.y)<8);
  }
});

test('a real change in peer feet still preempts the pending two-helper search at its retry',()=>{
  const fixed=JSON.parse(fs.readFileSync(new URL('./geometry-fixture.json',import.meta.url)));
  const rows=fixed.residents,points=rows.map(a=>[a.x,a.y,a.w,a.h]);
  points.push([515,40]);
  const scale={x:fixed.stageToCss.scaleX,y:fixed.stageToCss.scaleY};
  const {model,tick,people,scene}=residents(points,{scale,
    box:a=>rows[Number(a.key)]?.bounds||{left:500,right:600,top:40,bottom:40}});
  const key='24',goal={x:rows[24].releaseNative[0],y:rows[24].releaseNative[1]};
  model.select(key);model.move(key,goal,'drag',{pointerDrop:true});tick(6);
  assert.ok(model.move('28',{x:550,y:40},'ambient'));
  tick(2);assert.ok(model.snapshot()[28].x>515);
  model.sync(people,scene);tick(239);
  const end=model.snapshot();
  assert.deepEqual([end[24].x,end[24].y],[rows[24].x,rows[24].y]);
  assert.equal(end.filter(b=>b.source==='yield').length,0);
});
