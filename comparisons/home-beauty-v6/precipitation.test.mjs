import test from 'node:test';
import assert from 'node:assert/strict';
import {drawSeaE} from './sea-e.mjs';
import {drawSnowCityLake,snowCityFronts} from './snow-city-lake.mjs';
import {forestWind} from './full-motion.mjs';
import {sampleFall} from './fall-motion.mjs';

const base={variant:'E3',width:1000,height:1500,time:'night',season:'winter',weather:'snow',strength:1,opacity:1,seconds:13,fallPlus:true};
function strokes(region,overrides={}){
  const marks=[],stack=[];
  let path=[],ink={};
  const ctx=new Proxy({},{
    get(_,key) {
      if(key==='createRadialGradient')return ()=>({stops:[],addColorStop(...args){this.stops.push(args);}});
      if(key==='save')return ()=>stack.push({...ink});
      if(key==='restore')return ()=>{ink=stack.pop();};
      if(key==='beginPath')return ()=>{path=[];};
      if(['stroke','fill','fillRect'].includes(key))return (...args)=>marks.push([key,ink.globalAlpha,ink.strokeStyle,ink.fillStyle?.stops??ink.fillStyle,path.slice(),args]);
      if(['arc','moveTo','lineTo','ellipse','bezierCurveTo'].includes(key))return (...args)=>path.push([key,...args]);
      return ()=>{};
    },
    set(_,key,value){ink[key]=value;return true;}
  });
  (region==='sea'?drawSeaE:drawSnowCityLake)(ctx,{...base,...overrides,region});
  return marks;
}

test('coastal rain has one continuous straight stroke per visible falling drop; eight water rings retain their own clock',()=>{
  const weather='rain', effects={water:true,waves:false,foam:false,light:false};
  const shown=strokes('sea',{weather,effects});
  const hidden=strokes('sea',{weather,effects,fall:{count:0}});
  const old=strokes('sea',{weather,effects,fallPlus:false});
  const rings=marks=>marks.filter(mark=>mark[4].some(pt=>pt[0]==='ellipse')).map(mark=>[mark[1],mark[4]]);
  const drops=shown.filter(mark=>mark[4].some(pt=>pt[0]==='lineTo'));
  assert.equal(rings(hidden).length,8);
  assert.deepEqual(rings(shown),rings(hidden));
  assert.deepEqual(rings(hidden),rings(old));
  assert.ok(drops.length>14&&drops.length<=23);
  for(const mark of drops)assert.deepEqual(mark[4].map(pt=>pt[0]),['moveTo','lineTo']);
  assert.equal(hidden.length,8);
  const still=strokes('sea',{weather,effects,fall:{wind:0}});
  for(const [,,,,path] of still)if(path[0][0]==='moveTo')assert.equal(path[0][1],path[1][1]);
});

test('snow-country keeps its existing allocation, preserves window light and obeys reduced motion',()=>{
  for(const time of ['day','night']){
    const shown=strokes('snow',{time,seconds:12}), hidden=strokes('snow',{time,seconds:12,fall:{count:0}});
    const snowMarks=shown.filter(m=>m[0]==='fill'&&m[4][0]?.[0]==='ellipse');
    assert.ok(snowMarks.length>25 && snowMarks.length<=40);
    const lights=marks=>marks.filter(m=>m[0]==='fillRect').map(m=>[m[1],m[5]]);
    assert.deepEqual(lights(hidden),lights(strokes('snow',{time,seconds:12,fallPlus:false,effects:{particles:false}})));
    assert.deepEqual(strokes('snow',{time,reduced:true}),strokes('snow',{time,reduced:true,fallPlus:false}));
  }
  assert.equal(strokes('snow',{weather:'sunny',seconds:21,fall:{count:0}}).filter(m=>m[0]==='fill').length,0);
  assert.ok(strokes('snow',{weather:'sunny',seconds:21}).filter(m=>m[0]==='fill').length>0);
});

test('snow bough gust draws flakes with its hanging tip; city air follows its upright crown',()=>{
  const t=13,g=forestWind(t).gust;
  const bend=.37*Math.sin(t*.74)+.18*Math.sin(t*1.26)+.92*g;
  const exposed=snowCityFronts.snow(t,.066,.5,true);
  assert.equal(exposed.bend,-bend);
  assert.equal(snowCityFronts.city(t,.092,.5,true).bend,bend);
  assert.equal(snowCityFronts.snow(t,.066,.5,false).gust,0);
  const sampled=sampleFall('snow',2,t,{}, {region:'snow',anchorX:.066,front:snowCityFronts.snow});
  assert.equal(Math.sign(sampled.bend),Math.sign(exposed.bend));
  assert.ok(sampled.gust>.6);
});

test('memory-lake floating lights stay independent of fall controls and terrestrial precipitation',()=>{
  const reference=strokes('memory_lake',{fallPlus:false});
  for(const weather of ['snow','rain','sunny'])assert.deepEqual(strokes('memory_lake',{weather,fall:{wind:0,count:0,size:2,speed:2}}),reference);
});

test('three-minute coastal rain and layered snow trajectories, default controls',t=>{
  const radius=[[],[],[]],vertical=[[],[],[]],lateral=[[],[],[]];
  let drops=0,almostVertical=0,maxAngle=0,maxCalmSlope=0,minLength=Infinity,maxLength=0;
  const sea={region:'sea'},village={region:'snow',front:snowCityFronts.snow};
  for(let seconds=0;seconds<180;seconds+=.25){
    for(let i=0;i<23;i++){
      const p=sampleFall('rain',i,seconds,{},sea);
      const angle=Math.atan(Math.abs(p.dx)*1000/1500)*180/Math.PI;
      drops++;
      if(angle<2)almostVertical++;
      maxAngle=Math.max(maxAngle,angle);
      maxCalmSlope=Math.max(maxCalmSlope,Math.abs(sampleFall('rain',i,seconds,{wind:0},sea).dx));
      minLength=Math.min(minLength,16*p.length);
      maxLength=Math.max(maxLength,16*p.length);
    }
    for(let i=0;i<40;i++){
      const p=sampleFall('snow',i,seconds,{},village),next=sampleFall('snow',i,seconds+.1,{},village);
      // Measure a continuous visible portion of a flight; omit its offscreen reset.
      if(p.y<.1||p.y>.9||next.y<p.y||p.alpha<.01||next.alpha<.01)continue;
      const band=Math.floor(3*p.depth);
      radius[band].push(3.1*p.radius);
      vertical[band].push((next.y-p.y)*1500/.1);
      lateral[band].push(Math.abs(next.x-p.x)*1000/.1);
    }
  }
  const round=n=>Number(n.toFixed(2));
  const median=a=>round(a.sort((a,b)=>a-b)[Math.floor(a.length/2)]);
  const snow={medianRadius:radius.map(median),medianVerticalSpeed:vertical.map(median),medianAbsoluteLateralSpeed:lateral.map(median)};
  const rain={samples:drops,within2DegreesPct:round(almostVertical*100/drops),maxAngleDegrees:round(maxAngle),zeroWindSlope:maxCalmSlope,lineLength:[round(minLength),round(maxLength)]};
  t.diagnostic(JSON.stringify({seconds:180,painting:[1000,1500],rain,snow}));
  assert.ok(rain.within2DegreesPct>60);
  assert.ok(maxAngle>5 && maxAngle<20);
  assert.equal(maxCalmSlope,0);
  assert.ok(maxLength>1.5*minLength);
  for(const [far,middle,near] of Object.values(snow))assert.ok(far<middle&&middle<near);
});
