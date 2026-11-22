'use strict';
// Single-decision counterfactual, replaying the whole seeded model from its opening.
const {patchMovement:profile}=require('./goal-profile.cjs');
const {replaceExact}=require('../home-finish-v5/native-hooks.cjs');
const at=JSON.parse(process.env.GOAL_KEEP_ORIGINAL);
if(typeof at.key!=='string'||!Number.isFinite(at.clock))throw Error('Supply the recorded key and clock');
function patchMovement(source){
  const mark='p=chooseWanderGoal(a,p);globalThis.HomeGoalDiagnostics?.proposal';
  const match='a.key==='+JSON.stringify(at.key)+' && Math.abs(clock-'+JSON.stringify(at.clock)+')<1e-5';
  return replaceExact(profile(source),mark,'p=('+match+')?raw:chooseWanderGoal(a,p);globalThis.HomeGoalDiagnostics?.proposal');
}
module.exports={patchMovement};
