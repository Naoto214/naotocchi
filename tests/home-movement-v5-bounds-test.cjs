const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const model=require('../home-production-model.js');

function node(){return {
 style:{setProperty(k,v){this[k]=v;},removeProperty(k){delete this[k];}},dataset:{},children:[],attrs:{},isConnected:true,
 classList:{add(){},remove(){},toggle(){},contains(){return false;}},
 setAttribute(k,v){this.attrs[k]=v;},getAttribute(k){return this.attrs[k]??null;},removeAttribute(k){delete this.attrs[k];},
 appendChild(n){this.children.push(n);n.parentNode=this;},remove(){this.isConnected=false;},
 addEventListener(){},removeEventListener(){},querySelector(){return null;},querySelectorAll(){return [];},closest(){return null;},
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
