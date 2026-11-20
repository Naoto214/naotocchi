import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import source from './native-source.cjs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
const fixture=source.nativeFixture();
const {createTerrainNavigation}=await import(pathToFileURL(path.join(fixture,'home-route-navigation.mjs')));
const require=createRequire(import.meta.url);
const {createModel}=require(path.join(fixture,'home-production-model.js'));

function household(points,{walkable=()=>true,scale={x:1,y:1},box={left:0,right:120,top:0,bottom:100},intentAware=true}={}){
  const events=[],model=createModel({random:()=>.5,onEvent:e=>events.push(e)});
  const nav=createTerrainNavigation({width:120,height:100,cell:4,gridOrigin:{x:0,y:0},
    project:p=>p,unproject:p=>({...p,z:p.y}),walkable,
    segmentWalkable:(a,b)=>{
      const steps=Math.ceil(Math.hypot(b.x-a.x,b.y-a.y)*8);
      for(let i=1;i<=steps;i++)if(!walkable({x:a.x+(b.x-a.x)*i/steps,y:a.y+(b.y-a.y)*i/steps}))return false;
      return true;
    }});
  nav.intentAware=intentAware;
  nav.intentScale=scale;
  let seating=true;
  const list=points.map(([x,y],i)=>({key:String(i),kind:i?'companion':'pet',x,y,w:10,h:10}));
  const scene={region:'forest',width:120,height:100,navigation:nav,actorBounds:()=>box,
    visible:(p,a)=>!seating || (p.x===list[a.key].x && p.y===list[a.key].y)};
  const sync=()=>model.sync(list,scene);
  sync();
  seating=false;
  model.select('0');
  const live=()=>model.snapshot()[0];
  const step=()=>model.step(.025,{autonomy:false});
  const trace=()=>{const positions=[];for(let i=0;i<500;i++){step();positions.push(live());}return positions;};
  return {model,live,step,trace,events,scene,list,sync};
}

test('a crowded opening allows a short step that continuously escapes its initial overlap',()=>{
  const {model,live,trace,events}=household([[50,45],[44,45]]);
  assert.equal(model.move('0',{x:60,y:45},'drag',{pointerDrop:true}),true);
  assert.equal(live().x,50);
  const positions=trace();
  assert.ok(positions.every((a,i)=>a.x>=(i?positions[i-1].x:50) && a.x<=60.001));
  assert.equal(live().x,60);
  assert.equal(events.filter(e=>e.type==='arrive'&&e.source==='drag').length,1);
});

test('a blocked drag faces the release and shows the existing look without a later surprise walk',()=>{
  const {model,live,trace,events}=household([[50,45],[44,45],[56,45]],{box:{left:30,right:90,top:45,bottom:45}});
  assert.equal(model.move('0',{x:38,y:45},'drag',{pointerDrop:true}),false);
  assert.equal(live().activity,'look');assert.equal(live().direction,-1);
  assert.equal(live().target,null);trace();
  assert.equal(events.filter(e=>['move','arrive'].includes(e.type)).length,0);
  assert.equal(live().x,50);assert.equal(live().y,45);
});

test('an exact detour finishes at the released point and every observed foot stays on ground',()=>{
  const walkable=p=>p.x<=53 || p.x>=59 || p.y<=35;
  const {model,live,trace,events}=household([[50,45]],{walkable});
  assert.equal(model.move('0',{x:62,y:45},'drag',{pointerDrop:true}),true);
  assert.ok(live().route.length);
  const positions=trace();
  assert.ok(positions.every(walkable));assert.equal(live().x,62);assert.equal(live().y,45);
  assert.ok(events.some(e=>e.type==='arrive'&&e.source==='drag'));
});

test('an occupied release stops nearby on the original side without entering its neighbor',()=>{
  const box={left:0,right:120,top:45,bottom:45};
  const {model,live,trace,events}=household([[50,45],[78,45]],{box});
  assert.equal(model.move('0',{x:62,y:45},'drag',{pointerDrop:true}),true);
  const positions=trace();
  assert.ok(positions.every(a=>a.x<=58.001 && a.y===45));
  assert.ok(live().x>=57.5);assert.equal(events.filter(e=>e.type==='arrive'&&e.source==='drag').length,1);
});

test('a lateral release near the corner keeps the whole route inside scaled actor bounds',()=>{
  const box={left:0,right:57,top:42,bottom:56};
  const {model,live,trace,events}=household([[49,49],[75,51]],{box,scale:{x:1.8,y:.65}});
  assert.equal(model.move('0',{x:60,y:43},'drag',{pointerDrop:true}),true);
  const endpoint=live().route.at(-1)||live().target;
  assert.ok(endpoint.x>=box.left&&endpoint.x<=box.right&&endpoint.y>=box.top&&endpoint.y<=box.bottom);
  assert.ok(trace().every(p=>p.x>=box.left&&p.x<=box.right&&p.y>=box.top&&p.y<=box.bottom));
  assert.ok(events.some(e=>e.type==='arrive'&&e.source==='drag'));
});

test('long drags can use a long detour around a barrier to reach the original goal',()=>{
  const walkable=p=>p.x<=48||p.x>=64||p.y<=23;
  const {model,live,trace,events}=household([[30,62]],{walkable,scale:{x:1.4,y:.7}});
  assert.equal(model.move('0',{x:82,y:62},'drag',{pointerDrop:true}),true);
  const positions=trace();
  assert.ok(positions.every(walkable));assert.ok(positions.some(p=>p.y<=23));
  assert.equal(live().x,82);assert.equal(live().y,62);
  assert.ok(events.some(e=>e.type==='arrive'&&e.source==='drag'));
});

test('CSS movement on release distinguishes 7px jitter from an 8px drag without a move event',()=>{
  const calls=[];
  const source=readFileSync(path.join(fixture,'home-production-diorama.js'),'utf8');
  const handlers=source.slice(source.indexOf('    function down(e)'),source.indexOf('    function keydown(e)'));
  const context={enabled:true,blocked:()=>false,hit:()=>'0',
    point:e=>({x:e.clientX/2,y:e.clientY/.5}),paint:()=>{},resume:()=>{},
    guide:{visible:()=>false,drag:()=>{}},showGuide:()=>{},stage:{setPointerCapture:()=>{}},
    model:{select:()=>true,selected:()=>'0',move:(key,p,source)=>{calls.push([key,p.x,p.y,source]);return true;}}};
  const {down,up}=runInNewContext('let gesture=null; function clearGesture(){gesture=null;}'+handlers+';({down,up})',context);
  const pointer=x=>({clientX:x,clientY:20,isPrimary:true,button:0,pointerId:1,preventDefault(){}});
  down(pointer(44));up(pointer(51));assert.equal(calls.length,0);
  down(pointer(44));up(pointer(52));assert.deepEqual(calls,[['0',26,40,'drag']]);
});

test('a blocked long release declines a remote endpoint with negligible progress',()=>{
  const {model,live,trace}=household([[35,45]],{walkable:p=>p.x<=40});
  assert.equal(model.move('0',{x:100,y:45},'drag',{pointerDrop:true}),false);
  assert.equal(live().activity,'look');trace();
  assert.equal(live().x,35);
});

test('a substantial partial walk toward a distant blocked goal can cross the 24px correction radius',()=>{
  const {model,live,trace,events}=household([[35,45]],{walkable:p=>p.x<=65});
  assert.equal(model.move('0',{x:100,y:45},'drag',{pointerDrop:true}),true);
  assert.ok(trace().every(p=>p.x<=65));assert.ok(live().x>60);
  assert.ok(events.some(e=>e.type==='arrive'&&e.source==='drag'));
});

test('a long reachable off-grid point wins over a nearer waypoint on the legacy grid',()=>{
  const {model,live,trace}=household([[30.25,30.125]]);
  assert.equal(model.move('0',{x:76.35,y:55.725},'drag',{pointerDrop:true}),true);
  trace();assert.ok(Math.hypot(live().x-76.35,live().y-55.725)<1e-7);
});

function blockedLane(){
  const h=household([[45,48],[65,48]],{box:{left:0,right:120,top:48,bottom:48}});
  const drag=(key,x)=>h.model.move(key,{x,y:48},'drag',{pointerDrop:true});
  return {...h,drag,advance(seconds){
    for(let i=0;i<Math.ceil(seconds/.025);i++){
      h.step();
      const [lead,neighbor]=h.model.snapshot();
      assert.ok(Math.abs(lead.x-neighbor.x)>=20-1e-7);
    }
  }};
}

test('a real foot drop retries the original goal when a neighbor frees its lane',()=>{
  const h=blockedLane();
  assert.equal(h.drag('0',95),false);
  h.advance(.5);assert.equal(h.live().x,45);
  assert.equal(h.drag('1',120),true);
  h.advance(5);assert.equal(h.live().x,95);
  assert.ok(h.events.some(e=>e.actor.key==='0'&&e.type==='arrive'&&e.source==='drag'));
});

for(const stop of ['select','cancel','expiry'])test('a queued foot drop ends on '+stop,()=>{
  const h=blockedLane();
  assert.equal(h.drag('0',95),false);
  if(stop==='expiry')h.advance(13);
  else if(stop==='cancel')h.model.cancel();
  else h.model.select('0');
  assert.equal(h.drag('1',120),true);h.advance(5);
  assert.equal(h.live().x,45);
  assert.ok(!h.events.some(e=>e.type==='move'&&e.actor.key==='0'));
});

test('a legal path in the opposite direction cannot satisfy a horizontal short release',()=>{
  const box={left:0,right:120,top:48,bottom:48};
  const blocked=household([[50,48],[55,48]],{box});
  assert.equal(blocked.model.move('0',{x:64,y:48},'drag',{pointerDrop:true}),false);
  blocked.trace();assert.equal(blocked.live().x,50);assert.equal(blocked.live().direction,1);
  const other=household([[50,48],[55,48]],{box});
  assert.equal(other.model.move('0',{x:36,y:48},'drag',{pointerDrop:true}),true);
  other.trace();assert.equal(other.live().x,36);
});

test('a partial arrival keeps the initial drop goal while a moving neighbor yields',()=>{
  const h=household([[25,48],[70,48]],{box:{left:0,right:120,top:48,bottom:48}});
  const drop=(key,x)=>h.model.move(key,{x,y:48},'drag',{pointerDrop:true});
  assert.equal(drop('0',95),true);
  for(let i=0;i<45;i++)h.step();
  assert.ok(h.live().x>45&&h.live().x<=50.001);
  assert.equal(drop('1',120),true);
  for(let i=0;i<200;i++)h.step();
  assert.equal(h.live().x,95);
});

// The neighbor moves first in the model's live step, after both routes were planned.
function passingNeighbor(start,end,{source='drag',pointerDrop=true,intentAware=true}={}){
  const {model}=household([start,[50,45]],{intentAware});
  assert.equal(model.move('1',{x:90,y:45},source,{pointerDrop}),true);
  assert.equal(model.move('0',{x:end[0],y:end[1]},'drag',{pointerDrop:true}),true);
  model.step(.1,{autonomy:false});
  const [neighbor,walker]=model.snapshot();
  assert.ok(Math.hypot(neighbor.x-end[0],neighbor.y-end[1])<1e-7);
  return walker;
}

test('a moving neighbor can close the middle of a drag step while both ends stay clear',()=>{
  const walker=passingNeighbor([52.1,66.79],[52.1,62.59]);
  assert.equal(walker.x,50);
  assert.equal(walker.target,null);
});

test('a drag step must ease an existing live overlap from its first point',()=>{
  const walker=passingNeighbor([47,62],[50.8,62.55]);
  assert.equal(walker.x,50);
  assert.equal(walker.target,null);
  const escaping=passingNeighbor([47,62],[49.8,62.55]);
  assert.equal(escaping.x,54.2);
});

test('the normal ambient, keyboard and legacy navigation steppers keep their original path',()=>{
  for(const options of [{source:'ambient',pointerDrop:false},{source:'keyboard',pointerDrop:false},{intentAware:false}]){
    const walker=passingNeighbor([52.1,66.79],[52.1,62.59],options);
    assert.equal(walker.x,54.2);
  }
});

test('a pending drop detects changed contact dimensions at the same neighbor foot',()=>{
  const box={left:0,right:120,top:48,bottom:48};
  const h=household([[45,48],[65,48]],{box});
  assert.equal(h.model.move('0',{x:57,y:48},'drag',{pointerDrop:true}),false);
  h.list[1].w=2;
  h.sync();
  assert.equal(h.model.snapshot()[1].x,65);
  for(let i=0;i<100;i++)h.step();
  assert.ok(h.live().x>48.9&&h.live().x<=49);
});

test('a pending drop detects updated actor bounds and mutable ground at the same feet',()=>{
  for(const change of ['bounds','ground']){
    let groundEnd=change==='ground'?45:120;
    const box={left:0,right:change==='bounds'?45:120,top:48,bottom:48};
    const h=household([[45,48]],{box,walkable:p=>p.x<=groundEnd});
    assert.equal(h.model.move('0',{x:57,y:48},'drag',{pointerDrop:true}),false);
    groundEnd=120;box.right=120;
    h.sync();
    for(let i=0;i<110;i++)h.step();
    assert.equal(h.live().x,57,change);
  }
});

test('a shape sync that interrupts an accepted drop resumes walking to its original foot',()=>{
  const h=household([[45,48]]);
  assert.equal(h.model.move('0',{x:75,y:48},'drag',{pointerDrop:true}),true);
  h.step();const previous=h.live().x;
  h.list[0].w=12;
  h.sync();
  assert.equal(h.live().x,previous);
  assert.equal(h.live().target,null);
  for(let i=0;i<140;i++)h.step();
  assert.equal(h.live().x,75);
});

test('a newly open lane cannot revive a canceled, expired, removed-actor or replaced-scene drop',()=>{
  for(const stop of ['cancel','expiry','remove actor','replace navigation']){
    const box={left:0,right:45,top:48,bottom:48},h=household([[45,48]],{box});
    assert.equal(h.model.move('0',{x:57,y:48},'drag',{pointerDrop:true}),false);
    if(stop==='cancel')h.model.cancel();
    if(stop==='expiry')for(let i=0;i<500;i++)h.step();
    if(stop==='remove actor'){const resident=h.list.pop();h.sync();h.list.push(resident);}
    if(stop==='replace navigation')h.scene.navigation={...h.scene.navigation};
    box.right=120;h.sync();
    for(let i=0;i<110;i++)h.step();
    assert.equal(h.live().x,45,stop);
  }
});

test('a corrected foot beyond one requested axis can return to the actual release once a peer leaves',()=>{
  const h=household([[45,45],[70,45]],{box:{left:8,right:110,top:8,bottom:96}});
  const goal={x:74,y:46},drop=(key,p)=>h.model.move(key,p,'drag',{pointerDrop:true});
  assert.equal(drop('0',goal),true);
  const corrected=h.live().route.at(-1)||h.live().target;
  assert.ok(corrected.x>goal.x||corrected.y>goal.y);
  for(let i=0;i<120;i++)h.step();
  assert.ok(Math.hypot(h.live().x-corrected.x,h.live().y-corrected.y)<1e-6);
  assert.equal(drop('1',{x:95,y:80}),true);
  for(let i=0;i<240;i++)h.step();
  assert.ok(Math.hypot(h.live().x-goal.x,h.live().y-goal.y)<1e-6);
});

test('a partial arrival still several screen pixels from the release remains retryable',()=>{
  const h=household([[45,48],[75,48]],{scale:{x:2.25,y:.75},box:{left:0,right:120,top:48,bottom:48}});
  const drop=(key,x)=>h.model.move(key,{x,y:48},'drag',{pointerDrop:true});
  assert.equal(drop('0',57.5),true);
  for(let i=0;i<60;i++)h.step();
  const miss=57.5-h.live().x;
  assert.ok(miss<3&&miss*2.25>4);
  assert.equal(drop('1',105),true);
  for(let i=0;i<180;i++)h.step();
  assert.equal(h.live().x,57.5);
});
