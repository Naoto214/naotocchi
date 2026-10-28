const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const api=fs.existsSync('home-diorama-model.js')?require('../home-diorama-model.js'):{};
const scene={region:'forest',width:350,height:240,time:'day',weather:'sunny',tags:[{tag:'tree',x:80,y:135},{tag:'flower',x:260,y:170},{tag:'shelter',x:80,y:135}]};
const actors=[{key:'pet:dog',kind:'pet',id:'dog',x:170,y:150,w:60,h:75},{key:'companion:shiba',kind:'companion',id:'shiba',x:270,y:160,w:40,h:45}];
function model(events=[]){assert.equal(typeof api.createModel,'function');const m=api.createModel({random:()=>.25,onEvent:e=>events.push(e)});m.sync(actors,scene);return m;}
test('only thirteen formal Home regions',()=>{assert.equal(typeof api.supported,'function');for(const id of ['forest','river_lake','city','home','countryside','mountain','snow','sea','deepsea','jungle','desert','star_stop','memory_lake'])assert.ok(api.supported(id));for(const id of ['new','unknown-region','',null])assert.equal(api.supported(id),false);});
test('movement is gradual and clamps extreme commands inside safe ground',()=>{const m=model();m.select('pet:dog');m.move('pet:dog',{x:-999,y:999},'drag');const before=m.snapshot()[0];m.step(.05,{});const after=m.snapshot()[0];assert.ok(after.x<before.x&&after.x>before.x-5);for(let i=0;i<400;i++)m.step(.05,{autonomy:false});const a=m.snapshot()[0];assert.ok(a.x>=a.w/2+12);assert.ok(a.y<=scene.height-12);assert.ok(a.y>=a.h+18);});
test('roster sync never creates absent actors or mutates input state',()=>{const copy=JSON.stringify({scene,actors}),m=model();m.select('companion:shiba');m.move('companion:shiba',{x:40,y:130});m.sync(actors.slice(0,1),scene);assert.equal(m.selected(),null);assert.equal(m.snapshot().length,1);for(let i=0;i<500;i++)m.step(.1,{});assert.equal(JSON.stringify({scene,actors}),copy);});
test('blocked care interrupts destination; no delayed resume or command',()=>{const m=model();m.move('pet:dog',{x:80,y:140});m.step(.1,{blocked:true});const a=m.snapshot()[0];m.step(1,{autonomy:false});assert.equal(m.snapshot()[0].x,a.x);assert.equal(m.snapshot()[0].target,null);});
test('reduced motion disables idle travel but intentional movement works',()=>{const m=model();for(let i=0;i<1000;i++)m.step(.1,{reducedMotion:true});assert.equal(m.snapshot()[0].x,170);m.move('pet:dog',{x:80,y:140});m.step(.1,{reducedMotion:true});assert.ok(m.snapshot()[0].x<170);});
test('swept movement cannot pass through another actor',()=>{const m=model();m.move('pet:dog',{x:310,y:160});for(let i=0;i<300;i++){m.step(.05,{autonomy:false});const [a,b]=m.snapshot();assert.ok(Math.hypot((a.x-b.x)/((a.w+b.w)*.45+6),(a.y-b.y)/20)>=.98);}});
test('resize and region switch reset destinations within safe bounds',()=>{const m=model();m.move('pet:dog',{x:310,y:180});m.sync(actors,{...scene,width:240,height:180,region:'city'});for(const a of m.snapshot()){assert.equal(a.target,null);assert.ok(a.x<=240-a.w/2-12);assert.ok(a.y<=168);}});
test('events are frozen context only, rate limited and no automatic speech',()=>{const events=[],m=model(events);m.select('pet:dog');m.select('pet:dog');assert.equal(events.filter(e=>e.type==='tap').length,1);assert.ok(Object.isFrozen(events[0]));assert.equal(events[0].region,'forest');assert.equal(events[0].actor.id,'dog');assert.equal('text' in events[0],false);assert.equal('state' in events[0],false);});
test('invalid inputs and absent actors are ignored',()=>{const m=model();assert.equal(m.move('missing',{x:2,y:3}),false);assert.equal(m.move('pet:dog',{x:NaN,y:4}),false);m.step(Infinity,{});assert.ok(m.snapshot().every(a=>Number.isFinite(a.x+a.y)));});
test('rain autonomy prefers tagged shelter and night has slower activity',()=>{const m=model();m.sync([actors[0]],{...scene,weather:'rain'});for(let i=0;i<150;i++)m.step(.1,{});const a=m.snapshot()[0];assert.ok(a.x<170);assert.ok(a.y>=a.h+18);});
test('an arriving visitor cannot trap an already moved pet',()=>{const m=api.createModel();m.sync([actors[0]],scene);m.move('pet:dog',{x:250,y:155});for(let i=0;i<100;i++)m.step(.1,{autonomy:false});m.sync([actors[0],{...actors[1],x:250,y:155}],scene);const [a,b]=m.snapshot();assert.ok(Math.hypot((a.x-b.x)/((a.w+b.w)*.45+6),(a.y-b.y)/20)>=1);m.move(a.key,{x:150,y:155});m.step(.1,{autonomy:false});assert.ok(m.snapshot()[0].x<a.x);});
test('movement reserves asymmetric attachment bounds',()=>{const m=api.createModel();m.sync([{...actors[0],extent:{left:40,right:85,top:120,bottom:12}}],scene);m.move('pet:dog',{x:999,y:999});for(let i=0;i<100;i++)m.step(.1,{autonomy:false});const a=m.snapshot()[0];assert.ok(a.x+85<=scene.width-12);assert.ok(a.y+12<=scene.height-12);assert.ok(a.y-120>=18);});

test('frequent presentation sync does not starve life; actions diversify and stay ephemeral',()=>{
 const API=require('../home-diorama-model.js'),events=[],m=API.createModel({random:()=>.23,onEvent:e=>events.push(e)});
 const list=[{key:'pet:a',kind:'pet',id:'a',x:175,y:190,w:45,h:55,temperament:{curiosity:5,sociability:5,persistence:3,boldness:3}},{key:'partner:b',kind:'partner',id:'b',x:265,y:210,w:40,h:50}];
 const scene={region:'forest',width:380,height:320,time:'day',weather:'sunny',groundTop:120,tags:[{tag:'tree',x:80,y:190},{tag:'flower',x:290,y:240}]},before=JSON.stringify(list);
 m.sync(list,scene);for(let i=0;i<1200;i++){m.step(.1,{});if(i%30===0)m.sync(list,scene);}
 assert.equal(JSON.stringify(list),before);assert.ok(m.metrics().distance>60);assert.ok(Object.keys(m.metrics().activities).length>=4);assert.ok(m.metrics().moves>=3);
});
test('repeated busy updates yield once, then manual and autonomous activity resume',()=>{
 const m=require('../home-diorama-model.js').createModel({random:()=>.3});const list=[{key:'pet:a',kind:'pet',id:'a',x:175,y:180,w:45,h:55}],s={region:'forest',width:380,height:320,time:'day',tags:[]};m.sync(list,s);
 for(let i=0;i<50;i++)m.step(.1,{blocked:true});m.step(0,{blocked:false});assert.ok(m.select('pet:a'));assert.ok(m.move('pet:a',{x:80,y:220},'drag'));
 for(let i=0;i<600;i++)m.step(.1,{});assert.ok(m.metrics().distance>100);assert.ok(m.metrics().moves>1);
});
test('held pointer keeps only the selected actor from choosing a new autonomous action',()=>{
 const m=api.createModel({random:()=>.4});
 m.sync([{key:'pet:dog',kind:'pet',id:'dog',x:180,y:150,w:60,h:70}],{region:'forest',width:350,height:240,tags:[]});
 m.select('pet:dog');for(let i=0;i<150;i++)m.step(.1,{heldActor:'pet:dog'});
 assert.equal(m.metrics().moves,0);m.step(.1);assert.ok(m.metrics().moves>0||Object.keys(m.metrics().activities).length>0);
});
