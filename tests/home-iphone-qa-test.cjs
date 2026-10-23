const {test}=require('node:test'),assert=require('node:assert/strict');
const api=require('../home-diorama.js'),model=require('../home-diorama-model.js'),cast=require('../cast-layout.js');
const {harness}=require('./helpers/runtime-harness.cjs');
// A rightward walk of left-facing official dog art must reflect only the body.
test('native artwork facing produces correct left and right body scales across expressions',()=>{
 assert.equal(typeof api.facingScale,'function');
 for(const asset of ['assets/characters/dog/04.png','assets/characters/dog/08.png','assets/characters/companions/shiba.png']){
  assert.equal(api.facingScale({asset},1),-1);assert.equal(api.facingScale({asset},-1),1);
 }
 assert.equal(api.facingScale({asset:'assets/characters/companions/snail.png'},1),1);
 assert.equal(api.facingScale({asset:'assets/characters/partners/forest_bear.png'},-1),1,'front-facing art stays unmirrored');
});
test('presentation scaling preserves all cast ratios and attachment offsets without modifying source',()=>{
 assert.equal(typeof api.scaleLayout,'function');
 const args={width:350,height:260,conversationHeight:44,mainAsset:'assets/characters/dog/04.png',hasPartner:true,partnerAsset:'assets/characters/partners/forest_bear.png',hasAccessory:true,hasRing:true,companions:['assets/characters/companions/shiba.png','assets/characters/companions/cat_friend.png']};
 const raw=cast.layoutHomeCast(args),before=JSON.stringify(raw);
 for(const k of [1,.9,.8]){const scaled=api.scaleLayout(raw,args,k);assert.equal(scaled.main.w,raw.main.w*k);assert.equal(scaled.partner.w,raw.partner.w*k);assert.equal(scaled.companions[0].w,raw.companions[0].w*k);assert.equal(scaled.accessory.w,raw.accessory.w*k);assert.deepEqual(scaled.conversation,raw.conversation);assert.deepEqual(scaled.poops,raw.poops);}
 assert.equal(JSON.stringify(raw),before);
});
test('river width is visible and swimming geometry remains submerged inside shared stream',async()=>{
 const M=harness({deterministic:true}).api.meguruMod,{composeHomeWorld}=await import('../home-world.mjs'),{createWorldLife}=await import('../world-life.mjs');
 const c=composeHomeWorld(M,'river_lake'),streams=M.streams3d(c.world);assert.ok(c.world.terrain.half>=500);
 const life=createWorldLife('river_lake',()=>.37);let seen=0;
 for(let i=0;i<2400;i++){life.step(.1,{time:'day'});for(const a of life.snapshot().filter(a=>a.kind==='fish')){seen++;assert.ok(a.y+2<-11,'whole fish under water surface');assert.ok(Math.abs(a.z-1650)<170);assert.ok(streams[0].pts.every(p=>p.w>300));}}
 assert.ok(seen>100);
});
test('body-size separation prevents one large actor hiding another on adjacent depth rows',()=>{
 const m=model.createModel({random:()=>.3});m.sync([{key:'pet:a',kind:'pet',id:'a',x:170,y:170,w:80,h:100},{key:'partner:b',kind:'partner',id:'b',x:170,y:195,w:70,h:90}],{region:'forest',width:390,height:340,groundTop:130});
 const [a,b]=m.snapshot();assert.ok(Math.abs(a.x-b.x)>=60||Math.abs(a.y-b.y)>=75);
});
test('fish render inside scene below transparent water, pooled geometry never grows',async()=>{
 const THREE=await import('../vendor/three-0.170.0/three.module.min.js'),ambient=await import('../world-ambient.mjs');
 assert.equal(typeof ambient.createAquaticLife,'function');const scene=new THREE.Scene(),resources=[];
 const layer=ambient.createAquaticLife(THREE,scene,x=>{resources.push(x);return x;});
 const count=resources.length,meshes=scene.children.length;
 for(let i=0;i<100;i++)layer.update([{id:1,kind:'fish',x:i,y:-17,z:1650,direction:1,phase:.3}],i*.1);
 scene.updateMatrixWorld();const fish=[];scene.traverse(m=>{if(m.name==='home-fish-body'&&m.visible)fish.push(m);});assert.ok(fish.length>=3,'a small school');
 for(const m of fish){const box=new THREE.Box3().setFromObject(m);assert.ok(box.max.y<-11);assert.equal(m.material.depthTest,true);assert.equal(m.material.transparent,false);}
 assert.equal(resources.length,count);assert.equal(scene.children.length,meshes);layer.update([],10);assert.ok(fish.every(m=>!m.visible));
});
test('right-facing unicorn and eagle are not mirrored on a rightward walk',()=>{
 for(const asset of ['assets/characters/companions/unicorn.png','assets/characters/partners/high_eagle.png']){assert.equal(api.facingScale({asset},1),1);assert.equal(api.facingScale({asset},-1),-1);}
});
