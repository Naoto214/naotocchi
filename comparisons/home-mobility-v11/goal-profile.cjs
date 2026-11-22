'use strict';
// Observer used by the existing native 600s model test. Its source transform
// records finished movement, without bypassing the game planner or stepper.
const fs = require('node:fs');
const {patchMovement: fromV9} = require('../home-mobility-v10/movement.cjs');
const {replaceExact} = require('../home-finish-v5/native-hooks.cjs');
const {patchGoals} = require('./goals.cjs');

const mode=process.env.GOAL_PROFILE_MODE;
if (!['baseline','candidate','unrestricted','late'].includes(mode) || !process.env.GOAL_PROFILE_OUT) throw Error('Set GOAL_PROFILE_MODE and GOAL_PROFILE_OUT');
const samples=[], active=new Map();
const pos=p=>[p.x,p.y];
const round=n=>Math.round(n*1e5)/1e5;
const distance=(p,q,s)=>Math.hypot((p[0]-q[0])*s[0],(p[1]-q[1])*s[1]);
const heading=(p,q,s)=>(Math.atan2((q[1]-p[1])*s[1],(q[0]-p[0])*s[0])*180/Math.PI+360)%360;
globalThis.HomeGoalDiagnostics={
  proposal(a,raw,chosen,scale,clock){
    const origin=pos(a), requested=pos(raw), target=pos(chosen), s=[scale.x,scale.y];
    const previous=active.get(a.key);
    if(previous?.status==='accepted')previous.status='superseded';
    const row={key:a.key,clock:round(clock),origin,raw:requested,chosen:target,
      changed:raw!==chosen,rawDistance:round(distance(origin,requested,s)),
      chosenDistance:round(distance(origin,target,s)),rawBearing:round(heading(origin,requested,s)),
      chosenBearing:round(heading(origin,target,s)),scale:s,travel:0,
      rawProgress:0,chosenProgress:0,end:origin,status:'sampled'};
    active.set(a.key,row);samples.push(row);
  },
  result(a,goal,source,ok){
    if(!a)return;
    const row=active.get(a.key);
    if(!row)return;
    if(source!=='ambient'||goal.x!==row.chosen[0]||goal.y!==row.chosen[1]){
      if(row.status==='accepted')row.status='superseded';
      active.delete(a.key);return;
    }
    row.planEndpoint=ok?pos(a.route.at(-1)||a.target):null;
    row.status=ok?'accepted':'denied';
  },
  hop(a,p) {
    const row=active.get(a.key);
    if(!row||row.status!=='accepted'||a.source!=='ambient')return;
    row.travel+=distance(pos(a),pos(p),row.scale);
    row.end=pos(p);
  },
  arrival(a) {
    const row=active.get(a.key);
    if(row?.status==='accepted'&&a.source==='ambient'){
      row.end=pos(a);row.status='arrived';active.delete(a.key);
    }
  },
};
process.on('beforeExit',()=>{
  for(const row of samples){
    const {origin,raw,chosen,end,scale}=row;
    row.net=round(distance(origin,end,scale));
    row.rawProgress=round(distance(origin,raw,scale)-distance(end,raw,scale));
    row.chosenProgress=round(distance(origin,chosen,scale)-distance(end,chosen,scale));
    row.travel=round(row.travel);
  }
  fs.writeFileSync(process.env.GOAL_PROFILE_OUT,JSON.stringify(samples));
});
function patchMovement(source){
  let model=fromV9(source);
  if(mode==='baseline'){
    const tail='if(Math.abs(p.x-a.x)<35)p.x=a.x<scene.width/2?b.right:b.left;}';
    model=replaceExact(model,tail,tail.slice(0,-1)+'globalThis.HomeGoalDiagnostics.proposal(a,p,p,scene.navigation?.intentScale,clock);}');
  }else{
    model=patchGoals(model);
    if(mode==='unrestricted')model=replaceExact(model,'if (!stillSeeking && castWidth <= scene.width * 2.55) return raw;','');
    if(mode==='late')model=replaceExact(model,'if (!stillSeeking && castWidth <= scene.width * 2.55) return raw;','if (!stillSeeking) return raw;');
  }
  const move="    function move(key,p,source='tap',{pointerDrop=false}={}){";
  model=replaceExact(model,move,`    function move(key,p,source='tap',options={}){
      const accepted = profiledMove(key,p,source,options);
      globalThis.HomeGoalDiagnostics.result(actor(key),p,source,accepted);
      return accepted;
    }
`+move.replace('function move','function profiledMove'));
  for(const [mark,extra] of [
    ['if(mobility?.enabled)mobility.hop(a,p,clock);','globalThis.HomeGoalDiagnostics.hop(a,p);'],
    ["if(mobility?.enabled)mobility.arrival(a,clock);emit('arrive'","globalThis.HomeGoalDiagnostics.arrival(a);"],
  ]){
    model=replaceExact(model,mark,extra+mark);
  }
  return model;
}
module.exports={patchMovement};
