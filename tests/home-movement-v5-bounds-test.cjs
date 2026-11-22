const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const model=require('../home-production-model.js');

function node(){return {
 style:{setProperty(k,v){this[k]=v;},removeProperty(k){delete this[k];}},dataset:{},children:[],attrs:{},listeners:{},isConnected:true,
 classList:{add(){},remove(){},toggle(){},contains(){return false;}},
 setAttribute(k,v){this.attrs[k]=v;},getAttribute(k){return this.attrs[k]??null;},removeAttribute(k){delete this.attrs[k];},
 appendChild(n){this.children.push(n);n.parentNode=this;},remove(){this.isConnected=false;},
 addEventListener(k,fn){this.listeners[k]=fn;},removeEventListener(k){delete this.listeners[k];},querySelector(){return null;},querySelectorAll(){return [];},closest(){return null;},
 getBoundingClientRect(){return {left:0,top:0,width:350,height:380};},
};}
async function envelope(expanded,count=1){
 const stage=node(),doc=node();doc.body=node();doc.body.dataset={homeDisplayVersion:'18',homeViewportVersion:'12'};doc.visibilityState='visible';doc.createElement=()=>node();doc.getElementById=()=>null;
 const legacy={valid:p=>p.x>=140&&p.x<=230&&p.y>=200&&p.y<=300,depthScale:p=>.8+p.y/1000,nearest:p=>p,unproject:p=>({x:p.x,z:p.y}),project:p=>({x:p.x,y:p.z})};
 const navigation=expanded?{...legacy,layoutNavigation:legacy,valid:()=>true}:legacy;
 const testWorld={navigation:()=>navigation,stats:()=>({projectionRevision:1,renderer:{objects:0}}),occlusion:()=>[],setEnvironment(){},destroy(){}};
 const module={exports:{}};
 const source=fs.readFileSync('home-production-diorama.js','utf8').replace(/import\('\.\/home-production-world\.mjs\?[^']+'\)/,'Promise.resolve({createHomeWorld:()=>testWorld})');
 vm.runInNewContext(source,{module,testWorld});
 const env={NaotocchiHomeDioramaModel:model,matchMedia:()=>({matches:false,addEventListener(){},removeEventListener(){}}),requestAnimationFrame:()=>1,cancelAnimationFrame(){},NaotocchiHomeViewport:{residentPresentation:()=>({landscape:false,x:0,y:0,scaleX:1,scaleY:1,bodyScale:1,bodyScaleLimit:1})}};
 const actors=Array.from({length:count},(_,i)=>{
  const owner=node(),h=count===1?75:25+i*2,w=h*.8,kind=count===1?'companion':i===0?'pet':i===27?'partner':'companion';
  owner.style.height=h+'px';owner.style.top=(250-h)+'px';
  return {key:kind+':'+i,kind,id:String(i),owner,node:owner,x:175,y:250,w,h,extent:{top:h,left:w/2,right:w/2+(i%3)*8}};
 });
 const controller=module.exports.createController({stage,document:doc,env,getActors:()=>actors,getMeguru:()=>({})});
 try{controller.update({region:'city'});await Promise.resolve();await Promise.resolve();assert.notEqual(stage.dataset.worldRenderer,'unavailable',stage.dataset.worldError);assert.ok(stage.__homeResidentEnvelope);return JSON.parse(JSON.stringify({resident:stage.__homeResidentEnvelope,paint:stage.__homePaintEnvelope,actor:controller.model.snapshot()[0],sizes:actors.map(a=>[a.w,a.h,a.owner.style.height])}));}
 finally{controller.destroy();}
}

for(const count of [1,28])test(`added walking ground does not refit the existing camera or body envelope (${count} residents)`,async()=>{
 const before=await envelope(false,count),after=await envelope(true,count);
 assert.deepEqual(after.resident,before.resident,'resident envelope must use original layout navigation, not the added floor');
 assert.deepEqual(after.paint,before.paint,'paint fit keeps the existing depth and body reservation');
 assert.deepEqual(after.sizes,before.sizes,'artwork and CSS height remain unchanged');
 assert.equal(after.actor.x,before.actor.x);assert.equal(after.actor.y,before.actor.y);
});

test('presentation changes refresh painted-ground navigation even when the presentation key is unchanged',async()=>{
 const stage=node(),doc=node(),owner=node();doc.body=node();doc.body.dataset={homeDisplayVersion:'18',homeViewportVersion:'12'};doc.visibilityState='visible';doc.createElement=()=>node();doc.getElementById=()=>null;
 owner.style.height='75px';owner.style.top='175px';
 const legacy={valid:()=>true,depthScale:()=>1,nearest:p=>p,unproject:p=>({x:p.x,z:p.y}),project:p=>({x:p.x,y:p.z})};
 let nav={...legacy,layoutNavigation:legacy},calls=0,syncedNavigation,syncs=0;
 const testWorld={navigation:()=>{calls++;return nav;},observationPoints:n=>[{x:n===nav?201:101,y:220}],stats:()=>({projectionRevision:1,renderer:{objects:0}}),occlusion:()=>[],setEnvironment(){},destroy(){}};
 const module={exports:{}},source=fs.readFileSync('home-production-diorama.js','utf8').replace(/import\('\.\/home-production-world\.mjs\?[^']+'\)/,'Promise.resolve({createHomeWorld:()=>testWorld})');vm.runInNewContext(source,{module,testWorld});
 const presentation={landscape:false,x:0,y:0,scaleX:1,scaleY:1,bodyScale:1,bodyScaleLimit:1};
 const instrumentedModel={...model,createModel(options){const m=model.createModel(options),sync=m.sync;m.sync=(actors,scene)=>{syncedNavigation=scene.navigation;syncs++;return sync(actors,scene);};return m;}};
 const env={NaotocchiHomeDioramaModel:instrumentedModel,matchMedia:()=>({matches:false,addEventListener(){},removeEventListener(){}}),requestAnimationFrame:()=>1,cancelAnimationFrame(){},NaotocchiHomeViewport:{residentPresentation:()=>presentation}};
 const actor={key:'companion:test',kind:'companion',id:'test',owner,node:owner,x:175,y:250,w:60,h:75,extent:{top:75,left:30,right:30}};
 const controller=module.exports.createController({stage,document:doc,env,getActors:()=>[actor],getMeguru:()=>({})});
 try{
  controller.update({region:'city'});await Promise.resolve();await Promise.resolve();assert.notEqual(stage.dataset.worldRenderer,'unavailable',stage.dataset.worldError);
  stage.listeners['home-presentation']();
  const fixedEnvelope=JSON.stringify(stage.__homeResidentEnvelope),before=calls,beforeSync=syncs;
  // The painted background may change its inverse transform without changing
  // scale/safe-area fields in the presentation key (for example its offset).
  nav={...legacy,layoutNavigation:legacy,valid:p=>p.x!==230};
  stage.listeners['home-presentation']();
  assert.equal(calls,before+1,'every presentation event re-reads the cached world navigation');
  assert.ok(syncs>beforeSync,'a new navigation identity refreshes the model even with the same presentation key');
  assert.equal(syncedNavigation,nav);assert.equal(syncedNavigation.valid({x:230,y:250}),false,'updated painted-ground exclusion reaches the movement model');
  presentation.scaleX=1.2;nav={...legacy,layoutNavigation:legacy,valid:p=>p.x!==240};stage.listeners['home-presentation']();
  assert.equal(syncedNavigation,nav);assert.equal(syncedNavigation.valid({x:240,y:250}),false);
  assert.equal(JSON.stringify(stage.__homeResidentEnvelope),fixedEnvelope,'refreshing movement navigation does not refit the camera');
 }finally{controller.destroy();}
});

test('growth waits for the camera to consume its new envelope before correcting a safe foot',async()=>{
 const stage=node(),doc=node(),owner=node(),frame=node();doc.body=node();doc.body.dataset={homeDisplayVersion:'18',homeViewportVersion:'12'};doc.visibilityState='visible';doc.createElement=()=>node();doc.getElementById=()=>null;
 frame.getBoundingClientRect=()=>({left:0,right:350,top:0,bottom:400});stage.closest=()=>frame;
 const presentation={landscape:false,x:0,y:0,scaleX:1,scaleY:.5,bodyScale:1,bodyScaleLimit:1};
 const navigation={valid:()=>true,depthScale:()=>1,nearest:p=>p,unproject:p=>({x:p.x,z:p.y}),project:p=>({x:p.x,y:p.z})};
 const cameraDraws=[];
 const testWorld={draw(dt){cameraDraws.push(dt);},navigation:()=>navigation,stats:()=>({projectionRevision:1,renderer:{objects:0}}),occlusion:()=>[],setEnvironment(){},destroy(){}};
 const module={exports:{}},source=fs.readFileSync('home-production-diorama.js','utf8').replace(/import\('\.\/home-production-world\.mjs\?[^']+'\)/,'Promise.resolve({createHomeWorld:()=>testWorld})');vm.runInNewContext(source,{module,testWorld});
 let requested=0,nextFrame;stage.dispatchEvent=e=>{if(e.type==='home-paint-envelope')requested++;};
 const env={NaotocchiHomeDioramaModel:model,CustomEvent:class{constructor(type){this.type=type;}},matchMedia:()=>({matches:false,addEventListener(){},removeEventListener(){}}),visualViewport:{scale:1},requestAnimationFrame:fn=>{nextFrame=fn;return 1;},cancelAnimationFrame(){},NaotocchiHomeViewport:{residentPresentation:()=>presentation}};
 owner.style.height='50px';owner.style.top='200px';
 const a={key:'companion:test',kind:'companion',id:'test',owner,node:owner,x:175,y:250,w:60,h:50,extent:{top:50,left:30,right:30}};
 const controller=module.exports.createController({stage,document:doc,env,getActors:()=>[a],getMeguru:()=>({})});
 try{
  controller.update({region:'city'});await Promise.resolve();await Promise.resolve();stage.listeners['home-presentation']();
  const before=controller.model.snapshot()[0];assert.equal(before.y,250);const requests=requested;
  a.h=150;a.extent.top=150;owner.style.height='150px';owner.style.top='100px';controller.sync();assert.ok(requested>requests,'growth requests the existing camera fit update');
  assert.equal(controller.model.snapshot()[0].y,before.y,'do not commit a correction using new ink and the old camera');
  presentation.scaleY=1;stage.listeners['home-presentation']();
  assert.equal(controller.model.snapshot()[0].y,before.y,'the same foot is legal under the settled camera');
  assert.ok(controller.model.bounds(controller.model.snapshot()[0]).top<before.y);
  // A genuinely unsafe final presentation must still apply the unchanged bounds.
  presentation.scaleY=.5;stage.listeners['home-presentation']();
  const after=controller.model.snapshot()[0];assert.ok(after.y>before.y);assert.equal(after.y,controller.model.bounds(after).top);
  // Touch intentionally skips its camera fit while pinch-zoomed. That must
  // not strand the resident if zoom begins after the envelope was requested.
  a.h=140;a.extent.top=140;owner.style.height='140px';controller.sync();
  env.visualViewport.scale=2;nextFrame(1000);
  a.h=130;a.extent.top=130;owner.style.height='130px';controller.sync();
  assert.equal(controller.model.snapshot()[0].h,130,'a skipped zoom fit must not freeze later syncs');
  env.visualViewport.scale=1;stage.listeners['home-presentation']();
  // Change the actual frame axes at the same time as the next measured shape.
  a.h=125;a.extent.top=125;owner.style.height='125px';
  presentation.scaleX=1.25;cameraDraws.length=0;stage.listeners['home-presentation']();
  const [paintX,paintY]=owner.style.scale.split(' ').map(Number);
  assert.equal(cameraDraws.at(-1),0,'the camera event paints its backdrop before the next simulation frame');
  assert.ok(Math.abs(paintX*presentation.scaleX-paintY*presentation.scaleY)<1e-8,'the pending resident paint compensates both camera axes');
  stage.listeners['home-presentation']();
  a.h=120;a.extent.top=120;owner.style.height='120px';controller.sync();
  controller.update({region:'unsupported'});controller.update({region:'city'});
  assert.equal(controller.model.snapshot().length,1,'exit/reentry clears a pending presentation before the next camera event');
  await Promise.resolve();await Promise.resolve();stage.listeners['home-presentation']();
 }finally{controller.destroy();}
});
