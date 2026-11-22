'use strict';
// Offline classification only. The observer returns the exact original point
// to the measured simulation; the optional counterfactual changes one draw.
const fs=require('node:fs');
const {patchMovement:profile}=require('./goal-profile.cjs');
const {replaceExact}=require('../home-finish-v5/native-hooks.cjs');
const rows=[];
const override=process.env.GOAL_ALTERNATIVE && JSON.parse(process.env.GOAL_ALTERNATIVE);
const output=process.env.GOAL_CONNECTIVITY_OUT;
if(!output)throw Error('Set GOAL_CONNECTIVITY_OUT');
process.on('beforeExit',()=>fs.writeFileSync(output,JSON.stringify(rows)));
const same=(a,b)=>a&&b&&Math.hypot(a.x-b.x,a.y-b.y)<1e-5;
function inspect(actor,raw,issued,clock,scene,allow,isFree,box,alternate) {
  const nav=scene.navigation;
  const terrain=nav.valid(raw),visible=allow(raw);
  const row={key:actor.key,clock,terrain,visible,free:visible&&isFree(raw)};
  rows.push(row);
  if(!(row.terrain&&row.visible&&row.free))return issued;
  row.origin=[actor.x,actor.y];row.raw=[raw.x,raw.y];
  row.startTerrain=nav.valid(actor);row.startVisible=allow(actor);
  const exact=route=>route?.length && same(route.at(-1),raw) &&
    route.every((to,i)=>nav.segmentSafe(i?route[i-1]:actor,to,allow));
  row.direct=nav.segmentSafe(actor,raw,allow);
  row.staticRoute=row.direct || !!exact(nav.route(actor,raw,box,allow));
  if(!row.staticRoute && nav.referenceRoute)row.staticRoute=!!exact(nav.referenceRoute(actor,raw,box,allow));
  if(!row.staticRoute && nav.reachable)row.staticRoute=!!exact(nav.reachable(actor,raw,box,allow,
    p=>Math.hypot((p.x-raw.x)*nav.intentScale.x,(p.y-raw.y)*nav.intentScale.y)<.5));
  const next=alternate();
  row.alternate=next===raw?null:[next.x,next.y];
  if(row.alternate && override?.key===actor.key && Math.abs(clock-override.clock)<1e-5) {
    row.applied=true;return next;
  }
  return issued;
}
globalThis.goalConnectivity=inspect;
function patchMovement(source){
  let s=profile(source);
  s=replaceExact(s,'function chooseWanderGoal(a,raw) {','function chooseWanderGoal(a,raw,inspectOnly=false) {');
  s=replaceExact(s,'if (nav.valid(raw) && free(a, raw)) return raw;', 'if (!inspectOnly && nav.valid(raw) && free(a, raw)) return raw;');
  s=replaceExact(s,'if (!stillSeeking && castWidth <= scene.width * 2.55) return raw;',
    'if (!inspectOnly && !stillSeeking && castWidth <= scene.width * 2.55) return raw;');
  return replaceExact(s,'const raw=p;p=chooseWanderGoal(a,p);globalThis.HomeGoalDiagnostics?.proposal',
    'const raw=p;p=chooseWanderGoal(a,p);p=globalThis.goalConnectivity(a,raw,p,clock,scene,scene.planVisibility(a),point=>free(a,point),b,()=>chooseWanderGoal(a,raw,true));globalThis.HomeGoalDiagnostics?.proposal');
}
module.exports={patchMovement};
