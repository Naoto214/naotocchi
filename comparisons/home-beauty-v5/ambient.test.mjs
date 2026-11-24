import test from 'node:test';
import assert from 'node:assert/strict';
import {previousIsNative,hasNativeLayer,placeNativeParticles} from './ambient.mjs';

test('prior reference for original eight comes from shipped accents and particle DOM',()=>{
 const original=['home','countryside','river_lake','jungle','desert','mountain','star_stop','deepsea'];
 for(const region of original){
  assert.equal(previousIsNative(region),true);
  assert.equal(hasNativeLayer(region,{variant:'previous',compareSplit:false}),true);
  assert.equal(hasNativeLayer(region,{variant:'E3',compareSplit:true}),true);
  assert.equal(hasNativeLayer(region,{variant:'E3',compareSplit:false}),false);
 }
 for(const region of ['sea','forest','snow','city','memory_lake'])assert.equal(previousIsNative(region),false);
});
test('split clip intersects the native art mask and clocks stay aligned when frozen',()=>{
 globalThis.window={innerWidth:390};
 let paused=false;
 const animation={pause(){paused=true;},play(){paused=false;}};
 const fx={style:{clipPath:'polygon(0 0,50% 0,50% 50%)'},childElementCount:1,getAnimations:()=>[animation]};
 const api={settings:{variant:'E3',compareSplit:true,split:.5,speed:.5},frozen:true,clockRevision:1,clockSeconds:12};
 placeNativeParticles(fx,api,{region:'home'},{left:-86,width:562},{left:0},true);
 assert.equal(fx.style.clip,'rect(auto, 281px, auto, auto)');
 assert.equal(fx.style.clipPath,'polygon(0 0,50% 0,50% 50%)');
 assert.equal(animation.currentTime,12000);assert.equal(paused,true);
 api.frozen=false;api.settings.variant='previous';api.clockRevision++;
 placeNativeParticles(fx,api,{region:'home'},{left:-86,width:562},{left:0},false);
 assert.equal(fx.style.clip,'auto');assert.equal(animation.playbackRate,.5);
 assert.equal(paused,false);
});
