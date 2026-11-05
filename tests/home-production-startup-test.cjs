const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
test('the document-blocking egg module never depends on the optional Meguru 3D startup',()=>{
 const seen=new Set();
 function visit(file){
  if(seen.has(file))return;seen.add(file);
  const source=fs.readFileSync(file,'utf8');
  for(const match of source.matchAll(/(?:import|export)\s+[^;\n]*?from\s*['"](\.[^'"]+)['"]/g))visit(path.normalize(path.join(path.dirname(file),match[1])));
 }
 visit('home-production-egg.mjs');
 assert.ok(!seen.has('meguru-3d.mjs'),'delaying optional 3D must not block DOMContentLoaded or the egg');
});

async function deferredEgg(){
 const {artTransform,backdropComposition}=await import('../home-production-transform.mjs');
 let resolve,reject;const pending=new Promise((a,b)=>{resolve=a;reject=b;});let loads=0,created=0,frames=0;const environments=[];
 const source=fs.readFileSync('home-production-egg.mjs','utf8').replace(/^import .*;$/gm,'').replace(/export /g,'').replace(/import\('\.\/home-production-world\.mjs'\)/g,'loadModule()');
 const createWorld=()=>{created++;return {setEnvironment(e){environments.push(e);},draw(){},destroy(){}};};
 const create=new Function('loadModule','artTransform','backdropComposition','createHomeWorld',source+'\nreturn createEggPresentation;')(()=>{loads++;return pending;},artTransform,backdropComposition,createWorld);
 const rect={left:0,top:0,width:320,height:568};
 const node=()=>({style:{setProperty(){}},children:[],append(n){this.children.push(n);},setAttribute(){},remove(){this.removed=true;},getBoundingClientRect:()=>rect});
 const doc={body:{...node(),dataset:{}},createElement:node,visibilityState:'visible',defaultView:{requestAnimationFrame(){frames++;return frames;},cancelAnimationFrame(){}}};
 const egg=create(doc),sprite=node(),args={active:true,stage:node(),sprite,asset:'egg',time:'day',weather:'sunny',season:'spring'};
 return {doc,egg,sprite,args,resolve:()=>resolve({createHomeWorld:createWorld}),reject,counts:()=>({loads,created,frames}),environments};
}
test('optional background loading never delays the egg and uses the latest environment',async()=>{
 const q=await deferredEgg();q.egg.update(q.args);
 assert.equal(q.doc.body.dataset.homeV6Egg,'true');assert.ok(q.sprite.style.width);assert.match(q.doc.body.children[0].style.backgroundImage,/home-interior-c/);
 q.egg.update({...q.args,time:'night'});assert.deepEqual(q.counts(),{loads:1,created:0,frames:0});
 q.resolve();await new Promise(setImmediate);assert.deepEqual(q.counts(),{loads:1,created:1,frames:1});assert.equal(q.environments.at(-1).time,'night');
});
test('late or failed optional backgrounds cannot resurrect a departed egg or remove its fallback',async()=>{
 const late=await deferredEgg();late.egg.update(late.args);late.egg.destroy();late.resolve();await new Promise(setImmediate);
 assert.deepEqual(late.counts(),{loads:1,created:0,frames:0});assert.equal(late.doc.body.dataset.homeV6Egg,undefined);
 const failed=await deferredEgg();failed.egg.update(failed.args);failed.reject(new Error('optional renderer unavailable'));await new Promise(setImmediate);
 assert.equal(failed.doc.body.dataset.homeV6Egg,'true');assert.ok(failed.sprite.style.width);assert.match(failed.doc.body.children[0].style.backgroundImage,/home-interior-c/);
 failed.egg.update(failed.args);assert.deepEqual(failed.counts(),{loads:1,created:0,frames:0});
});
