const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const api=fs.existsSync('home-diorama.js')?require('../home-diorama.js'):{};
const model=require('../home-diorama-model.js');
const {harness}=require('./helpers/runtime-harness.cjs');
test('landmarks use the real Meguru profile and stage bounds',()=>{
 assert.equal(typeof api.sceneFor,'function');const h=harness({deterministic:true});
 for(const region of ['forest','river_lake','city']){
  const p=h.api.meguruMod.REGION3D[region],s=api.sceneFor({region,season:'summer',time:'day',weather:'sunny'},350,240,p,h.api.meguruMod.WORLDS[region]);
  assert.equal(s.crown,p.foliage.crown[1]);assert.equal(s.water,p.water.shallow);
  assert.ok(s.tags.every(t=>t.x>=0&&t.x<=350&&t.y<=186));
  assert.ok(s.tags.some(t=>t.tag==='shelter'));
  assert.equal(api.landscape,undefined,'old translucent SVG landscape is removed');
 }
});
function node(){return {style:{setProperty(k,v){this[k]=v;},removeProperty(k){delete this[k];}},dataset:{},children:[],attrs:{},classList:{add(){},remove(){},toggle(){}},isConnected:true,
 setAttribute(k,v){this.attrs[k]=v;},removeAttribute(k){delete this.attrs[k];},getAttribute(k){return this.attrs[k]??null;},appendChild(n){this.children.push(n);n.parentNode=this;},remove(){this.isConnected=false;},
 listeners:{},addEventListener(k,f){this.listeners[k]=f;},removeEventListener(k){delete this.listeners[k];},setPointerCapture(){},releasePointerCapture(){},
 getBoundingClientRect(){return {x:0,y:0,left:0,top:0,width:350,height:240};},querySelector(){return null;},closest(){return null;}};}
function setup({region='forest',poops=0}={}){
 assert.equal(typeof api.createController,'function');const stage=node(),doc=node(),owner=node(),events=[],raf=new Map();let serial=0,hidden=false,blocked=false;
 doc.createElement=()=>node();Object.defineProperty(doc,'visibilityState',{get:()=>hidden?'hidden':'visible'});
 const poop=node();for(let i=0;i<poops;i++)poop.appendChild(node());doc.getElementById=id=>id==='poopRow'?poop:null;
 const env={NaotocchiHomeDioramaModel:model,matchMedia:()=>({matches:false,addEventListener(){},removeEventListener(){}}),requestAnimationFrame:f=>{raf.set(++serial,f);return serial;},cancelAnimationFrame:id=>raf.delete(id),CustomEvent:class{constructor(t,v){this.type=t;this.detail=v.detail;}}};
 let actors=[{key:'pet:dog',kind:'pet',id:'dog',node:owner,owner,x:170,y:145,w:60,h:75,baseX:140,baseY:70}];
 stage.dispatchEvent=e=>events.push(e);const c=api.createController({stage,document:doc,env,getActors:()=>actors,isBlocked:()=>blocked,onGesture:()=>{},onPosition:()=>{}});
 if(region)c.update({region,width:350,height:240,season:'summer',weather:'sunny',time:'day'},{});
 return {stage,doc,owner,c,raf,events,poop,setHidden:v=>{hidden=v;doc.listeners.visibilitychange();},setBlocked:v=>blocked=v,setActors:v=>actors=v};
}
test('interrupt before a terrain scene exists leaves the legacy poop row untouched',()=>{
 for(const region of [null,'unsupported-qa-region']){
  const h=setup({region,poops:4}),before=JSON.stringify(h.poop.children.map(n=>n.style));
  assert.doesNotThrow(()=>h.c.interrupt(),'care/conversation can interrupt an inactive controller');
  assert.doesNotThrow(()=>h.setHidden(true),'backgrounding before terrain initialization is safe');
  assert.equal(JSON.stringify(h.poop.children.map(n=>n.style)),before);
  assert.equal(h.poop.dataset.groundKey,undefined);assert.equal(h.raf.size,0);h.c.destroy();
 }
});
test('leaving terrain preserves legacy poop visibility through interruption and permits reentry',()=>{
 const h=setup({poops:4});assert.ok(h.poop.children.every(n=>n.style.visibility==='visible'));
 h.c.update({region:'unsupported-qa-region'});const before=JSON.stringify(h.poop.children.map(n=>n.style));
 h.c.interrupt();
 assert.equal(JSON.stringify(h.poop.children.map(n=>n.style)),before,'inactive paint must not hide or reposition the legacy row');
 h.setHidden(true);assert.equal(JSON.stringify(h.poop.children.map(n=>n.style)),before,'backgrounding preserves the legacy row');h.setHidden(false);
 assert.equal(h.poop.dataset.groundKey,undefined);
 h.c.update({region:'forest'});assert.ok(h.poop.children.every(n=>n.style.visibility==='visible'&&n.style.left&&n.style.top));
 assert.ok(h.poop.dataset.groundKey);h.c.destroy();
});
test('tap selects, release after drag sets destination without teleport',()=>{
 const h=setup(),pointer=(x,y)=>({pointerId:1,isPrimary:true,button:0,clientX:x,clientY:y,target:h.owner,preventDefault(){}});
 h.stage.listeners.pointerdown(pointer(170,120));h.stage.listeners.pointerup(pointer(170,120));assert.equal(h.c.model.selected(),'pet:dog');
 h.stage.listeners.pointerdown(pointer(170,120));h.stage.listeners.pointermove(pointer(80,160));h.stage.listeners.pointerup(pointer(80,160));
 const a=h.c.model.snapshot()[0];assert.equal(a.x,170);assert.ok(a.target.x<170);
});
test('cancel and lost capture never dispatch a movement',()=>{for(const type of ['pointercancel','lostpointercapture']){const h=setup();const p={pointerId:1,isPrimary:true,clientX:170,clientY:120,target:h.owner,preventDefault(){}};h.stage.listeners.pointerdown(p);h.stage.listeners.pointermove({...p,clientX:60});h.stage.listeners[type](p);assert.equal(h.c.model.snapshot()[0].target,null);}});
test('hidden document cancels RAF and destination, visible resumes without catchup',()=>{const h=setup();h.c.model.move('pet:dog',{x:60,y:160});assert.ok(h.raf.size);h.setHidden(true);assert.equal(h.raf.size,0);assert.equal(h.c.model.snapshot()[0].target,null);h.setHidden(false);assert.equal(h.raf.size,1);h.c.destroy();assert.equal(h.raf.size,0);});
test('Pilot exit restores original actor styles and input ownership',()=>{const h=setup();h.c.update({region:'unsupported-qa-region'},{});assert.equal(h.stage.dataset.diorama,undefined);assert.equal(h.owner.style.translate,'');assert.equal(h.owner.getAttribute('role'),null);});
test('departed actor cannot receive stale drag release',()=>{const h=setup();const p={pointerId:1,isPrimary:true,clientX:170,clientY:120,target:h.owner,preventDefault(){}};h.stage.listeners.pointerdown(p);h.setActors([]);h.c.sync();h.stage.listeners.pointerup({...p,clientX:60});assert.equal(h.c.model.snapshot().length,0);});
test('leaving a paused Pilot removes all animation pause state',()=>{const h=setup();h.setBlocked(true);h.c.update({region:'forest'},{});assert.equal(h.stage.dataset.dioramaPaused,'true');h.c.update({region:'unsupported-qa-region'},{});assert.equal(h.stage.dataset.dioramaPaused,undefined);assert.equal(h.stage.dataset.dioramaReduced,undefined);});
test('a 15-second held drag survives repeated normal render updates without autonomous movement',()=>{
 const h=setup(),p={pointerId:1,isPrimary:true,button:0,clientX:170,clientY:120,target:h.owner,preventDefault(){}};
 h.stage.listeners.pointerdown(p);const before=h.c.model.snapshot()[0];
 for(let i=1;i<=160;i++){const callbacks=[...h.raf.values()];h.raf.clear();for(const f of callbacks)f(i*100);h.c.update({region:'forest',width:350,height:240,season:'summer',weather:'sunny',time:'day'},{});}
 const after=h.c.model.snapshot()[0];assert.equal(after.x,before.x);assert.equal(after.y,before.y);assert.equal(after.target,null);assert.equal(h.c.model.metrics().moves,0);
 h.stage.listeners.pointermove({...p,clientX:80,clientY:160});h.stage.listeners.pointerup({...p,clientX:80,clientY:160});assert.ok(h.c.model.snapshot()[0].target);h.c.destroy();
});
test('explicit visible actor target wins over a foreground actor padded touch area',()=>{
 const h=setup(),back=node(),front=node();h.setActors([{key:'pet:back',kind:'pet',id:'back',owner:back,node:back,x:160,y:150,w:10,h:10},{key:'companion:front',kind:'companion',id:'front',owner:front,node:front,x:160,y:170,w:10,h:10}]);h.c.sync();
 h.stage.listeners.pointerdown({pointerId:1,isPrimary:true,button:0,clientX:160,clientY:145,target:back,preventDefault(){}});
 assert.equal(h.c.model.selected(),'pet:back');h.c.destroy();
});
test('first-use guide persists on cancelled gesture and collapses only on successful actor drag; replay works',()=>{
 const h=setup(),hint=h.stage.children.find(n=>n.className==='diorama-hint');assert.equal(hint.hidden,false);
 const p={pointerId:1,isPrimary:true,button:0,clientX:170,clientY:120,target:h.owner,preventDefault(){}};
 h.stage.listeners.pointerdown(p);h.stage.listeners.pointermove({...p,clientX:80});h.stage.listeners.pointercancel(p);assert.equal(hint.hidden,false);
 h.stage.listeners.pointerdown(p);h.stage.listeners.pointerup(p);assert.equal(hint.hidden,false);
 h.stage.listeners.pointerdown(p);h.stage.listeners.pointermove({...p,clientX:80,clientY:160});h.stage.listeners.pointerup({...p,clientX:80,clientY:160});assert.equal(hint.hidden,false,'first walk retains guide row until arrival');
 for(let i=0;i<300;i++)h.c.model.step(.1,{autonomy:false});h.c.sync();assert.equal(hint.hidden,true);
 h.c.replayGuide();assert.equal(hint.hidden,false);h.c.dismissGuide();assert.equal(hint.hidden,true);h.c.destroy();
});
test('transparent padding of foreground PNG does not steal a visible visitor tap',()=>{
 const h=setup(),back=node(),front=node();h.setActors([{key:'pet:front',kind:'pet',id:'front',owner:front,node:front,x:170,y:210,w:60,h:75},{key:'partner:back',kind:'partner',id:'back',owner:back,node:back,x:150,y:125,w:50,h:50}]);h.c.sync();
 h.stage.listeners.pointerdown({pointerId:1,isPrimary:true,button:0,clientX:150,clientY:90,target:front,preventDefault(){}});
 assert.equal(h.c.model.selected(),'partner:back');h.c.destroy();
});
test('keyboard selects and moves the focused actor without pointer coordinates',()=>{
 const h=setup(),visitor=node();h.setActors([{key:'pet:dog',kind:'pet',id:'dog',node:h.owner,owner:h.owner,x:170,y:145,w:60,h:75},{key:'companion:shiba',kind:'companion',id:'shiba',node:visitor,owner:visitor,x:90,y:145,w:30,h:40}]);h.c.sync();
 h.stage.listeners.keydown({key:'Enter',target:visitor,preventDefault(){}});assert.equal(h.c.model.selected(),'companion:shiba');
 h.stage.listeners.keydown({key:'ArrowRight',target:visitor,preventDefault(){}});assert.ok(h.c.model.snapshot().find(a=>a.key==='companion:shiba').target);h.c.destroy();
});
test('overview changes presentation mode and preserves all actors',()=>{
 const h=setup();h.setActors(Array.from({length:6},(_,i)=>{const owner=node();return {key:'companion:'+i,kind:'companion',id:String(i),label:'仲間'+i,owner,node:owner,x:30+i*50,y:140,w:20,h:30};}));h.c.sync();
 const toggle=h.stage.children.find(n=>n.className==='diorama-view');assert.ok(toggle);assert.equal(toggle.hidden,false);
 toggle.listeners.click();assert.equal(h.c.overview(),true);assert.equal(h.c.model.snapshot().length,6);toggle.listeners.click();assert.equal(h.c.overview(),false);h.c.destroy();
});
test('resizing an actor around its unchanged foot repositions the terrain mask',async()=>{
 const stage=node(),doc=node(),owner=node();let left=100;
 doc.body=node();doc.visibilityState='visible';doc.createElement=()=>node();doc.createElementNS=()=>node();
 owner.getBoundingClientRect=()=>({left,top:80,width:100,height:100});
 const nav={unproject:p=>({x:p.x,z:p.y}),project:p=>({x:p.x,y:p.z}),nearest:p=>p,valid:()=>true};
 const testWorld={navigation:()=>nav,stats:()=>({projectionRevision:1,renderer:{objects:1}}),
  occlusion:()=>[[[10,10],[20,10],[20,20]]],setEnvironment(){},destroy(){}};
 // Substitute only the asynchronous renderer dependency; exercise the real controller's update/sync/paint paths.
 const module={exports:{}};
 require('node:vm').runInNewContext(fs.readFileSync('home-diorama.js','utf8').replace("import('./home-world.mjs')",'Promise.resolve({createHomeWorld:()=>testWorld})'),{module,testWorld});
 const env={NaotocchiHomeDioramaModel:model,matchMedia:()=>({matches:false,addEventListener(){},removeEventListener(){}}),requestAnimationFrame:()=>1,cancelAnimationFrame(){}};
 let actors=[{key:'pet:dog',kind:'pet',id:'dog',node:owner,owner,x:170,y:145,w:60,h:75}];
 const c=module.exports.createController({stage,document:doc,env,getActors:()=>actors,getMeguru:()=>({})});
 try{
  c.update({region:'forest'});await Promise.resolve();await Promise.resolve();
  assert.equal(owner.style.maskPosition,'-100px -80px');
  const before=c.model.snapshot()[0];left=120;actors=[{...actors[0],w:40,h:50}];c.sync();
  assert.equal(c.model.snapshot()[0].x,before.x);assert.equal(c.model.snapshot()[0].y,before.y);
  assert.equal(owner.style.maskPosition,'-120px -80px');
  assert.equal(owner.style.webkitMaskPosition,'-120px -80px');
 }finally{c.destroy();}
});
test('stationary sleep subtree replacement refreshes head shift for each actor role and clears on wake',()=>{
 for(const kind of ['pet','companion','partner']){
  const h=setup(),owner=h.owner;let transform=null;
  owner.querySelector=()=>transform?{getAttribute:()=>transform}:null;
  h.setActors([{key:kind+':dog',kind,id:'dog',asset:'assets/characters/dog/06.png',node:owner,owner,x:170,y:145,w:60,h:75,baseX:140,baseY:70,originX:48}]);h.c.sync();
  assert.equal(owner.style['--diorama-sleep-shift'],'0%');
  transform='translate(2 3)';h.c.sync();assert.equal(owner.style['--diorama-sleep-shift'],api.sleepAccentShift(transform,48,-1)+'%');
  transform=null;h.c.sync();assert.equal(owner.style['--diorama-sleep-shift'],'0%');
  transform='translate(-4 2)';h.c.sync();assert.equal(owner.style['--diorama-sleep-shift'],api.sleepAccentShift(transform,48,-1)+'%');
  h.c.destroy();assert.equal(owner.style['--diorama-sleep-shift'],undefined);
 }
});
