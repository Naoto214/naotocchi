'use strict';
const {replaceExact}=require('../home-finish-v5/native-hooks.cjs');
// This is a reason to retry the original command. The unchanged planner and
// stepper still verify every helper stage and actual owner step.
const opening=`function openedGoalwardRay(a,goal,oldFeet,now) {
  const nav=scene.navigation,s=nav.intentScale,box=bounds(a,scene);
  const distance=p=>Math.hypot((p.x-goal.x)*s.x,(p.y-goal.y)*s.y);
  const start=distance(a);if(start<8)return false;
  const shapes=new Map(actors.map(b=>[b.key,[(a.w+b.w)*.5+10,(a.h+b.h)*.38+10]]));
  let ink=null;
  for(let i=0;i<48;i++){
    const angle=i*Math.PI/24,q={x:a.x+8*Math.cos(angle)/s.x,y:a.y+8*Math.sin(angle)/s.y};
    if(q.x<box.left||q.x>box.right||q.y<box.top||q.y>box.bottom||start-distance(q)<.75)continue;
    function blocks(b){const z=shapes.get(b.key);return z&&!contactSegmentSafe(a,q,b,z[0],z[1]);}
    const after=now.filter(blocks);
    if(after.length>2||after.some(b=>!b.available)||oldFeet.filter(blocks).length<=after.length)continue;
    ink??=scene.planVisibility?.(a)||(p=>visible(a,p));
    if(nav.segmentSafe(a,q,ink))return true;
  }
  return false;
}
`;

function patchMovement(source){
 let s=replaceExact(source,'const waiting=new Map(),helpedAt=new Map();','const crowdMisses=new Map(),waiting=new Map(),helpedAt=new Map();let reopenedKey=null;');
 s=replaceExact(s,'  if(earlyKey!==a.key && !resuming)waiting.set(a.key,{point:{x:p.x,y:p.y},feet,expires:clock+12});',`  if(earlyKey!==a.key&&!resuming){
    const misses=crowdMisses.get(a.key)||{since:clock,choices:0};
    misses.choices=Math.min(3,misses.choices+1);crowdMisses.set(a.key,misses);
    waiting.set(a.key,{point:{x:p.x,y:p.y},feet,expires:clock+12});
  }`);
 s=replaceExact(s,'function clearRelief() {',opening+'function clearRelief() {');
 s=replaceExact(s,'    if(w.retried||flags.heldActor===key||!differentFeet(w.feet,nearbyFeet(a),scene.navigation.intentScale,clock-a.lastWalk>=70))continue;',`    if(flags.heldActor===key)continue;
    const misses=w.retried&&crowdMisses.get(key);
    if(w.retried&&(w.reopened||!misses||misses.choices<3||clock-misses.since<240))continue;
    const feet=nearbyFeet(a),scale=scene.navigation.intentScale;
    if(w.retried){
      if(!differentFeet(w.examined||w.feet,feet,scale,false))continue;
      if(!openedGoalwardRay(a,w.point,w.feet,feet)){w.examined=feet;continue;}
    }else if(!differentFeet(w.feet,feet,scale,clock-a.lastWalk>=70))continue;`);
 s=replaceExact(s,'    w.retried=true;w.attempted=false;w.feet=nearbyFeet(a);earlyKey=key;',`    if(w.retried){w.reopened=true;reopenedKey=key;}
    w.retried=true;w.attempted=false;w.feet=feet;earlyKey=key;`);
 s=replaceExact(s,"    try{move(key,w.point,'ambient');}finally{earlyKey=null;}",
   "    try{move(key,w.point,'ambient');}finally{earlyKey=null;reopenedKey=null;}");
 s=replaceExact(s,'if(arrange){clearRelief();waiting.clear();helpedAt.clear();}', 'if(arrange){clearRelief();waiting.clear();helpedAt.clear();crowdMisses.clear();}');
 s=replaceExact(s,'if(changed){cancel();cooldown.clear();}', 'if(changed){cancel();cooldown.clear();crowdMisses.clear();}');
 s=replaceExact(s,'if(!a||paused)return false;clearRelief();waiting.delete(key);','if(!a||paused)return false;crowdMisses.delete(key);clearRelief();waiting.delete(key);');
 s=replaceExact(s,"if(source!=='ambient'&&retryingKey!==key){clearRelief();", "if(source!=='ambient'&&retryingKey!==key){crowdMisses.delete(key);clearRelief();");
 s=replaceExact(s,'        if(mobility?.enabled)mobility.hop(a,p,clock);',"        if(a.source!=='yield'&&crowdMisses.size)crowdMisses.delete(a.key);\n        if(mobility?.enabled)mobility.hop(a,p,clock);");
 return s;
}
module.exports={patchMovement};
