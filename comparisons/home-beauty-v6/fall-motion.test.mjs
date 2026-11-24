import test from 'node:test';
import assert from 'node:assert/strict';
import {fallCount,sampleFall} from './fall-motion.mjs';
import {forestFront,forestRelease} from './forest-e.mjs';

const forest={region:'forest',front:forestFront};
const dt=.025;

test('default and zero density, fixed upper limit and continuous size calibration',()=>{
  assert.equal(fallCount(20),20);
  assert.equal(fallCount(20,{count:0}),0);
  assert.equal(fallCount(40,{count:2}),60);
  assert.equal(fallCount(60,{count:1.5}),64);
  for(const kind of ['leaf','petal','snow','rain']){
    const a=sampleFall(kind,7,14,{},forest);
    const b=sampleFall(kind,7,14,{size:2},forest);
    assert.equal(b.x,a.x);assert.equal(b.y,a.y);assert.equal(b.radius,2*a.radius);
  }
});

test('time seeking reconstructs exactly the same flight independent of history',()=>{
  for(const kind of ['leaf','petal','snow','rain']){
    for(const speed of [.25,1,2]){
      const settings={speed};
      const initial=sampleFall(kind,13,143.45,settings,forest);
      for(const t of [11.39,2201,143.3,0,14.2]){
        sampleFall(kind,13,t,settings,forest);
      }
      assert.deepEqual(sampleFall(kind,13,143.45,settings,forest),initial);
      for(const time of [0,32,75,180]){
        const p=sampleFall(kind,6,time,settings,forest);
        assert.ok(Object.values(p).every(Number.isFinite));
      }
    }
  }
});

test('advected leaves travel in the same signed front as branches and only some lift',()=>{
  let matched=0,signed=0,gustRise=0,calmRise=0,observed=0;
  const risen=new Set();
  for(let i=0;i<20;i++){
    const opts={...forest,anchorX:forestRelease(i).x};
    for(let t=0;t<180;t+=.10){
      const p=sampleFall('leaf',i,t,{},opts);
      const next=sampleFall('leaf',i,t+dt,{},opts);
      if(p.phase>next.phase||p.alpha<.12)continue;
      observed++;
      const calm=sampleFall('leaf',i,t,{wind:0},opts);
      const calmNext=sampleFall('leaf',i,t+dt,{wind:0},opts);
      // Remove intrinsic flutter to isolate horizontal transport by wind.
      const advected=(next.x-p.x)-(calmNext.x-calm.x);
      const branch=forestFront(t,p.sourceX,p.depth);
      if(Math.abs(branch.bend)>.48){
        signed++;
        if(advected*branch.bend>0)matched++;
      }
      if(next.y<p.y){
        risen.add(i);
        if(branch.gust>.05)gustRise++;
        else calmRise++;
      }
    }
  }
  assert.ok(signed>3000 && matched/signed>.985);
  assert.ok(gustRise>35 && gustRise/observed<.05);
  assert.ok(risen.size>1 && risen.size<14);
  assert.equal(calmRise,0);
});

test('petals spend longer in flight and turn more gently than autumn leaves',()=>{
  function average(kind){
    let cycles=0,travel=0,spin=0;
    for(let i=0;i<20;i++)for(let t=0;t<180;t+=.25){
      const a=sampleFall(kind,i,t,{},forest),b=sampleFall(kind,i,t+dt,{},forest);
      if(a.phase>=b.phase||a.alpha<.2)continue;
      travel+=b.phase-a.phase;spin+=Math.abs(b.rotation-a.rotation);cycles++;
    }
    return [travel/cycles,spin/cycles];
  }
  const [leafFall,leafTurn]=average('leaf'),[petalFall,petalTurn]=average('petal');
  assert.ok(petalFall<leafFall*.83 && petalTurn<leafTurn*.8);
});

test('snow has three individually paced depths; near flakes travel in wider eddies',()=>{
  const bands=[[],[],[]];
  for(let i=0;i<24;i++){
    const a=sampleFall('snow',i,0,{wind:0},forest);
    const b=sampleFall('snow',i,dt,{wind:0},forest);
    let low=1,high=-1;
    for(let t=0;t<40;t+=.10){
      const p=sampleFall('snow',i,t,{wind:0},forest);
      low=Math.min(low,p.x-p.sourceX);high=Math.max(high,p.x-p.sourceX);
    }
    bands[Math.floor(a.depth*3)].push([a.radius,(b.phase-a.phase+1)%1,high-low]);
  }
  const mean=(band,col)=>bands[band].reduce((n,a)=>n+a[col],0)/bands[band].length;
  for(const col of [0,1,2]){
    assert.ok(mean(2,col)>mean(1,col) && mean(1,col)>mean(0,col));
  }
  assert.ok(mean(2,2)>mean(0,2)*3);
  const noGust={...forest,gusts:false};
  let strong=0,calm=0,nStrong=0,nCalm=0;
  for(let i=0;i<24;i++)for(let t=8;t<23;t+=.1){
    const a=sampleFall('snow',i,t,{},forest);
    const b=sampleFall('snow',i,t+dt,{},forest);
    const c=sampleFall('snow',i,t,{},noGust);
    const d=sampleFall('snow',i,t+dt,{},noGust);
    if(a.phase>b.phase||a.alpha<.17)continue;
    const transport=Math.abs((b.x-a.x)-(d.x-c.x));
    if(a.gust>.55){strong+=transport;nStrong++;}
    else if(a.gust<.02){calm+=transport;nCalm++;}
  }
  assert.ok(strong/nStrong>4*calm/nCalm);
});

test('rain travels on its release line, with different lengths, speeds and opacities',()=>{
  const constant=(bend)=>()=>({bend,gust:Math.abs(bend)});
  const still={region:'sea',front:constant(.1)};
  const gale={region:'sea',front:(t)=>({bend:Math.cos(t)*1.25,gust:.85})};
  const lengths=new Set(),speeds=new Set(),alphas=new Set();
  let slanted=0;
  for(let i=0;i<23;i++)for(let t=0;t<14;t+=.19){
    const a=sampleFall('rain',i,t,{},gale),b=sampleFall('rain',i,t+dt,{},gale);
    if(a.phase>b.phase)continue;
    assert.equal(a.dx,b.dx);
    assert.equal(a.rotation,0);
    assert.ok(Math.abs((b.x-a.x)-(b.y-a.y)*a.dx)<1e-12);
    assert.equal(sampleFall('rain',i,t,{},still).dx,0);
    assert.equal(sampleFall('rain',i,t,{wind:0},gale).dx,0);
    lengths.add(a.length.toFixed(2));speeds.add(((b.y-a.y)/dt).toFixed(2));alphas.add(a.alpha.toFixed(2));
    if(Math.abs(a.dx)>.08)slanted++;
  }
  assert.ok(slanted>100 && lengths.size>10 && speeds.size>8 && alphas.size>15);
});
