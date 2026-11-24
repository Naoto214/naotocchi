import test from 'node:test';
import assert from 'node:assert/strict';
import {composeNature} from './paint.mjs';

function context() {
  const gradient={addColorStop(){}};
  return new Proxy({createRadialGradient:()=>gradient}, {
    get:(target,key)=>key in target ? target[key] : ()=>{}
  });
}

test('an interior wipe reuses the environment at equal wind and draws both wind fields when they differ',()=>{
  const rect={left:0,top:0,width:390,height:585};
  const ctx=context();
  let images=0;
  ctx.drawImage=()=>{images++;};
  globalThis.document={createElement:()=>({width:0,height:0,getContext:context})};
  const settings={variant:'B',strength:1,season:'autumn',weather:'sunny',
    effects:{particles:false},split:.491};
  globalThis.window={innerWidth:390,HomeBeauty:{settings,sampleClock:t=>t}};
  for (const [region,time] of [['forest','day'],['countryside','evening']]) {
    const image={src:region+'-'+time+'.webp',naturalWidth:1000,naturalHeight:1500};
    function sample(compareSplit,wind) {
      Object.assign(settings,{region,time,compareSplit,fall:{count:1,size:1,speed:1,wind}});
      images=0;
      composeNature(ctx,rect,rect,{image,alpha:1},14,false);
      return images;
    }
    const single=sample(false,1);
    assert.ok(single>0,region);
    assert.equal(sample(true,1),single,region);
    assert.equal(sample(true,2),2*single,region);
  }
});
