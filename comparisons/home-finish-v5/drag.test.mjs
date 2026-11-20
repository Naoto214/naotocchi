import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {createTerrainNavigation} from '../../home-route-navigation.mjs';
const require=createRequire(import.meta.url);
const {createModel}=require('../../home-production-model.js');

function household(points,{walkable=()=>true,scale={x:1,y:1},box={left:0,right:120,top:0,bottom:100}}={}){
  const events=[],model=createModel({random:()=>.5,onEvent:e=>events.push(e)});
  const nav=createTerrainNavigation({width:120,height:100,cell:4,gridOrigin:{x:0,y:0},
    project:p=>p,unproject:p=>({...p,z:p.y}),walkable,
    segmentWalkable:(a,b)=>{
      const steps=Math.ceil(Math.hypot(b.x-a.x,b.y-a.y)*8);
      for(let i=1;i<=steps;i++)if(!walkable({x:a.x+(b.x-a.x)*i/steps,y:a.y+(b.y-a.y)*i/steps}))return false;
      return true;
    }});
  nav.intentAware=true;
  nav.intentScale=scale;
  let seating=true;
  const list=points.map(([x,y],i)=>({key:String(i),kind:i?'companion':'pet',x,y,w:10,h:10}));
  model.sync(list,{region:'forest',width:120,height:100,navigation:nav,actorBounds:()=>box,
    visible:(p,a)=>!seating || (p.x===list[a.key].x && p.y===list[a.key].y)});
  seating=false;
  model.select('0');
  const live=()=>model.snapshot()[0];
  const step=()=>model.step(.025,{autonomy:false});
  const trace=()=>{const positions=[];for(let i=0;i<500;i++){step();positions.push(live());}return positions;};
  return {model,live,step,trace,events};
}

test('a crowded opening allows a short step that continuously escapes its initial overlap',()=>{
  const {model,live,trace,events}=household([[50,45],[44,45]]);
  assert.equal(model.move('0',{x:60,y:45},'drag'),true);
  assert.equal(live().x,50);
  const positions=trace();
  assert.ok(positions.every((a,i)=>a.x>=(i?positions[i-1].x:50) && a.x<=60.001));
  assert.equal(live().x,60);
  assert.equal(events.filter(e=>e.type==='arrive'&&e.source==='drag').length,1);
});

test('a blocked drag faces the release and shows the existing look without a later surprise walk',()=>{
  const {model,live,trace,events}=household([[50,45],[44,45],[56,45]],{box:{left:30,right:90,top:45,bottom:45}});
  assert.equal(model.move('0',{x:38,y:45},'drag'),false);
  assert.equal(live().activity,'look');assert.equal(live().direction,-1);
  assert.equal(live().target,null);trace();
  assert.equal(events.filter(e=>['move','arrive'].includes(e.type)).length,0);
  assert.equal(live().x,50);assert.equal(live().y,45);
});

test('an exact detour finishes at the released point and every observed foot stays on ground',()=>{
  const walkable=p=>p.x<=53 || p.x>=59 || p.y<=35;
  const {model,live,trace,events}=household([[50,45]],{walkable});
  assert.equal(model.move('0',{x:62,y:45},'drag'),true);
  assert.ok(live().route.length);
  const positions=trace();
  assert.ok(positions.every(walkable));assert.equal(live().x,62);assert.equal(live().y,45);
  assert.ok(events.some(e=>e.type==='arrive'&&e.source==='drag'));
});

test('an occupied release stops nearby on the original side without entering its neighbor',()=>{
  const box={left:0,right:120,top:45,bottom:45};
  const {model,live,trace,events}=household([[50,45],[78,45]],{box});
  assert.equal(model.move('0',{x:62,y:45},'drag'),true);
  const positions=trace();
  assert.ok(positions.every(a=>a.x<=58.001 && a.y===45));
  assert.ok(live().x>=57.5);assert.equal(events.filter(e=>e.type==='arrive'&&e.source==='drag').length,1);
});

test('a lateral release near the corner keeps the whole route inside scaled actor bounds',()=>{
  const box={left:0,right:57,top:42,bottom:56};
  const {model,live,trace,events}=household([[49,49],[75,51]],{box,scale:{x:1.8,y:.65}});
  assert.equal(model.move('0',{x:60,y:43},'drag'),true);
  const endpoint=live().route.at(-1)||live().target;
  assert.ok(endpoint.x>=box.left&&endpoint.x<=box.right&&endpoint.y>=box.top&&endpoint.y<=box.bottom);
  assert.ok(trace().every(p=>p.x>=box.left&&p.x<=box.right&&p.y>=box.top&&p.y<=box.bottom));
  assert.ok(events.some(e=>e.type==='arrive'&&e.source==='drag'));
});

test('long drags can use a long detour around a barrier to reach the original goal',()=>{
  const walkable=p=>p.x<=48||p.x>=64||p.y<=23;
  const {model,live,trace,events}=household([[30,62]],{walkable,scale:{x:1.4,y:.7}});
  assert.equal(model.move('0',{x:82,y:62},'drag'),true);
  const positions=trace();
  assert.ok(positions.every(walkable));assert.ok(positions.some(p=>p.y<=23));
  assert.equal(live().x,82);assert.equal(live().y,62);
  assert.ok(events.some(e=>e.type==='arrive'&&e.source==='drag'));
});
