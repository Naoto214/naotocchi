import test from 'node:test';
import assert from 'node:assert/strict';
import {forestFront,forestEProfile,drawForestE} from './forest-e.mjs';

test('a front arrives at separate crowns and recovers between events',()=>{
 const values=(u,z)=>Array.from({length:50},(_,i)=>forestFront(9+i*.2,u,z).gust);
 const left=values(.15,.3),right=values(.85,.3);
 assert.ok(left.indexOf(Math.max(...left))<right.indexOf(Math.max(...right)));
 assert.equal(forestFront(30,.5,.5).gust,0);
 assert.equal(forestFront(13,.5,.5,false).gust,0);
 assert.notEqual(forestFront(180,.5,.5).bend,forestFront(0,.5,.5).bend);
});
test('each E design has a different visual balance',()=>{
 assert.ok(forestEProfile('E1').breeze>forestEProfile('E2').breeze);
 assert.ok(forestEProfile('E2').glow>forestEProfile('E3').glow);
 assert.ok(forestEProfile('E3').glow>forestEProfile('E1').glow);
});
test('zero strength and other renderers cannot emit draw commands',()=>{
 const c=new Proxy({}, {get(){throw Error('unexpected canvas access')}});
 for(const [variant,strength,opacity] of [['E2',0,1],['E1',1,0],['D3',1,1]])drawForestE(c,{region:'forest',variant,strength,opacity,width:390,height:585});
});

test('rain and snow take precedence over autumn leaves, with opt-out and reduced motion',()=>{
 const trace=[];
 const ctx=new Proxy({}, {get:(_,k)=>(...args)=>trace.push(k)});
 const scene={region:'forest',variant:'E3',time:'day',season:'autumn',width:390,height:585,
   seconds:16,strength:1,opacity:1,effects:{motion:false,light:false,particles:true}};
 function paths(patch){
   trace.length=0;drawForestE(ctx,{...scene,...patch});
   return {stroke:trace.filter(k=>k==='stroke').length,arc:trace.filter(k=>k==='arc').length,
     leaves:trace.filter(k=>k==='quadraticCurveTo').length};
 }
 assert.ok(paths({weather:'sunny'}).leaves>0);
 const rain=paths({weather:'rain'}),snow=paths({weather:'snow'});
 assert.ok(rain.stroke>0&&rain.arc===0&&rain.leaves===0);
 assert.ok(snow.arc>0&&snow.stroke===0&&snow.leaves===0);
 assert.deepEqual(paths({weather:'rain',reduced:true}),{stroke:0,arc:0,leaves:0});
 assert.deepEqual(paths({weather:'snow',effects:{...scene.effects,particles:false}}),{stroke:0,arc:0,leaves:0});
});

test('a later front reaches the right-hand crowns first',()=>{
 const series=u=>Array.from({length:60},(_,i)=>forestFront(33+i*.15,u,.4).gust);
 const l=series(.15),r=series(.85);
 assert.ok(r.indexOf(Math.max(...r))<l.indexOf(Math.max(...l)));
});
