const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const window={},source=fs.readFileSync('home-production-touch.js','utf8');vm.runInNewContext(source.slice(source.indexOf('/* V8 viewport:')),{window});
const viewport=window.NaotocchiHomeViewport,diorama=require('../home-production-diorama.js');
test('both cameras use the chosen population table; no profile preserves actual release values',()=>{
 const groups=[1,2,3,5,6,10,11,18,19,28];
 for(const [profile,expected] of [[undefined,[1,.92,.86,.8,.74]],['v18',[1,.9,.8,.7,.6]],['v1',[1,1,.9,.8,.7]]]){
  for(const [i,count] of groups.entries()){
   const args={paneWidth:400,paneHeight:900,nativeWidth:320,nativeHeight:600,stageTop:60,stageHeight:400,frameLeft:0,hostWidth:900,hostHeight:600,count,profile,envelope:{left:50,right:270,top:200,bottom:400,above:90,below:5,side:45}};
   for(const camera of [viewport.portraitPresentation,viewport.landscapePresentation])assert.equal(camera(args).bodyScale,expected[Math.floor(i/2)]);
  }
 }
});
test('main multiplier grows painted frame and its item about the same foot without resizing others',()=>{
 const mainAsset='assets/characters/dog/03.png',friend='assets/characters/companions/shiba.png',partnerAsset='assets/characters/partners/forest_bear.png';
 for(const count of [2,5,10,18,28]){
  const args={width:390,height:430,conversationHeight:44,mainAsset,partnerAsset,hasPartner:true,hasRing:true,hasAccessory:true,companions:Array(count-2).fill(friend)};
  const base=diorama.layoutTerrainCast(args);
  const b=require('../cast-bounds.js')[mainAsset]?.box||[0,0,128,128],foot=f=>[f.x+f.w*(b[0]+b[2])/256,f.y+f.h*b[3]/128+(f.artOffsetY||0)];
  for(const percent of [100,105,110,115,120]){
   const next=diorama.layoutTerrainCast({...args,heroPercent:percent});
   assert.ok(Math.abs(next.main.w/base.main.w-percent/100)<1e-8);
   assert.ok(Math.abs(next.accessory.w/base.accessory.w-percent/100)<1e-8);
   assert.ok(foot(next.main).every((v,i)=>Math.abs(v-foot(base.main)[i])<1e-8));
   assert.deepEqual(next.partner,base.partner);assert.deepEqual(next.companions,base.companions);
  }
 }
});
