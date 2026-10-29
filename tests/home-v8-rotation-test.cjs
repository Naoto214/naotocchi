const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),{createRequire}=require('node:module');
const {adaptDiorama,adaptScript}=require('../tools/home-v8-adapter.cjs');
function layoutModule(){const c={module:{exports:{}},require:createRequire(require.resolve('../home-diorama.js'))};vm.runInNewContext(adaptDiorama(fs.readFileSync('home-diorama.js','utf8')),c);return c.module.exports;}
const asset='assets/characters/dog/stage-4.webp';
for(const time of ['day','night'])test(`rotation of single large actor has legal floor in landscape and portrait (${time})`,async()=>{
 const {ART_SCENES}=await import('../home-v7-manifest.mjs'),{createRecoveredNavigation}=await import('../home-recovered-navigation.mjs');
 const {recoveredModelSource}=require('../tools/home-recovered-model.cjs');const context={module:{exports:{}},console,Uint32Array};vm.runInNewContext(recoveredModelSource(fs.readFileSync('home-diorama-model.js','utf8')),context);
 const model=context.module.exports.createModel({random:()=>.5}),layout=layoutModule();
 for(const [hostWidth,stageWidth,availableHeight,left,top,w,h] of [[320,302,380,9,170,95.4924,111.4078],[567,515,150,26,117,112.2,130.9],[320,302,380,9,170,95.4924,111.4078]]){
  const rendered=layout.layoutTerrainCast({width:stageWidth,height:availableHeight,mainAsset:asset,companions:[],hasPartner:false});
  const height=Math.max(availableHeight,rendered.height),nav=createRecoveredNavigation(ART_SCENES['star-new'],{width:hostWidth,height:844},{left,top,width:stageWidth,height});
  model.sync([{key:'pet:dog',kind:'pet',id:'dog',x:202.224711909,y:325.71236086,w,h,extent:{top:h+12}}],{region:'star_stop',time,width:stageWidth,height,groundTop:24,navigation:nav});
  const a=model.snapshot()[0];assert.ok(nav.valid(a),JSON.stringify({hostWidth,height,a,bounds:model.bounds(a)}));assert.ok(a.y-a.h>=0,'body stays below header');
 }
});
