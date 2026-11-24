import test from 'node:test';
import assert from 'node:assert/strict';
import {drawRiverHomeCountry,fieldWind} from './river-home-country.mjs';
import {drawMountainJungleDesert} from './mountain-jungle-desert.mjs';

const quiet={motion:false,canopy:false,light:false,ground:false,water:false,magic:false,particles:true};
function trace(region,weather,overrides={}) {
  let path=[],placement=[];
  const marks=[];
  const ctx=new Proxy({
    beginPath(){path=[];},translate(x,y){placement=[x,y];},
    moveTo(x,y){path.push([x,y]);},lineTo(x,y){path.push([x,y]);},
    fill(){marks.push({op:'fill',path,placement,alpha:this.globalAlpha});},
    stroke(){marks.push({op:'stroke',path,alpha:this.globalAlpha});}
  },{get(target,key){return key in target?target[key]:()=>{};}});
  const state={region,weather,variant:'E3',time:'evening',season:'autumn',width:1000,height:1500,
    seconds:9.2,effects:quiet,fallPlus:true,fall:{count:1,size:1,speed:1,wind:1},...overrides};
  (['mountain','jungle','desert'].includes(region)?drawMountainJungleDesert:drawRiverHomeCountry)(ctx,state);
  return marks;
}
test('autumn sunset releases a sparse selection at field edges; former E3 stays empty',()=>{
  const leaves=trace('countryside','sunny').filter(p=>p.op==='fill');
  assert.ok(leaves.length>=3 && leaves.length<=7);
  assert.equal(trace('countryside','sunny',{fallPlus:false}).length,0);
  assert.equal(trace('countryside','sunny',{time:'night'}).length,0);
});
test('particle count zero and reduced motion suppress only atmospheric fall',()=>{
  for(const region of ['countryside','home','mountain','jungle','desert']){
    for(const weather of ['rain','snow']){
      assert.equal(trace(region,weather,{fall:{count:0}}).length,0,region+' '+weather);
      assert.equal(trace(region,weather,{reduced:true}).length,0,region+' '+weather);
    }
  }
});
test('still air gives vertical free rain across the terrain and field',()=>{
  for(const region of ['mountain','jungle','desert','countryside']){
    const marks=trace(region,'rain',{fall:{wind:0}}).filter(p=>p.op==='stroke'&&p.path.length===2);
    assert.ok(marks.length>3);
    for(const p of marks) assert.ok(Math.abs(p.path[1][0]-p.path[0][0])<.00001,region);
  }
});
test('snow stays out of the dunes and tropical air',()=>{
  for(const region of ['desert','jungle'])assert.equal(trace(region,'snow').length,0);
});

test('field leaves move downwind with the vegetation on both eastward and westward fronts',()=>{
  // Observe the first mid-field crown. Subtract its still-air flutter so the test
  // measures only the signed air transport, independently of spin and depth.
  const x=.65, step=.25;
  let previous,aligned=0,west=0,east=0;
  for(let seconds=0; seconds<=180; seconds+=step) {
    const withWind=trace('countryside','sunny',{seconds})[0];
    const still=trace('countryside','sunny',{seconds,fall:{wind:0}})[0];
    const offset=withWind.placement[0]-still.placement[0], height=withWind.placement[1];
    const wind=fieldWind(seconds-step/2,x);
    if(previous && Math.abs(height-previous.height)<6 && Math.abs(wind)>.40 &&
        withWind.alpha>.08 && previous.alpha>.08) {
      if(wind>0)east++;else west++;
      if((offset-previous.offset)*wind>0)aligned++;
    }
    previous={offset,height,alpha:withWind.alpha};
  }
  assert.ok(west>20 && east>20);
  assert.ok(aligned/(west+east)>.95);
});
test('rain controls preserve summer fireflies and river impact rings',()=>{
  for(const [region,weather] of [['countryside','sunny'],['river_lake','rain']]){
    const options={season:'summer',effects:{...quiet,water:true},fall:{count:0}};
    const original=trace(region,weather,{...options,fallPlus:false});
    const candidate=trace(region,weather,options);
    assert.ok(original.length>0);
    assert.deepEqual(candidate,original);
  }
});
