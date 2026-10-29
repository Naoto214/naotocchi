const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),{createRequire}=require('node:module');
const {adaptDiorama,adaptScript}=require('../tools/home-v8-adapter.cjs');
function layoutModule(){const c={module:{exports:{}},require:createRequire(require.resolve('../home-diorama.js'))};vm.runInNewContext(adaptDiorama(fs.readFileSync('home-diorama.js','utf8')),c);return c.module.exports;}
const asset='assets/characters/dog/stage-4.webp';
for(const candidate of ['star-new','star_stop-original'])for(const time of ['day','night'])test(`rotation of single large actor has legal floor in landscape and portrait (${candidate} / ${time})`,async()=>{
 const {ART_SCENES}=await import('../home-v7-manifest.mjs'),{createRecoveredNavigation}=await import('../home-recovered-navigation.mjs');
 const {recoveredModelSource}=require('../tools/home-recovered-model.cjs');const context={module:{exports:{}},console,Uint32Array};vm.runInNewContext(recoveredModelSource(fs.readFileSync('home-diorama-model.js','utf8')),context);
 const model=context.module.exports.createModel({random:()=>.5}),layout=layoutModule();
 for(const [hostWidth,stageWidth,availableHeight,left,top,w,h] of [[320,302,380,9,170,95.4924,111.4078],[567,515,150,26,117,112.2,130.9],[320,302,380,9,170,95.4924,111.4078]]){
  const rendered=layout.layoutTerrainCast({width:stageWidth,height:availableHeight,mainAsset:asset,companions:[],hasPartner:false});
  const height=Math.max(availableHeight,rendered.height),nav=createRecoveredNavigation(ART_SCENES[candidate],{width:hostWidth,height:844},{left,top,width:stageWidth,height});
  model.sync([{key:'pet:dog',kind:'pet',id:'dog',x:202.224711909,y:325.71236086,w,h,extent:{top:h+12}}],{region:'star_stop',time,width:stageWidth,height,groundTop:24,navigation:nav});
  const a=model.snapshot()[0];assert.ok(nav.valid(a),JSON.stringify({hostWidth,height,a,bounds:model.bounds(a)}));assert.ok(a.y-a.h>=0,'body stays below header');
 }
});
// CI 40909046973: six residents in the old star plaza, after 320 -> 844 rotation.
// Include the real ring/heart extents: the partner needs more room than its body.
for(const candidate of ['star-new','star_stop-original'])test(`landscape married six-person cast keeps every foot legal (${candidate})`,async()=>{
 const {ART_SCENES}=await import('../home-v7-manifest.mjs'),{createRecoveredNavigation}=await import('../home-recovered-navigation.mjs');
 const boxes=require('../cast-bounds.js'),layout=layoutModule(),{recoveredModelSource}=require('../tools/home-recovered-model.cjs');
 const ctx={module:{exports:{}},console,Uint32Array};vm.runInNewContext(recoveredModelSource(fs.readFileSync('home-diorama-model.js','utf8')),ctx);
 const paths=['assets/characters/dog/04.png','assets/characters/partners/forest_bear.png',...['cat_friend','tanuki','rabbit_friend','squirrel'].map(id=>'assets/characters/companions/'+id+'.png')];
 for(const hostWidth of [567,582])for(const motionRadius of [0,2,4]){
  const width=hostWidth-52,l=layout.layoutTerrainCast({width,height:150,mainAsset:paths[0],partnerAsset:paths[1],hasPartner:true,hasRing:true,companions:paths.slice(2),motionRadius});
  const actors=[l.main,l.partner,...l.companions].map((f,i)=>{
   const b=boxes[paths[i]].box,x=f.x+f.w*(b[0]+b[2])/256,y=f.y+f.h*b[3]/128+(f.artOffsetY||0),w=f.w*(b[2]-b[0])/128,h=f.h*(b[3]-b[1])/128,extent={left:w/2,right:w/2,top:h,bottom:0};
   for(const r of (i===1?[l.ring,...l.hearts]:[]).filter(Boolean)){extent.left=Math.max(extent.left,x-r.x+6);extent.right=Math.max(extent.right,r.x+r.w-x+6);extent.top=Math.max(extent.top,y-r.y+6);extent.bottom=Math.max(extent.bottom,r.y+r.h-y+6);}extent.top+=12;
   return {key:String(i),id:String(i),kind:i===0?'pet':i===1?'partner':'companion',x,y,w,h,extent};
  });
  const navigation=createRecoveredNavigation(ART_SCENES[candidate],{width:hostWidth,height:390},{left:26,top:117,width,height:l.height}),m=ctx.module.exports.createModel({random:()=>.5});
  m.sync(actors,{region:'star_stop',width,height:l.height,groundTop:24,navigation});
  for(const a of m.snapshot())assert.ok(navigation.valid(a),JSON.stringify({candidate,hostWidth,motionRadius,height:l.height,actor:a,bounds:m.bounds(a)}));
 }
});
