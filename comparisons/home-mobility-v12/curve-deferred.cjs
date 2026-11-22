'use strict';
const {replaceExact}=require('../home-finish-v5/native-hooks.cjs');

// Queues a read-only search after the last native straight attempt. The
// straight search returns null on this same tick, so its original failure memo,
// waiting queue, scheduler and next resident's request all run normally.
function reserveCurve(a,goal,goals){
  const request=relief;
  if(backgroundCurve||request?.owner!==a.key||!sameFoot(goal,request.point)||!goals.length)return;
  const wait=waiting.get(a.key);
  if(!wait||wait.expires<=clock||!sameFoot(wait.point,goal))return;
  backgroundCurve={owner:a.key,point:{...goal},wait,expires:request.expires,
    region:scene.region,time:scene.time,navigation:scene.navigation,
    from:{x:a.x,y:a.y},search:curvedHandoff(a,goal,goals,true)};
}

function stepBackgroundCurve(flags){
  const job=backgroundCurve;
  if(!job)return;
  const a=actor(job.owner);
  // A native decision replaced or consumed this intention. Even a new request
  // for the same point gets a distinct waiting record.
  if(!a||scene.navigation!==job.navigation||scene.region!==job.region||scene.time!==job.time||
     clock>=job.expires||flags.reducedMotion||flags.autonomy===false||
     flags.heldActor!=null||manualGoals.size||clock<a.manualUntil||a.target||
     !sameFoot(a,job.from)||waiting.get(job.owner)!==job.wait){
    backgroundCurve=null;return;
  }
  if(relief)return;
  let result;
  for(let i=0;i<2;i++){
    result=job.search.next();
    if(result.done)break;
  }
  if(!result.done)return;
  backgroundCurve=null;
  const pair=result.value;
  if(!pair||!currentCurveFeet(pair,0))return;
  // A bystander can start a new walk on the same tick at the same foot. Its
  // original route takes priority over an optional curved handoff.
  if(pair.feet.some(([key])=>actor(key)?.target))return;
  const live={owner:job.owner,point:job.point,expires:job.expires,search:null,pair,stage:0};
  // Recheck before any helper moves. A rejected offer has no scheduler,
  // geometry, RNG, activity or reservation side effects.
  if(beginPairStage(a,live,pair,0)){
    live.stage=1;
    relief=live;
  }
}

function patchDeferred(frozen){
  let s=replaceExact(frozen,'function* curvedHandoff(a,goal,goals,ambient) {',
    'let backgroundCurve=null;\n'+reserveCurve.toString()+'\n'+stepBackgroundCurve.toString()+'\nfunction* curvedHandoff(a,goal,goals,ambient) {');
  s=replaceExact(s,'  return yield* curvedHandoff(a,goal,goals,true);',
    '  if(relief?.owner===a.key){reserveCurve(a,goal,goals);return null;}\n  return yield* curvedHandoff(a,goal,goals,true);');
  s=replaceExact(s,'      return yield* curvedHandoff(a,goal,goals,ambient);',
    '      if(ambient&&relief?.owner===a.key){reserveCurve(a,goal,goals);return null;}\n      return yield* curvedHandoff(a,goal,goals,ambient);');
  s=replaceExact(s,'      stepRelief(flags);','      stepRelief(flags);\n      stepBackgroundCurve(flags);');
  s=replaceExact(s,'function cancel(){clearRelief();','function cancel(){backgroundCurve=null;clearRelief();');
  s=replaceExact(s,'function select(key){const a=actor(key);if(!a||paused)return false;',
    'function select(key){const a=actor(key);if(!a||paused)return false;backgroundCurve=null;');
  s=replaceExact(s,"if(source!=='ambient'&&retryingKey!==key){crowdMisses.delete(key);",
    "if(source!=='ambient'&&retryingKey!==key){backgroundCurve=null;crowdMisses.delete(key);");
  return s;
}
module.exports={patchDeferred};
