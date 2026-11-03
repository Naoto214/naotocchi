const {test}=require('node:test'),assert=require('node:assert/strict');
function fixture(){
 const nodes=[],frames=new Set();let next=0;
 const element=()=>({style:{setProperty(){}},children:[],setAttribute(){},append(x){this.children.push(x);},remove(){this.removed=true;},getBoundingClientRect:()=>({left:0,top:0,width:393,height:720})});
 const doc={body:{dataset:{},append(x){nodes.push(x);}},createElement:element,defaultView:{requestAnimationFrame(){const n=++next;frames.add(n);return n;},cancelAnimationFrame(n){frames.delete(n);}}};
 const input={active:true,stage:element(),sprite:element(),asset:'egg',time:'day',weather:'sunny',season:'spring'};
 let resolve,reject,calls=0;const worlds=[];
 const promise=new Promise((a,b)=>{resolve=a;reject=b;});
 const load=()=>{calls++;return promise;};
 const module={createHomeWorld({container}){const w={container,environments:[],setEnvironment(e){this.environments.push(e);},draw(){},destroy(){this.dead=true;}};worlds.push(w);return w;}};
 return {doc,input,nodes,frames,worlds,load,resolve:()=>resolve(module),reject:()=>reject(Error('offline')),calls:()=>calls};
}
const flush=()=>new Promise(r=>setImmediate(r));
test('egg renders immediately while optional background loads, then uses latest environment once',async()=>{
 const {createEggPresentation}=await import('../home-production-egg.mjs');const h=fixture(),egg=createEggPresentation(h.doc,h.load);
 egg.update(h.input);egg.update({...h.input,time:'night'});
 assert.equal(h.doc.body.dataset.homeV6Egg,'true');assert.ok(h.input.sprite.style.width);assert.match(h.nodes[0].style.backgroundImage,/home-interior-c/);
 assert.equal(h.worlds.length,0);assert.equal(h.calls(),1);
 h.resolve();await flush();assert.equal(h.worlds.length,1);assert.equal(h.worlds[0].environments.at(-1).time,'night');assert.equal(h.frames.size,1);
 egg.destroy();assert.equal(h.worlds[0].dead,true);assert.equal(h.frames.size,0);
});
for(const action of ['inactive','destroy'])test('late background load cannot resurrect egg after '+action,async()=>{
 const {createEggPresentation}=await import('../home-production-egg.mjs');const h=fixture(),egg=createEggPresentation(h.doc,h.load);
 egg.update(h.input);if(action==='inactive')egg.update({...h.input,active:false});else egg.destroy();
 h.resolve();await flush();assert.equal(h.worlds.length,0);assert.equal(h.frames.size,0);assert.equal(h.doc.body.dataset.homeV6Egg,undefined);
 egg.update(h.input);assert.equal(h.worlds.length,1);assert.equal(h.calls(),1);egg.destroy();
});
test('failed optional background preserves the visible egg and static background',async()=>{
 const {createEggPresentation}=await import('../home-production-egg.mjs');const h=fixture(),egg=createEggPresentation(h.doc,h.load);
 egg.update(h.input);h.reject();await flush();assert.equal(h.doc.body.dataset.homeV6Egg,'true');assert.ok(h.input.sprite.style.width);assert.match(h.nodes[0].style.backgroundImage,/home-interior-c/);assert.equal(h.worlds.length,0);egg.destroy();
});
