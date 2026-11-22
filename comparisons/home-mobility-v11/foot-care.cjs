'use strict';

const {replaceExact}=require('../home-finish-v5/native-hooks.cjs');

// These two private assets belong only to the paused growth comparison. Each
// native sync still validates the floor, visibility, contact and all former
// sampled exits before a previously projected household is allowed to stay.
function makeCareFootTrial() {
  const enabled=new URLSearchParams(location.search).get('careGuard')==='1';
  let before=null,deadline=0,armed=false;
  const steps=[];
  function legalDirections(a) {
    const nav=scene.navigation,scale=nav.intentScale,b=bounds(a,scene),mask=[];
    for (const distance of [3,8,16]) {
      for (let direction=0;direction<48;direction++) {
        const angle=Math.PI*direction/24;
        const to={x:a.x+Math.cos(angle)*distance/scale.x,y:a.y+Math.sin(angle)*distance/scale.y};
        mask.push(to.x>=b.left && to.x<=b.right && to.y>=b.top && to.y<=b.bottom &&
          nav.segmentSafe(a,to,p=>visible(a,p)) && actors.every(other=>other===a ||
            contactSegmentSafe(a,to,other,(a.w+other.w)*.5+10,(a.h+other.h)*.38+10)));
      }
    }
    return mask;
  }
  function bodySignature(a) {
    return [a.w,a.h,a.extent?.left,a.extent?.right,a.extent?.top,a.extent?.bottom].join('/');
  }
  function capture() {
    if (!enabled) return;
    before={nav:scene.navigation,people:new Map(actors.map(a=>[a.key,{
      x:a.x,y:a.y,body:bodySignature(a),directions:legalDirections(a)
    }]))};
  }
  function prepare() {
    if (armed || !globalThis.HomeCastTrial?.settings.paused || !globalThis.HomeCastTrial.ready ||
        scene.region!=='forest' || actors.length!==28 || !scene.navigation?.segmentSafe) return false;
    armed=true;
    capture();
    deadline=performance.now()+12000;
    return true;
  }
  function verify(old,oldScene,arrange) {
    if (!armed || !arrange || !globalThis.HomeCastTrial.settings.paused || oldScene.region!==scene.region ||
        scene.region!=='forest' || old.length!==28 || actors.length!==28 || !oldScene.navigation || !scene.navigation ||
        steps.length>=2 || performance.now()>deadline) return null;
    const started=performance.now();
    const record={sequence:steps.length+1,eligible:false,accepted:false,previousExits:0,currentExits:0,lost:0};
    steps.push(record);
    if (!enabled) return record;
    if (before?.nav!==oldScene.navigation || !old.every(a=>{
      const sample=before.people.get(a.key);
      return sample && sample.x===a.x && sample.y===a.y && sample.body===bodySignature(a);
    })) {record.reason='previous-state-changed';return record;}
    const previous=new Map(old.map(a=>[a.key,a]));
    for (const a of actors) {
      const prior=previous.get(a.key),nav=scene.navigation;
      if (!prior) {record.reason='resident-changed';return record;}
      const floor=oldScene.navigation.unproject(prior),desired=floor && nav.project(floor);
      const b=bounds(a,scene);
      if (!desired || Math.hypot(a.x-desired.x,a.y-desired.y)>1e-5 ||
          a.x<b.left-1e-6 || a.x>b.right+1e-6 || a.y<b.top-1e-6 || a.y>b.bottom+1e-6 ||
          !nav.valid(a) || !visible(a,a)) {record.reason='projected-foot-invalid';return record;}
      const worse=actors.some(other=>{
        if (other===a) return false;
        const peer=previous.get(other.key);
        return !peer || clearance(a,a,other)<Math.min(1,clearance(prior,prior,peer))-1e-6;
      });
      if (worse) {record.reason='new-or-deeper-contact';return record;}
    }
    record.eligible=true;
    for (const a of actors) {
      const previousMask=before.people.get(a.key).directions,currentMask=legalDirections(a);
      for (let i=0;i<currentMask.length;i++) {
        if (previousMask[i]) record.previousExits++;
        if (currentMask[i]) record.currentExits++;
        if (previousMask[i] && !currentMask[i]) record.lost++;
      }
    }
    record.accepted=!record.lost;
    record.reason=record.accepted?'previous-directions-preserved':'previous-direction-lost';
    record.validateMs=performance.now()-started;
    return record;
  }
  function finish(record) {
    if (!record) return;
    if (steps.length===2) {before=null;armed=false;}
    else capture();
  }
  function read() {
    return {enabled,applied:steps.some(s=>s.accepted),steps:steps.map(s=>({...s}))};
  }
  return {prepare,verify,finish,read};
}

function patchCareModel(source) {
  const marker='    function sync(list,next){';
  let out=replaceExact(source,marker,makeCareFootTrial.toString()+`
    const careFeet=makeCareFootTrial();
    globalThis.HomeCareFootControl={prepare:careFeet.prepare,read:careFeet.read};
`+marker);
  const reserve='      if(lead&&(actors.length>5';
  out=replaceExact(out,reserve,'      const growthComparison=careFeet.verify(previousActors,previousScene,arrange);\n'+reserve);
  out=replaceExact(out,'        if(!fits(a)&&(arrange','        if(!growthComparison?.accepted && !fits(a)&&(arrange');
  const finish='      if(arrange){clearRelief();';
  return replaceExact(out,finish,'      careFeet.finish(growthComparison);\n'+finish);
}

function patchCareGame(source) {
  const boot='  globalThis.__naotocchiBooted = true;';
  return replaceExact(source,boot,`  let comparedGrowth=false, priorGrowth=null;
  function measuredGrowthFeet(){
    return new Map(HomeCastTrial.inspect().map(r=>[r.key,{x:r.foot.x,y:r.foot.y}]));
  }
  globalThis.HomeCareGrowthTrial=Object.freeze({
    grow(){
      if(comparedGrowth || !HomeDragTrial.opening() || !HomeCastTrial.settings.paused ||
         state.stage!==STAGE.GROWING || state.isSleeping || state.isSick || state.transformOptions || state.infinite) return false;
      const prev=currentAge(),stage=currentFormStageIndex();
      let next=prev+1;
      while(next<=GOAL_AGE && stageForAge(next,state.speciesLine)===stage)next++;
      if(next>GOAL_AGE || !globalThis.HomeCareFootControl?.prepare())return false;
      priorGrowth={age:prev,stage,feet:measuredGrowthFeet()};
      comparedGrowth=true;
      state.ageTicks=next*AGE_TICKS_PER_YEAR;
      onAgeChanged(prev);
      render();
      return true;
    },
    read(){
      const info=globalThis.HomeCareFootControl?.read()||{enabled:false,applied:false,steps:[]};
      let maxScreenCss=0,residentKey=null,fromScreen=null,toScreen=null;
      if(priorGrowth){
        for(const [key,p] of measuredGrowthFeet()){
          const old=priorGrowth.feet.get(key);if(!old)continue;
          const d=Math.hypot(p.x-old.x,p.y-old.y);
          if(d>maxScreenCss){maxScreenCss=d;residentKey=key;fromScreen=old;toScreen=p;}
        }
      }
      return {...info,started:comparedGrowth,freshReloadRequired:comparedGrowth,ageBefore:priorGrowth?.age??null,ageAfter:currentAge(),
        stageBefore:priorGrowth?.stage??null,stageAfter:currentFormStageIndex(),maxScreenCss,residentKey,fromScreen,toScreen};
    }
  });
`+boot);
}

module.exports={patchCareModel,patchCareGame};
