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
function setup(){
 assert.equal(typeof api.createController,'function');const stage=node(),doc=node(),owner=node(),events=[],raf=new Map();let serial=0,hidden=false,blocked=false;
 doc.createElement=()=>node();Object.defineProperty(doc,'visibilityState',{get:()=>hidden?'hidden':'visible'});
 const env={NaotocchiHomeDioramaModel:model,matchMedia:()=>({matches:false,addEventListener(){},removeEventListener(){}}),requestAnimationFrame:f=>{raf.set(++serial,f);return serial;},cancelAnimationFrame:id=>raf.delete(id),CustomEvent:class{constructor(t,v){this.type=t;this.detail=v.detail;}}};
 let actors=[{key:'pet:dog',kind:'pet',id:'dog',node:owner,owner,x:170,y:145,w:60,h:75,baseX:140,baseY:70}];
 stage.dispatchEvent=e=>events.push(e);const c=api.createController({stage,document:doc,env,getActors:()=>actors,isBlocked:()=>blocked,onGesture:()=>{},onPosition:()=>{}});
 c.update({region:'forest',width:350,height:240,season:'summer',weather:'sunny',time:'day'},{});
 return {stage,doc,owner,c,raf,events,setHidden:v=>{hidden=v;doc.listeners.visibilitychange();},setBlocked:v=>blocked=v,setActors:v=>actors=v};
}
test('tap selects, release after drag sets destination without teleport',()=>{
 const h=setup(),pointer=(x,y)=>({pointerId:1,isPrimary:true,button:0,clientX:x,clientY:y,target:h.owner,preventDefault(){}});
 h.stage.listeners.pointerdown(pointer(170,120));h.stage.listeners.pointerup(pointer(170,120));assert.equal(h.c.model.selected(),'pet:dog');
 h.stage.listeners.pointerdown(pointer(170,120));h.stage.listeners.pointermove(pointer(80,160));h.stage.listeners.pointerup(pointer(80,160));
 const a=h.c.model.snapshot()[0];assert.equal(a.x,170);assert.ok(a.target.x<170);
});
test('cancel and lost capture never dispatch a movement',()=>{for(const type of ['pointercancel','lostpointercapture']){const h=setup();const p={pointerId:1,isPrimary:true,clientX:170,clientY:120,target:h.owner,preventDefault(){}};h.stage.listeners.pointerdown(p);h.stage.listeners.pointermove({...p,clientX:60});h.stage.listeners[type](p);assert.equal(h.c.model.snapshot()[0].target,null);}});
test('hidden document cancels RAF and destination, visible resumes without catchup',()=>{const h=setup();h.c.model.move('pet:dog',{x:60,y:160});assert.ok(h.raf.size);h.setHidden(true);assert.equal(h.raf.size,0);assert.equal(h.c.model.snapshot()[0].target,null);h.setHidden(false);assert.equal(h.raf.size,1);h.c.destroy();assert.equal(h.raf.size,0);});
test('Pilot exit restores original actor styles and input ownership',()=>{const h=setup();h.c.update({region:'home'},{});assert.equal(h.stage.dataset.diorama,undefined);assert.equal(h.owner.style.translate,'');assert.equal(h.owner.getAttribute('role'),null);});
test('departed actor cannot receive stale drag release',()=>{const h=setup();const p={pointerId:1,isPrimary:true,clientX:170,clientY:120,target:h.owner,preventDefault(){}};h.stage.listeners.pointerdown(p);h.setActors([]);h.c.sync();h.stage.listeners.pointerup({...p,clientX:60});assert.equal(h.c.model.snapshot().length,0);});
test('leaving a paused Pilot removes all animation pause state',()=>{const h=setup();h.setBlocked(true);h.c.update({region:'forest'},{});assert.equal(h.stage.dataset.dioramaPaused,'true');h.c.update({region:'home'},{});assert.equal(h.stage.dataset.dioramaPaused,undefined);assert.equal(h.stage.dataset.dioramaReduced,undefined);});
test('a 15-second held drag survives repeated normal render updates without autonomous movement',()=>{
 const h=setup(),p={pointerId:1,isPrimary:true,button:0,clientX:170,clientY:120,target:h.owner,preventDefault(){}};
 h.stage.listeners.pointerdown(p);const before=h.c.model.snapshot()[0];
 for(let i=1;i<=160;i++){const callbacks=[...h.raf.values()];h.raf.clear();for(const f of callbacks)f(i*100);h.c.update({region:'forest',width:350,height:240,season:'summer',weather:'sunny',time:'day'},{});}
 const after=h.c.model.snapshot()[0];assert.equal(after.x,before.x);assert.equal(after.y,before.y);assert.equal(after.target,null);assert.equal(h.c.model.metrics().moves,0);
 h.stage.listeners.pointermove({...p,clientX:80,clientY:160});h.stage.listeners.pointerup({...p,clientX:80,clientY:160});assert.ok(h.c.model.snapshot()[0].target);h.c.destroy();
});
