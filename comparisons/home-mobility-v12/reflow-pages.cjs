'use strict';
const fs=require('node:fs');
const path=require('node:path');
const {replaceExact,digest}=require('../home-finish-v5/native-hooks.cjs');
const {corridorModel,corridorPainter}=require('../home-mobility-v11/foot-corridor.cjs');
const {patchCareGame}=require('../home-mobility-v11/foot-care.cjs');
const {growthModel}=require('./growth.cjs');
const {liveGrowthModel,liveGrowthGame,liveGrowthPainter}=require('./live-growth.cjs');

function addReflowPages({add,baseline,modelSource,rendererSource}) {
  const read=(base,name)=>fs.readFileSync(path.join(base,name),'utf8');
  const inherited=name=>read(path.join(__dirname,'../home-mobility-v11'),name);
  const local=name=>read(__dirname,name);
  const game=name=>read(path.join(baseline,'game'),name);
  function swap(page,oldName,newName,source){
    const tag=(name,body)=>'<script src="'+name+'?v='+digest(body).slice(0,12)+'"></script>';
    return replaceExact(page,tag(oldName,game(oldName)),tag(newName,source));
  }
  const basePage=game('mobility-v11-foot.html');
  const model='home-production-model-mobility-v11-foot.js',painter='home-production-diorama-mobility-v11.js';
  const corridorPaint=corridorPainter(rendererSource);
  const paintName='home-production-diorama-v12-corridor.js';
  add('game/'+paintName,corridorPaint);
  const audit=inherited('foot-geometry-diagnostic.js');
  let live=corridorModel(modelSource,audit);
  live=replaceExact(live,'    actors=record.actors.map(a=>structuredClone(a));',`    actors=record.actors.map(saved=>{
      const measured=actor(saved.key);
      return {...structuredClone(saved),reflowArt:measured.reflowArt,reflowInk:measured.reflowInk,reflowGear:measured.reflowGear};
    });`);
  const begin='    const canHold=mode===\'guard\'&&holds&&now.otherLong.length>0;';
  const end='    const after=canHold?now:geometryExitAudit(scene,actors);';
  const i=live.indexOf(begin),j=live.indexOf(end,i);
  if(i<0||j<i)throw Error('Expected original corridor comparison');
  live=replaceExact(live,live.slice(i,j+end.length),`    // Only the reference removes the optional V12 geometry stamp. Both arms
    // enter the real sync and exercise the same native navigation functions.
    if(mode==='native')delete next.navigation.reflowGeometry;
    sync(list,next);
    const decision=globalThis.HomeV12Reflow?.read(actors[0].key);
    const canHold=mode==='guard'&&decision?.clock===clock&&decision.held;
    const after=geometryExitAudit(scene,actors);`);
  live=replaceExact(live,'policy={mode,held:canHold','policy={mode,decision,held:!!canHold');
  const liveName='home-production-model-v12-corridor.js';
  add('game/'+liveName,live);
  const replay=swap(swap(basePage,model,liveName,live),painter,paintName,corridorPaint);
  for(const region of ['mountain','forest']){
    add('game/mobility-v12-corridor-'+region+'.html',replay);
    add('v12/corridor-'+region+'.json',inherited('evidence/corridor-'+region+'.json'));
  }
  add('v12/corridor.html',inherited('corridor.html'));
  add('v12/corridor.mjs',inherited('corridor.mjs').replace('mobility-v11-corridor','mobility-v12-corridor').replace('diagnostics:0','diagnostics:0,footLog:1'));
  const care=growthModel(modelSource), careModel='home-production-model-v12-growth.js';
  const oldApp='script-v2-mobility-v7.js',newApp='script-v2-mobility-v11-growth.js',app=game(newApp);
  const carePaint='home-production-diorama-v12-growth.js';
  const careRenderer=replaceExact(rendererSource,'    function paint(){','    globalThis.paintV12Growth=()=>paint();\n    function paint(){');
  add('game/'+carePaint,careRenderer);
  add('game/'+careModel,care);
  let growth=swap(basePage,model,careModel,care);
  growth=swap(growth,painter,carePaint,careRenderer);
  add('game/mobility-v12-growth.html',swap(growth,oldApp,newApp,app));
  const liveCareModel=liveGrowthModel(modelSource),liveCareGame=patchCareGame(liveGrowthGame(game(oldApp))).replace('  let comparedGrowth=false,',`  globalThis.HomeCareFootControl={prepare:()=>true,read:()=>globalThis.HomeV12LifeGrowth?.read()};
  let comparedGrowth=false,`);
  const lmodel='home-production-model-v12-life.js',lgame='script-v2-mobility-v12-life.js';
  add('game/'+lmodel,liveCareModel);add('game/'+lgame,liveCareGame);
  const lpaint='home-production-diorama-v12-life.js',lifePainter=liveGrowthPainter(rendererSource);
  add('game/'+lpaint,lifePainter);
  const ordinary=swap(swap(basePage,model,lmodel,liveCareModel),painter,lpaint,lifePainter);
  add('game/mobility-v12-life.html',swap(ordinary,oldApp,lgame,liveCareGame));
  add('v12/growth.html',local('growth.html'));
  add('v12/growth.mjs',local('growth.mjs'));
}
module.exports={addReflowPages};
