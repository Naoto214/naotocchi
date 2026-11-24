import test from 'node:test';
import assert from 'node:assert/strict';
import {createRecoveredNavigation} from '../../../home-recovered-navigation.mjs';
import {ART_SCENES} from '../../../home-production-manifest.mjs';
import production from '../../../home-production-model.js';

const host={width:375,height:615};
const stage={left:16,top:140,width:343,height:372};
function navigation(region,width=375) {
  return createRecoveredNavigation(ART_SCENES[region],{...host,width},stage,{
    stableGrid:true, viewportWidth:width,
    paintedProjection:p=>({x:.15+p.x/480,z:.22+p.y/900})
  });
}
function points(nav,count){return Array.from({length:count},(_,i)=>nav.initialPoint(i,count));}

test('fresh dense forest has its own seeds and small or non-forest households keep theirs',()=>{
  for(const [region,count,changed] of [['forest',28,true],['forest',4,false],['city',28,false]]){
    const nav=navigation(region);
    const candidate=points(nav,count);
    try{
      globalThis.homeForestLayout='A';
      const original=points(nav,count);
      assert.deepEqual(candidate[0],original[0]);
      assert.equal(JSON.stringify(candidate)!==JSON.stringify(original),changed);
    }finally{delete globalThis.homeForestLayout;}
  }
});

test('ordinary scene refresh preserves walked feet; region re-entry reapplies fresh seats',()=>{
  const nav=navigation('forest'),scene={...stage,region:'forest',navigation:nav};
  const cast=Array.from({length:28},(_,i)=>({key:String(i),kind:i===0?'pet':i===1?'partner':'companion',
    x:80+i*4,y:230+i*2,w:8,h:9}));
  const model=production.createModel({random:()=>.5});
  const feet=()=>model.snapshot().map(a=>[a.x,a.y]);
  model.sync(cast,scene);
  const opening=feet(), hero=model.snapshot()[0];
  assert.ok(model.move(hero.key,{x:hero.x+18,y:hero.y+4},'drag'));
  for(let i=0;i<40;i++)model.step(.05,{autonomy:false});
  const moved=feet();
  assert.notDeepEqual(moved[0],opening[0]);
  model.cancel();
  for(let i=0;i<4;i++)model.sync(cast.map(a=>({...a})),scene);
  assert.deepEqual(feet(),moved);
  model.sync(cast,{...scene,region:'city',navigation:navigation('city')});
  model.sync(cast,scene);
  assert.deepEqual(feet(),opening);
});

test('the forest painting stays uniform throughout the resident frame and covers the footer',async()=>{
  const {forestGroundCrop}=await import('../../../home-production-world.mjs');
  for(const [width,height,top,bottom] of [[320,516,124,305],[375,615,140,351],[390,630,140,366],[390,844,140,600],[430,695,158,450]]){
    const t=forestGroundCrop({width,height,top:0},top,bottom);
    assert.ok(t.left<=0 && t.left+t.width>=width);
    assert.equal(t.width*1.5,t.height);
    assert.ok(Math.abs(t.top+t.height*.56-top-24)<1e-6);
    assert.ok(t.footer>bottom);
    assert.ok((height-t.footer)/(t.top+t.height-t.footer)<=1.4+1e-9);
  }
});

test('the provisional 28-resident forest ring gives the partner its nearest seed without losing a seat',()=>{
  const nav=createRecoveredNavigation(ART_SCENES.forest,host,stage,{stableGrid:true});
  const candidate=points(nav,28);
  let ring;
  try{
    globalThis.homeForestLayout='B';
    ring=points(nav,28);
  }finally{delete globalThis.homeForestLayout;}
  const distance=p=>Math.hypot(p.x-candidate[0].x,p.y-candidate[0].y);
  assert.equal(distance(candidate[1]),Math.min(...ring.slice(1).map(distance)));
  assert.deepEqual(candidate.map(p=>JSON.stringify(p)).sort(),ring.map(p=>JSON.stringify(p)).sort());
});
