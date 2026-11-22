'use strict';
const {replaceExact}=require('../home-finish-v5/native-hooks.cjs');
const {patchFastCareModel}=require('../home-mobility-v11/foot-care-fast.cjs');

// A normal V12 home can opt into this real lifecycle hook. Preflight uses
// idle slices and is discarded at the first mismatch. Growing never waits for
// it, and there is no attempt to reinterpret a live drag or conversation.
function liveGrowthModel(source){
  let code=patchFastCareModel(source);
  code=replaceExact(code,"  const enabled=new URLSearchParams(location.search).get('careGuard')==='1';",
    "  const enabled=new URLSearchParams(location.search).get('growthLive')==='1';");
  code=replaceExact(code,'    const dx=16/scale.x,dy=16/scale.y;',`    const canSee=scene.planVisibility?.(a)||(p=>visible(a,p));
    const dx=16/scale.x,dy=16/scale.y;`);
  code=replaceExact(code,'mask[k]=nav.segmentSafe(a,to,p=>visible(a,p));','mask[k]=nav.segmentSafe(a,to,canSee);');
  const i=code.indexOf('  function prepare() {'),j=code.indexOf('  function verify(old',i);
  if(i<0||j<i)throw Error('Expected growth prepare hook');
  code=replaceExact(code,code.slice(i,j),`  let warmed=null,iteration=0,budget=Infinity,lastReason=null;
  const ink=a=>[a.reflowGear,a.reflowInk?.up,a.reflowInk?.down,a.reflowInk?.left,a.reflowInk?.right].join('/');
  function dependencies(a){
    const s=scene.navigation.intentScale,b=bounds(a,scene);
    const near=actors.filter(other=>other!==a&&
      Math.abs(a.x-other.x)<=16/s.x+(a.w+other.w)*.5+10+1e-6&&
      Math.abs(a.y-other.y)<=16/s.y+(a.h+other.h)*.38+10+1e-6);
    const foreground=globalThis.HomeV12CareForeground?.(a);
    if(!foreground)return null;
    return JSON.stringify([foreground,a.x,a.y,bodySignature(a),a.reflowArt,ink(a),s.x,s.y,b.left,b.right,b.top,b.bottom,
      near.map(other=>[other.key,other.x,other.y,other.w,other.h])]);
  }
  const overBudget={};
  function staticallyEligible(){
    return enabled&&scene.region==='forest'&&actors.length===28&&scene.navigation?.segmentSafe&&
      !manualGoals.size&&!waiting.size&&!relief&&actors.every(a=>!a.target&&!a.route?.length&&
        !['together','approach','chat','sleep'].includes(a.activity));
  }
  const matches=(map,nav)=>scene.navigation===nav&&staticallyEligible()&&actors.every(a=>{
    const sample=map.get(a.key);return sample&&sample.x===a.x&&sample.y===a.y&&sample.body===bodySignature(a)&&sample.art===a.reflowArt&&sample.ink===ink(a);
  });
  function preflight(){
    const token=++iteration;
    warmed=null;
    if(!staticallyEligible())return Promise.resolve(false);
    const nav=scene.navigation,people=new Map(actors.map(a=>[a.key,{x:a.x,y:a.y,body:bodySignature(a),art:a.reflowArt,ink:ink(a)}]));
    const keys=actors.map(a=>a.key);
    return new Promise(resolve=>{
      let index=0;
      const slice=()=>{
        if(token!==iteration||armed||!matches(people,nav)){resolve(false);return;}
        const until=performance.now()+4;
        do{
          const key=keys[index++],resident=actor(key),entry=people.get(key);
          entry.deps=dependencies(resident);entry.directions=legalDirections(resident);
        }while(index<keys.length&&performance.now()<until);
        if(index===keys.length){warmed={nav,people};resolve(true);return;}
        setTimeout(slice,0);
      };
      setTimeout(slice,0);
    });
  }
  function prepare(){
    if(performance.now()>deadline)armed=false;
    if(armed||!warmed||!matches(warmed.people,warmed.nav)){lastReason='no-current-preflight';return false;}
    ++iteration;before=warmed;warmed=null;armed=true;steps.length=0;
    deadline=performance.now()+4000;lastReason='armed';return true;
  }
`);
  code=replaceExact(code,'    if (!armed || !arrange || !globalThis.HomeCastTrial.settings.paused ||',
    '    if (!armed || !arrange ||');
  code=replaceExact(code,'    if (!enabled) return record;','    if (!enabled || old.some(a=>a.target||a.route?.length) || manualGoals.size || relief){record.reason="active-route";return record;}');
  code=replaceExact(code,'    for(let k=0;k<bearings.length;k++){','    for(let k=0;k<bearings.length;k++){\n      if(k%12===0&&performance.now()>budget)throw overBudget;');
  code=replaceExact(code,'    else capture();',`    else {armed=false;before=null;lastReason=record.reason||'native-layout';}`);
  // The two syncs belong to one actual stage change. Certify every direction
  // available before care in both projections. No player can enter a newly
  // gained direction during the intermediate synchronous layout pass.
  code=replaceExact(code,'const previousMask=before.people.get(a.key).directions,currentMask=legalDirections(a,finalCheck?previousMask:null);',
    `const previous=before.people.get(a.key),previousMask=previous.directions;
      const deps=dependencies(a);
      const reuse=!!deps&&before.nav===scene.navigation&&before.nav?.reflowGeometry&&previous.deps===deps;
      const currentMask=reuse?previousMask:legalDirections(a,previousMask);
      if(reuse)record.reused=(record.reused||0)+1;`);
  code=replaceExact(code,'if(measured)measured.people.set(a.key,{x:a.x,y:a.y,body:bodySignature(a),directions:currentMask})',
    'if(measured)measured.people.set(a.key,{x:a.x,y:a.y,body:bodySignature(a),directions:previousMask,deps})');
  code=replaceExact(code,'record.completeCurrentMask=!finalCheck;','record.completeCurrentMask=false;');
  const cap='  function finish(record) {';
  code=replaceExact(code,cap,`  function withinBudget(old,oldScene,arrange){
    if(!armed||!arrange)return null;
    budget=performance.now()+48;
    try{return verify(old,oldScene,arrange);}
    catch(error){
      if(error!==overBudget)throw error;
      const record=steps[steps.length-1]||{sequence:steps.length+1};
      record.accepted=false;record.reason='time-budget';record.validateMs=48+(performance.now()-budget);
      armed=false;before=null;lastReason='time-budget';return record;
    }finally{budget=Infinity;}
  }
`+cap);
  code=replaceExact(code,'return {prepare,verify,finish,read};',
    'return {prepare,preflight,verify:withinBudget,finish,read:()=>({...read(),armed,warmed:!!warmed,lastReason})};');
  code=replaceExact(code,"globalThis.HomeCareFootControl={prepare:careFeet.prepare,read:careFeet.read};",
    "globalThis.HomeV12LifeGrowth=Object.freeze({prepare:careFeet.prepare,preflight:careFeet.preflight,read:careFeet.read});");
  return code;
}
function liveGrowthGame(source){
  let code=replaceExact(source,'    if (after !== before) clearTemporaryForm();',`    if(after!==before)globalThis.HomeV12LifeGrowth?.prepare();
    if (after !== before) clearTemporaryForm();`);
  const timer='setInterval(loop, TICK_MS);';
  code=replaceExact(code,timer,`let preflightAge=-1;
  setInterval(()=>{
    if(globalThis.HomeV12LifeGrowth&&state.stage===STAGE.GROWING&&!state.isSleeping&&!state.isSick){
      const age=currentAge(),ticks=AGE_TICKS_PER_YEAR-(state.ageTicks%AGE_TICKS_PER_YEAR);
      if(ticks<=2&&preflightAge!==age&&stageForAge(age+1,state.speciesLine)!==stageForAge(age,state.speciesLine)){
        preflightAge=age;globalThis.HomeV12LifeGrowth.preflight();
      }
    }
    loop();
  },TICK_MS);`);
  return code;
}
function liveGrowthPainter(source){
  return replaceExact(source,'    function planVisibility(a){',`    globalThis.HomeV12CareForeground=a=>{
      if(!world?.pointIndependentOcclusion||!scene?.navigation)return null;
      const rect=displayRect(stage),host=displayRect(worldHost);
      return [rect.left-host.left,rect.top-host.top,polygonsAt(a)];
    };
    function planVisibility(a){`);
}
module.exports={liveGrowthModel,liveGrowthGame,liveGrowthPainter};
